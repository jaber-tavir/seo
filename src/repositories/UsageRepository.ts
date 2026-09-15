import { Op, col, fn } from "sequelize";
import { Usage } from "@/models/Usage";
import type { UsageMetric } from "@/constants";
import type { Transaction } from "sequelize";

export class UsageRepository {
  async findCurrent(organizationId: string, metric: UsageMetric, periodStart: Date): Promise<Usage | null> {
    return Usage.findOne({ where: { organization_id: organizationId, metric, period_start: periodStart } });
  }

  async create(
    attributes: {
      organization_id: string;
      metric: UsageMetric;
      amount: number;
      period_start: Date;
      period_end: Date;
    },
    transaction?: Transaction
  ): Promise<Usage> {
    return Usage.create(attributes, { transaction });
  }

  /** Atomic amount += n (safe under concurrency) */
  async increment(usage: Usage, amount: number, transaction?: Transaction): Promise<void> {
    await usage.increment("amount", { by: amount, transaction });
  }

  async sumMetric(organizationId: string, metric: UsageMetric, periodStart: Date): Promise<number> {
    const result = await Usage.sum("amount", {
      where: { organization_id: organizationId, metric, period_start: periodStart },
    });
    return typeof result === "number" ? result : 0;
  }

  async listCurrent(organizationId: string, periodStart: Date): Promise<Usage[]> {
    return Usage.findAll({ where: { organization_id: organizationId, period_start: periodStart } });
  }

  /** Monthly usage series for dashboard charts (sums per period) */
  async getMonthlySeries(organizationId: string, months = 6): Promise<Array<{ period_start: Date; metric: UsageMetric; total: number }>> {
    const since = new Date();
    since.setMonth(since.getMonth() - (months - 1));
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const rows = await Usage.findAll({
      where: { organization_id: organizationId, period_start: { [Op.gte]: since } },
      attributes: ["period_start", "metric", [fn("SUM", col("amount")), "total"]],
      group: [col("period_start"), col("metric")],
      order: [["period_start", "ASC"]],
      raw: true,
    });
    return rows as unknown as Array<{ period_start: Date; metric: UsageMetric; total: number }>;
  }

  async countActiveOrganizations(periodStart: Date): Promise<number> {
    return Usage.count({ where: { period_start: periodStart }, distinct: true, col: "organization_id" });
  }
}

export const usageRepository = new UsageRepository();
