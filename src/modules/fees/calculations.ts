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
    slow: percentile(feesGwei, 25),
    standard: percentile(feesGwei, 50),
    fast: percentile(feesGwei, 90),
  };
}

export type CongestionSignals = Readonly<{
  gasUsedRatio: number;
  pendingTransactionsPerSecond: number;
  standardFeeChangeRatio: number;
}>;

const CONGESTION_LEVELS: readonly CongestionLevel[] = [
  "low",
  "normal",
  "high",
  "critical",
];

export function calculateCongestion(signals: CongestionSignals): CongestionLevel {
  const gasSeverity = severityFor(signals.gasUsedRatio, [0.5, 0.75, 0.9]);
  const pendingSeverity = severityFor(
    signals.pendingTransactionsPerSecond,
    [10, 50, 100]
  );
  const feeSeverity = severityFor(
    Math.max(0, signals.standardFeeChangeRatio),
    [0.1, 0.25, 0.5]
  );

  return CONGESTION_LEVELS[Math.max(gasSeverity, pendingSeverity, feeSeverity)];
}

function severityFor(value: number, thresholds: readonly number[]): number {
  if (value < thresholds[0]) return 0;
  if (value < thresholds[1]) return 1;
  if (value < thresholds[2]) return 2;
  return 3;
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
