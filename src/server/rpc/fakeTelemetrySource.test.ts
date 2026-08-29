import { describe, it, expect } from "vitest";
import { FakeTelemetrySource } from "./fakeTelemetrySource";
import type { EthereumBlockTelemetry } from "@/modules/fees/application/ports";

function makeBlock(blockNumber: bigint): EthereumBlockTelemetry {
  return {
    chainId: 1,
    blockNumber,
    blockHash: `0x${"a".repeat(64)}`,
    timestamp: new Date(),
    baseFeePerGas: 20_000_000_000n,
    gasUsed: 15_000_000n,
    gasLimit: 30_000_000n,
  };
}

describe("FakeTelemetrySource", () => {
  it("chama o listener quando um bloco é emitido", async () => {
    const source = new FakeTelemetrySource();
    const received: EthereumBlockTelemetry[] = [];

    await source.subscribeToBlocks((block) => {received.push(block);});
    await source.emitBlock(makeBlock(100n));
    await source.emitBlock(makeBlock(101n));

    expect(received.map((b) => b.blockNumber)).toEqual([100n, 101n]);
  });

  it("para de receber blocos depois do unsubscribe", async () => {
    const source = new FakeTelemetrySource();
    const received: EthereumBlockTelemetry[] = [];

    const unsubscribe = await source.subscribeToBlocks((block) =>
      {received.push(block)}
    );
    await unsubscribe();
    await source.emitBlock(makeBlock(100n));

    expect(received).toEqual([]);
    expect(source.listenerCount()).toBe(0);
  });

  it("suporta múltiplos listeners ao mesmo tempo", async () => {
    const source = new FakeTelemetrySource();
    let countA = 0;
    let countB = 0;

    await source.subscribeToBlocks(() => {
      countA++;
    });
    await source.subscribeToBlocks(() => {
      countB++;
    });
    await source.emitBlock(makeBlock(1n));

    expect(countA).toBe(1);
    expect(countB).toBe(1);
  });
});