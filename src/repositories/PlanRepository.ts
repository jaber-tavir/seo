import type { CreationAttributes } from "sequelize";
import { Plan } from "@/models";

export class PlanRepository {
  async findBySlug(slug: string): Promise<Plan | null> {
    return Plan.findOne({ where: { slug } });
  }

  async findById(id: string): Promise<Plan | null> {
    return Plan.findByPk(id);
  }

  async listActive(): Promise<Plan[]> {
    return Plan.findAll({ where: { status: "active" }, order: [["sort_order", "ASC"]] });
  }

  async listAll(): Promise<Plan[]> {
    return Plan.findAll({ order: [["sort_order", "ASC"]] });
  }

  async countAll(): Promise<number> {
    return Plan.count();
  }

  async upsertBySlug(attributes: CreationAttributes<Plan> & { slug: string }): Promise<Plan> {
    const existing = await this.findBySlug(attributes.slug);
    if (existing) {
      await existing.update(attributes);
      return existing;
    }
    return Plan.create(attributes);
  }
}

export const planRepository = new PlanRepository();
