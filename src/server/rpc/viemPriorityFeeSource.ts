import { createPublicClient, webSocket, type PublicClient } from "viem";
import { mainnet } from "viem/chains";
import type {
  PriorityFeeSource,
  PriorityFeeGwei,
} from "@/modules/fees/application/ports";

const WEI_PER_GWEI = 1e9;

/**
 * Reaproveita o mesmo client viem para consultar getFeeHistory,
 * que devolve, por bloco, os valores de prioridade pagos nos
 * percentis pedidos (10 = lenta, 50 = padrão, 90 = rápida).
 */
export class ViemPriorityFeeSource implements PriorityFeeSource {
  private client: PublicClient;

  constructor(rpcWebSocketUrl: string) {
    this.client = createPublicClient({
      chain: mainnet,
      transport: webSocket(rpcWebSocketUrl),
    });
  }

  async getPriorityFeeGwei(blockNumber: bigint): Promise<PriorityFeeGwei> {
    const feeHistory = await this.client.getFeeHistory({
      blockCount: 1,
      rewardPercentiles: [10, 50, 90],
      blockNumber,
    });

    const rewards = feeHistory.reward?.[0] ?? [0n, 0n, 0n];

    return {
      slow: Number(rewards[0]) / WEI_PER_GWEI,
      standard: Number(rewards[1]) / WEI_PER_GWEI,
      fast: Number(rewards[2]) / WEI_PER_GWEI,
    };
  }
}