import type { ContentProvider } from "@/providers/ai/types"
import { env } from "./env"

let cachedProvider: { name: string; provider: ContentProvider } | null = null

export async function isAiEnabled(): Promise<boolean> {
  const result = await getAiProvider()
  return result.provider !== null
}

export async function getAiProvider(): Promise<{ name: string; provider: ContentProvider }> {
  if (cachedProvider) return cachedProvider

  if (env.AI_API_KEY) {
    try {
      const { OpenAiProvider } = await import("@/providers/ai/openai-provider")
      cachedProvider = { name: "openai", provider: new OpenAiProvider({ apiKey: env.AI_API_KEY }) }
      return cachedProvider
    } catch {
      // Fall through to mock
    }
  }

  const { MockAiProvider } = await import("@/providers/ai/mock-provider")
  cachedProvider = { name: "mock", provider: new MockAiProvider() }
  return cachedProvider
}


