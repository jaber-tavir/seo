import { env } from "@/config/env";

/**
 * Structured JSON server-side logger.
 * Sensitive values (passwords, tokens, API keys, secrets) are redacted.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL = LEVEL_ORDER[env.LOG_LEVEL as LogLevel] ?? LEVEL_ORDER.info;

const REDACT_KEY_PATTERN = /password|passwd|secret|token|authorization|auth|api[-_]?key|key[-_]?hash|cookie|credential/i;
const REDACTED = "[REDACTED]";

function redact(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }

  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: env.isProduction ? undefined : value.stack };
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = REDACT_KEY_PATTERN.test(key) && typeof val === "string" ? REDACTED : redact(val, depth + 1);
    }
    return out;
  }

  return value;
}

function write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (LEVEL_ORDER[level] < MIN_LEVEL) return;
  const entry = {
    time: new Date().toISOString(),
    level,
    message,
    ...(meta ? (redact(meta) as Record<string, unknown>) : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => write("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => write("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write("error", message, meta),
  child(bindings: Record<string, unknown>) {
    return {
      debug: (message: string, meta?: Record<string, unknown>) => write("debug", message, { ...bindings, ...meta }),
      info: (message: string, meta?: Record<string, unknown>) => write("info", message, { ...bindings, ...meta }),
      warn: (message: string, meta?: Record<string, unknown>) => write("warn", message, { ...bindings, ...meta }),
      error: (message: string, meta?: Record<string, unknown>) => write("error", message, { ...bindings, ...meta }),
    };
  },
};
