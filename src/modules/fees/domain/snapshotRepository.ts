import type { FeeSnapshot } from "@/modules/fees";

/**
 * Guarda o estado das fees em memória: o snapshot mais recente
 * e um histórico limitado (fila circular), sem duplicar blocos.
 */
export class InMemorySnapshotRepository {
  private current: FeeSnapshot | null = null;
  private history: FeeSnapshot[] = [];
  private readonly maxHistorySize: number;

  private readonly seenBlockNumbers = new Set<string>();

  constructor(maxHistorySize: number) {
    if (maxHistorySize <= 0) {
      throw new Error("maxHistorySize deve ser maior que zero");
    }
    this.maxHistorySize = maxHistorySize;
  }

  save(snapshot: FeeSnapshot): void {
    if (this.seenBlockNumbers.has(snapshot.blockNumber)) {
      return;
    }

    this.current = snapshot;
    this.history.push(snapshot);
    this.seenBlockNumbers.add(snapshot.blockNumber);

    if (this.history.length > this.maxHistorySize) {
      const removed = this.history.shift();
      if (removed) {
        this.seenBlockNumbers.delete(removed.blockNumber);
      }
    }
  }

  getCurrent(): FeeSnapshot | null {
    return this.current;
  }

  getHistory(limit: number): FeeSnapshot[] {
    if (limit <= 0) {
      return [];
    }
    return this.history.slice(-limit);
  }

  size(): number {
    return this.history.length;
  }
}