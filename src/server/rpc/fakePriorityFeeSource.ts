import type {
  PriorityFeeSource,
  PriorityFeeGwei,
} from "@/modules/fees/application/ports";

/**
 * Implementação falsa de PriorityFeeSource, usada só em testes.
 * Devolve um valor fixo configurável, sem chamar RPC nenhum.
 */
export class FakePriorityFeeSource implements PriorityFeeSource {
  constructor(private quote: PriorityFeeGwei) {}

async getPriorityFeeGwei(_blockNumber: bigint): Promise<PriorityFeeGwei> {    return this.quote;
  
}

  /** Permite trocar o valor devolvido em um teste específico. */
  setQuote(quote: PriorityFeeGwei): void {
    this.quote = quote;
  }
}