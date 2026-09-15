export * from "./types";
export { MockKeywordProvider } from "./mock-provider";
export { DataForSEOKeywordProvider, isDataForSEOConfigured } from "./dataforseo-provider";

import type { KeywordProvider } from "./types";
import { MockKeywordProvider } from "./mock-provider";
import { DataForSEOKeywordProvider, isDataForSEOConfigured } from "./dataforseo-provider";

/**
 * Provider registry. Returns the DataForSEO provider when credentials are
 * configured, otherwise the clearly-marked mock (nulls, never fabricated).
 * UI/services never touch this selection logic — they call getKeywordProvider().
 */
export function getKeywordProvider(): KeywordProvider {
  if (isDataForSEOConfigured()) return new DataForSEOKeywordProvider();
  return new MockKeywordProvider();
}

