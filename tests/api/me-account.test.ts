import { beforeEach, describe, expect, it } from "vitest";
import * as me from "@/app/api/me/route";
import * as account from "@/app/api/account/route";
import * as business from "@/app/api/business/route";
import * as customers from "@/app/api/customers/route";
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

describe("GET /api/me", () => {
  it("401 when signed out", async () => {
    signOut();
    expect((await call(me.GET)).status).toBe(401);
  });

  it("returns id, email and role", async () => {
    const u = await createUser("customer");
    signInAs(u);
    const res = await call(me.GET);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: u.id, email: u.email, role: "customer" });
  });
});

describe("DELETE /api/account", () => {
  it("401 when signed out", async () => {
    signOut();
    expect((await call(account.DELETE, { method: "DELETE" })).status).toBe(401);
  });

  it("deletes the user and cascades business, clients, orders, measurements and media", async () => {
    const other = await createTailor("Other");
    const otherClient = await createClient(other.business.id);
    await createOrder(other.business.id, otherClient.id);

    const { user, business: biz } = await createTailor();
    const c = await createClient(biz.id);
    const tpl = await createTemplate();
    await createMeasurementSet(biz.id, c.id, tpl.id);
    await createOrder(biz.id, c.id);
    await prisma.media.create({ data: { businessId: biz.id, ownerType: "customer", ownerId: c.id, url: "data:image/png;base64,AA==" } });

    const res = await call(account.DELETE, { method: "DELETE" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect(await prisma.business.findUnique({ where: { id: biz.id } })).toBeNull();
    expect(await prisma.customer.count({ where: { businessId: biz.id } })).toBe(0);
    expect(await prisma.order.count({ where: { businessId: biz.id } })).toBe(0);
    expect(await prisma.measurementSet.count({ where: { businessId: biz.id } })).toBe(0);
    expect(await prisma.media.count({ where: { businessId: biz.id } })).toBe(0);

    // Other tenants and global templates untouched.
    expect(await prisma.user.findUnique({ where: { id: other.user.id } })).not.toBeNull();
    expect(await prisma.order.count({ where: { businessId: other.business.id } })).toBe(1);
    expect(await prisma.measurementTemplate.count({ where: { id: tpl.id } })).toBe(1);
  });

  it("deletes a customer-role account (no business)", async () => {
    const u = await createUser("customer");
    signInAs(u);
    expect((await call(account.DELETE, { method: "DELETE" })).status).toBe(200);
    expect(await prisma.user.count()).toBe(0);
  });
});

describe("a session for a deleted account", () => {
  // JWT sessions outlive the user row. Once the account is gone, the same
  // session cookie must stop working.
  it("GET /api/me returns 401", async () => {
    await createTailor();
    await call(account.DELETE, { method: "DELETE" });
    expect((await call(me.GET)).status).toBe(401);
  });

  it("PATCH /api/business returns 401 and creates nothing", async () => {
    await createTailor();
    await call(account.DELETE, { method: "DELETE" });
    const res = await call(business.PATCH, { method: "PATCH", body: { name: "Ghost Studio" } });
    expect(res.status).toBe(401);
    expect(await prisma.business.count()).toBe(0);
  });

  it("GET /api/customers returns 401", async () => {
    await createTailor();
    await call(account.DELETE, { method: "DELETE" });
    expect((await call(customers.GET, { path: "/api/customers" })).status).toBe(401);
  });
});
