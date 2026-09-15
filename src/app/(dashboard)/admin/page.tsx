import type { Metadata } from "next";
import { Database, Building2, FolderKanban, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { userRepository } from "@/repositories/UserRepository";
import { organizationRepository } from "@/repositories/OrganizationRepository";
import { projectRepository } from "@/repositories/ProjectRepository";
import { auditLogRepository } from "@/repositories/AuditLogRepository";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin(); // role guard - non-admins are redirected

  const [usersTotal, orgs, projects, auditLogs, usersList] = await Promise.all([
    userRepository.count(),
    organizationRepository.countAll(),
    projectRepository.countAll(),
    auditLogRepository.countAll(),
    userRepository.listAdmin(10, 0),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-muted-foreground text-sm">
          Platform overview. The full admin panel (plans, jobs, usage, monitoring) ships in Phase 10.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Users" value={usersTotal} icon={Database} />
        <StatCard title="Organizations" value={orgs} icon={Building2} />
        <StatCard title="Projects" value={projects} icon={FolderKanban} />
        <StatCard title="Audit log entries" value={auditLogs} icon={ShieldCheck} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Latest users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersList.rows.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>{u.getFullName()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{u.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.status === "active" ? "success" : "warning"}>{u.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDateTime(u.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
