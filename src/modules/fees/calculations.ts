import type { CongestionLevel, EstimatedCost } from "./domain/fee-snapshot";

/**
 * Calcula o percentil de uma lista de números.
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower];
  }

  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * A partir de uma lista de fees pagas (em gwei), devolve os três níveis
 * no formato exigido pelo contrato: { slow, standard, fast }.
 */
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

/**
 * Classifica o congestionamento a partir da proporção de gás usado no bloco.
 *
 * ATENÇÃO: os limiares abaixo (0.5 / 0.75 / 0.9) são uma suposição minha,
 * o contrato define os 4 níveis mas não os limiares. Confirme com quem
 * escreveu o schema antes de considerar isso definitivo.
 */
export function calculateCongestion(gasUsedRatio: number): CongestionLevel {
  if (gasUsedRatio < 0.5) return "low";
  if (gasUsedRatio < 0.75) return "normal";
  if (gasUsedRatio < 0.9) return "high";
  return "critical";
}

/**
 * Converte uma fee em gwei para custo em USD.
 */
function gweiCostToUsd(
  gasUnits: number,
  feeGwei: number,
  ethUsdPrice: number
): number {
  const GWEI_TO_ETH = 1e-9;
  const costInEth = gasUnits * feeGwei * GWEI_TO_ETH;
  return roundToCents(costInEth * ethUsdPrice);
}

/**
 * Monta um item de `estimatedCosts` para uma operação específica,
 * calculando o custo em USD para os três níveis de fee (slow/standard/fast).
 *
 * "operation" e "gasUnits" descrevem o tipo de transação (ex: "ETH transfer",
 * 21000 unidades de gás). A lista de operações suportadas ainda precisa
 * ser confirmada com o time, esta função só monta UM item por vez.
 */
export function buildEstimatedCost(
  operation: string,
  gasUnits: number,
  priorityFeeGwei: { slow: number; standard: number; fast: number },
  ethUsdPrice: number
): EstimatedCost {
  return {
    operation,
    gasUnits,
    slowUsd: gweiCostToUsd(gasUnits, priorityFeeGwei.slow, ethUsdPrice),
    standardUsd: gweiCostToUsd(gasUnits, priorityFeeGwei.standard, ethUsdPrice),
    fastUsd: gweiCostToUsd(gasUnits, priorityFeeGwei.fast, ethUsdPrice),
  };
}

/**
 * Arredonda para 2 casas decimais.
 */
export function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}