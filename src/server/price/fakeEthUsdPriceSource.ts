import type {
  EthUsdPriceSource,
  EthUsdQuote,
} from "@/modules/fees/application/ports";

/**
 * Implementação falsa de EthUsdPriceSource, usada só em testes.
 * Permite controlar manualmente o preço devolvido e simular falhas.
 */
export class FakeEthUsdPriceSource implements EthUsdPriceSource {
  private quote: EthUsdQuote;
  private shouldFail = false;

  constructor(initial: EthUsdQuote) {
    this.quote = initial;
  }

  async getCurrentPrice(): Promise<EthUsdQuote> {
    if (this.shouldFail) {
      throw new Error("falha simulada de preço");
    }
    return this.quote;
  }

  /** Define o preço que será devolvido nas próximas chamadas. */
  setQuote(quote: EthUsdQuote): void {
    this.quote = quote;
  }

  /** Liga/desliga simulação de falha, útil para testar cenários de degradação. */
  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }
}