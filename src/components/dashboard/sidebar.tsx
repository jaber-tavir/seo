"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  Link2,
  Radar,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { SessionUser } from "@/types";

interface SidebarProps {
  user: SessionUser;
  organizationName: string;
  onNavigate?: () => void;
}

const mainItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, enabled: true },
  { href: "/projects", label: "Projects", icon: FolderKanban, enabled: true },
];

const projectItems = [
  { label: "Site Audit", icon: Radar, suffix: "/audit" },
  { label: "Keywords", icon: Search, suffix: "/keywords" },
  { label: "Backlinks", icon: Link2, suffix: "/backlinks" },
  { label: "Competitors", icon: Users, suffix: "/competitors" },
];

const soonItems = [
  { label: "Rank Tracker", icon: TrendingUp },
  { label: "Technical SEO", icon: ShieldCheck },
  { label: "Reports", icon: BarChart3 },
  { label: "SEO Tools", icon: Wrench },
];

const accountItems = [
  { href: "/tools", label: "Free SEO Tools", icon: Wrench, enabled: true },
  { href: "/settings", label: "Settings", icon: Settings, enabled: true },
  { href: "/billing", label: "Billing", icon: CreditCard, enabled: true },
];

export function Sidebar({ user, organizationName, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  // When inside a project, link Site Audit / Keywords to that project
  const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
  const activeProjectId = projectMatch?.[1];

  const renderLink = (item: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        )}
      >
        <item.icon className="size-4" />
        {item.label}
      </Link>
    );
  };

  const renderSoon = (item: { label: string; icon: React.ComponentType<{ className?: string }> }) => (
    <div
      key={item.label}
      title="Coming in a later phase"
      className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground/50"
    >
      <item.icon className="size-4" />
      {item.label}
      <Badge variant="secondary" className="ml-auto text-[10px]">
        Soon
      </Badge>
    </div>
  );

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold" onClick={onNavigate}>
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <TrendingUp className="size-4" />
          </span>
          SEO Tools
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {mainItems.map(renderLink)}
        <p className="px-3 pt-4 pb-1 text-xs font-semibold tracking-wide text-muted-foreground/70 uppercase">SEO Suite</p>
        {activeProjectId
          ? projectItems.map((item) =>
              renderLink({ href: `/projects/${activeProjectId}${item.suffix}`, label: item.label, icon: item.icon })
            )
          : null}
        {soonItems.map(renderSoon)}
        <p className="px-3 pt-4 pb-1 text-xs font-semibold tracking-wide text-muted-foreground/70 uppercase">Account</p>
        {accountItems.map(renderLink)}
        {user.role === "admin" || user.role === "super_admin" ? (
          renderLink({ href: "/admin", label: "Admin", icon: ShieldCheck })
        ) : null}
      </nav>

      <div className="border-t p-3">
        <p className="truncate px-3 text-xs font-medium text-muted-foreground">{organizationName}</p>
      </div>
    </aside>
  );
}
