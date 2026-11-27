import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireStaffPage } from "@/lib/admin/auth";
import { liveSubscriptionWhere } from "@/lib/billing/plans";
import { PageHeader, Section } from "@/components/admin/ui";
import { NewPlanForm, PlanEditor } from "@/components/admin/plan-editor";

export const metadata: Metadata = { title: "Plans & prices" };

export default async function PlansPage() {
  await requireStaffPage("owner");
  const [plans, counts] = await Promise.all([
    prisma.plan.findMany({ orderBy: { sortOrder: "asc" }, include: { prices: { where: { active: true }, orderBy: [{ currency: "asc" }, { interval: "asc" }] } } }),
    prisma.subscription.groupBy({ by: ["planKey"], where: liveSubscriptionWhere(), _count: { _all: true } }),
  ]);

  return (
    <>
      <PageHeader title="Plans & prices" description="What each plan includes and costs. Changes apply to the web and mobile apps straight away." />
      <div className="max-w-3xl space-y-6">
        {plans.map(p => (
          <PlanEditor
            key={p.key + p.updatedAt.toISOString()}
            plan={{
              key: p.key,
              name: p.name,
              tagline: p.tagline,
              features: p.features,
              maxClients: p.maxClients,
              customBranding: p.customBranding,
              explorePosting: p.explorePosting,
              active: p.active,
              isDefault: p.isDefault,
              sortOrder: p.sortOrder,
              revenuecatEntitlement: p.revenuecatEntitlement,
              prices: p.prices.map(x => ({ interval: x.interval as "monthly" | "yearly", currency: x.currency, amountMinor: x.amountMinor })),
              subscribers: counts.find(c => c.planKey === p.key)?._count._all ?? 0,
            }}
          />
        ))}
        <Section title="Add a plan" description="For example a bigger Studio tier. New plans start switched off.">
          <NewPlanForm />
        </Section>
      </div>
    </>
  );
}
