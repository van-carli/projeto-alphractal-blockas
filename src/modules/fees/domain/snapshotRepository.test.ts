import { describe, it, expect } from "vitest";
import { InMemorySnapshotRepository } from "./snapshotRepository";
import type { FeeSnapshot } from "@/modules/fees";

function makeSnapshot(blockNumber: string, sequence: number): FeeSnapshot {
  return {
    sequence,
    timestamp: new Date().toISOString(),
    chainId: 1,
    blockNumber,
    blockHash: `0x${"a".repeat(64)}`,
    baseFeeGwei: 20,
    gasUsedRatio: 0.5,
    priorityFeeGwei: { slow: 15, standard: 20, fast: 30 },
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

describe("InMemorySnapshotRepository", () => {
  it("começa sem snapshot atual", () => {
    const repo = new InMemorySnapshotRepository(10);
    expect(repo.getCurrent()).toBeNull();
  });

  it("guarda o snapshot mais recente", () => {
    const repo = new InMemorySnapshotRepository(10);
    repo.save(makeSnapshot("1", 1));
    repo.save(makeSnapshot("2", 2));

    expect(repo.getCurrent()?.blockNumber).toBe("2");
  });

  it("não duplica o mesmo bloco", () => {
    const repo = new InMemorySnapshotRepository(10);
    repo.save(makeSnapshot("1", 1));
    repo.save(makeSnapshot("1", 1));

    expect(repo.size()).toBe(1);
  });

  it("respeita o limite máximo do histórico", () => {
    const repo = new InMemorySnapshotRepository(3);

    repo.save(makeSnapshot("1", 1));
    repo.save(makeSnapshot("2", 2));
    repo.save(makeSnapshot("3", 3));
    repo.save(makeSnapshot("4", 4));

    expect(repo.size()).toBe(3);
    expect(repo.getHistory(10).map((s) => s.blockNumber)).toEqual([
      "2",
      "3",
      "4",
    ]);
  });

  it("getHistory respeita o limite pedido", () => {
    const repo = new InMemorySnapshotRepository(10);
    repo.save(makeSnapshot("1", 1));
    repo.save(makeSnapshot("2", 2));
    repo.save(makeSnapshot("3", 3));

    expect(repo.getHistory(2).map((s) => s.blockNumber)).toEqual(["2", "3"]);
  });

  it("getHistory com limite 0 devolve lista vazia", () => {
    const repo = new InMemorySnapshotRepository(10);
    repo.save(makeSnapshot("1", 1));

    expect(repo.getHistory(0)).toEqual([]);
  });
});