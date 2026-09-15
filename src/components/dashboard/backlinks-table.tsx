"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BacklinkListResponse } from "./backlinks-manager";

interface BacklinkRow {
  id: string;
  source_url: string;
  target_url: string;
  anchor_text: string | null;
  domain: string | null;
  link_type: string;
  status: string;
  first_seen: string | null;
  last_seen: string | null;
}

interface DomainRow {
  id: string;
  domain: string;
  backlinks_count: number;
  first_seen: string | null;
  last_seen: string | null;
}

interface AnchorRow {
  anchor: string;
  count: number;
  dofollow: number;
}

export function BacklinksTableBody({
  data,
  isLoading,
  syncPending,
  onSync,
  page,
  setPage,
  syncedAt,
}: {
  data: BacklinkListResponse | undefined;
  isLoading: boolean;
  syncPending: boolean;
  onSync: () => void;
  page: number;
  setPage: (p: number | ((p: number) => number)) => void;
  syncedAt: string | null;
}) {
  if (isLoading) return <p className="text-muted-foreground py-6 text-center text-sm">Loading backlinks...</p>;
  if (!data || data.rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-muted-foreground text-sm">No backlinks synced yet.</p>
        <Button className="mt-3" size="sm" disabled={syncPending} onClick={onSync}>
          Sync backlinks
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {data.kind === "referring-domains" ? (
        <ReferringDomainsTable rows={data.rows as DomainRow[]} />
      ) : data.kind === "anchors" ? (
        <AnchorsTable rows={data.rows as AnchorRow[]} />
      ) : (
        <BacklinksTable rows={data.rows as BacklinkRow[]} />
      )}
      {data.pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page {data.pagination.page} of {data.pagination.totalPages} — {data.pagination.total} rows
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
      {syncedAt ? <p className="text-muted-foreground text-xs">Last synced {new Date(syncedAt).toLocaleString()}</p> : null}
    </div>
  );
}

function BacklinksTable({ rows }: { rows: BacklinkRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Source</TableHead>
            <TableHead>Anchor</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>First seen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <p className="max-w-72 truncate font-medium" title={r.source_url}>{r.source_url}</p>
                <p className="text-muted-foreground max-w-72 truncate text-xs" title={r.target_url}>→ {r.target_url}</p>
              </TableCell>
              <TableCell className="max-w-40 truncate text-sm">{r.anchor_text ?? "—"}</TableCell>
              <TableCell className="text-sm">{r.link_type}</TableCell>
              <TableCell className="text-sm">{r.status}</TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {r.first_seen ? new Date(r.first_seen).toLocaleDateString() : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ReferringDomainsTable({ rows }: { rows: DomainRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Domain</TableHead>
            <TableHead className="text-right">Backlinks</TableHead>
            <TableHead>First seen</TableHead>
            <TableHead>Last seen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.domain}</TableCell>
              <TableCell className="text-right font-semibold">{r.backlinks_count}</TableCell>
              <TableCell className="text-muted-foreground text-xs">{r.first_seen ? new Date(r.first_seen).toLocaleDateString() : "—"}</TableCell>
              <TableCell className="text-muted-foreground text-xs">{r.last_seen ? new Date(r.last_seen).toLocaleDateString() : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AnchorsTable({ rows }: { rows: AnchorRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.anchor} className="flex items-center gap-3 text-sm">
          <span className="w-64 shrink-0 truncate font-medium">{r.anchor}</span>
          <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
            <div className="bg-primary h-full rounded-full" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
          <span className="text-muted-foreground w-24 shrink-0 text-right text-xs">{r.count} links · {r.dofollow} dofollow</span>
        </div>
      ))}
    </div>
  );
}
