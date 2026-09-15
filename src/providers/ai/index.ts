import { env } from "@/config/env"
import { MockAiProvider } from "./mock-provider"
import { OpenAiProvider } from "./openai-provider"
import type { AIProvider } from "./types"

export { MockAiProvider } from "./mock-provider"
export { OpenAiProvider } from "./openai-provider"
export type {
  AIProvider,
  ContentProvider,
  GenerateContentInput,
  GenerateContentResult,
  AiTitleInput,
  AiDescriptionInput,
  AiOutlineInput,
  AiOutlineSection,
  AiFaqInput,
  AiRewriteInput,
  AiExpandInput,
  AiShortenInput,
  AiBriefInput,
  AiBriefResult,
} from "./types"

export interface AiProviderHandle {
  provider: AIProvider
  name: string
  /** true when the deterministic mock provider is active (no AI_API_KEY configured) */
  demo: boolean
}

let cachedProvider: AIProvider | null = null
let cachedName: string | null = null

/**
 * Returns the active AI content provider based on configuration.
 * - If AI_PROVIDER is set, uses that provider.
 * - If AI_API_KEY is set, uses OpenAI (or an OpenAI-compatible endpoint).
 * - Otherwise falls back to the mock provider (deterministic, no external calls).
 *
 * The UI never talks to an AI vendor directly - it always goes through this
 * factory, so providers can be swapped without touching application code.
 */
export function getAiProvider(): AiProviderHandle {
  if (cachedProvider && cachedName) {
    return { provider: cachedProvider, name: cachedName, demo: cachedName === "mock" }
  }

  const providerName = env.AI_PROVIDER ?? (env.AI_API_KEY ? "openai" : "mock")

  if (providerName === "openai" && env.AI_API_KEY) {
    cachedProvider = new OpenAiProvider({
      apiKey: env.AI_API_KEY,
      baseUrl: env.AI_API_URL,
      model: env.AI_MODEL,
    })
    cachedName = "openai"
  } else {
    cachedProvider = new MockAiProvider()
    cachedName = "mock"
  }

  return { provider: cachedProvider, name: cachedName, demo: cachedName === "mock" }
}

/**
 * Returns true if a real AI provider is configured (not the mock).
 */
export function isAiEnabled(): boolean {
  return getAiProvider().name !== "mock"
}

/** Test helper - clears the memoized provider so env changes take effect. */
export function resetAiProvider(): void {
  cachedProvider = null
  cachedName = null
}
