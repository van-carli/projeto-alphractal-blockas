import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("oculta URLs WebSocket e credenciais presentes nos metadados", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.error("falha no provedor", {
      endpoint: "wss://eth.example/v2/credencial-real",
      apiKey: "credencial-real",
      nested: { token: "token-real" },
    });

    const loggedMetadata = error.mock.calls[0][1];
    expect(JSON.stringify(loggedMetadata)).not.toContain("credencial-real");
    expect(JSON.stringify(loggedMetadata)).not.toContain("token-real");
    expect(loggedMetadata).toEqual({
      endpoint: "[REDACTED]",
      apiKey: "[REDACTED]",
      nested: { token: "[REDACTED]" },
    });
  });
});
