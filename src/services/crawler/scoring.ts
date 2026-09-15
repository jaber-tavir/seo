import { createHash } from "node:crypto";
import type { SeoCheck } from "./analyzer";
import type { ExtractedPage } from "./extractor";

/**
 * SEO scoring.
 *
 * Deterministic, explainable 0-100 score derived from the analyzer findings.
 * Starts at 100 and subtracts a weight per (severity, type) pair:
 *   critical error  -25 | high -10 | medium -4 | low -1
 *   warnings count at half weight, notices at quarter weight.
 * Duplicate titles/descriptions (site-wide, computed by the audit service)
 * deduct an extra -5 each, capped.
 */

const SEVERITY_WEIGHT: Record<SeoCheck["severity"], number> = {
  critical: 25,
  high: 10,
  medium: 4,
  low: 1,
};

const TYPE_FACTOR: Record<SeoCheck["type"], number> = {
  error: 1,
  warning: 0.5,
  notice: 0.25,
};

export interface PageScoreInput {
  checks: SeoCheck[];
  indexable: boolean;
}

export function scorePage(input: PageScoreInput): number {
  let score = 100;
  for (const check of input.checks) {
    score -= SEVERITY_WEIGHT[check.severity] * TYPE_FACTOR[check.type];
  }
  if (!input.indexable) score = Math.min(score, 40);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export interface SiteScoreInput {
  pageScores: number[];
  pagesTotal: number;
  errors: number;
  warnings: number;
}

export function scoreSite(input: SiteScoreInput): { score: number; healthScore: number } {
  if (input.pageScores.length === 0) return { score: 0, healthScore: 0 };
  const avg = input.pageScores.reduce((a, b) => a + b, 0) / input.pageScores.length;
  const coveragePenalty = input.pagesTotal > input.pageScores.length ? 5 : 0;
  const score = Math.max(0, Math.min(100, Math.round(avg - coveragePenalty)));
  const issueDensity = (input.errors * 3 + input.warnings) / Math.max(1, input.pageScores.length);
  const healthScore = Math.max(0, Math.min(100, Math.round(100 - Math.min(60, issueDensity * 8))));
  return { score, healthScore };
}

export function contentHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function duplicatePenalty(count: number): number {
  return Math.min(15, count * 5);
}

export type { ExtractedPage };
