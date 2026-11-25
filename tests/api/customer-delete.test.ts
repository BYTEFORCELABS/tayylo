import { beforeEach, describe, expect, it } from "vitest";
import * as one from "@/app/api/customers/[id]/route";
import { call, createClient, createMeasurementSet, createOrder, createTailor, createTemplate, createUser, prisma, resetDb, signInAs, signOut } from "../helpers";

beforeEach(resetDb);

const del = (id: string) => call(one.DELETE, { params: { id } });

describe("DELETE /api/customers/[id]", () => {
  it("401 when signed out", async () => {
    signOut();
    expect((await del("x")).status).toBe(401);
  });

  it("404 for another business's client, and leaves it alone", async () => {
    const other = await createTailor("Other");
    const theirs = await createClient(other.business.id);
    const me = await createUser("tailor");
    await prisma.business.create({ data: { ownerId: me.id, name: "Mine", currency: "NGN", unitSystem: "metric" } });
    signInAs(me);
    expect((await del(theirs.id)).status).toBe(404);
    expect(await prisma.customer.findUnique({ where: { id: theirs.id } })).not.toBeNull();
  });

  it("deletes a client with no orders", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const res = await del(c.id);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(await prisma.customer.findUnique({ where: { id: c.id } })).toBeNull();
  });

  it("409 while an order is still in progress", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    await createOrder(business.id, c.id, { priceMinor: 0 });
    const res = await del(c.id);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/1 order is still in progress/);
    expect(await prisma.customer.findUnique({ where: { id: c.id } })).not.toBeNull();
  });

  it("409 while a delivered order still has a balance", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const o = await createOrder(business.id, c.id, { priceMinor: 100_000 });
    await prisma.order.update({ where: { id: o.id }, data: { statusName: "delivered", payments: { create: { amountMinor: 40_000, method: "Cash" } } } });
    const res = await del(c.id);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/unpaid balance/);
  });

  it("ignores cancelled orders", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const o = await createOrder(business.id, c.id, { priceMinor: 100_000 });
    await prisma.order.update({ where: { id: o.id }, data: { statusName: "cancelled" } });
    expect((await del(c.id)).status).toBe(200);
  });

  it("removes measurements, settled orders and every related photo, but nobody else's", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const keep = await createClient(business.id);
    const tpl = await createTemplate();
    await createMeasurementSet(business.id, c.id, tpl.id);
    const o = await createOrder(business.id, c.id, { priceMinor: 50_000 });
    await prisma.order.update({ where: { id: o.id }, data: { statusName: "delivered", payments: { create: { amountMinor: 50_000, method: "Transfer" } } } });
    const f = await prisma.fitting.create({ data: { orderId: o.id, number: 1, outcome: "approved" } });
    const url = "data:image/png;base64,AA==";
    await prisma.media.createMany({
      data: [
        { businessId: business.id, ownerType: "customer", ownerId: c.id, url },
        { businessId: business.id, ownerType: "order", ownerId: o.id, url },
        { businessId: business.id, ownerType: "fitting", ownerId: f.id, url },
        { businessId: business.id, ownerType: "customer", ownerId: keep.id, url },
      ],
    });

    expect((await del(c.id)).status).toBe(200);
    expect(await prisma.measurementSet.count({ where: { customerId: c.id } })).toBe(0);
    expect(await prisma.order.count({ where: { customerId: c.id } })).toBe(0);
    expect(await prisma.payment.count()).toBe(0);
    expect(await prisma.fitting.count()).toBe(0);
    const media = await prisma.media.findMany();
    expect(media).toHaveLength(1);
    expect(media[0].ownerId).toBe(keep.id);
  });
});
