import { beforeEach, describe, expect, it } from "vitest";
import * as importRoute from "@/app/api/customers/import/route";
import { call, createClient, createTailor, createUser, prisma, resetDb, signInAs, signOut } from "../helpers";

beforeEach(resetDb);

describe("POST /api/customers/import", () => {
  it("401 when signed out", async () => {
    signOut();
    const res = await call(importRoute.POST, { body: [{ fullName: "Ada" }] });
    expect(res.status).toBe(401);
  });

  it("403 for a customer-role account", async () => {
    signInAs(await createUser("customer"));
    const res = await call(importRoute.POST, { body: [{ fullName: "Ada" }] });
    expect(res.status).toBe(403);
  });

  it("404 for a tailor without a business", async () => {
    signInAs(await createUser("tailor"));
    const res = await call(importRoute.POST, { body: [{ fullName: "Ada" }] });
    expect(res.status).toBe(404);
  });

  it("creates every named row in the signed-in business, trimmed and tagged Imported", async () => {
    const { business } = await createTailor();
    const res = await call(importRoute.POST, {
      body: [
        { fullName: "  Ada Obi ", phone: " +234 800 ", email: " ada@x.co ", notes: " slim " },
        { fullName: "Bola" },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ count: 2 });

    const rows = await prisma.customer.findMany({ where: { businessId: business.id }, orderBy: { fullName: "asc" } });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ fullName: "Ada Obi", phones: ["+234 800"], email: "ada@x.co", notes: "slim", tags: ["Imported"] });
    expect(rows[1]).toMatchObject({ fullName: "Bola", phones: [], email: null, notes: null, tags: ["Imported"] });
  });

  it("skips rows with a blank or missing name", async () => {
    await createTailor();
    const res = await call(importRoute.POST, { body: [{ fullName: "   " }, { phone: "0800" }, { fullName: "Ada" }] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ count: 1 });
  });

  it("returns count 0 for an empty list", async () => {
    await createTailor();
    const res = await call(importRoute.POST, { body: [] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ count: 0 });
  });

  it("ignores any businessId in the rows and never writes to another business", async () => {
    const other = await createTailor("Other");
    const { business } = await createTailor();
    await call(importRoute.POST, { body: [{ fullName: "Ada", businessId: other.business.id }] });
    expect(await prisma.customer.count({ where: { businessId: other.business.id } })).toBe(0);
    expect(await prisma.customer.count({ where: { businessId: business.id } })).toBe(1);
  });

  it("does not touch existing clients", async () => {
    const { business } = await createTailor();
    await createClient(business.id, { fullName: "Existing" });
    await call(importRoute.POST, { body: [{ fullName: "New" }] });
    expect(await prisma.customer.count({ where: { businessId: business.id } })).toBe(2);
  });

  it("400 (not 500) when the body is not an array", async () => {
    await createTailor();
    const res = await call(importRoute.POST, { body: { fullName: "Ada" } });
    expect(res.status).toBe(400);
  });

  it("400 (not 500) on malformed JSON", async () => {
    await createTailor();
    const res = await call(importRoute.POST, { rawBody: "[{", headers: { "Content-Type": "application/json" } });
    expect(res.status).toBe(400);
  });

  it("400 (not 500) when a row's fields have the wrong types", async () => {
    await createTailor();
    const res = await call(importRoute.POST, { body: [{ fullName: 123 }, { fullName: "Ada", phone: 8000 }] });
    expect(res.status).toBe(400);
  });

  it("400 (not 500) when the list contains null entries", async () => {
    await createTailor();
    const res = await call(importRoute.POST, { body: [null, { fullName: "Ada" }] });
    expect(res.status).toBe(400);
  });

  it("rejects an unreasonably large import (413/400) instead of writing it", async () => {
    const { business } = await createTailor();
    const huge = Array.from({ length: 20_001 }, (_, i) => ({ fullName: `Client ${i}` }));
    const res = await call(importRoute.POST, { body: huge });
    expect([400, 413]).toContain(res.status);
    expect(await prisma.customer.count({ where: { businessId: business.id } })).toBe(0);
  });
});
