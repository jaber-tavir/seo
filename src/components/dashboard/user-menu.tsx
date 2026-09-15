"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";
import type { SessionUser } from "@/types";

interface UserMenuProps {
  user: SessionUser;
  onNavigate: (href: string) => void;
}

export function UserMenu({ user, onNavigate }: UserMenuProps) {
  const router = useRouter();
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;

  const logout = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? "Logout failed");
      return json.data;
    },
    onSuccess: () => {
      router.push("/login");
      router.refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-1.5" aria-label="Account menu">
          <Avatar className="size-7">
            <AvatarFallback>{initials(fullName)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-28 truncate text-sm font-medium md:inline">{user.first_name ?? user.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="truncate text-sm font-medium">{fullName}</p>
          <p className="text-muted-foreground truncate text-xs font-normal">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={() => onNavigate("/settings")}>
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={() => onNavigate("/billing")}>
          Billing & usage
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => logout.mutate()} disabled={logout.isPending}>
          {logout.isPending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
