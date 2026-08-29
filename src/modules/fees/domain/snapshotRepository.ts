import type { FeeSnapshot } from "./fee-snapshot";
import type {
  SnapshotRepository,
  SnapshotHistoryQuery,
} from "../application/ports";

export class InMemorySnapshotRepository implements SnapshotRepository {
  private history: FeeSnapshot[] = [];
  private readonly latestByChain = new Map<number, FeeSnapshot>();
  private readonly seenKeys = new Set<string>();
  private readonly maxHistorySize: number;

  constructor(maxHistorySize: number) {
    if (maxHistorySize <= 0) {
      throw new Error("maxHistorySize deve ser maior que zero");
    }
    this.maxHistorySize = maxHistorySize;
  }

  private keyFor(snapshot: FeeSnapshot): string {
    return `${snapshot.chainId}:${snapshot.blockNumber}`;
  }

  async save(snapshot: FeeSnapshot): Promise<void> {
    const key = this.keyFor(snapshot);
    if (this.seenKeys.has(key)) {
      return;
    }

    this.history.push(snapshot);
    this.seenKeys.add(key);
    this.latestByChain.set(snapshot.chainId, snapshot);

    if (this.history.length > this.maxHistorySize) {
      const removed = this.history.shift();
      if (removed) {
        this.seenKeys.delete(this.keyFor(removed));
      }
    }
  }

  async getLatest(chainId: number): Promise<FeeSnapshot | null> {
    return this.latestByChain.get(chainId) ?? null;
  }

  async getHistory(
    query: SnapshotHistoryQuery
  ): Promise<readonly FeeSnapshot[]> {
    if (query.limit <= 0) {
      return [];
    }

    let items = this.history.filter((s) => s.chainId === query.chainId);

    if (query.from) {
      const fromTime = query.from.getTime();
      items = items.filter((s) => new Date(s.timestamp).getTime() >= fromTime);
    }

    if (query.to) {
      const toTime = query.to.getTime();
      items = items.filter((s) => new Date(s.timestamp).getTime() <= toTime);
    }

    return items.slice(-query.limit);
  }

  size(): number {
    return this.history.length;
  }
}