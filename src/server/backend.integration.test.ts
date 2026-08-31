import { describe, expect, it } from "vitest";
import { FeeSnapshotService } from "@/modules/fees/application/feeSnapshotService";
import type { EthereumBlockTelemetry } from "@/modules/fees";
import { InMemorySnapshotRepository } from "@/modules/fees/domain/snapshotRepository";
import { FakeClock } from "./clock";
import { FakeEthUsdPriceSource } from "./price/fakeEthUsdPriceSource";
import { FakePendingTransactionSource } from "./rpc/fakePendingTransactionSource";
import { FakePriorityFeeSource } from "./rpc/fakePriorityFeeSource";
import { FakeTelemetrySource } from "./rpc/fakeTelemetrySource";
import { SseHub } from "./sse/sseHub";

function makeBlock(
  blockNumber: bigint,
  hashCharacter: string
): EthereumBlockTelemetry {
  return {
    chainId: 1,
    blockNumber,
    blockHash: `0x${hashCharacter.repeat(64)}`,
    timestamp: new Date("2026-08-24T10:00:00.000Z"),
    baseFeePerGas: 10_000_000_000n,
    gasUsed: 18_000_000n,
    gasLimit: 30_000_000n,
  };
}

async function readText(
  reader: ReadableStreamDefaultReader<Uint8Array>
): Promise<string> {
  return new TextDecoder().decode((await reader.read()).value);
}

async function readUntil(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  expectedText: string
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const text = await readText(reader);
    if (text.includes(expectedText)) return text;
  }
  throw new Error(`Evento SSE não encontrado: ${expectedText}`);
}

describe("fluxo integrado do backend", () => {
  it("transforma blocos em histórico e eventos sem acessar a rede pública", async () => {
    const clock = new FakeClock(new Date("2026-08-24T10:00:00.000Z"));
    const telemetry = new FakeTelemetrySource();
    const pendingTransactions = new FakePendingTransactionSource();
    const repository = new InMemorySnapshotRepository(10);
    const sseHub = new SseHub(999_999);
    const service = new FeeSnapshotService({
      telemetrySource: telemetry,
      priorityFeeSource: new FakePriorityFeeSource({
        slow: 1,
        standard: 2,
        fast: 5,
      }),
      pendingTransactionSource: pendingTransactions,
      priceSource: new FakeEthUsdPriceSource({
        price: 3000,
        updatedAt: clock.now(),
      }),
      repository,
      sseHub,
      clock,
      staleThresholdMs: 120_000,
      operations: [{ operation: "ETH transfer", gasUnits: 21_000 }],
    });
    const stream = sseHub.connect(null, service.getHealth());
    const reader = stream.getReader();
    expect(await readText(reader)).toContain('"status":"unhealthy"');

    const stop = await service.start();
    pendingTransactions.emit([`0x${"1".repeat(64)}`]);
    await telemetry.emitBlock(makeBlock(100n, "a"));

    expect(await readUntil(reader, "event: snapshot")).toContain(
      "event: snapshot"
    );
    expect(await readUntil(reader, '"status":"healthy"')).toContain(
      '"status":"healthy"'
    );
    expect(await repository.getLatest(1)).toMatchObject({
      blockNumber: "100",
      pendingTransactionsPerSecond: 1,
      priceStatus: "fresh",
    });

    clock.advance(180_000);
    await telemetry.emitBlock(makeBlock(101n, "b"));
    await readUntil(reader, "event: snapshot");
    await readUntil(reader, '"status":"degraded"');
    expect(await repository.getLatest(1)).toMatchObject({
      blockNumber: "101",
      priceStatus: "stale",
    });

    await telemetry.emitBlock(makeBlock(101n, "c"));
    await readUntil(reader, "event: snapshot");
    await readUntil(reader, "event: health");
    expect(await repository.getLatest(1)).toMatchObject({
      blockHash: `0x${"c".repeat(64)}`,
    });
    expect(await repository.getHistory({ chainId: 1, limit: 10 })).toHaveLength(2);

    telemetry.emitConnectionStatus(false);
    expect(await readUntil(reader, '"status":"unhealthy"')).toContain(
      '"status":"unhealthy"'
    );

    await stop();
    await reader.cancel();
    sseHub.close();
  });
});
