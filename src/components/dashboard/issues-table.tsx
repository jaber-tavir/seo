"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface IssueRow {
  id: string;
  type: "error" | "warning" | "notice";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string | null;
  recommendation: string | null;
}

interface IssuesResponse {
  items: IssueRow[];
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
}

const severityBadge: Record<string, "destructive" | "warning" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "warning",
  medium: "secondary",
  low: "outline",
};

export function IssuesTable({ projectId, auditId }: { projectId: string; auditId: string }) {
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data, isLoading } = useQuery<IssuesResponse>({
    queryKey: ["audit-issues", auditId, page],
    queryFn: () =>
      apiFetch<IssuesResponse>(`/api/projects/${projectId}/audits/${auditId}/issues?page=${page}&pageSize=${pageSize}`),
  });

  if (isLoading) return <p className="text-muted-foreground py-6 text-center text-sm">Loading issues…</p>;

  const issues = data?.items ?? [];

  return (
    <div className="space-y-4">
      {issues.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">No issues found for this audit.</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-full">Issue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell>
                    <Badge variant={severityBadge[issue.severity] ?? "secondary"}>{issue.severity}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm capitalize">{issue.type}</TableCell>
                  <TableCell>
                    <p className="font-medium">{issue.title}</p>
                    {issue.description && <p className="text-muted-foreground mt-0.5 text-sm">{issue.description}</p>}
                    {issue.recommendation && <p className="text-muted-foreground/70 mt-1 text-xs">{issue.recommendation}</p>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} issues
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= (data.pagination.totalPages ?? 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}