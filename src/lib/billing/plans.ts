import type { Plan, Prisma, Subscription } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/auth-helpers";
import { getAppSettings } from "@/lib/app-settings";

/**
 * Which plan a user is on. A subscription counts while it's active, trialing,
 * past due (grace while the provider retries) or cancelled but not yet at the
 * end of its paid period. Everyone else is on the default (free) plan.
 */
export const LIVE_STATUSES = ["active", "trialing", "past_due", "cancelled"] as const;

export function liveSubscriptionWhere(now = new Date()): Prisma.SubscriptionWhereInput {
  return {
    status: { in: [...LIVE_STATUSES] },
    OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
  };
}

export function isLive(sub: Pick<Subscription, "status" | "currentPeriodEnd"> | null | undefined, now = new Date()) {
  if (!sub) return false;
  if (!(LIVE_STATUSES as readonly string[]).includes(sub.status)) return false;
  return !sub.currentPeriodEnd || sub.currentPeriodEnd > now;
}

/** Used only if the database has no default plan: no limits at all. */
const FALLBACK_FREE: Plan = {
  key: "free",
  name: "Free",
  tagline: "",
  features: [],
  maxClients: null,
  customBranding: true,
  explorePosting: true,
  isDefault: true,
  active: true,
  sortOrder: 0,
  revenuecatEntitlement: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

export async function defaultPlan(): Promise<Plan> {
  return (await prisma.plan.findFirst({ where: { isDefault: true }, orderBy: { sortOrder: "asc" } })) ?? FALLBACK_FREE;
}

export async function effectivePlan(userId: string) {
  const sub = await prisma.subscription.findUnique({ where: { userId }, include: { plan: true } });
  if (sub && isLive(sub)) return { plan: sub.plan, subscription: sub, paid: !sub.plan.isDefault };
  return { plan: await defaultPlan(), subscription: sub, paid: false };
}

export type Feature = "addClients" | "customBranding" | "explorePosting";

/**
 * Throws 402 when the user's plan doesn't allow the action. Does nothing
 * until billing is switched on in the admin portal's App controls.
 * `adding` is how many clients the action would add.
 */
export async function assertPlanAllows(userId: string, feature: Feature, opts: { businessId?: string; adding?: number } = {}) {
  if (!(await getAppSettings()).billingEnabled) return;
  const { plan } = await effectivePlan(userId);

  if (feature === "addClients" && plan.maxClients !== null && opts.businessId) {
    const count = await prisma.customer.count({ where: { businessId: opts.businessId } });
    if (count + (opts.adding ?? 1) > plan.maxClients) {
      throw new ApiError(402, `The ${plan.name} plan includes up to ${plan.maxClients} clients. Upgrade to add more.`);
    }
  }
  if (feature === "customBranding" && !plan.customBranding) {
    throw new ApiError(402, `Your studio logo on documents is a paid feature. Upgrade to add it.`);
  }
  if (feature === "explorePosting" && !plan.explorePosting) {
    throw new ApiError(402, `Posting to Explore isn't included in the ${plan.name} plan. Upgrade to post.`);
  }
}

/** Plans to offer, with their active prices, in display order. */
export async function listPlans() {
  return prisma.plan.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: { prices: { where: { active: true }, orderBy: [{ currency: "asc" }, { interval: "asc" }] } },
  });
}
