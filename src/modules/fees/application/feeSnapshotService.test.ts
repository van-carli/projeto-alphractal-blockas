import { describe, it, expect } from "vitest";
import { FeeSnapshotService } from "./feeSnapshotService";
import { FakeTelemetrySource } from "@/server/rpc/fakeTelemetrySource";
import { FakePriorityFeeSource } from "@/server/rpc/fakePriorityFeeSource";
import { FakeEthUsdPriceSource } from "@/server/price/fakeEthUsdPriceSource";
import { InMemorySnapshotRepository } from "../domain/snapshotRepository";
import { SseHub } from "@/server/sse/sseHub";
import { FakeClock } from "@/server/clock";
import type { EthereumBlockTelemetry } from "./ports";

function makeBlock(blockNumber: bigint): EthereumBlockTelemetry {
  return {
    chainId: 1,
    blockNumber,
    blockHash: `0x${"a".repeat(64)}`,
    timestamp: new Date(),
    baseFeePerGas: 10_000_000_000n, // 10 gwei
    gasUsed: 15_000_000n,
    gasLimit: 30_000_000n, // gasUsedRatio = 0.5
  };
}

function createService() {
  const telemetry = new FakeTelemetrySource();
  const priorityFee = new FakePriorityFeeSource({
    slow: 1,
    standard: 2,
    fast: 5,
  });
  const clock = new FakeClock(new Date("2026-08-24T10:00:00.000Z"));
  const price = new FakeEthUsdPriceSource({
    price: 3000,
    updatedAt: clock.now(),
  });
  const repository = new InMemorySnapshotRepository(100);
  const sseHub = new SseHub(999_999);

  const service = new FeeSnapshotService({
    telemetrySource: telemetry,
    priorityFeeSource: priorityFee,
    priceSource: price,
    repository,
    sseHub,
    clock,
    staleThresholdMs: 120_000,
    operations: [{ operation: "ETH transfer", gasUnits: 21000 }],
  });

  return { service, telemetry, priorityFee, price, repository, sseHub, clock };
}

describe("FeeSnapshotService", () => {
  it("processa um bloco e salva o snapshot", async () => {
    const { service, telemetry, repository } = createService();
    await service.start();

    await telemetry.emitBlock(makeBlock(100n));

    const latest = await repository.getLatest(1);
    expect(latest).not.toBeNull();
    expect(latest!.blockNumber).toBe("100");
    expect(latest!.baseFeeGwei).toBe(10);
    expect(latest!.gasUsedRatio).toBe(0.5);
    expect(latest!.congestionLevel).toBe("normal");
    expect(latest!.priorityFeeGwei).toEqual({ slow: 1, standard: 2, fast: 5 });
    expect(latest!.estimatedCosts.length).toBe(1);
    expect(latest!.estimatedCosts[0].operation).toBe("ETH transfer");
  });

  it("incrementa o sequence a cada bloco", async () => {
    const { service, telemetry, repository } = createService();
    await service.start();

    await telemetry.emitBlock(makeBlock(100n));
    await telemetry.emitBlock(makeBlock(101n));

    const history = await repository.getHistory({ chainId: 1, limit: 10 });
    expect(history.map((s) => s.sequence)).toEqual([0, 1]);
  });

  it("detecta preço stale quando o clock avança além do threshold", async () => {
    const { service, telemetry, repository, clock } = createService();
    await service.start();

    clock.advance(3 * 60 * 1000); // 3 minutos, acima do threshold de 2 min
    await telemetry.emitBlock(makeBlock(100n));

    const latest = await repository.getLatest(1);
    expect(latest!.priceStatus).toBe("stale");
  });

  it("health começa unhealthy e fica degraded enquanto o preço está indisponível", async () => {
    const { service } = createService();
    expect(service.getHealth().status).toBe("unhealthy");

    await service.start();
    expect(service.getHealth().status).toBe("degraded");
    expect(service.getHealth().rpcConnected).toBe(true);
  });

  it("health indica priceStatus unavailable se nunca houve preço", async () => {
    const { service } = createService();
    expect(service.getHealth().priceStatus).toBe("unavailable");
  });

  it("reflete desconexão e recuperação da fonte Ethereum no health", async () => {
    const { service, telemetry } = createService();
    await service.start();
    await telemetry.emitBlock(makeBlock(100n));

    expect(service.getHealth().status).toBe("healthy");

    telemetry.emitConnectionStatus(false);
    expect(service.getHealth()).toMatchObject({
      status: "unhealthy",
      rpcConnected: false,
    });

    telemetry.emitConnectionStatus(true);
    expect(service.getHealth()).toMatchObject({
      status: "healthy",
      rpcConnected: true,
    });
  });

  it("não quebra se o processamento de um bloco falhar", async () => {
    const { service, telemetry, price, repository } = createService();
    await service.start();

    price.setShouldFail(true);
    await telemetry.emitBlock(makeBlock(100n)); // falha silenciosa

    price.setShouldFail(false);
    await telemetry.emitBlock(makeBlock(101n)); // recupera

    const latest = await repository.getLatest(1);
    expect(latest!.blockNumber).toBe("101");
  });
});
