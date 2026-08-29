import { describe, it, expect } from "vitest";
import { InMemorySnapshotRepository } from "./snapshotRepository";
import type { FeeSnapshot } from "./fee-snapshot";

function makeSnapshot(
  blockNumber: string,
  sequence: number,
  chainId = 1,
  timestamp = new Date().toISOString()
): FeeSnapshot {
  return {
    sequence,
    timestamp,
    chainId,
    blockNumber,
    blockHash: `0x${"a".repeat(64)}`,
    baseFeeGwei: 20,
    gasUsedRatio: 0.5,
    priorityFeeGwei: { slow: 15, standard: 20, fast: 30 },
    ethUsd: 3000,
    priceUpdatedAt: timestamp,
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
  it("começa sem snapshot mais recente", async () => {
    const repo = new InMemorySnapshotRepository(10);
    expect(await repo.getLatest(1)).toBeNull();
  });

  it("guarda o snapshot mais recente por chain", async () => {
    const repo = new InMemorySnapshotRepository(10);
    await repo.save(makeSnapshot("1", 1, 1));
    await repo.save(makeSnapshot("2", 2, 1));
    await repo.save(makeSnapshot("1", 1, 137));

    expect((await repo.getLatest(1))?.blockNumber).toBe("2");
    expect((await repo.getLatest(137))?.blockNumber).toBe("1");
  });

  it("não duplica o mesmo bloco na mesma chain", async () => {
    const repo = new InMemorySnapshotRepository(10);
    await repo.save(makeSnapshot("1", 1));
    await repo.save(makeSnapshot("1", 1));

    expect(repo.size()).toBe(1);
  });

  it("respeita o limite máximo do histórico", async () => {
    const repo = new InMemorySnapshotRepository(3);
    await repo.save(makeSnapshot("1", 1));
    await repo.save(makeSnapshot("2", 2));
    await repo.save(makeSnapshot("3", 3));
    await repo.save(makeSnapshot("4", 4));

    expect(repo.size()).toBe(3);
  });

  it("getHistory filtra por chainId e respeita o limite", async () => {
    const repo = new InMemorySnapshotRepository(10);
    await repo.save(makeSnapshot("1", 1, 1));
    await repo.save(makeSnapshot("2", 2, 1));
    await repo.save(makeSnapshot("1", 1, 137));

    const history = await repo.getHistory({ chainId: 1, limit: 10 });
    expect(history.map((s) => s.blockNumber)).toEqual(["1", "2"]);
  });

  it("getHistory filtra por intervalo de datas", async () => {
    const repo = new InMemorySnapshotRepository(10);
    await repo.save(makeSnapshot("1", 1, 1, "2026-08-24T10:00:00.000Z"));
    await repo.save(makeSnapshot("2", 2, 1, "2026-08-24T11:00:00.000Z"));
    await repo.save(makeSnapshot("3", 3, 1, "2026-08-24T12:00:00.000Z"));

    const history = await repo.getHistory({
      chainId: 1,
      from: new Date("2026-08-24T10:30:00.000Z"),
      limit: 10,
    });

    expect(history.map((s) => s.blockNumber)).toEqual(["2", "3"]);
  });
});