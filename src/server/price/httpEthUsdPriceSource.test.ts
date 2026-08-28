import { describe, it, expect, vi } from "vitest";
import { HttpEthUsdPriceSource } from "./httpEthUsdPriceSource";
import { FakeClock } from "../clock";

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

describe("HttpEthUsdPriceSource", () => {
  it("retorna o preço quando a chamada tem sucesso", async () => {
    const clock = new FakeClock(new Date("2026-08-24T10:00:00.000Z"));
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ ethereum: { usd: 3000 } })
    );

    const source = new HttpEthUsdPriceSource({
      apiUrl: "https://api.example.invalid/price",
      clock,
      fetchImpl,
      retryDelayMs: 0,
    });

    const quote = await source.getCurrentPrice();

    expect(quote.price).toBe(3000);
    expect(quote.updatedAt).toEqual(clock.now());
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("tenta novamente em caso de falha, até o limite configurado", async () => {
    const clock = new FakeClock(new Date());
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error("falha 1"))
      .mockRejectedValueOnce(new Error("falha 2"))
      .mockResolvedValueOnce(jsonResponse({ ethereum: { usd: 3100 } }));

    const source = new HttpEthUsdPriceSource({
      apiUrl: "https://api.example.invalid/price",
      clock,
      fetchImpl,
      retryDelayMs: 0,
      maxRetries: 2,
    });

    const quote = await source.getCurrentPrice();

    expect(quote.price).toBe(3100);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("usa o último preço válido quando todas as tentativas falham", async () => {
    const clock = new FakeClock(new Date("2026-08-24T10:00:00.000Z"));
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ ethereum: { usd: 3000 } })
    );

    const source = new HttpEthUsdPriceSource({
      apiUrl: "https://api.example.invalid/price",
      clock,
      fetchImpl,
      retryDelayMs: 0,
      maxRetries: 0,
    });

    // primeira chamada com sucesso, guarda o preço como válido
    const firstQuote = await source.getCurrentPrice();
    expect(firstQuote.price).toBe(3000);

    // segunda chamada falha
    fetchImpl.mockRejectedValueOnce(new Error("fora do ar"));
    const secondQuote = await source.getCurrentPrice();

    // devolve o último preço válido, não lança erro
    expect(secondQuote.price).toBe(3000);
    expect(secondQuote.updatedAt).toEqual(firstQuote.updatedAt);
  });

  it("lança erro quando falha e não há preço anterior em cache", async () => {
    const clock = new FakeClock(new Date());
    const fetchImpl = vi.fn(async () => {
      throw new Error("fora do ar");
    });

    const source = new HttpEthUsdPriceSource({
      apiUrl: "https://api.example.invalid/price",
      clock,
      fetchImpl,
      retryDelayMs: 0,
      maxRetries: 0,
    });

    await expect(source.getCurrentPrice()).rejects.toThrow();
  });
});