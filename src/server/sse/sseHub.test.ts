import { describe, it, expect, afterEach, vi } from "vitest";
import { SseHub } from "./sseHub";
import type { FeeSnapshot } from "@/modules/fees/domain/fee-snapshot";
import type { TelemetryHealth } from "@/modules/fees/domain/telemetry-health";

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

function makeHealth(): TelemetryHealth {
  return {
    status: "healthy",
    rpcConnected: true,
    lastBlock: "100",
    lastBlockAt: "2026-08-24T10:00:00.000Z",
    priceUpdatedAt: "2026-08-24T10:00:00.000Z",
    priceStatus: "fresh",
    sseClients: 1,
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
    vi.useRealTimers();
  });

  it("envia retry, snapshot e health iniciais ao conectar", async () => {
    hub = new SseHub(999_999);
    const snapshot = makeSnapshot("100");
    const stream = hub.connect(snapshot, makeHealth());

    const text = await readOneEvent(stream);

    expect(text).toContain("retry: 3000");
    expect(text).toContain("event: snapshot");
    expect(text).toContain("id: 1");
    expect(text).toContain('"blockNumber":"100"');
    expect(text).toContain("event: health");
    expect(text).toContain('"status":"healthy"');
  });

  it("broadcast envia para todos os clientes conectados", async () => {
    hub = new SseHub(999_999);
    const stream1 = hub.connect(null);
    const stream2 = hub.connect(null);
    await readOneEvent(stream1);
    await readOneEvent(stream2);

    hub.broadcastSnapshot(makeSnapshot("200"));

    const text1 = await readOneEvent(stream1);
    const text2 = await readOneEvent(stream2);

    expect(text1).toContain('"blockNumber":"200"');
    expect(text2).toContain('"blockNumber":"200"');
  });

  it("remove o cliente quando a requisição é abortada", async () => {
    hub = new SseHub(999_999);
    const request = new AbortController();
    hub.connect(null, null, request.signal);

    expect(hub.clientCount()).toBe(1);
    request.abort();
    await Promise.resolve();
    expect(hub.clientCount()).toBe(0);
  });

  it("envia heartbeat no intervalo configurado", async () => {
    vi.useFakeTimers();
    hub = new SseHub(15_000);
    const stream = hub.connect(null);
    const reader = stream.getReader();
    await reader.read();

    const heartbeat = reader.read();
    await vi.advanceTimersByTimeAsync(15_000);

    expect(new TextDecoder().decode((await heartbeat).value)).toBe(
      ": keep-alive\n\n"
    );
    reader.releaseLock();
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
