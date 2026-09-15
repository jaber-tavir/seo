import { Op } from "sequelize";
import { sequelize } from "@/config/database";
import { Usage } from "@/models";
import { STOCK_METRICS, type UsageMetric } from "@/constants";
import { DEFAULT_PLANS, type PlanLimits } from "@/constants/plans";
import { DatabaseError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { isWithinLimit, remainingUsage, resolveCurrentPeriod, usagePercent } from "@/lib/usage-math";
import { organizationRepository } from "@/repositories/OrganizationRepository";
import { projectRepository } from "@/repositories/ProjectRepository";
import { usageRepository } from "@/repositories/UsageRepository";

/**
 * Centralized usage & limits service.
 * All feature services call this - subscription/limit logic is never duplicated.
 */

export interface LimitCheck {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number | null; // null = unlimited
}

export interface MetricUsage {
  metric: UsageMetric;
  limit: number;
  used: number;
  remaining: number | null;
  percent: number | null;
}

export interface UsageSummary {
  organization_id: string;
  plan: { id: string; name: string; slug: string } | null;
  period: { period_start: Date; period_end: Date };
  metrics: MetricUsage[];
}

const FREE_LIMITS_FALLBACK: PlanLimits =
  DEFAULT_PLANS.find((p) => p.slug === "free")?.limits ?? {
    projects: 1,
    crawled_pages: 100,
    tracked_keywords: 50,
    keyword_searches: 50,
    audits: 10,
    reports: 3,
    api_requests: 0,
    ai_generations: 20,
    white_label_reports: false,
    api_access: false,
  };

export class UsageService {
  /** Limits come from the organization's plan in the database */
  async getPlanLimits(organizationId: string): Promise<PlanLimits> {
    const org = await organizationRepository.findById(organizationId, {
      include: [{ model: (await import("@/models")).Plan, as: "plan" }],
    });
    if (!org) throw new NotFoundError("Organization not found");
    const plan = org.get("plan") as { limits?: PlanLimits } | null;
    return plan?.limits ?? FREE_LIMITS_FALLBACK;
  }

  /** Current consumed amount for a metric ("stock" metrics are live counts) */
  async getUsedValue(organizationId: string, metric: UsageMetric): Promise<number> {
    if (STOCK_METRICS.includes(metric)) {
      if (metric === "projects") {
        return projectRepository.countByOrganization(organizationId);
      }
      if (metric === "tracked_keywords") {
        const { Project, Keyword } = await import("@/models");
        const projects = await Project.findAll({ where: { organization_id: organizationId }, attributes: ["id"] });
        if (projects.length === 0) return 0;
        return Keyword.count({ where: { project_id: { [Op.in]: projects.map((p) => p.id) } } });
      }
      return 0;
    }

    const { period_start } = resolveCurrentPeriod();
    return usageRepository.sumMetric(organizationId, metric, period_start);
  }

  /** Check whether an action consuming `requested` units is allowed */
  async checkLimit(organizationId: string, metric: UsageMetric, requested = 1): Promise<LimitCheck> {
    const limits = await this.getPlanLimits(organizationId);
    const limit = limits[metric] ?? 0;
    const used = await this.getUsedValue(organizationId, metric);
    return {
      allowed: isWithinLimit(limit, used, requested),
      limit,
      used,
      remaining: remainingUsage(limit, used),
    };
  }

  /** Same as checkLimit but throws a user-friendly error when blocked */
  async enforceLimit(organizationId: string, metric: UsageMetric, requested = 1, label?: string): Promise<LimitCheck> {
    const check = await this.checkLimit(organizationId, metric, requested);
    if (!check.allowed) {
      throw new ForbiddenError(
        label
          ? `Your plan allows ${check.limit} ${label}. Upgrade your plan to continue.`
          : `You have reached your plan limit for ${metric}. Upgrade your plan to continue.`
      );
    }
    return check;
  }

  /** Consume units of a flow metric (monthly counter). Stock metrics are a no-op. */
  async consumeUsage(organizationId: string, metric: UsageMetric, amount = 1): Promise<void> {
    if (STOCK_METRICS.includes(metric) || amount <= 0) return;

    const { period_start, period_end } = resolveCurrentPeriod();
    const transaction = await sequelize.transaction();
    try {
      let usage = await Usage.findOne({
        where: { organization_id: organizationId, metric, period_start },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!usage) {
        try {
          usage = await usageRepository.create(
            { organization_id: organizationId, metric, amount, period_start, period_end },
            transaction
          );
        } catch (err) {
          const isUniqueConflict =
            (err as { name?: string })?.name === "SequelizeUniqueConstraintError" ||
            (err as { original?: { code?: string } })?.original?.code === "ER_DUP_ENTRY";
          if (!isUniqueConflict) throw err;
          usage = await Usage.findOne({
            where: { organization_id: organizationId, metric, period_start },
            transaction,
            lock: transaction.LOCK.UPDATE,
          });
        }
      }

      if (!usage) throw new DatabaseError("Failed to record usage");

      if (usage.amount !== amount) {
        await usageRepository.increment(usage, amount, transaction);
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async getRemainingUsage(organizationId: string, metric: UsageMetric): Promise<number | null> {
    const check = await this.checkLimit(organizationId, metric, 0);
    return check.remaining;
  }

  /** Full usage summary across all metrics (for dashboard & billing pages) */
  async getUsage(organizationId: string): Promise<UsageSummary> {
    const limits = await this.getPlanLimits(organizationId);
    const org = await organizationRepository.findById(organizationId, {
      include: [{ model: (await import("@/models")).Plan, as: "plan" }],
    });
    if (!org) throw new NotFoundError("Organization not found");
    const plan = org.get("plan") as { id: string; name: string; slug: string } | null;

    const metrics: MetricUsage[] = [];
    for (const metric of Object.keys(limits) as UsageMetric[]) {
      const limit = limits[metric];
      if (typeof limit === "boolean") continue; // feature flags, not numeric usage
      const used = await this.getUsedValue(organizationId, metric);
      metrics.push({ metric, limit, used, remaining: remainingUsage(limit, used), percent: usagePercent(limit, used) });
    }

    return {
      organization_id: organizationId,
      plan: plan ? { id: plan.id, name: plan.name, slug: plan.slug } : null,
      period: resolveCurrentPeriod(),
      metrics,
    };
  }

  /** Monthly usage series for dashboard charts (real data, empty until usage exists) */
  async getUsageSeries(organizationId: string, months = 6) {
    return usageRepository.getMonthlySeries(organizationId, months);
  }

  /** Feature flag helper from the plan */
  async hasFeature(organizationId: string, feature: "white_label_reports" | "api_access"): Promise<boolean> {
    const limits = await this.getPlanLimits(organizationId);
    return limits[feature] === true;
  }

}

export const usageService = new UsageService();
