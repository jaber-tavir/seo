"use client";

import { useState } from "react";
import { Topbar } from "./topbar";
import { Sidebar } from "./sidebar";
import type { SessionUser } from "@/types";

/**
 * Client shell for the dashboard area: responsive sidebar + sticky topbar.
 * The server layout passes the authenticated user and organization name.
 */
export function DashboardShell({
  user,
  organizationName,
  children,
}: {
  user: SessionUser;
  organizationName: string;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-svh">
      {/* Desktop sidebar */}
      <div className="sticky top-0 hidden h-svh shrink-0 md:block">
        <Sidebar user={user} organizationName={organizationName} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="bg-black/50 absolute inset-0" onClick={() => setSidebarOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">
            <Sidebar user={user} organizationName={organizationName} onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} organizationName={organizationName} onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
