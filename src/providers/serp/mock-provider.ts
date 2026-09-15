import type { RankCheckResult, RankProvider } from "./types";

/**
 * MockRankProvider — ONLY for UI development and tests.
 * Returns null positions (not fabricated positions) so the UI can render
 * "not ranked yet" states without inventing metric data.
 */
export class MockRankProvider implements RankProvider {
  readonly name = "mock";

  async checkPosition(): Promise<RankCheckResult> {
    return { position: null, rankingUrl: null, totalResults: null, checkedAt: new Date() };
  }
}
