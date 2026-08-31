import type {
  PendingTransactionSource,
  Unsubscribe,
} from "@/modules/fees/application/ports";

type PendingTransactionListener = (
  hashes: readonly `0x${string}`[]
) => void;

export class FakePendingTransactionSource implements PendingTransactionSource {
  private listeners: PendingTransactionListener[] = [];

  async subscribeToPendingTransactions(
    listener: PendingTransactionListener
  ): Promise<Unsubscribe> {
    this.listeners.push(listener);

    return () => {
      this.listeners = this.listeners.filter(
        (candidate) => candidate !== listener
      );
    };
  }

  emit(hashes: readonly `0x${string}`[]): void {
    for (const listener of this.listeners) {
      listener(hashes);
    }
  }
}
