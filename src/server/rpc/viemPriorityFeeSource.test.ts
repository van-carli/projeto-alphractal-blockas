import { describe, expect, it, vi } from "vitest";
import type { PublicClient } from "viem";
import { ViemPriorityFeeSource } from "./viemPriorityFeeSource";

describe("ViemPriorityFeeSource", () => {
  it("consulta os percentis p25, p50 e p90 do bloco", async () => {
    const getFeeHistory = vi.fn().mockResolvedValue({
      reward: [[1_000_000_000n, 2_000_000_000n, 5_000_000_000n]],
    });
    const source = new ViemPriorityFeeSource({
      getFeeHistory,
    } as unknown as PublicClient);

    await expect(source.getPriorityFeeGwei(100n)).resolves.toEqual({
      slow: 1,
      standard: 2,
      fast: 5,
    });
    expect(getFeeHistory).toHaveBeenCalledWith({
      blockCount: 1,
      rewardPercentiles: [25, 50, 90],
      blockNumber: 100n,
    });
  });
});
