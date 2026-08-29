import { describe, it, expect } from "vitest";
import { FakePriorityFeeSource } from "./fakePriorityFeeSource";

describe("FakePriorityFeeSource", () => {
  it("devolve o valor configurado inicialmente", async () => {
    const source = new FakePriorityFeeSource({
      slow: 10,
      standard: 20,
      fast: 30,
    });

    const result = await source.getPriorityFeeGwei(100n);

    expect(result).toEqual({ slow: 10, standard: 20, fast: 30 });
  });

  it("permite trocar o valor com setQuote", async () => {
    const source = new FakePriorityFeeSource({
      slow: 10,
      standard: 20,
      fast: 30,
    });

    source.setQuote({ slow: 5, standard: 15, fast: 25 });
    const result = await source.getPriorityFeeGwei(101n);

    expect(result).toEqual({ slow: 5, standard: 15, fast: 25 });
  });
});