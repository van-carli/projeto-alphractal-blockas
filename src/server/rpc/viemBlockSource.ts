import type { PublicClient } from "viem";
import type {
  EthereumTelemetrySource,
  EthereumBlockTelemetry,
  EthereumConnectionListener,
  Unsubscribe,
} from "@/modules/fees/application/ports";
import { logger } from "@/server/logger";

export class ViemBlockSource implements EthereumTelemetrySource {
  private unwatch: (() => void) | null = null;

  constructor(private readonly client: PublicClient) {}

  async subscribeToBlocks(
    listener: (block: EthereumBlockTelemetry) => void | Promise<void>,
    connectionListener?: EthereumConnectionListener
  ): Promise<Unsubscribe> {
    if (this.unwatch) {
      throw new Error(
        "ViemBlockSource já está inscrito. Chame o unsubscribe anterior antes de assinar de novo."
      );
    }

    const chainId = await this.client.getChainId();
    connectionListener?.(true);

    this.unwatch = this.client.watchBlocks({
      onBlock: async (block) => {
        connectionListener?.(true);
        if (block.number === null || block.hash === null) {
          return;
        }

        const telemetry: EthereumBlockTelemetry = {
          chainId,
          blockNumber: block.number,
          blockHash: block.hash,
          timestamp: new Date(Number(block.timestamp) * 1000),
          baseFeePerGas: block.baseFeePerGas ?? 0n,
          gasUsed: block.gasUsed,
          gasLimit: block.gasLimit,
        };

        await listener(telemetry);
      },
      onError: (error) => {
        connectionListener?.(false);
        logger.error("[rpc] erro na conexão de blocos", {
          error: error instanceof Error ? error.message : "desconhecido",
        });
      },
    });

    return async () => {
      this.unwatch?.();
      this.unwatch = null;
      connectionListener?.(false);
    };
  }
}
