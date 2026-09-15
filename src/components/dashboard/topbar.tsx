"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellIcon, CheckIcon, MenuIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "./global-search";
import { UserMenu } from "./user-menu";
import type { SessionUser } from "@/types";

interface TopbarProps {
  user: SessionUser;
  organizationName: string;
  onOpenSidebar: () => void;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

interface NotificationsResponse {
  notifications: NotificationItem[];
  unread_count: number;
}

export function Topbar({ user, organizationName, onOpenSidebar }: TopbarProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data } = useQuery<NotificationsResponse>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?page=1&pageSize=8");
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed to load notifications");
      return json.data as NotificationsResponse;
    },
    refetchInterval: 60_000,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Failed");
      return json.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const unread = data?.unread_count ?? 0;

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpenSidebar} aria-label="Open sidebar">
        <MenuIcon className="size-5" />
      </Button>

      <div className="hidden min-w-0 items-center gap-2 text-sm md:flex">
        <span className="text-muted-foreground">Organization:</span>
        <span className="truncate font-medium">{organizationName}</span>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <GlobalSearch open={open} onOpenChange={setOpen} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <BellIcon className="size-5" />
              {unread > 0 ? (
                <Badge variant="destructive" className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px]">
                  {unread > 9 ? "9+" : unread}
                </Badge>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-sm font-medium">Notifications</span>
              {unread > 0 ? (
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => markAllRead.mutate()}>
                  <CheckIcon className="size-3" /> Mark all read
                </Button>
              ) : null}
            </div>
            <DropdownMenuSeparator />
            {data && data.notifications.length > 0 ? (
              data.notifications.map((n) => (
                <DropdownMenuLabel key={n.id} className="font-normal">
                  <p className={`text-sm ${n.read_at ? "text-muted-foreground" : "font-medium"}`}>{n.title}</p>
                  <p className="text-muted-foreground line-clamp-2 text-xs">{n.message}</p>
                </DropdownMenuLabel>
              ))
            ) : (
              <p className="text-muted-foreground px-2 py-6 text-center text-sm">No notifications yet</p>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="w-full cursor-pointer">
                Notification settings
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <UserMenu user={user} onNavigate={() => router.push("/settings")} />
      </div>
    </header>
  );
}
