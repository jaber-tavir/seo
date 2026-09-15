"use client"

import { useState } from "react"
import { apiGet, apiDelete } from "@/lib/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"

interface ContentDocument {
  id: string
  title: string
  slug: string
  status: string
  content: string | null
  meta_title: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
}

interface Props {
  initialData: { items: ContentDocument[]; total: number; page: number; limit: number }
}

const statusVariant: Record<string, string> = {
  draft: "secondary",
  published: "default",
  archived: "outline",
}

export function ContentDocumentsList({ initialData }: Props) {
  const [documents, setDocuments] = useState<ContentDocument[]>(initialData.items)
  const [expanded, setExpanded] = useState<string | null>(null)

  const deleteDocument = async (id: string) => {
    if (!confirm("Delete this document?")) return
    const result = await apiDelete(`/api/content/${id}`)
    if (result.success) {
      setDocuments((prev) => prev.filter((d) => d.id !== id))
      toast.success("Document deleted")
    } else {
      toast.error(result.error?.message ?? "Failed to delete")
    }
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No documents yet. Generate content from a brief to see it here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{documents.length} document{documents.length !== 1 ? "s" : ""}</p>
      {documents.map((doc) => (
        <Card key={doc.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(expanded === doc.id ? null : doc.id)}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium truncate">{doc.title}</span>
                  <Badge variant={statusVariant[doc.status] as any} className="text-xs">{doc.status}</Badge>
                </div>
                {doc.meta_description && <p className="text-sm text-muted-foreground truncate">{doc.meta_description}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  Updated {new Date(doc.updated_at).toLocaleDateString()} · /{doc.slug}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => deleteDocument(doc.id)}>Delete</Button>
            </div>
            {expanded === doc.id && doc.content && (
              <div className="mt-3 pt-3 border-t text-sm whitespace-pre-wrap text-muted-foreground max-h-64 overflow-y-auto">
                {doc.content.slice(0, 2000)}{doc.content.length > 2000 ? "..." : ""}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
