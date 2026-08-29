import { describe, it, expect } from "vitest";
import {
  percentile,
  calculateFeeTiers,
  calculateCongestion,
  buildEstimatedCost,
  roundToCents,
} from "./calculations";

describe("percentile", () => {
  it("calcula a mediana corretamente", () => {
    expect(percentile([10, 20, 30, 40, 50], 50)).toBe(30);
  });

  it("retorna 0 para lista vazia", () => {
    expect(percentile([], 50)).toBe(0);
  });

  it("retorna o próprio valor quando só há um elemento", () => {
    expect(percentile([42], 50)).toBe(42);
  });
});

describe("calculateFeeTiers", () => {
  it("devolve slow, standard e fast em ordem crescente", () => {
    const fees = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
    const result = calculateFeeTiers(fees);
    expect(result.slow).toBeLessThan(result.standard);
    expect(result.standard).toBeLessThan(result.fast);
  });
});

describe("calculateCongestion", () => {
  it("classifica como low", () => expect(calculateCongestion(0.3)).toBe("low"));
  it("classifica como normal", () => expect(calculateCongestion(0.6)).toBe("normal"));
  it("classifica como high", () => expect(calculateCongestion(0.8)).toBe("high"));
  it("classifica como critical", () => expect(calculateCongestion(0.95)).toBe("critical"));
});

describe("buildEstimatedCost", () => {
  it("calcula custos somando baseFee + priorityFee", () => {
    // baseFee 10 gwei + priority slow 5 = 15 gwei total
    // 21000 * 15 * 1e-9 = 0.000315 ETH * 3000 USD = 0.95
    const result = buildEstimatedCost(
      "ETH transfer",
      21000,
      10,
      { slow: 5, standard: 10, fast: 20 },
      3000
    );

    expect(result.operation).toBe("ETH transfer");
    expect(result.slowUsd).toBe(0.95);
    expect(result.standardUsd).toBe(1.26);
    expect(result.fastUsd).toBe(1.89);
  });
});

describe("roundToCents", () => {
  it("arredonda para duas casas decimais", () => {
    expect(roundToCents(1.2345)).toBe(1.23);
  });
});