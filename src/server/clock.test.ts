import { describe, it, expect } from "vitest";
import { FakeClock } from "./clock";

describe("FakeClock", () => {
  it("começa na data inicial fornecida", () => {
    const clock = new FakeClock(new Date("2026-08-24T10:00:00.000Z"));
    expect(clock.now().toISOString()).toBe("2026-08-24T10:00:00.000Z");
  });

  it("avança o tempo quando pedido", () => {
    const clock = new FakeClock(new Date("2026-08-24T10:00:00.000Z"));
    clock.advance(5 * 60 * 1000);

    expect(clock.now().toISOString()).toBe("2026-08-24T10:05:00.000Z");
  });

  it("não avança sozinho", () => {
    const clock = new FakeClock(new Date("2026-08-24T10:00:00.000Z"));
    const first = clock.now().getTime();
    const second = clock.now().getTime();

    expect(first).toBe(second);
  });
});