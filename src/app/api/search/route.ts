import { Op } from "sequelize";
import { ok, withApi } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import { organizationService } from "@/services/OrganizationService";
import { projectRepository } from "@/repositories/ProjectRepository";

export const dynamic = "force-dynamic";

interface SearchResult {
  type: "project" | "keyword" | "report" | "competitor" | "issue";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

/**
 * Global search (Cmd/Ctrl + K) - searches projects, keywords, reports,
 * competitors and SEO issues, scoped to the user's organization.
 */
export const GET = withApi(async ({ req, user }) => {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) throw new ValidationError("Search query must be at least 2 characters");

  const org = await organizationService.getPrimaryOrganization(user);
  const like = `%${q}%`;
  const models = await import("@/models");

  const [projects, keywords, reports, competitors, issues] = await Promise.all([
    projectRepository.search(org.id, q, 5),
    models.Keyword.findAll({
      where: { keyword: { [Op.like]: like } },
      include: [{ model: models.Project, as: "project", where: { organization_id: org.id }, attributes: ["id", "domain"] }],
      limit: 5,
    }),
    models.Report.findAll({
      where: { title: { [Op.like]: like } },
      include: [{ model: models.Project, as: "project", where: { organization_id: org.id }, attributes: ["id", "domain"] }],
      limit: 5,
    }),
    models.Competitor.findAll({
      where: { domain: { [Op.like]: like } },
      include: [{ model: models.Project, as: "project", where: { organization_id: org.id }, attributes: ["id", "domain"] }],
      limit: 5,
    }),
    models.SeoIssue.findAll({
      where: { title: { [Op.like]: like } },
      include: [{ model: models.Project, as: "project", where: { organization_id: org.id }, attributes: ["id", "domain"] }],
      limit: 5,
    }),
  ]);

  const results: SearchResult[] = [
    ...projects.map((p) => ({
      type: "project" as const,
      id: p.id,
      title: p.name,
      subtitle: p.domain,
      href: `/projects/${p.id}`,
    })),
    ...keywords.map((k) => {
      const project = k.get("project") as { id: string; domain: string } | null;
      return {
        type: "keyword" as const,
        id: k.id,
        title: k.keyword,
        subtitle: project?.domain ?? null,
        href: `/projects/${project?.id ?? ""}/keywords`,
      };
    }),
    ...reports.map((r) => {
      const project = r.get("project") as { id: string; domain: string } | null;
      return {
        type: "report" as const,
        id: r.id,
        title: r.title,
        subtitle: project?.domain ?? null,
        href: `/projects/${project?.id ?? ""}/reports`,
      };
    }),
    ...competitors.map((c) => {
      const project = c.get("project") as { id: string; domain: string } | null;
      return {
        type: "competitor" as const,
        id: c.id,
        title: c.domain,
        subtitle: project?.domain ?? null,
        href: `/projects/${project?.id ?? ""}/competitors`,
      };
    }),
    ...issues.map((i) => {
      const project = i.get("project") as { id: string; domain: string } | null;
      return {
        type: "issue" as const,
        id: i.id,
        title: i.title,
        subtitle: project?.domain ?? null,
        href: `/projects/${project?.id ?? ""}/audit`,
      };
    }),
  ];

  return ok({ query: q, results });
});
