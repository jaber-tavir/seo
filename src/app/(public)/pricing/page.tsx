import type { Metadata } from "next";
import { CheckCircle2, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { planRepository } from "@/repositories/PlanRepository";
import { formatCurrency } from "@/lib/utils";
import type { Plan } from "@/models";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, scalable pricing for the all-in-one SEO platform. Start free, upgrade when you need more projects, crawls and keywords.",
  alternates: { canonical: "/pricing" },
};

export const dynamic = "force-dynamic";

function serializePlan(plan: Plan) {
  return {
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    price: plan.price,
    features: plan.features ?? [],
  };
}

export default async function PricingPage() {
  // Real plans from the database (seeded via `npm run db:seed`)
  const plans = (await planRepository.listActive()).map(serializePlan);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Simple pricing that scales with you</h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-2xl">
          Start on the free plan and upgrade as your SEO program grows. All plans include the core SEO toolkit.
        </p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan, index) => (
          <Card key={plan.id} className={index === 2 ? "border-primary relative shadow-md" : undefined}>
            {index === 2 ? (
              <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">Most popular</Badge>
            ) : null}
            <CardHeader>
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              <CardDescription>
                <span className="text-foreground text-3xl font-bold">{formatCurrency(plan.price)}</span>
                <span className="text-muted-foreground"> / month</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant={index === 2 ? "default" : "outline"} asChild>
                <a href="/register">{plan.price === 0 ? "Start free" : `Choose ${plan.name}`}</a>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <p className="text-muted-foreground mt-10 text-center text-sm">
        <Minus className="mr-1 inline size-3" />
        Online checkout and subscription management arrive with the billing phase — plan limits are enforced already.
      </p>
    </div>
  );
}
