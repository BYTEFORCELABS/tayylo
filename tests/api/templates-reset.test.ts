import { beforeEach, describe, expect, it } from "vitest";
import * as templates from "@/app/api/templates/route";
import * as reset from "@/app/api/reset/route";
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

describe("GET /api/templates", () => {
  it("401 when signed out", async () => {
    signOut();
    expect((await call(templates.GET)).status).toBe(401);
  });

  it("403 for a customer-role account", async () => {
    signInAs(await createUser("customer"));
    expect((await call(templates.GET)).status).toBe(403);
  });

  it("returns global templates plus the business's own, not other businesses'", async () => {
    const other = await createTailor("Other");
    await createTemplate(other.business.id, "Their Custom");
    const { business } = await createTailor();
    await createTemplate(null, "Shirt");
    await createTemplate(business.id, "Agbada Custom");
    await createTemplate(null, "Blazer");

    const res = await call(templates.GET);
    expect(res.status).toBe(200);
    expect(res.body.map((t: { name: string }) => t.name)).toEqual(["Agbada Custom", "Blazer", "Shirt"]);
  });

  it("returns fields ordered by sortOrder", async () => {
    await createTailor();
    const tpl = await prisma.measurementTemplate.create({
      data: {
        name: "Trouser",
        category: "Western",
        fields: {
          create: [
            { key: "b", label: "B", group: "G", sortOrder: 2 },
            { key: "a", label: "A", group: "G", sortOrder: 0 },
            { key: "c", label: "C", group: "G", sortOrder: 1 },
          ],
        },
      },
    });
    const res = await call(templates.GET);
    const t = res.body.find((x: { id: string }) => x.id === tpl.id);
    expect(t.fields.map((f: { key: string }) => f.key)).toEqual(["a", "c", "b"]);
  });
});

describe("POST /api/reset", () => {
  it("401 when signed out", async () => {
    signOut();
    expect((await call(reset.POST, { method: "POST" })).status).toBe(401);
  });

  it("403 for a customer-role account", async () => {
    signInAs(await createUser("customer"));
    expect((await call(reset.POST, { method: "POST" })).status).toBe(403);
  });

  it("wipes the caller's clients, orders, measurements and media, keeping the business profile and templates", async () => {
    const other = await createTailor("Other");
    const oc = await createClient(other.business.id);
    await createOrder(other.business.id, oc.id);
    await prisma.media.create({ data: { businessId: other.business.id, ownerType: "customer", ownerId: oc.id, url: "x" } });

    const { business } = await createTailor("Mine");
    await prisma.business.update({ where: { id: business.id }, data: { ownerName: "Ada", bankAccounts: [{ id: "1", bankName: "A", accountName: "", accountNumber: "1", isDefault: true }] } });
    const ownTpl = await createTemplate(business.id, "Own");
    const global = await createTemplate(null, "Global");
    const c = await createClient(business.id);
    await createMeasurementSet(business.id, c.id, global.id);
    await createOrder(business.id, c.id);
    await prisma.media.create({ data: { businessId: business.id, ownerType: "customer", ownerId: c.id, url: "x" } });

    const res = await call(reset.POST, { method: "POST" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    expect(await prisma.customer.count({ where: { businessId: business.id } })).toBe(0);
    expect(await prisma.order.count({ where: { businessId: business.id } })).toBe(0);
    expect(await prisma.measurementSet.count({ where: { businessId: business.id } })).toBe(0);
    expect(await prisma.media.count({ where: { businessId: business.id } })).toBe(0);
    expect(await prisma.orderItem.count()).toBe(1); // only the other business's order item remains

    const kept = await prisma.business.findUniqueOrThrow({ where: { id: business.id } });
    expect(kept).toMatchObject({ name: "Mine", ownerName: "Ada" });
    expect(kept.bankAccounts).toHaveLength(1);
    expect(await prisma.measurementTemplate.count({ where: { id: { in: [ownTpl.id, global.id] } } })).toBe(2);

    expect(await prisma.customer.count({ where: { businessId: other.business.id } })).toBe(1);
    expect(await prisma.order.count({ where: { businessId: other.business.id } })).toBe(1);
    expect(await prisma.media.count({ where: { businessId: other.business.id } })).toBe(1);
  });

  it("is safe to run on an empty workspace", async () => {
    await createTailor();
    expect((await call(reset.POST, { method: "POST" })).status).toBe(200);
  });
});
