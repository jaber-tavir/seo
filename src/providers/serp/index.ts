export * from "./types";
export { MockRankProvider } from "./mock-provider";

import type { RankProvider } from "./types";
import { MockRankProvider } from "./mock-provider";

/**
 * Provider registry. Phase 6+ adds real providers selected by configuration
 * (e.g. DataForSEO SERP / SerpAPI). The default is the clearly-marked mock
 * (null positions — never fabricated).
 */
export function getRankProvider(): RankProvider {
  return new MockRankProvider();
}
