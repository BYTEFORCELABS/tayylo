import { prisma } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/auth-helpers";
import { getAppSettings } from "@/lib/app-settings";
import { effectivePlan, listPlans } from "@/lib/billing/plans";
import { paystackEnabled } from "@/lib/billing/paystack";

// The signed-in user's plan, usage and the plans on offer. Used by the web
// Settings page and the mobile app's upgrade screen.
export async function GET() {
  try {
    const { userId } = await requireUser();
    const [settings, { plan, subscription, paid }, plans, business] = await Promise.all([
      getAppSettings(),
      effectivePlan(userId),
      listPlans(),
      prisma.business.findUnique({ where: { ownerId: userId }, select: { id: true, currency: true } }),
    ]);
    const clients = business ? await prisma.customer.count({ where: { businessId: business.id } }) : 0;

    return Response.json({
      billingEnabled: settings.billingEnabled,
      checkout: { web: settings.billingEnabled && paystackEnabled() },
      currency: business?.currency ?? "NGN",
      plan: {
        key: plan.key,
        name: plan.name,
        paid,
        limits: { maxClients: plan.maxClients, customBranding: plan.customBranding, explorePosting: plan.explorePosting },
      },
      subscription:
        subscription && paid
          ? {
              status: subscription.status,
              provider: subscription.provider,
              interval: subscription.interval,
              currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            }
          : null,
      usage: { clients },
      plans: plans.map(p => ({
        key: p.key,
        name: p.name,
        tagline: p.tagline,
        features: p.features,
        isDefault: p.isDefault,
        revenuecatEntitlement: p.revenuecatEntitlement,
        prices: p.prices.map(pr => ({ interval: pr.interval, currency: pr.currency, amountMinor: pr.amountMinor })),
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
