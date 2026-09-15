import { ok, withApi } from "@/lib/api";
import { planRepository } from "@/repositories/PlanRepository";

export const dynamic = "force-dynamic";

export const GET = withApi(
  async () => {
    const plans = await planRepository.listActive();
    return ok({
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        billing_interval: p.billing_interval,
        limits: p.limits,
        features: p.features,
        sort_order: p.sort_order,
      })),
    });
  },
  { auth: "none" }
);
