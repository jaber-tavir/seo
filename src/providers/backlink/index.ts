export * from "./types";
export { MockBacklinkProvider } from "./mock-provider";
export { DataForSEOBacklinkProvider, isBacklinkDataForSEOConfigured } from "./dataforseo-provider";

import type { BacklinkProvider } from "./types";
import { MockBacklinkProvider } from "./mock-provider";
import { DataForSEOBacklinkProvider, isBacklinkDataForSEOConfigured } from "./dataforseo-provider";

/**
 * Provider registry. Returns the DataForSEO provider when credentials are
 * configured, otherwise the clearly-marked mock (nulls, never fabricated).
 * UI/services never touch this selection logic - they call getBacklinkProvider().
 */
export function getBacklinkProvider(): BacklinkProvider {
  if (isBacklinkDataForSEOConfigured()) return new DataForSEOBacklinkProvider();
  return new MockBacklinkProvider();
}
