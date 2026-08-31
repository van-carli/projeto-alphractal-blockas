import { describe, expect, it } from "vitest";
import { parseHistoryQuery } from "./query";

describe("parseHistoryQuery", () => {
  it("aplica valores padrão e limita o tamanho máximo", () => {
    expect(parseHistoryQuery(new URLSearchParams())).toEqual({
      success: true,
      value: { limit: 50 },
    });
    expect(parseHistoryQuery(new URLSearchParams("limit=9999"))).toEqual({
      success: true,
      value: { limit: 500 },
    });
  });

  it.each(["0", "-1", "2.5", "10abc", ""])(
    "rejeita o limite inválido %j",
    (limit) => {
      const result = parseHistoryQuery(
        new URLSearchParams(`limit=${encodeURIComponent(limit)}`)
      );
      expect(result.success).toBe(false);
    }
  );

  it("converte datas ISO válidas", () => {
    const result = parseHistoryQuery(
      new URLSearchParams(
        "from=2026-08-24T10%3A00%3A00.000Z&to=2026-08-24T11%3A00%3A00.000Z"
      )
    );

    expect(result).toEqual({
      success: true,
      value: {
        limit: 50,
        from: new Date("2026-08-24T10:00:00.000Z"),
        to: new Date("2026-08-24T11:00:00.000Z"),
      },
    });
  });

  it("rejeita datas inválidas e intervalos invertidos", () => {
    expect(
      parseHistoryQuery(new URLSearchParams("from=data-invalida"))
        .success
    ).toBe(false);
    expect(
      parseHistoryQuery(
        new URLSearchParams(
          "from=2026-08-24T12%3A00%3A00.000Z&to=2026-08-24T11%3A00%3A00.000Z"
        )
      ).success
    ).toBe(false);
  });
});
