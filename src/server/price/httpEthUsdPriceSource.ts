import { z } from "zod";
import type {
  EthUsdPriceSource,
  EthUsdQuote,
  Clock,
} from "@/modules/fees/application/ports";

const CoinGeckoResponseSchema = z.object({
  ethereum: z.object({
    usd: z.number().positive(),
  }),
});

export type HttpEthUsdPriceSourceOptions = Readonly<{
  apiUrl: string;
  clock: Clock;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  fetchImpl?: typeof fetch;
}>;

export class HttpEthUsdPriceSource implements EthUsdPriceSource {
  private readonly apiUrl: string;
  private readonly clock: Clock;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly fetchImpl: typeof fetch;

  // guarda o último preço que deu certo, para usar como fallback
  private lastValidQuote: EthUsdQuote | null = null;

  constructor(options: HttpEthUsdPriceSourceOptions) {
    this.apiUrl = options.apiUrl;
    this.clock = options.clock;
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.maxRetries = options.maxRetries ?? 2;
    this.retryDelayMs = options.retryDelayMs ?? 500;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getCurrentPrice(): Promise<EthUsdQuote> {
    // tenta a chamada até maxRetries + 1 vezes no total
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const quote = await this.fetchOnce();
        this.lastValidQuote = quote;
        return quote;
      } catch {
        const isLastAttempt = attempt === this.maxRetries;
        if (!isLastAttempt) {
          await delay(this.retryDelayMs);
        }
      }
    }

    // todas as tentativas falharam: usa o último preço válido, se existir
    if (this.lastValidQuote) {
      return this.lastValidQuote;
    }

    // nunca conseguimos um preço válido, não há o que devolver
    throw new Error(
      "Não foi possível obter o preço de ETH/USD e não há preço anterior em cache"
    );
  }

  private async fetchOnce(): Promise<EthUsdQuote> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = `${this.apiUrl}?ids=ethereum&vs_currencies=usd`;
      const response = await this.fetchImpl(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`resposta HTTP inesperada: ${response.status}`);
      }

      const json = await response.json();
      const parsed = CoinGeckoResponseSchema.parse(json);

      return {
        price: parsed.ethereum.usd,
        updatedAt: this.clock.now(),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}