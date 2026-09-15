"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MonitorSmartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/client";
import { formatDateTime } from "@/lib/utils";

interface SessionItem {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  last_used_at: string | null;
  created_at: string;
  expires_at: string;
  current: boolean;
}

export function SessionsList() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ sessions: SessionItem[] }>({
    queryKey: ["sessions"],
    queryFn: () => apiFetch<{ sessions: SessionItem[] }>("/api/account/sessions"),
  });

  const revoke = useMutation({
    mutationFn: (payload: { id?: string; all_others?: boolean }) =>
      apiFetch("/api/account/sessions", { method: "DELETE", body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success("Session revoked");
      void queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading sessions…</p>;

  const sessions = data?.sessions ?? [];

  return (
    <div className="space-y-3">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Device</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead>Signed in</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell>
                  <span className="flex items-center gap-2 text-sm">
                    <MonitorSmartphone className="text-muted-foreground size-4" />
                    {session.current ? (
                      <span className="font-medium">
                        This device <span className="text-muted-foreground font-normal">(current)</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground max-w-56 truncate">{session.user_agent ?? "Unknown device"}</span>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{session.ip_address ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{formatDateTime(session.last_used_at)}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{formatDateTime(session.created_at)}</TableCell>
                <TableCell>
                  {session.current ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive h-7 text-xs"
                      onClick={() => revoke.mutate({ all_others: true })}
                      disabled={revoke.isPending}
                    >
                      <X className="size-3" /> Others
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive h-7 text-xs"
                      onClick={() => revoke.mutate({ id: session.id })}
                      disabled={revoke.isPending}
                    >
                      Revoke
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-muted-foreground text-xs">
        Sessions store only a hashed token. Changing your password revokes all other sessions automatically.
      </p>
    </div>
  );
}
