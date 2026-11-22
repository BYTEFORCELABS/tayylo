import { beforeEach, describe, expect, it } from "vitest";
import * as payments from "@/app/api/orders/[id]/payments/route";
import * as fittings from "@/app/api/orders/[id]/fittings/route";
import * as fittingOne from "@/app/api/orders/[id]/fittings/[fittingId]/route";
import * as media from "@/app/api/orders/[id]/media/route";
import * as mediaOne from "@/app/api/orders/[id]/media/[mediaId]/route";
import { call, createClient, createOrder, createTailor, createUser, prisma, resetDb, signInAs, signOut } from "../helpers";

beforeEach(resetDb);

async function setup(priceMinor = 100_000) {
  const t = await createTailor();
  const c = await createClient(t.business.id);
  const o = await createOrder(t.business.id, c.id, { priceMinor });
  return { ...t, client: c, order: o };
}

/** Another tailor's order; leaves the ORIGINAL tailor signed in. */
async function foreignOrder(me: { id: string; email: string }) {
  const other = await createTailor("Other");
  const o = await createOrder(other.business.id, (await createClient(other.business.id)).id);
  signInAs({ id: me.id, email: me.email, role: "tailor" });
  return { ...other, order: o };
}

const pay = (id: string, body: unknown) => call(payments.POST, { params: { id }, body });
const fit = (id: string, body: unknown) => call(fittings.POST, { params: { id }, body });

// ------------------------------------------------------------------ payments

describe("POST /api/orders/[id]/payments", () => {
  it("records a payment and bumps the order's updatedAt", async () => {
    const { order } = await setup();
    const res = await pay(order.id, { amountMinor: 20_000, method: "transfer", reference: "TRX1", paidAt: "2026-11-01T10:00:00.000Z" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ orderId: order.id, amountMinor: 20_000, method: "transfer", reference: "TRX1" });
    expect(new Date(res.body.paidAt).toISOString()).toBe("2026-11-01T10:00:00.000Z");
    const after = await prisma.order.findUnique({ where: { id: order.id } });
    expect(after!.updatedAt.getTime()).toBeGreaterThan(order.updatedAt.getTime());
  });

  it("defaults paidAt to now and an empty reference to null", async () => {
    const { order } = await setup();
    const res = await pay(order.id, { amountMinor: 1, method: "cash", reference: "" });
    expect(res.body.reference).toBeNull();
    expect(Math.abs(new Date(res.body.paidAt).getTime() - Date.now())).toBeLessThan(60_000);
  });

  it.each([
    ["zero", 0],
    ["negative", -500],
    ["non-integer", 10.5],
    ["a string", "100"],
  ])("400 for a %s amount", async (_label, amountMinor) => {
    const { order } = await setup();
    const res = await pay(order.id, { amountMinor, method: "cash" });
    expect(res.status).toBe(400);
    expect(await prisma.payment.count()).toBe(0);
  });

  it("400 (not 500) when the amount is missing", async () => {
    const { order } = await setup();
    expect((await pay(order.id, { method: "cash" })).status).toBe(400);
  });

  it("400 (not 500) when the method is missing", async () => {
    const { order } = await setup();
    expect((await pay(order.id, { amountMinor: 100 })).status).toBe(400);
  });

  it("400 (not 500) for an invalid paidAt", async () => {
    const { order } = await setup();
    expect((await pay(order.id, { amountMinor: 100, method: "cash", paidAt: "yesterday-ish" })).status).toBe(400);
  });

  it("400 when the payment would take the total paid above the price", async () => {
    const { order } = await setup(100_000);
    await pay(order.id, { amountMinor: 90_000, method: "cash" });
    const res = await pay(order.id, { amountMinor: 20_000, method: "cash" });
    expect(res.status).toBe(400);
    expect(await prisma.payment.count()).toBe(1);
  });

  it("400 (not 500) on malformed JSON", async () => {
    const { order } = await setup();
    expect((await call(payments.POST, { params: { id: order.id }, rawBody: "{x" })).status).toBe(400);
  });

  it("404 for another business's order", async () => {
    const { user } = await setup();
    const theirs = await foreignOrder(user);
    const res = await pay(theirs.order.id, { amountMinor: 100, method: "cash" });
    expect(res.status).toBe(404);
    expect(await prisma.payment.count()).toBe(0);
  });

  it("401 signed out / 403 customer role", async () => {
    const { order } = await setup();
    signOut();
    expect((await pay(order.id, { amountMinor: 100, method: "cash" })).status).toBe(401);
    signInAs(await createUser("customer"));
    expect((await pay(order.id, { amountMinor: 100, method: "cash" })).status).toBe(403);
  });
});

// ------------------------------------------------------------------ fittings

describe("POST /api/orders/[id]/fittings", () => {
  it("records a fitting with adjustments, numbered in sequence", async () => {
    const { order } = await setup();
    const first = await fit(order.id, {
      outcome: "adjustments_needed",
      notes: "Take in waist",
      adjustments: [{ fieldKey: "waist", label: "Waist", deltaMm: -10, rawDelta: "-1" }],
    });
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ orderId: order.id, number: 1, outcome: "adjustments_needed", notes: "Take in waist" });
    expect(first.body.adjustments).toHaveLength(1);
    expect(first.body.adjustments[0]).toMatchObject({ fieldKey: "waist", label: "Waist", deltaMm: -10, rawDelta: "-1" });

    const second = await fit(order.id, { outcome: "approved" });
    expect(second.body.number).toBe(2);
    expect(second.body.adjustments).toEqual([]);
    expect(second.body.notes).toBeNull();
  });

  it("400 (not 500) when outcome is missing", async () => {
    const { order } = await setup();
    expect((await fit(order.id, { notes: "x" })).status).toBe(400);
  });

  it("400 for an unknown outcome", async () => {
    const { order } = await setup();
    expect((await fit(order.id, { outcome: "exploded" })).status).toBe(400);
    expect(await prisma.fitting.count()).toBe(0);
  });

  it("400 (not 500) for an adjustment with a non-integer deltaMm", async () => {
    const { order } = await setup();
    const res = await fit(order.id, {
      outcome: "adjustments_needed",
      adjustments: [{ fieldKey: "waist", label: "Waist", deltaMm: "lots", rawDelta: "?" }],
    });
    expect(res.status).toBe(400);
  });

  it("400 (not 500) on malformed JSON", async () => {
    const { order } = await setup();
    expect((await call(fittings.POST, { params: { id: order.id }, rawBody: "x" })).status).toBe(400);
  });

  it("404 for another business's order", async () => {
    const { user } = await setup();
    const theirs = await foreignOrder(user);
    expect((await fit(theirs.order.id, { outcome: "approved" })).status).toBe(404);
    expect(await prisma.fitting.count()).toBe(0);
  });

  it("401 signed out / 403 customer role", async () => {
    const { order } = await setup();
    signOut();
    expect((await fit(order.id, { outcome: "approved" })).status).toBe(401);
    signInAs(await createUser("customer"));
    expect((await fit(order.id, { outcome: "approved" })).status).toBe(403);
  });
});

describe("DELETE /api/orders/[id]/fittings/[fittingId]", () => {
  const del = (id: string, fittingId: string) => call(fittingOne.DELETE, { method: "DELETE", params: { id, fittingId } });

  it("deletes the fitting (with adjustments) and renumbers later fittings", async () => {
    const { order } = await setup();
    const f1 = (await fit(order.id, { outcome: "adjustments_needed", adjustments: [{ fieldKey: "w", label: "W", deltaMm: 5, rawDelta: "0.5" }] })).body;
    const f2 = (await fit(order.id, { outcome: "adjustments_needed" })).body;
    const f3 = (await fit(order.id, { outcome: "approved" })).body;

    const res = await del(order.id, f1.id);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    const left = await prisma.fitting.findMany({ where: { orderId: order.id }, orderBy: { number: "asc" } });
    expect(left.map(f => [f.id, f.number])).toEqual([
      [f2.id, 1],
      [f3.id, 2],
    ]);
    expect(await prisma.fittingAdjustment.count()).toBe(0);
  });

  it("a new fitting after a delete gets the next number (no duplicates)", async () => {
    const { order } = await setup();
    const f1 = (await fit(order.id, { outcome: "approved" })).body;
    await fit(order.id, { outcome: "approved" });
    await del(order.id, f1.id);
    const f3 = await fit(order.id, { outcome: "approved" });
    expect(f3.body.number).toBe(2);
  });

  it("404 for a fitting that belongs to a different order of the same business", async () => {
    const { business, client, order } = await setup();
    const otherOrder = await createOrder(business.id, client.id);
    const f = (await fit(otherOrder.id, { outcome: "approved" })).body;
    expect((await del(order.id, f.id)).status).toBe(404);
    expect(await prisma.fitting.count({ where: { id: f.id } })).toBe(1);
  });

  it("404 for another business's order + fitting", async () => {
    const { user } = await setup();
    const theirs = await foreignOrder(user);
    const f = await prisma.fitting.create({ data: { orderId: theirs.order.id, number: 1, outcome: "approved" } });
    expect((await del(theirs.order.id, f.id)).status).toBe(404);
    expect(await prisma.fitting.count({ where: { id: f.id } })).toBe(1);
  });

  it("404 when pairing my order id with another business's fitting id", async () => {
    const { user, order } = await setup();
    const theirs = await foreignOrder(user);
    const f = await prisma.fitting.create({ data: { orderId: theirs.order.id, number: 1, outcome: "approved" } });
    expect((await del(order.id, f.id)).status).toBe(404);
    expect(await prisma.fitting.count({ where: { id: f.id } })).toBe(1);
  });

  it("404 for an unknown fitting id", async () => {
    const { order } = await setup();
    expect((await del(order.id, "00000000-0000-0000-0000-000000000000")).status).toBe(404);
  });
});

// ------------------------------------------------------------------ media

describe("POST /api/orders/[id]/media", () => {
  const add = (id: string, body: unknown) => call(media.POST, { params: { id }, body });

  it("adds a photo to the order", async () => {
    const { business, order } = await setup();
    const res = await add(order.id, { url: "data:image/png;base64,AAAA", caption: "Fabric" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ businessId: business.id, ownerType: "order", ownerId: order.id, caption: "Fabric" });
  });

  it("400 when url is missing or empty", async () => {
    const { order } = await setup();
    expect((await add(order.id, {})).status).toBe(400);
    expect((await add(order.id, { url: "" })).status).toBe(400);
  });

  it("400 when url is not an image", async () => {
    const { order } = await setup();
    expect((await add(order.id, { url: "javascript:alert(1)" })).status).toBe(400);
    expect(await prisma.media.count()).toBe(0);
  });

  it("400 (not 500) on malformed JSON", async () => {
    const { order } = await setup();
    expect((await call(media.POST, { params: { id: order.id }, rawBody: "x" })).status).toBe(400);
  });

  it("404 for another business's order", async () => {
    const { user } = await setup();
    const theirs = await foreignOrder(user);
    expect((await add(theirs.order.id, { url: "data:image/png;base64,AAAA" })).status).toBe(404);
    expect(await prisma.media.count()).toBe(0);
  });
});

describe("DELETE /api/orders/[id]/media/[mediaId]", () => {
  const del = (id: string, mediaId: string) => call(mediaOne.DELETE, { method: "DELETE", params: { id, mediaId } });

  it("deletes the photo", async () => {
    const { business, order } = await setup();
    const m = await prisma.media.create({ data: { businessId: business.id, ownerType: "order", ownerId: order.id, url: "u" } });
    const res = await del(order.id, m.id);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(await prisma.media.count()).toBe(0);
  });

  it("404 for a photo on a different order", async () => {
    const { business, client, order } = await setup();
    const other = await createOrder(business.id, client.id);
    const m = await prisma.media.create({ data: { businessId: business.id, ownerType: "order", ownerId: other.id, url: "u" } });
    expect((await del(order.id, m.id)).status).toBe(404);
    expect(await prisma.media.count()).toBe(1);
  });

  it("404 for a client photo addressed through an order", async () => {
    const { business, client, order } = await setup();
    const m = await prisma.media.create({ data: { businessId: business.id, ownerType: "customer", ownerId: client.id, url: "u" } });
    expect((await del(order.id, m.id)).status).toBe(404);
  });

  it("404 for another business's photo", async () => {
    const { user } = await setup();
    const theirs = await foreignOrder(user);
    const m = await prisma.media.create({ data: { businessId: theirs.business.id, ownerType: "order", ownerId: theirs.order.id, url: "u" } });
    expect((await del(theirs.order.id, m.id)).status).toBe(404);
    expect(await prisma.media.count()).toBe(1);
  });

  it("401 when signed out", async () => {
    const { business, order } = await setup();
    const m = await prisma.media.create({ data: { businessId: business.id, ownerType: "order", ownerId: order.id, url: "u" } });
    signOut();
    expect((await del(order.id, m.id)).status).toBe(401);
  });
});
