import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { FeeSnapshot, TelemetryHealth } from "@/modules/fees";
import { InMemorySnapshotRepository } from "@/modules/fees/domain/snapshotRepository";
import { SseHub } from "@/server/sse/sseHub";

const runtimeState = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("@/server/application-runtime", () => ({
  getRuntime: () => runtimeState.current,
}));

import { GET as getSnapshot } from "./fees/snapshot/route";
import { GET as getHistory } from "./fees/history/route";
import { GET as getStream } from "./fees/stream/route";
import { GET as getHealth } from "./health/route";

function makeSnapshot(blockNumber: string, sequence: number): FeeSnapshot {
  return {
    sequence,
    timestamp: `2026-08-24T10:00:0${sequence}.000Z`,
    chainId: 1,
    blockNumber,
    blockHash: `0x${BigInt(blockNumber).toString(16).padStart(64, "0")}`,
    baseFeeGwei: 10,
    gasUsedRatio: 0.6,
    priorityFeeGwei: { slow: 1, standard: 2, fast: 5 },
    ethUsd: 3000,
    priceUpdatedAt: "2026-08-24T10:00:00.000Z",
    priceStatus: "fresh",
    pendingTransactionsPerSecond: 10,
    congestionLevel: "normal",
    estimatedCosts: [],
  };
}

const health: TelemetryHealth = {
  status: "healthy",
  rpcConnected: true,
  lastBlock: "101",
  lastBlockAt: "2026-08-24T10:00:01.000Z",
  priceUpdatedAt: "2026-08-24T10:00:00.000Z",
  priceStatus: "fresh",
  sseClients: 0,
};

async function createRuntime() {
  const repository = new InMemorySnapshotRepository(10);
  await repository.save(makeSnapshot("100", 0));
  await repository.save(makeSnapshot("101", 1));
  const sseHub = new SseHub(999_999);
  return {
    repository,
    sseHub,
    feeService: { getHealth: () => health },
    chainId: 1,
  };
}

describe("Route Handlers de telemetria", () => {
  beforeEach(() => {
    runtimeState.current = null;
  });

  it("retorna 503 antes da inicialização", async () => {
    const response = await getSnapshot();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: "UNAVAILABLE" },
    });
  });

  it("entrega snapshot e histórico limitado", async () => {
    runtimeState.current = await createRuntime();

    const snapshotResponse = await getSnapshot();
    expect(snapshotResponse.status).toBe(200);
    expect(await snapshotResponse.json()).toMatchObject({ blockNumber: "101" });

    const historyResponse = await getHistory(
      new NextRequest("http://localhost/api/fees/history?limit=1")
    );
    expect(historyResponse.status).toBe(200);
    expect(await historyResponse.json()).toMatchObject([
      { blockNumber: "101" },
    ]);
  });

  it("rejeita filtros de histórico inválidos", async () => {
    runtimeState.current = await createRuntime();
    const response = await getHistory(
      new NextRequest("http://localhost/api/fees/history?from=invalida")
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "BAD_REQUEST" },
    });
  });

  it("entrega o estado de saúde", async () => {
    runtimeState.current = await createRuntime();
    const response = await getHealth();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(health);
  });

  it("abre o stream e remove o cliente quando a requisição encerra", async () => {
    const runtime = await createRuntime();
    runtimeState.current = runtime;
    const requestController = new AbortController();
    const response = await getStream(
      new Request("http://localhost/api/fees/stream", {
        signal: requestController.signal,
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/event-stream; charset=utf-8"
    );
    const reader = response.body!.getReader();
    const initialText = new TextDecoder().decode((await reader.read()).value);
    expect(initialText).toContain("retry: 3000");
    expect(initialText).toContain("event: snapshot");
    expect(initialText).toContain("event: health");

    requestController.abort();
    await Promise.resolve();
    expect(runtime.sseHub.clientCount()).toBe(0);
    runtime.sseHub.close();
  });
});
