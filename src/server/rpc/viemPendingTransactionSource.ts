import type { PublicClient } from "viem";
import type {
  PendingTransactionSource,
  Unsubscribe,
} from "@/modules/fees/application/ports";
import { logger } from "@/server/logger";

export class ViemPendingTransactionSource
  implements PendingTransactionSource
{
  private unwatch: (() => void) | null = null;

  constructor(private readonly client: PublicClient) {}

  async subscribeToPendingTransactions(
    listener: (hashes: readonly `0x${string}`[]) => void
  ): Promise<Unsubscribe> {
    if (this.unwatch) {
      throw new Error("ViemPendingTransactionSource já está inscrito");
    }

    this.unwatch = this.client.watchPendingTransactions({
      batch: true,
      onTransactions: listener,
      onError: (error) => {
        logger.warn("[rpc] telemetria de transações pendentes indisponível", {
          error: error.message,
        });
      },
    });

    return () => {
      this.unwatch?.();
      this.unwatch = null;
    };
  }
}
