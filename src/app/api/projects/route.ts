import { created, ok, withApi } from "@/lib/api";
import { ValidationError } from "@/lib/errors";
import { projectService } from "@/services/ProjectService";
import { createProjectSchema, projectListQuerySchema } from "@/validators/project";

export const dynamic = "force-dynamic";

export const GET = withApi(async ({ req, user }) => {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const query = projectListQuerySchema.safeParse(params);
  if (!query.success) throw new ValidationError("Invalid query parameters", query.error.issues);

  const result = await projectService.listProjects(user, query.data);
  return ok({
    projects: result.rows.map((p) => p.toJSON()),
    pagination: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages },
  });
});

export const POST = withApi(async ({ req, user }) => {
  const body = await req.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) throw new ValidationError("Invalid project data", parsed.error.issues);

  const project = await projectService.createProject(user, {
    name: parsed.data.name,
    website_url: parsed.data.website_url,
    country: parsed.data.country,
    language: parsed.data.language,
    search_engine: parsed.data.search_engine,
    sitemap_url: parsed.data.sitemap_url || undefined,
  });
  return created({ project: project.toJSON() });
});
