import { createPublicClient, webSocket, type PublicClient } from "viem";
import { mainnet } from "viem/chains";
import type {
  EthereumTelemetrySource,
  EthereumBlockTelemetry,
  Unsubscribe,
} from "@/modules/fees/application/ports";

export class ViemBlockSource implements EthereumTelemetrySource {
  private client: PublicClient | null = null;

  constructor(private readonly rpcWebSocketUrl: string) {}

  async subscribeToBlocks(
    listener: (block: EthereumBlockTelemetry) => void | Promise<void>
  ): Promise<Unsubscribe> {
    if (this.client) {
      throw new Error(
        "ViemBlockSource já está inscrito. Chame o unsubscribe anterior antes de assinar de novo."
      );
    }

    this.client = createPublicClient({
      chain: mainnet,
      transport: webSocket(this.rpcWebSocketUrl),
    });

    const chainId = await this.client.getChainId();

    const unwatch = this.client.watchBlocks({
      onBlock: async (block) => {
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
      onError: () => {
        console.error("[rpc] erro na conexão de blocos");
      },
    });

    return async () => {
      unwatch();
      this.client = null;
    };
  }
}