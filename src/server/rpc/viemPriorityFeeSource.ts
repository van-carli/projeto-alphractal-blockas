import type { PublicClient } from "viem";
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
  constructor(private readonly client: PublicClient) {}

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
