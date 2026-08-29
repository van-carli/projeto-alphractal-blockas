const SENSITIVE_PATTERNS = [
  /wss?:\/\/[^\s]+/gi,
  /https?:\/\/[^\s]*(?:key|token|secret|password)[^\s]*/gi,
];

function sanitize(message: string): string {
  let clean = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    clean = clean.replace(pattern, "[REDACTED]");
  }
  return clean;
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>): void {
    console.log(sanitize(message), meta ?? "");
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(sanitize(message), meta ?? "");
  },

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(sanitize(message), meta ?? "");
  },
};