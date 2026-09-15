import { Op, type WhereOptions } from "sequelize";
import { Backlink, ReferringDomain } from "@/models";
import type { PaginatedResult, PaginationParams } from "./base";
import { buildPaginatedResult, normalizePagination } from "./base";

export interface BacklinkListFilters extends PaginationParams {
  search?: string;
  status?: "active" | "lost";
  linkType?: string;
  anchor?: string;
  sort?: "first_seen" | "last_seen" | "created_at" | "domain";
  order?: "ASC" | "DESC";
}

export class BacklinkRepository {
  async upsert(row: {
    project_id: string;
    source_url: string;
    target_url: string;
    anchor_text?: string | null;
    domain?: string | null;
    domain_authority?: number | null;
    link_type?: string;
    status?: "active" | "lost";
    first_seen?: Date | null;
    last_seen?: Date | null;
  }): Promise<Backlink> {
    const existing = await Backlink.findOne({
      where: { project_id: row.project_id, source_url: row.source_url, target_url: row.target_url },
    });
    if (existing) {
      await existing.update({
        anchor_text: row.anchor_text ?? existing.anchor_text,
        domain: row.domain ?? existing.domain,
        domain_authority: row.domain_authority ?? existing.domain_authority,
        link_type: (row.link_type as Backlink["link_type"]) ?? existing.link_type,
        status: (row.status as Backlink["status"]) ?? existing.status,
        first_seen: row.first_seen ?? existing.first_seen,
        last_seen: row.last_seen ?? existing.last_seen ?? new Date(),
      });
      return existing;
    }
    return Backlink.create({
      project_id: row.project_id,
      source_url: row.source_url,
      target_url: row.target_url,
      anchor_text: row.anchor_text ?? null,
      domain: row.domain ?? null,
      domain_authority: row.domain_authority ?? null,
      link_type: (row.link_type as Backlink["link_type"]) ?? "dofollow",
      status: (row.status as Backlink["status"]) ?? "active",
      first_seen: row.first_seen ?? new Date(),
      last_seen: row.last_seen ?? new Date(),
    });
  }

  /** Mark active rows absent from the latest provider snapshot as lost. */
  async markLost(projectId: string, keepKeys: Set<string>): Promise<number> {
    const rows = await Backlink.findAll({
      where: { project_id: projectId, status: "active" },
      attributes: ["id", "source_url", "target_url"],
    });
    let lost = 0;
    for (const row of rows) {
      const key = `${row.source_url}||${row.target_url}`;
      if (!keepKeys.has(key)) {
        await row.update({ status: "lost" });
        lost += 1;
      }
    }
    return lost;
  }

  async listByProject(projectId: string, filters?: BacklinkListFilters): Promise<PaginatedResult<Backlink>> {
    const { page, pageSize, offset, limit } = normalizePagination(filters);
    const sort = filters?.sort ?? "first_seen";
    const order = filters?.order ?? "DESC";
    const where: WhereOptions<Backlink> = {
      project_id: projectId,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.linkType ? { link_type: filters.linkType } : {}),
      ...(filters?.anchor ? { anchor_text: { [Op.like]: `%${filters.anchor}%` } } : {}),
    };
    const search = filters?.search?.trim();
    const orClause = search
      ? [
          {
            [Op.or]: [
              { source_url: { [Op.like]: `%${search}%` } },
              { domain: { [Op.like]: `%${search}%` } },
              { target_url: { [Op.like]: `%${search}%` } },
            ],
          },
        ]
      : [];
    const { rows, count } = await Backlink.findAndCountAll({
      where: { ...where, ...(orClause.length > 0 ? { [Op.and]: orClause } : {}) },
      order: [[sort, order]],
      limit,
      offset,
    });
    return buildPaginatedResult(rows, count, page, pageSize);
  }

  async countByStatus(projectId: string): Promise<{ active: number; lost: number; dofollow: number; nofollow: number }> {
    const [active, lost, dofollow, nofollow] = await Promise.all([
      Backlink.count({ where: { project_id: projectId, status: "active" } }),
      Backlink.count({ where: { project_id: projectId, status: "lost" } }),
      Backlink.count({ where: { project_id: projectId, status: "active", link_type: "dofollow" } }),
      Backlink.count({ where: { project_id: projectId, status: "active", link_type: "nofollow" } }),
    ]);
    return { active, lost, dofollow, nofollow };
  }

  async newSince(projectId: string, days = 30): Promise<Backlink[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return Backlink.findAll({
      where: { project_id: projectId, first_seen: { [Op.gte]: since } },
      order: [["first_seen", "DESC"]],
      limit: 100,
    });
  }

  async anchorDistribution(projectId: string, limit = 50): Promise<Array<{ anchor: string; count: number; dofollow: number }>> {
    const rows = await Backlink.findAll({
      where: { project_id: projectId, status: "active" },
      attributes: ["anchor_text", "link_type"],
      limit: 10000,
    });
    const byAnchor = new Map<string, { count: number; dofollow: number }>();
    for (const row of rows) {
      const anchor = (row.anchor_text ?? "(no anchor)").slice(0, 200);
      const entry = byAnchor.get(anchor) ?? { count: 0, dofollow: 0 };
      entry.count += 1;
      if (row.link_type === "dofollow") entry.dofollow += 1;
      byAnchor.set(anchor, entry);
    }
    return [...byAnchor.entries()]
      .map(([anchor, v]) => ({ anchor, count: v.count, dofollow: v.dofollow }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async rebuildReferringDomains(projectId: string): Promise<ReferringDomain[]> {
    const rows = await Backlink.findAll({
      where: { project_id: projectId },
      attributes: ["domain", "domain_authority", "status", "first_seen", "last_seen"],
      limit: 20000,
    });
    const byDomain = new Map<string, { total: number; active: number; first: Date | null; last: Date | null }>();
    for (const row of rows) {
      const domain = (row.domain ?? "").toLowerCase();
      if (!domain) continue;
      const entry = byDomain.get(domain) ?? { total: 0, active: 0, first: null, last: null };
      entry.total += 1;
      if (row.status === "active") entry.active += 1;
      if (row.first_seen && (!entry.first || row.first_seen < entry.first)) entry.first = row.first_seen;
      if (row.last_seen && (!entry.last || row.last_seen > entry.last)) entry.last = row.last_seen;
      byDomain.set(domain, entry);
    }
    const domains: ReferringDomain[] = [];
    for (const [domain, v] of byDomain) {
      const [record] = await ReferringDomain.upsert({
        project_id: projectId,
        domain,
        domain_authority: null,
        backlinks_count: v.active,
        first_seen: v.first,
        last_seen: v.last,
      });
      domains.push(record);
    }
    await ReferringDomain.destroy({ where: { project_id: projectId, backlinks_count: 0 } });
    return domains.sort((a, b) => (b.backlinks_count ?? 0) - (a.backlinks_count ?? 0)).slice(0, 200);
  }

  async listReferringDomains(projectId: string, page = 1, pageSize = 20, search?: string): Promise<PaginatedResult<ReferringDomain>> {
    const { offset, limit } = normalizePagination({ page, pageSize });
    const where: WhereOptions<ReferringDomain> = {
      project_id: projectId,
      ...(search ? { domain: { [Op.like]: `%${search}%` } } : {}),
    };
    const { rows, count } = await ReferringDomain.findAndCountAll({
      where,
      order: [["backlinks_count", "DESC"]],
      limit,
      offset,
    });
    return buildPaginatedResult(rows, count, page, pageSize);
  }

  async deleteByProject(projectId: string): Promise<void> {
    await Backlink.destroy({ where: { project_id: projectId } });
    await ReferringDomain.destroy({ where: { project_id: projectId } });
  }
}

export const backlinkRepository = new BacklinkRepository();

