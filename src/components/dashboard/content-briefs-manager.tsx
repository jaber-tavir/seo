"use client"

import { useState } from "react"
import { apiPost, apiDelete } from "@/lib/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface ContentBrief {
  id: string
  keyword: string
  search_intent: string | null
  suggested_title: string | null
  outline: string[] | null
  competitor_urls: string[] | null
  related_keywords: string[] | null
  questions: string[] | null
  created_at: string
}

interface ContentDocument {
  id: string
  title: string
  slug: string
}

interface Props {
  projectId: string
  initialData: { items: ContentBrief[]; total: number; page: number; limit: number }
}

/**
 * Content brief manager.
 * Brief creation/removal goes through the service layer API - the component
 * holds no business rules (limits, authorization) itself.
 */
export function ContentBriefsManager({ projectId, initialData }: Props) {
  const [briefs, setBriefs] = useState<ContentBrief[]>(initialData.items)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [generatingBriefId, setGeneratingBriefId] = useState<string | null>(null)

  const [keyword, setKeyword] = useState("")
  const [searchIntent, setSearchIntent] = useState("")
  const [suggestedTitle, setSuggestedTitle] = useState("")
  const [outline, setOutline] = useState("")
  const [competitorUrls, setCompetitorUrls] = useState("")
  const [relatedKeywords, setRelatedKeywords] = useState("")
  const [questions, setQuestions] = useState("")

  const resetForm = () => {
    setKeyword("")
    setSearchIntent("")
    setSuggestedTitle("")
    setOutline("")
    setCompetitorUrls("")
    setRelatedKeywords("")
    setQuestions("")
  }

  const splitLines = (value: string) =>
    value.split("\n").map((item) => item.trim()).filter(Boolean)
  const splitCommas = (value: string) =>
    value.split(",").map((item) => item.trim()).filter(Boolean)

  const createBrief = async () => {
    if (!keyword.trim()) {
      toast.error("Keyword is required")
      return
    }
    setLoading(true)
    try {
      const result = await apiPost<ContentBrief>(`/api/projects/${projectId}/content-briefs`, {
        keyword: keyword.trim(),
        search_intent: searchIntent || undefined,
        suggested_title: suggestedTitle || undefined,
        outline: outline || undefined,
        competitor_urls: competitorUrls ? splitLines(competitorUrls) : undefined,
        related_keywords: relatedKeywords ? splitCommas(relatedKeywords) : undefined,
        questions: questions ? splitLines(questions) : undefined,
      })

      if (result.success) {
        setBriefs((prev) => [result.data, ...prev])
        resetForm()
        setShowForm(false)
        toast.success("Content brief created")
      } else {
        toast.error(result.error.message)
      }
    } catch {
      toast.error("Failed to create brief")
    } finally {
      setLoading(false)
    }
  }

  const deleteBrief = async (briefId: string) => {
    if (!confirm("Delete this content brief?")) return
    const result = await apiDelete(`/api/projects/${projectId}/content-briefs/${briefId}`)
    if (result.success) {
      setBriefs((prev) => prev.filter((brief) => brief.id !== briefId))
      toast.success("Brief deleted")
    } else {
      toast.error(result.error.message)
    }
  }

  const generateContent = async (briefId: string) => {
    setGeneratingBriefId(briefId)
    try {
      const result = await apiPost<ContentDocument>(
        `/api/projects/${projectId}/content-briefs/${briefId}/generate`,
        {},
      )
      if (result.success) {
        toast.success(`Generated "${result.data.title}" - find it under Documents`)
      } else {
        toast.error(result.error.message)
      }
    } catch {
      toast.error("Generation failed")
    } finally {
      setGeneratingBriefId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {briefs.length} brief{briefs.length === 1 ? "" : "s"}
        </p>
        <Button onClick={() => setShowForm((open) => !open)} variant={showForm ? "outline" : "default"}>
          {showForm ? "Cancel" : "New brief"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create content brief</CardTitle>
            <CardDescription>Guide AI content generation for a target keyword</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Target keyword *"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Input
              placeholder="Search intent (informational, commercial, ...)"
              value={searchIntent}
              onChange={(e) => setSearchIntent(e.target.value)}
            />
            <Input
              placeholder="Suggested title (optional)"
              value={suggestedTitle}
              onChange={(e) => setSuggestedTitle(e.target.value)}
            />
            <Textarea
              placeholder="Outline (one section per line)"
              value={outline}
              onChange={(e) => setOutline(e.target.value)}
              rows={4}
            />
            <Textarea
              placeholder="Competitor URLs (one per line)"
              value={competitorUrls}
              onChange={(e) => setCompetitorUrls(e.target.value)}
              rows={2}
            />
            <Textarea
              placeholder="Related keywords (comma separated)"
              value={relatedKeywords}
              onChange={(e) => setRelatedKeywords(e.target.value)}
              rows={2}
            />
            <Textarea
              placeholder="Questions to answer (one per line)"
              value={questions}
              onChange={(e) => setQuestions(e.target.value)}
              rows={2}
            />
            <Button onClick={createBrief} disabled={loading || !keyword.trim()}>
              {loading ? "Creating..." : "Create brief"}
            </Button>
          </CardContent>
        </Card>
      )}

      {briefs.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>No content briefs yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {briefs.map((brief) => (
            <Card key={brief.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="truncate font-medium">{brief.keyword}</span>
                      {brief.search_intent && (
                        <Badge variant="secondary" className="text-xs">
                          {brief.search_intent}
                        </Badge>
                      )}
                      {brief.questions && brief.questions.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {brief.questions.length} questions
                        </Badge>
                      )}
                    </div>
                    {brief.suggested_title && (
                      <p className="truncate text-sm text-muted-foreground">{brief.suggested_title}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Created {new Date(brief.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateContent(brief.id)}
                      disabled={generatingBriefId === brief.id}
                    >
                      {generatingBriefId === brief.id ? "Generating..." : "Generate"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteBrief(brief.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}