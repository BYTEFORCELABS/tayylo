import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as billing from "@/app/api/billing/route";
import * as checkout from "@/app/api/billing/checkout/route";
import * as paystackHook from "@/app/api/billing/paystack/webhook/route";
import * as rcHook from "@/app/api/billing/revenuecat/webhook/route";
import * as customers from "@/app/api/customers/route";
import * as importRoute from "@/app/api/customers/import/route";
import * as business from "@/app/api/business/route";
import * as grant from "@/app/api/admin/users/[id]/subscription/route";
import * as planAdmin from "@/app/api/admin/plans/[key]/route";
import { clearAppSettingsCache } from "@/lib/app-settings";
import { effectivePlan } from "@/lib/billing/plans";
import { subscriptionStats } from "@/lib/admin/stats";
import { call, createTailor, createUser, prisma, resetDb, signInAs } from "../helpers";

const SECRET = "sk_test_secret";

beforeEach(async () => {
  await resetDb();
  clearAppSettingsCache();
  vi.stubEnv("PAYSTACK_SECRET_KEY", SECRET);
  vi.stubEnv("REVENUECAT_WEBHOOK_AUTH", "rc-secret");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function plans({ maxClients = 2 } = {}) {
  await prisma.plan.create({ data: { key: "free", name: "Free", isDefault: true, maxClients, customBranding: false, explorePosting: true, sortOrder: 0 } });
  await prisma.plan.create({
    data: {
      key: "pro",
      name: "Pro",
      maxClients: null,
      customBranding: true,
      explorePosting: true,
      sortOrder: 1,
      revenuecatEntitlement: "pro",
      prices: { create: [{ interval: "monthly", currency: "NGN", amountMinor: 500000, paystackPlanCode: "PLN_monthly" }, { interval: "yearly", currency: "NGN", amountMinor: 5000000 }] },
    },
  });
}
const billingOn = () => prisma.appSetting.create({ data: { key: "billingEnabled", value: true } });

const addClient = () => call(customers.POST, { body: { fullName: `Client ${Math.random()}` } });

function signedPaystack(event: unknown) {
  const raw = JSON.stringify(event);
  const sig = crypto.createHmac("sha512", SECRET).update(raw).digest("hex");
  return call(paystackHook.POST, { rawBody: raw, headers: { "x-paystack-signature": sig, "content-type": "application/json" }, method: "POST" });
}
const charge = (userId: string, id = 1, extra: Record<string, unknown> = {}) => ({
  event: "charge.success",
  data: { id, reference: `ref-${id}`, amount: 500000, currency: "NGN", paid_at: new Date().toISOString(), metadata: { userId }, customer: { customer_code: "CUS_1", email: "x@test.local" }, plan: { plan_code: "PLN_monthly" }, ...extra },
});

describe("plan limits", () => {
  it("don't apply until billing is switched on", async () => {
    await plans({ maxClients: 1 });
    await createTailor();
    for (let i = 0; i < 3; i++) expect((await addClient()).status).toBe(201);
  });

  it("cap clients, imports and the studio logo on the free plan; Pro lifts them", async () => {
    await plans({ maxClients: 2 });
    await billingOn();
    const { user } = await createTailor();
    expect((await addClient()).status).toBe(201);
    expect((await addClient()).status).toBe(201);
    const blocked = await addClient();
    expect(blocked.status).toBe(402);
    expect(blocked.body.error).toMatch(/up to 2 clients/);
    expect((await call(importRoute.POST, { body: [{ fullName: "A" }] })).status).toBe(402);
    expect((await call(business.PATCH, { method: "PATCH", body: { logoUrl: "data:image/png;base64,AAAA" } })).status).toBe(402);
    expect((await call(business.PATCH, { method: "PATCH", body: { logoUrl: null } })).status).toBe(200); // removing is always fine

    await prisma.subscription.create({ data: { userId: user.id, planKey: "pro", status: "active", provider: "manual" } });
    expect((await addClient()).status).toBe(201);
    expect((await call(business.PATCH, { method: "PATCH", body: { logoUrl: "data:image/png;base64,AAAA" } })).status).toBe(200);
  });

  it("GET /api/billing reports plan, usage and offers", async () => {
    await plans();
    await billingOn();
    await createTailor();
    await addClient();
    const res = await call(billing.GET);
    expect(res.body).toMatchObject({ billingEnabled: true, plan: { key: "free", paid: false, limits: { maxClients: 2 } }, usage: { clients: 1 }, currency: "NGN" });
    expect(res.body.plans.map((p: { key: string }) => p.key)).toEqual(["free", "pro"]);
  });
});

describe("Paystack", () => {
  it("checkout creates the Paystack plan once and returns the payment page", async () => {
    await plans();
    await billingOn();
    await createTailor();
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      void _init;
      if (url.endsWith("/plan")) return Response.json({ status: true, data: { plan_code: "PLN_new_yearly" } });
      return Response.json({ status: true, data: { authorization_url: "https://checkout.paystack.com/abc", reference: "r" } });
    });
    vi.stubGlobal("fetch", fetchMock);
    const res = await call(checkout.POST, { body: { planKey: "pro", interval: "yearly" } });
    expect(res.status).toBe(200);
    expect(res.body.url).toBe("https://checkout.paystack.com/abc");
    expect((await prisma.planPrice.findFirst({ where: { interval: "yearly" } }))?.paystackPlanCode).toBe("PLN_new_yearly");
    const init = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(init).toMatchObject({ plan: "PLN_new_yearly", currency: "NGN", metadata: { planKey: "pro" } });
  });

  it("checkout is closed while billing is off", async () => {
    await plans();
    await createTailor();
    expect((await call(checkout.POST, { body: { planKey: "pro", interval: "monthly" } })).status).toBe(503);
  });

  it("refuses unsigned webhooks", async () => {
    const res = await call(paystackHook.POST, { rawBody: JSON.stringify(charge("x")), headers: { "x-paystack-signature": "bad" }, method: "POST" });
    expect(res.status).toBe(401);
  });

  it("a payment starts Pro once, even if delivered twice; failure, cancel and disable follow", async () => {
    await plans();
    const { user } = await createTailor();
    expect((await signedPaystack(charge(user.id))).status).toBe(200);
    expect((await signedPaystack(charge(user.id))).status).toBe(200);
    expect(await prisma.billingEvent.count()).toBe(1);
    let p = await effectivePlan(user.id);
    expect(p).toMatchObject({ paid: true, plan: { key: "pro" }, subscription: { provider: "paystack", status: "active", amountMinor: 500000 } });
    expect(p.subscription!.currentPeriodEnd!.getTime()).toBeGreaterThan(Date.now() + 27 * 864e5);

    await signedPaystack({ event: "subscription.create", data: { id: 9, subscription_code: "SUB_1", customer: { customer_code: "CUS_1" }, plan: { plan_code: "PLN_monthly" } } });
    await signedPaystack({ event: "invoice.payment_failed", data: { id: 10, customer: { customer_code: "CUS_1" } } });
    expect((await effectivePlan(user.id)).subscription?.status).toBe("past_due");
    expect((await effectivePlan(user.id)).paid).toBe(true); // grace while Paystack retries

    await signedPaystack({ event: "subscription.not_renew", data: { id: 11, subscription_code: "SUB_1", customer: { customer_code: "CUS_1" } } });
    p = await effectivePlan(user.id);
    expect(p).toMatchObject({ paid: true, subscription: { status: "cancelled", cancelAtPeriodEnd: true } });

    await signedPaystack({ event: "subscription.disable", data: { id: 12, subscription_code: "SUB_1", customer: { customer_code: "CUS_1" } } });
    p = await effectivePlan(user.id);
    expect(p).toMatchObject({ paid: false, plan: { key: "free" } });
  });

  it("renewals at an old price still count after the price changes", async () => {
    await plans();
    const { user } = await createTailor();
    const owner = await createUser();
    await prisma.user.update({ where: { id: owner.id }, data: { staffRole: "owner" } });
    signInAs(owner);
    const res = await call(planAdmin.PATCH, {
      method: "PATCH",
      params: { key: "pro" },
      body: { name: "Pro", maxClients: null, customBranding: true, explorePosting: true, prices: [{ interval: "monthly", currency: "NGN", amountMinor: 700000 }] },
    });
    expect(res.status).toBe(200);
    expect(res.body.prices).toEqual([expect.objectContaining({ interval: "monthly", amountMinor: 700000, paystackPlanCode: null })]);
    expect(await prisma.planPrice.count({ where: { paystackPlanCode: "PLN_monthly", active: false } })).toBe(1);

    await signedPaystack(charge(user.id, 50));
    expect((await effectivePlan(user.id)).plan.key).toBe("pro");
  });
});

describe("RevenueCat (app stores)", () => {
  const rc = (event: Record<string, unknown>, auth = "rc-secret") =>
    call(rcHook.POST, { body: { event: { id: crypto.randomUUID(), store: "APP_STORE", entitlement_ids: ["pro"], ...event } }, headers: { authorization: `Bearer ${auth}` } });

  it("needs the shared secret", async () => {
    expect((await rc({ type: "TEST", app_user_id: "x" }, "wrong")).status).toBe(401);
  });

  it("a purchase grants the plan; expiration ends it", async () => {
    await plans();
    const { user } = await createTailor();
    await rc({ type: "INITIAL_PURCHASE", app_user_id: user.id, product_id: "pro_monthly", price: 4.99, currency: "USD", expiration_at_ms: Date.now() + 30 * 864e5 });
    expect(await effectivePlan(user.id)).toMatchObject({ paid: true, subscription: { provider: "apple", status: "active", amountMinor: 499 } });
    await rc({ type: "EXPIRATION", app_user_id: user.id, expiration_at_ms: Date.now() - 1000 });
    expect((await effectivePlan(user.id)).paid).toBe(false);
  });

  it("doesn't override an active web subscription", async () => {
    await plans();
    const { user } = await createTailor();
    await signedPaystack(charge(user.id));
    await rc({ type: "INITIAL_PURCHASE", app_user_id: user.id, product_id: "pro_monthly", expiration_at_ms: Date.now() + 864e5 });
    expect((await effectivePlan(user.id)).subscription?.provider).toBe("paystack");
  });
});

describe("free plans from Tayylo and stats", () => {
  it("admins can give and remove a plan; stats add up", async () => {
    await plans();
    const { user } = await createTailor();
    const { user: payer } = await createTailor();
    await createTailor();
    const admin = await createUser("customer"); // staff, but not a tailor, so not counted below
    await prisma.user.update({ where: { id: admin.id }, data: { staffRole: "admin" } });
    signInAs(admin);

    expect((await call(grant.PUT, { method: "PUT", params: { id: user.id }, body: { planKey: "pro", until: null, note: "x" } })).status).toBe(400);
    expect((await call(grant.PUT, { method: "PUT", params: { id: user.id }, body: { planKey: "pro", until: null, note: "Launch partner" } })).status).toBe(200);
    expect(await effectivePlan(user.id)).toMatchObject({ paid: true, subscription: { provider: "manual", note: "Launch partner" } });

    await signedPaystack(charge(payer.id));
    expect((await call(grant.PUT, { method: "PUT", params: { id: payer.id }, body: { planKey: "pro", until: null, note: "Launch partner" } })).status).toBe(409);

    const s = await subscriptionStats();
    expect(s).toMatchObject({ paidTotal: 2, paying: 1, complimentary: 1, freeTailors: 1, mrr: [{ currency: "NGN", minor: 500000 }], revenue30: [{ currency: "NGN", minor: 500000 }] });

    expect((await call(grant.DELETE, { method: "DELETE", params: { id: user.id } })).status).toBe(200);
    expect((await effectivePlan(user.id)).paid).toBe(false);
    expect((await call(grant.DELETE, { method: "DELETE", params: { id: payer.id } })).status).toBe(404);
  });
});
