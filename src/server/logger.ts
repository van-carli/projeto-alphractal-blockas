const SENSITIVE_PATTERNS = [
  /wss?:\/\/[^\s]+/gi,
  /https?:\/\/[^\s]*(?:key|token|secret|password)[^\s]*/gi,
];
const SENSITIVE_KEY_PATTERN = /(?:api[-_]?key|token|secret|password|authorization)/i;

function sanitize(message: string): string {
  let clean = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    clean = clean.replace(pattern, "[REDACTED]");
  }
  return clean;
}

function sanitizeMetadata(
  meta: Record<string, unknown>
): Record<string, unknown> {
  return sanitizeObject(meta, new WeakSet<object>());
}

function sanitizeObject(
  value: Record<string, unknown>,
  seen: WeakSet<object>
): Record<string, unknown> {
  if (seen.has(value)) return { circular: "[REDACTED]" };
  seen.add(value);

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key)
        ? "[REDACTED]"
        : sanitizeValue(entry, seen),
    ])
  );
}

function sanitizeValue(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === "string") return sanitize(value);
  if (value instanceof Error) {
    return { name: value.name, message: sanitize(value.message) };
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry, seen));
  }
  if (value && typeof value === "object") {
    return sanitizeObject(value as Record<string, unknown>, seen);
  }
  return value;
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>): void {
    console.log(sanitize(message), meta ? sanitizeMetadata(meta) : "");
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(sanitize(message), meta ? sanitizeMetadata(meta) : "");
  },

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(sanitize(message), meta ? sanitizeMetadata(meta) : "");
  },
};
