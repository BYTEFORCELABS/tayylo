import { beforeEach, describe, expect, it } from "vitest";
import * as list from "@/app/api/orders/route";
import * as one from "@/app/api/orders/[id]/route";
import {
  call,
  createClient,
  createMeasurementSet,
  createOrder,
  createTailor,
  createTemplate,
  createUser,
  prisma,
  resetDb,
  signInAs,
  signOut,
} from "../helpers";

beforeEach(resetDb);

const dueAt = () => new Date(Date.now() + 7 * 864e5).toISOString();

function orderBody(customerId: string, extra: Record<string, unknown> = {}) {
  return {
    customerId,
    customerName: "Ada",
    number: "1010",
    dueAt: dueAt(),
    priceMinor: 5_000_000,
    currency: "NGN",
    items: [{ garmentType: "Agbada", styleNotes: "Wide sleeves" }],
    ...extra,
  };
}

async function addOrderMedia(businessId: string, orderId: string, url = "data:image/png;base64,AAAA") {
  return prisma.media.create({ data: { businessId, ownerType: "order", ownerId: orderId, url } });
}

// ------------------------------------------------------------------ list

describe("GET /api/orders", () => {
  it("401 when signed out", async () => {
    signOut();
    expect((await call(list.GET, { path: "/api/orders" })).status).toBe(401);
  });

  it("403 for a customer-role account", async () => {
    signInAs(await createUser("customer"));
    expect((await call(list.GET, { path: "/api/orders" })).status).toBe(403);
  });

  it("404 for a tailor without a business", async () => {
    signInAs(await createUser("tailor"));
    expect((await call(list.GET, { path: "/api/orders" })).status).toBe(404);
  });

  it("lists only this business's orders, soonest due first, with items/payments/fittings", async () => {
    const other = await createTailor("Other");
    const theirClient = await createClient(other.business.id);
    await createOrder(other.business.id, theirClient.id);

    const { business } = await createTailor();
    const c = await createClient(business.id);
    const later = await createOrder(business.id, c.id);
    await prisma.order.update({ where: { id: later.id }, data: { dueAt: new Date(Date.now() + 30 * 864e5) } });
    const sooner = await createOrder(business.id, c.id);
    await prisma.order.update({ where: { id: sooner.id }, data: { dueAt: new Date(Date.now() + 864e5) } });

    const res = await call(list.GET, { path: "/api/orders" });
    expect(res.status).toBe(200);
    expect(res.body.map((o: { id: string }) => o.id)).toEqual([sooner.id, later.id]);
    expect(res.body[0]).toHaveProperty("items");
    expect(res.body[0]).toHaveProperty("payments");
    expect(res.body[0]).toHaveProperty("fittings");
  });

  it("filters by ?customerId", async () => {
    const { business } = await createTailor();
    const a = await createClient(business.id);
    const b = await createClient(business.id);
    const oa = await createOrder(business.id, a.id);
    await createOrder(business.id, b.id);
    const res = await call(list.GET, { path: `/api/orders?customerId=${a.id}` });
    expect(res.body.map((o: { id: string }) => o.id)).toEqual([oa.id]);
  });

  it("?customerId of another business returns nothing", async () => {
    const other = await createTailor("Other");
    const theirClient = await createClient(other.business.id);
    await createOrder(other.business.id, theirClient.id);
    await createTailor();
    const res = await call(list.GET, { path: `/api/orders?customerId=${theirClient.id}` });
    expect(res.body).toEqual([]);
  });
});

// ------------------------------------------------------------------ create

describe("POST /api/orders", () => {
  it("creates an order with items and an initial deposit", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const tpl = await createTemplate();
    const set = await createMeasurementSet(business.id, c.id, tpl.id);
    const res = await call(list.POST, {
      body: orderBody(c.id, {
        items: [{ garmentType: "Agbada", measurementSetId: set.id, styleNotes: "Wide sleeves" }],
        payments: [{ amountMinor: 1_000_000, method: "cash" }],
      }),
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ businessId: business.id, customerId: c.id, statusName: "pending", priceMinor: 5_000_000 });
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ garmentType: "Agbada", measurementSetId: set.id, styleNotes: "Wide sleeves" });
    expect(res.body.payments).toHaveLength(1);
    expect(res.body.payments[0]).toMatchObject({ amountMinor: 1_000_000, method: "cash" });
  });

  it("ignores a businessId sent by the client", async () => {
    const other = await createTailor("Other");
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const res = await call(list.POST, { body: orderBody(c.id, { businessId: other.business.id }) });
    expect(res.body.businessId).toBe(business.id);
  });

  it("rejects a customerId that belongs to another business", async () => {
    const other = await createTailor("Other");
    const theirClient = await createClient(other.business.id);
    await createTailor();
    const res = await call(list.POST, { body: orderBody(theirClient.id) });
    expect([400, 404]).toContain(res.status);
    expect(await prisma.order.count({ where: { customerId: theirClient.id } })).toBe(0);
  });

  it("rejects a measurementSetId that belongs to another business", async () => {
    const other = await createTailor("Other");
    const theirClient = await createClient(other.business.id);
    const tpl = await createTemplate();
    const theirSet = await createMeasurementSet(other.business.id, theirClient.id, tpl.id);
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const res = await call(list.POST, {
      body: orderBody(c.id, { items: [{ garmentType: "Shirt", measurementSetId: theirSet.id }] }),
    });
    expect([400, 404]).toContain(res.status);
    expect(await prisma.orderItem.count({ where: { measurementSetId: theirSet.id } })).toBe(0);
  });

  it("400 (not 500) when customerId is missing", async () => {
    await createTailor();
    const body = orderBody("x");
    delete (body as Record<string, unknown>).customerId;
    expect((await call(list.POST, { body })).status).toBe(400);
  });

  it("400 (not 500) when dueAt is missing", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const body = orderBody(c.id);
    delete (body as Record<string, unknown>).dueAt;
    expect((await call(list.POST, { body })).status).toBe(400);
  });

  it("400 (not 500) when dueAt is not a date", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    expect((await call(list.POST, { body: orderBody(c.id, { dueAt: "next friday" }) })).status).toBe(400);
  });

  it("400 for a negative price", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const res = await call(list.POST, { body: orderBody(c.id, { priceMinor: -500 }) });
    expect(res.status).toBe(400);
    expect(await prisma.order.count()).toBe(0);
  });

  it("400 (not 500) for a non-integer price", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    expect((await call(list.POST, { body: orderBody(c.id, { priceMinor: 12.5 }) })).status).toBe(400);
  });

  it("400 for an initial payment with a non-positive amount", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const res = await call(list.POST, { body: orderBody(c.id, { payments: [{ amountMinor: -100, method: "cash" }] }) });
    expect(res.status).toBe(400);
    expect(await prisma.payment.count()).toBe(0);
  });

  it("400 for an initial deposit larger than the price", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const res = await call(list.POST, {
      body: orderBody(c.id, { priceMinor: 1000, payments: [{ amountMinor: 5000, method: "cash" }] }),
    });
    expect(res.status).toBe(400);
  });

  it("400 (not 500) on malformed JSON", async () => {
    await createTailor();
    expect((await call(list.POST, { rawBody: "{oops", headers: { "Content-Type": "application/json" } })).status).toBe(400);
  });

  it("never gives two orders in the same business the same number", async () => {
    // The web client picks a random number in 1010–1099, so collisions happen
    // in real use; the server must prevent or resolve them.
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const first = await call(list.POST, { body: orderBody(c.id, { number: "1050" }) });
    const second = await call(list.POST, { body: orderBody(c.id, { number: "1050" }) });
    expect(first.status).toBe(201);
    const numbers = (await prisma.order.findMany({ where: { businessId: business.id } })).map(o => o.number);
    expect(new Set(numbers).size).toBe(numbers.length);
    if (second.status === 201) expect(second.body.number).not.toBe("1050");
  });

  it("allows the same order number in two different businesses", async () => {
    const a = await createTailor("A");
    const ca = await createClient(a.business.id);
    expect((await call(list.POST, { body: orderBody(ca.id, { number: "2000" }) })).status).toBe(201);
    const b = await createTailor("B");
    const cb = await createClient(b.business.id);
    expect((await call(list.POST, { body: orderBody(cb.id, { number: "2000" }) })).status).toBe(201);
  });
});

// ------------------------------------------------------------------ get one

describe("GET /api/orders/[id]", () => {
  it("returns the order with items, payments, fittings and media", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const o = await createOrder(business.id, c.id);
    const m = await addOrderMedia(business.id, o.id);
    const res = await call(one.GET, { params: { id: o.id } });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(o.id);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.media.map((x: { id: string }) => x.id)).toEqual([m.id]);
  });

  it("404 for another business's order", async () => {
    const other = await createTailor("Other");
    const theirs = await createOrder(other.business.id, (await createClient(other.business.id)).id);
    await createTailor();
    expect((await call(one.GET, { params: { id: theirs.id } })).status).toBe(404);
  });

  it("404 for an unknown id", async () => {
    await createTailor();
    expect((await call(one.GET, { params: { id: "00000000-0000-0000-0000-000000000000" } })).status).toBe(404);
  });

  it("401 when signed out", async () => {
    const { business } = await createTailor();
    const o = await createOrder(business.id, (await createClient(business.id)).id);
    signOut();
    expect((await call(one.GET, { params: { id: o.id } })).status).toBe(401);
  });
});

// ------------------------------------------------------------------ patch

describe("PATCH /api/orders/[id]", () => {
  async function setup(priceMinor = 100_000) {
    const t = await createTailor();
    const c = await createClient(t.business.id);
    const o = await createOrder(t.business.id, c.id, { priceMinor });
    return { ...t, client: c, order: o };
  }
  const patch = (id: string, body: unknown) => call(one.PATCH, { method: "PATCH", params: { id }, body });

  it("updates the status", async () => {
    const { order } = await setup();
    const res = await patch(order.id, { statusName: "cutting" });
    expect(res.status).toBe(200);
    expect(res.body.statusName).toBe("cutting");
    expect(res.body).toHaveProperty("media");
  });

  it("400 for an unknown status", async () => {
    const { order } = await setup();
    const res = await patch(order.id, { statusName: "teleported" });
    expect(res.status).toBe(400);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.statusName).toBe("pending");
  });

  it("setting the first price on a price-less order is free", async () => {
    const { order } = await setup(0);
    const res = await patch(order.id, { priceMinor: 50_000 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ priceMinor: 50_000, priceChangeCount: 0 });
  });

  it("counts later price changes and locks the price after the cap", async () => {
    const { order } = await setup(100_000);
    let res = await patch(order.id, { priceMinor: 110_000 });
    expect(res.body).toMatchObject({ priceMinor: 110_000, priceChangeCount: 1 });
    res = await patch(order.id, { priceMinor: 120_000 });
    expect(res.body).toMatchObject({ priceMinor: 120_000, priceChangeCount: 2 });
    res = await patch(order.id, { priceMinor: 130_000 });
    expect(res.status).toBe(409);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.priceMinor).toBe(120_000);
  });

  it("re-sending the same price doesn't count as a change", async () => {
    const { order } = await setup(100_000);
    const res = await patch(order.id, { priceMinor: 100_000 });
    expect(res.body.priceChangeCount).toBe(0);
  });

  it.each([0, -1, 12.5, "abc"])("400 for an invalid price %p", async price => {
    const { order } = await setup();
    expect((await patch(order.id, { priceMinor: price })).status).toBe(400);
  });

  it("400 when the new price is below what's already been paid", async () => {
    const { order } = await setup(100_000);
    await prisma.payment.create({ data: { orderId: order.id, amountMinor: 80_000, method: "cash" } });
    const res = await patch(order.id, { priceMinor: 50_000 });
    expect(res.status).toBe(400);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.priceMinor).toBe(100_000);
  });

  it("sets and clears the invoice bank account", async () => {
    const { business, order } = await setup();
    await prisma.business.update({
      where: { id: business.id },
      data: { bankAccounts: [{ id: "acc-1", bankName: "GTBank", accountName: "A", accountNumber: "0123", isDefault: true }] },
    });
    let res = await patch(order.id, { bankAccountId: "acc-1" });
    expect(res.body.bankAccountId).toBe("acc-1");
    res = await patch(order.id, { bankAccountId: null });
    expect(res.body.bankAccountId).toBeNull();
  });

  it("400 for a bankAccountId that isn't one of the business's accounts", async () => {
    const { order } = await setup();
    expect((await patch(order.id, { bankAccountId: "not-an-account" })).status).toBe(400);
  });

  it("sets the cover from this order's media and clears it", async () => {
    const { business, order } = await setup();
    const m = await addOrderMedia(business.id, order.id, "data:image/png;base64,FULL");
    let res = await patch(order.id, { cover: { mediaId: m.id, thumbUrl: "data:image/png;base64,THUMB" } });
    expect(res.status).toBe(200);
    expect(res.body.items[0]).toMatchObject({ photos: [m.id], imageUrl: "data:image/png;base64,THUMB" });
    res = await patch(order.id, { cover: { mediaId: m.id } });
    expect(res.body.items[0].imageUrl).toBe("data:image/png;base64,FULL");
    res = await patch(order.id, { cover: null });
    expect(res.body.items[0]).toMatchObject({ photos: [], imageUrl: null });
  });

  it("400 when the cover photo belongs to another order or business", async () => {
    const { business, client, order } = await setup();
    const otherOrder = await createOrder(business.id, client.id);
    const notMine = await addOrderMedia(business.id, otherOrder.id);
    expect((await patch(order.id, { cover: { mediaId: notMine.id } })).status).toBe(400);

    const other = await createTailor("Other");
    const theirOrder = await createOrder(other.business.id, (await createClient(other.business.id)).id);
    const theirMedia = await addOrderMedia(other.business.id, theirOrder.id);
    // createTailor signed in as "Other"; switch back to the original tailor.
    const owner = await prisma.user.findUnique({ where: { id: business.ownerId } });
    signInAs({ id: owner!.id, email: owner!.email, role: "tailor" });
    expect((await patch(order.id, { cover: { mediaId: theirMedia.id } })).status).toBe(400);
  });

  it("400 when setting a cover on an order with no items", async () => {
    const { business, client } = await setup();
    const bare = await prisma.order.create({
      data: { businessId: business.id, customerId: client.id, customerName: "C", number: "9", dueAt: new Date(), priceMinor: 1 },
    });
    expect((await patch(bare.id, { cover: null })).status).toBe(400);
  });

  it("is all-or-nothing: a rejected price doesn't leave a cover change behind", async () => {
    const { business, order } = await setup();
    const m = await addOrderMedia(business.id, order.id);
    const res = await patch(order.id, { cover: { mediaId: m.id }, priceMinor: -5 });
    expect(res.status).toBe(400);
    const item = await prisma.orderItem.findFirst({ where: { orderId: order.id } });
    expect(item?.photos).toEqual([]);
  });

  it("404 for another business's order, and changes nothing", async () => {
    const other = await createTailor("Other");
    const theirs = await createOrder(other.business.id, (await createClient(other.business.id)).id);
    await createTailor();
    expect((await patch(theirs.id, { statusName: "cancelled", priceMinor: 1 })).status).toBe(404);
    const row = await prisma.order.findUnique({ where: { id: theirs.id } });
    expect(row).toMatchObject({ statusName: "pending", priceMinor: 100_000 });
  });

  it("400 (not 500) on malformed JSON", async () => {
    const { order } = await setup();
    expect((await call(one.PATCH, { method: "PATCH", params: { id: order.id }, rawBody: "nope" })).status).toBe(400);
  });

  it("403 for a customer-role account", async () => {
    const { order } = await setup();
    signInAs(await createUser("customer"));
    expect((await patch(order.id, { statusName: "ready" })).status).toBe(403);
  });
});

// ------------------------------------------------------------------ delete

describe("DELETE /api/orders/[id]", () => {
  it("deletes the order with its items, payments, fittings and photos", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const o = await createOrder(business.id, c.id);
    await prisma.payment.create({ data: { orderId: o.id, amountMinor: 100, method: "cash" } });
    await prisma.fitting.create({ data: { orderId: o.id, number: 1, outcome: "approved" } });
    await addOrderMedia(business.id, o.id);

    const res = await call(one.DELETE, { method: "DELETE", params: { id: o.id } });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.orderItem.count()).toBe(0);
    expect(await prisma.payment.count()).toBe(0);
    expect(await prisma.fitting.count()).toBe(0);
    expect(await prisma.media.count()).toBe(0);
    expect(await prisma.customer.count()).toBe(1);
  });

  it("404 for another business's order, and keeps it", async () => {
    const other = await createTailor("Other");
    const theirs = await createOrder(other.business.id, (await createClient(other.business.id)).id);
    await createTailor();
    expect((await call(one.DELETE, { method: "DELETE", params: { id: theirs.id } })).status).toBe(404);
    expect(await prisma.order.count({ where: { id: theirs.id } })).toBe(1);
  });

  it("404 when deleted twice", async () => {
    const { business } = await createTailor();
    const o = await createOrder(business.id, (await createClient(business.id)).id);
    await call(one.DELETE, { method: "DELETE", params: { id: o.id } });
    expect((await call(one.DELETE, { method: "DELETE", params: { id: o.id } })).status).toBe(404);
  });
});
