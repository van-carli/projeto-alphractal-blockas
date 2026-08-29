import { describe, it, expect, afterEach } from "vitest";
import { SseHub } from "./sseHub";
import type { FeeSnapshot } from "@/modules/fees/domain/fee-snapshot";

function makeSnapshot(blockNumber: string): FeeSnapshot {
  return {
    sequence: 1,
    timestamp: new Date().toISOString(),
    chainId: 1,
    blockNumber,
    blockHash: `0x${"a".repeat(64)}`,
    baseFeeGwei: 20,
    gasUsedRatio: 0.5,
    priorityFeeGwei: { slow: 1, standard: 2, fast: 5 },
    ethUsd: 3000,
    priceUpdatedAt: new Date().toISOString(),
    priceStatus: "fresh",
    pendingTransactionsPerSecond: null,
    congestionLevel: "normal",
    estimatedCosts: [
      {
        operation: "ETH transfer",
        gasUnits: 21000,
        slowUsd: 0.9,
        standardUsd: 1.2,
        fastUsd: 1.8,
      },
    ],
  };
}

async function readOneEvent(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const { value } = await reader.read();
  reader.releaseLock();
  return new TextDecoder().decode(value);
}

describe("SseHub", () => {
  let hub: SseHub;

  afterEach(() => {
    hub?.close();
  });

  it("envia snapshot inicial ao conectar", async () => {
    hub = new SseHub(999_999);
    const snapshot = makeSnapshot("100");
    const stream = hub.connect(snapshot);

    const text = await readOneEvent(stream);

    expect(text).toContain("event: snapshot");
    expect(text).toContain('"blockNumber":"100"');
  });

  it("broadcast envia para todos os clientes conectados", async () => {
    hub = new SseHub(999_999);
    const stream1 = hub.connect(null);
    const stream2 = hub.connect(null);

    hub.broadcastSnapshot(makeSnapshot("200"));

    const text1 = await readOneEvent(stream1);
    const text2 = await readOneEvent(stream2);

    expect(text1).toContain('"blockNumber":"200"');
    expect(text2).toContain('"blockNumber":"200"');
  });

  it("rastreia contagem de clientes", () => {
    hub = new SseHub(999_999);
    expect(hub.clientCount()).toBe(0);

    hub.connect(null);
    hub.connect(null);
    expect(hub.clientCount()).toBe(2);
  });

  it("limpa tudo no close", () => {
    hub = new SseHub(999_999);
    hub.connect(null);
    hub.connect(null);

    hub.close();
    expect(hub.clientCount()).toBe(0);
  });
});