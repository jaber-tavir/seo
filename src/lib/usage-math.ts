/**
 * Pure usage-limit math (unit-testable, no database access).
 * Used by UsageService.
 */

export interface UsagePeriod {
  period_start: Date;
  period_end: Date;
}

/** Current monthly billing/usage period (UTC month boundaries) */
export function resolveCurrentPeriod(now: Date = new Date()): UsagePeriod {
  const period_start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const period_end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { period_start, period_end };
}

export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

export function isWithinLimit(limit: number, used: number, requested: number): boolean {
  if (isUnlimited(limit)) return true;
  return used + requested <= limit;
}

/** null = unlimited */
export function remainingUsage(limit: number, used: number): number | null {
  if (isUnlimited(limit)) return null;
  return Math.max(0, limit - used);
}

/** null = unlimited */
export function usagePercent(limit: number, used: number): number | null {
  if (isUnlimited(limit)) return null;
  if (limit <= 0) return used > 0 ? 100 : 0;
  return Math.min(100, Math.round((used / limit) * 100));
}
