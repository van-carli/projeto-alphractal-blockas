import type { CongestionLevel, EstimatedCost } from "./domain/fee-snapshot";

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function calculateFeeTiers(feesGwei: number[]): {
  slow: number;
  standard: number;
  fast: number;
} {
  return {
    slow: percentile(feesGwei, 10),
    standard: percentile(feesGwei, 50),
    fast: percentile(feesGwei, 90),
  };
}

export function calculateCongestion(gasUsedRatio: number): CongestionLevel {
  if (gasUsedRatio <= 0.5) return "low";
  if (gasUsedRatio < 0.75) return "normal";
  if (gasUsedRatio < 0.9) return "high";
  return "critical";
}

function gweiCostToUsd(
  gasUnits: number,
  totalFeeGwei: number,
  ethUsdPrice: number
): number {
  const GWEI_TO_ETH = 1e-9;
  return roundToCents(gasUnits * totalFeeGwei * GWEI_TO_ETH * ethUsdPrice);
}

/**
 * Calcula os custos em USD para uma operação.
 * O custo total por unidade de gás = baseFeeGwei + priorityFeeGwei de cada tier.
 */
export function buildEstimatedCost(
  operation: string,
  gasUnits: number,
  baseFeeGwei: number,
  priorityFeeGwei: { slow: number; standard: number; fast: number },
  ethUsdPrice: number
): EstimatedCost {
  return {
    operation,
    gasUnits,
    slowUsd: gweiCostToUsd(gasUnits, baseFeeGwei + priorityFeeGwei.slow, ethUsdPrice),
    standardUsd: gweiCostToUsd(gasUnits, baseFeeGwei + priorityFeeGwei.standard, ethUsdPrice),
    fastUsd: gweiCostToUsd(gasUnits, baseFeeGwei + priorityFeeGwei.fast, ethUsdPrice),
  };
}

export function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}