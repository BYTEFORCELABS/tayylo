import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Turns payment-provider webhooks into the user's Subscription row.
 * Each event is recorded once in BillingEvent (provider + externalId), so a
 * webhook delivered twice is applied once.
 */

/** Records the event; returns false if it was already processed. */
async function recordOnce(e: {
  provider: string;
  type: string;
  externalId: string;
  userId?: string | null;
  amountMinor?: number | null;
  currency?: string | null;
  payload: unknown;
}) {
  try {
    await prisma.billingEvent.create({
      data: {
        provider: e.provider,
        type: e.type,
        externalId: e.externalId,
        userId: e.userId ?? null,
        amountMinor: e.amountMinor ?? null,
        currency: e.currency ?? null,
        payload: e.payload as Prisma.InputJsonValue,
      },
    });
    return true;
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") return false;
    throw err;
  }
}

const addInterval = (from: Date, interval: string | null | undefined) => {
  const d = new Date(from);
  if (interval === "yearly" || interval === "annually") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
};

// ---------------------------------------------------------------- Paystack

interface PaystackData {
  id?: number;
  reference?: string;
  amount?: number;
  currency?: string;
  status?: string;
  paid_at?: string;
  subscription_code?: string;
  next_payment_date?: string | null;
  metadata?: { userId?: string } | string | null;
  customer?: { customer_code?: string; email?: string };
  plan?: { plan_code?: string; interval?: string; amount?: number; currency?: string } | Record<string, never>;
  subscription?: { subscription_code?: string; next_payment_date?: string | null };
}

/** Finds our user: metadata first (checkout), then the Paystack customer, then email. */
async function paystackUser(d: PaystackData) {
  const meta = typeof d.metadata === "object" && d.metadata ? d.metadata : null;
  if (meta?.userId) {
    const u = await prisma.user.findUnique({ where: { id: meta.userId }, select: { id: true } });
    if (u) return u.id;
  }
  if (d.customer?.customer_code) {
    const s = await prisma.subscription.findFirst({ where: { providerCustomerId: d.customer.customer_code }, select: { userId: true } });
    if (s) return s.userId;
  }
  if (d.customer?.email) {
    const u = await prisma.user.findUnique({ where: { email: d.customer.email.toLowerCase() }, select: { id: true } });
    if (u) return u.id;
  }
  return null;
}

async function priceForPlanCode(code: string | undefined) {
  if (!code) return null;
  return prisma.planPrice.findFirst({ where: { paystackPlanCode: code } });
}

export async function applyPaystackEvent(event: { event: string; data: PaystackData }) {
  const { event: type, data: d } = event;
  const externalId = `${type}:${d.id ?? d.reference ?? d.subscription_code ?? crypto.createHash("sha256").update(JSON.stringify(event)).digest("hex")}`;
  const userId = await paystackUser(d);
  const fresh = await recordOnce({
    provider: "paystack",
    type,
    externalId,
    userId,
    amountMinor: type === "charge.success" ? d.amount ?? null : null,
    currency: d.currency ?? d.plan?.currency ?? null,
    payload: event,
  });
  if (!fresh || !userId) return { applied: false, userId };

  const price = await priceForPlanCode(d.plan?.plan_code);
  const existing = await prisma.subscription.findUnique({ where: { userId } });
  const base = {
    provider: "paystack",
    providerCustomerId: d.customer?.customer_code ?? existing?.providerCustomerId ?? null,
  };

  switch (type) {
    case "subscription.create":
    case "charge.success": {
      // A one-off charge without a plan isn't a subscription payment.
      if (!price) break;
      const periodEnd = d.next_payment_date
        ? new Date(d.next_payment_date)
        : d.subscription?.next_payment_date
          ? new Date(d.subscription.next_payment_date)
          : addInterval(d.paid_at ? new Date(d.paid_at) : new Date(), price.interval);
      const data = {
        ...base,
        planKey: price.planKey,
        status: "active",
        interval: price.interval,
        currency: price.currency,
        amountMinor: price.amountMinor,
        providerSubscriptionId: d.subscription_code ?? d.subscription?.subscription_code ?? existing?.providerSubscriptionId ?? null,
        currentPeriodEnd: existing?.currentPeriodEnd && existing.currentPeriodEnd > periodEnd ? existing.currentPeriodEnd : periodEnd,
        cancelAtPeriodEnd: false,
        note: null,
      };
      await prisma.subscription.upsert({ where: { userId }, create: { userId, ...data }, update: data });
      break;
    }
    case "invoice.payment_failed":
      if (existing?.provider === "paystack") await prisma.subscription.update({ where: { userId }, data: { status: "past_due" } });
      break;
    case "subscription.not_renew":
      if (existing?.provider === "paystack") {
        await prisma.subscription.update({ where: { userId }, data: { status: "cancelled", cancelAtPeriodEnd: true } });
      }
      break;
    case "subscription.disable":
      if (existing?.provider === "paystack" && (!d.subscription_code || existing.providerSubscriptionId === d.subscription_code)) {
        await prisma.subscription.update({ where: { userId }, data: { status: "expired", currentPeriodEnd: new Date() } });
      }
      break;
  }
  return { applied: true, userId };
}

// ---------------------------------------------------------------- RevenueCat (App Store / Google Play)

interface RevenueCatEvent {
  id: string;
  type: string;
  app_user_id: string;
  original_app_user_id?: string;
  aliases?: string[];
  entitlement_ids?: string[] | null;
  product_id?: string;
  period_type?: string;
  expiration_at_ms?: number | null;
  store?: string;
  price?: number | null;
  currency?: string | null;
  original_transaction_id?: string;
}

export async function applyRevenueCatEvent(e: RevenueCatEvent) {
  // The app identifies purchasers by their Tayylo user id.
  const ids = [e.app_user_id, e.original_app_user_id, ...(e.aliases ?? [])].filter(Boolean) as string[];
  const user = await prisma.user.findFirst({ where: { id: { in: ids.filter(id => /^[0-9a-f-]{36}$/i.test(id)) } }, select: { id: true } });
  const userId = user?.id ?? null;
  const fresh = await recordOnce({
    provider: "revenuecat",
    type: e.type,
    externalId: e.id,
    userId,
    amountMinor: e.price != null && ["INITIAL_PURCHASE", "RENEWAL"].includes(e.type) ? Math.round(e.price * 100) : null,
    currency: e.currency ?? null,
    payload: e,
  });
  if (!fresh || !userId || e.type === "TEST") return { applied: false, userId };

  const provider = e.store === "PLAY_STORE" ? "google" : "apple";
  const plan = e.entitlement_ids?.length
    ? await prisma.plan.findFirst({ where: { revenuecatEntitlement: { in: e.entitlement_ids } }, orderBy: { sortOrder: "desc" } })
    : null;
  const existing = await prisma.subscription.findUnique({ where: { userId } });
  const expires = e.expiration_at_ms ? new Date(e.expiration_at_ms) : null;
  // A store event must not override a subscription paid somewhere else.
  const ours = !existing || existing.provider === provider || !(existing.currentPeriodEnd && existing.currentPeriodEnd > new Date());

  switch (e.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "PRODUCT_CHANGE":
    case "SUBSCRIPTION_EXTENDED": {
      if (!plan || !ours) break;
      const data = {
        planKey: plan.key,
        status: e.period_type === "TRIAL" ? "trialing" : "active",
        provider,
        interval: /year|annual/i.test(e.product_id ?? "") ? "yearly" : "monthly",
        currency: e.currency ?? null,
        amountMinor: e.price != null ? Math.round(e.price * 100) : null,
        providerSubscriptionId: e.original_transaction_id ?? e.product_id ?? null,
        providerCustomerId: e.original_app_user_id ?? null,
        currentPeriodEnd: expires,
        cancelAtPeriodEnd: false,
        note: null,
      };
      await prisma.subscription.upsert({ where: { userId }, create: { userId, ...data }, update: data });
      break;
    }
    case "CANCELLATION":
      if (existing?.provider === provider) {
        await prisma.subscription.update({ where: { userId }, data: { status: "cancelled", cancelAtPeriodEnd: true, ...(expires ? { currentPeriodEnd: expires } : {}) } });
      }
      break;
    case "BILLING_ISSUE":
      if (existing?.provider === provider) await prisma.subscription.update({ where: { userId }, data: { status: "past_due" } });
      break;
    case "EXPIRATION":
      if (existing?.provider === provider) {
        await prisma.subscription.update({ where: { userId }, data: { status: "expired", currentPeriodEnd: expires ?? new Date() } });
      }
      break;
  }
  return { applied: true, userId };
}
