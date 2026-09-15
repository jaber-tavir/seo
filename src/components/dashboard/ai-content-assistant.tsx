"use client"

import { useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { apiPost } from "@/lib/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

type Tool =
  | "title"
  | "description"
  | "outline"
  | "faq"
  | "rewrite"
  | "expand"
  | "shorten"
  | "content"

const TOOL_OPTIONS: Array<{ value: Tool; label: string; hint: string }> = [
  { value: "title", label: "SEO titles", hint: "Generate click-worthy title tags (max 60 chars)" },
  { value: "description", label: "Meta descriptions", hint: "Generate meta descriptions (max 160 chars)" },
  { value: "outline", label: "Article outline", hint: "Section-by-section outline for the target keyword" },
  { value: "faq", label: "FAQ questions", hint: "People-also-ask style questions to answer" },
  { value: "content", label: "Full article", hint: "Draft a full SEO article from a keyword" },
  { value: "rewrite", label: "Rewrite", hint: "Rewrite your text in a chosen tone" },
  { value: "expand", label: "Expand", hint: "Add useful depth to your text" },
  { value: "shorten", label: "Shorten", hint: "Tighten your text to a target length" },
]

const TEXT_TOOLS: Tool[] = ["rewrite", "expand", "shorten"]

interface AiOutlineSection {
  heading: string
  subheadings?: string[]
}

interface AiToolResult {
  provider?: string
  demo?: boolean
  titles?: string[]
  descriptions?: string[]
  outline?: AiOutlineSection[]
  questions?: string[]
  text?: string
  content?: string | null
  meta_title?: string | null
  meta_description?: string | null
  token_count?: number | null
}

interface ReadabilityResult {
  words: number
  sentences: number
  fleshReadingEase: number
  gradeLevel: number
  complexity: string
  avgWordsPerSentence: number
}

/**
 * AI content assistant.
 *
 * Talks only to /api/tools/ai and /api/tools/readability - the UI never calls an
 * AI vendor directly, so the provider can be swapped on the server (see
 * src/providers/ai). Demo output (mock provider) is always labelled.
 */
export function AiContentAssistant() {
  const [tool, setTool] = useState<Tool>("title")
  const [keyword, setKeyword] = useState("")
  const [tone, setTone] = useState("")
  const [count, setCount] = useState("3")
  const [sections, setSections] = useState("5")
  const [text, setText] = useState("")
  const [targetLength, setTargetLength] = useState("80")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AiToolResult | null>(null)
  const [readability, setReadability] = useState<ReadabilityResult | null>(null)

  const needsText = TEXT_TOOLS.includes(tool)
  const needsKeyword = !needsText

  const buildPayload = () => {
    if (needsText) {
      if (text.trim().length < 3) throw new Error("Enter the text you want to transform")
      if (tool === "shorten") {
        return { tool, text: text.trim(), targetLength: Number(targetLength) || undefined }
      }
      return { tool, text: text.trim(), tone: tone.trim() || undefined }
    }

    if (keyword.trim().length < 2) throw new Error("Enter a target keyword")

    switch (tool) {
      case "title":
        return { tool, keyword: keyword.trim(), tone: tone.trim() || undefined, count: Number(count) || undefined }
      case "description":
        return { tool, keyword: keyword.trim(), count: Number(count) || undefined }
      case "outline":
        return { tool, keyword: keyword.trim(), sections: Number(sections) || undefined }
      case "faq":
        return { tool, topic: keyword.trim(), count: Number(count) || undefined }
      case "content":
        return { tool, keyword: keyword.trim(), tone: tone.trim() || undefined }
      default:
        return { tool, keyword: keyword.trim() }
    }
  }

  const run = async () => {
    setLoading(true)
    setReadability(null)
    try {
      const payload = buildPayload()
      const response = await apiPost<AiToolResult>("/api/tools/ai", payload)
      if (response.success) {
        setResult(response.data)
        if (response.data.demo) {
          toast.info("Demo provider active - set AI_API_KEY for live AI output")
        }
      } else {
        toast.error(response.error.message)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI request failed")
    } finally {
      setLoading(false)
    }
  }

  const analyzeReadability = async (value: string) => {
    if (value.trim().length < 3) {
      toast.error("Nothing to analyze yet")
      return
    }
    const response = await apiPost<ReadabilityResult>("/api/tools/readability", { text: value })
    if (response.success) setReadability(response.data)
    else toast.error(response.error.message)
  }

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success("Copied to clipboard")
    } catch {
      toast.error("Copy failed")
    }
  }

  const resultText =
    result?.content ??
    result?.text ??
    result?.titles?.join("\n") ??
    result?.descriptions?.join("\n") ??
    ""

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4" /> AI content assistant
            {result?.demo && (
              <Badge variant="outline" className="text-xs">
                demo
              </Badge>
            )}
          </CardTitle>
          <CardDescription>{TOOL_OPTIONS.find((option) => option.value === tool)?.hint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="ai-tool">Tool</Label>
              <Select
                value={tool}
                onValueChange={(value) => {
                  setTool(value as Tool)
                  setResult(null)
                  setReadability(null)
                }}
              >
                <SelectTrigger id="ai-tool">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOOL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ai-tone">Tone (optional)</Label>
              <Input
                id="ai-tone"
                placeholder="informative, friendly, expert..."
                value={tone}
                onChange={(event) => setTone(event.target.value)}
              />
            </div>
          </div>

          {needsKeyword ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="ai-keyword">{tool === "faq" ? "Topic *" : "Target keyword *"}</Label>
                <Input
                  id="ai-keyword"
                  placeholder="e.g. airport transfer Lisbon"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                />
              </div>
              {(tool === "title" || tool === "description" || tool === "faq") && (
                <div className="space-y-1">
                  <Label htmlFor="ai-count">How many</Label>
                  <Input
                    id="ai-count"
                    type="number"
                    min={1}
                    max={5}
                    value={count}
                    onChange={(event) => setCount(event.target.value)}
                  />
                </div>
              )}
              {tool === "outline" && (
                <div className="space-y-1">
                  <Label htmlFor="ai-sections">Sections</Label>
                  <Input
                    id="ai-sections"
                    type="number"
                    min={3}
                    max={10}
                    value={sections}
                    onChange={(event) => setSections(event.target.value)}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="ai-text">Your text *</Label>
                <Textarea
                  id="ai-text"
                  rows={6}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Paste the content you want to transform"
                />
              </div>
              {tool === "shorten" && (
                <div className="space-y-1">
                  <Label htmlFor="ai-target">Target word count</Label>
                  <Input
                    id="ai-target"
                    type="number"
                    min={20}
                    max={2000}
                    value={targetLength}
                    onChange={(event) => setTargetLength(event.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={run} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Working...
                </>
              ) : (
                "Generate"
              )}
            </Button>
            {(result?.content ?? result?.text) && (
              <Button
                variant="outline"
                onClick={() => analyzeReadability((result?.content ?? result?.text) as string)}
              >
                Check readability
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {readability && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Readability</CardTitle>
            <CardDescription>
              Flesch Reading Ease {readability.fleshReadingEase} · grade {readability.gradeLevel} ·{" "}
              {readability.complexity.replace(/_/g, " ")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Words</p>
              <p className="font-medium">{readability.words}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Sentences</p>
              <p className="font-medium">{readability.sentences}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Avg words/sentence</p>
              <p className="font-medium">{readability.avgWordsPerSentence}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Reading ease</p>
              <p className="font-medium">{readability.fleshReadingEase}/100</p>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Result
              <Badge variant="secondary" className="text-xs">
                {result.provider ?? "ai"}
              </Badge>
              {result.demo && (
                <Badge variant="outline" className="text-xs">
                  demo data
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              {resultText ? (
                <Button size="sm" variant="outline" onClick={() => copy(resultText)}>
                  Copy output
                </Button>
              ) : (
                "No copyable text output for this tool"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {result.meta_title && (
              <p>
                <span className="text-muted-foreground">Meta title:</span> {result.meta_title}
              </p>
            )}
            {result.meta_description && (
              <p>
                <span className="text-muted-foreground">Meta description:</span> {result.meta_description}
              </p>
            )}

            {result.titles && result.titles.length > 0 && (
              <ul className="list-disc space-y-1 pl-5">
                {result.titles.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}

            {result.descriptions && result.descriptions.length > 0 && (
              <ul className="list-disc space-y-1 pl-5">
                {result.descriptions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}

            {result.questions && result.questions.length > 0 && (
              <ul className="list-disc space-y-1 pl-5">
                {result.questions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}

            {result.outline && result.outline.length > 0 && (
              <ul className="space-y-2">
                {result.outline.map((section) => (
                  <li key={section.heading}>
                    <p className="font-medium">{section.heading}</p>
                    {section.subheadings && section.subheadings.length > 0 && (
                      <ul className="list-disc pl-5 text-muted-foreground">
                        {section.subheadings.map((sub) => (
                          <li key={sub}>{sub}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {(result.content ?? result.text) && (
              <div className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3">
                {result.content ?? result.text}
              </div>
            )}

            {typeof result.token_count === "number" && result.token_count > 0 && (
              <p className="text-xs text-muted-foreground">{result.token_count} tokens</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}