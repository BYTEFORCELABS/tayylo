import { beforeEach, describe, expect, it } from "vitest";
import * as create from "@/app/api/measurements/route";
import * as one from "@/app/api/measurements/[id]/route";
import * as restore from "@/app/api/measurements/[id]/restore/route";
import * as byClient from "@/app/api/customers/[id]/measurements/route";
import {
  call,
  createClient,
  createMeasurementSet,
  createTailor,
  createTemplate,
  createUser,
  prisma,
  resetDb,
  signInAs,
  signOut,
} from "../helpers";

beforeEach(resetDb);

const UNKNOWN = "00000000-0000-0000-0000-000000000000";

function body(customerId: string, templateId: string, extra: Record<string, unknown> = {}) {
  return {
    customerId,
    templateId,
    templateName: "Shirt",
    values: [
      { fieldKey: "chest", labelSnapshot: "Chest", valueMm: 1000, rawInput: "100" },
      { fieldKey: "waist", labelSnapshot: "Waist", valueMm: 850, rawInput: "85" },
    ],
    ...extra,
  };
}

async function setAt(businessId: string, customerId: string, templateId: string, takenAt: Date) {
  const s = await createMeasurementSet(businessId, customerId, templateId);
  return prisma.measurementSet.update({ where: { id: s.id }, data: { takenAt }, include: { values: true } });
}

describe("POST /api/measurements", () => {
  it("401 when signed out", async () => {
    signOut();
    expect((await call(create.POST, { body: body("a", "b") })).status).toBe(401);
  });

  it("403 for a customer-role account", async () => {
    signInAs(await createUser("customer"));
    expect((await call(create.POST, { body: body("a", "b") })).status).toBe(403);
  });

  it("records a final set with its values", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const tpl = await createTemplate();
    const res = await call(create.POST, { body: body(c.id, tpl.id, { note: "First fitting" }) });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      businessId: business.id,
      customerId: c.id,
      templateId: tpl.id,
      templateName: "Shirt",
      source: "manual",
      status: "final",
      note: "First fitting",
      supersedesId: null,
    });
    expect(res.body.values).toHaveLength(2);
    expect(res.body.values.find((v: { fieldKey: string }) => v.fieldKey === "chest")).toMatchObject({ labelSnapshot: "Chest", valueMm: 1000, rawInput: "100" });
  });

  it("allows a set with no values", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const tpl = await createTemplate();
    const res = await call(create.POST, { body: body(c.id, tpl.id, { values: undefined }) });
    expect(res.status).toBe(201);
    expect(res.body.values).toEqual([]);
  });

  it("records supersedesId to link a new version to the previous one", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const tpl = await createTemplate();
    const prev = await createMeasurementSet(business.id, c.id, tpl.id);
    const res = await call(create.POST, { body: body(c.id, tpl.id, { supersedesId: prev.id }) });
    expect(res.status).toBe(201);
    expect(res.body.supersedesId).toBe(prev.id);
  });

  it("uses the business's own custom template", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const mine = await createTemplate(business.id, "My Agbada");
    const res = await call(create.POST, { body: body(c.id, mine.id) });
    expect(res.status).toBe(201);
  });

  it("404 for another business's client, and nothing is written", async () => {
    const other = await createTailor("Other");
    const theirs = await createClient(other.business.id);
    const tpl = await createTemplate();
    await createTailor();
    const res = await call(create.POST, { body: body(theirs.id, tpl.id) });
    expect(res.status).toBe(404);
    expect(await prisma.measurementSet.count()).toBe(0);
  });

  it("400/404 (not 500) when customerId is missing", async () => {
    await createTailor();
    const tpl = await createTemplate();
    const res = await call(create.POST, { body: body(undefined as unknown as string, tpl.id) });
    expect([400, 404]).toContain(res.status);
  });

  it("400 (not 500) when templateId is missing", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const res = await call(create.POST, { body: body(c.id, undefined as unknown as string) });
    expect(res.status).toBe(400);
  });

  it("400/404 (not 500) when templateId does not exist", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const res = await call(create.POST, { body: body(c.id, UNKNOWN) });
    expect([400, 404]).toContain(res.status);
  });

  it("refuses another business's private template", async () => {
    const other = await createTailor("Other");
    const theirTpl = await createTemplate(other.business.id, "Their secret");
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const res = await call(create.POST, { body: body(c.id, theirTpl.id) });
    expect([400, 404]).toContain(res.status);
    expect(await prisma.measurementSet.count()).toBe(0);
  });

  it("refuses a supersedesId that points at another business's set", async () => {
    const other = await createTailor("Other");
    const theirClient = await createClient(other.business.id);
    const tpl = await createTemplate();
    const theirSet = await createMeasurementSet(other.business.id, theirClient.id, tpl.id);
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const res = await call(create.POST, { body: body(c.id, tpl.id, { supersedesId: theirSet.id }) });
    expect([400, 404]).toContain(res.status);
  });

  it("400 (not 500) when a value has a non-numeric valueMm", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const tpl = await createTemplate();
    const res = await call(create.POST, {
      body: body(c.id, tpl.id, { values: [{ fieldKey: "chest", labelSnapshot: "Chest", valueMm: "abc", rawInput: "abc" }] }),
    });
    expect(res.status).toBe(400);
    expect(await prisma.measurementSet.count()).toBe(0);
  });

  it("400 (not 500) when a value is missing labelSnapshot", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const tpl = await createTemplate();
    const res = await call(create.POST, {
      body: body(c.id, tpl.id, { values: [{ fieldKey: "chest", label: "Chest", valueMm: 1000, rawInput: "100" }] }),
    });
    expect(res.status).toBe(400);
  });

  it("400 (not 500) on malformed JSON", async () => {
    await createTailor();
    const res = await call(create.POST, { rawBody: "{oops", headers: { "Content-Type": "application/json" } });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/measurements/[id]", () => {
  it("401 when signed out", async () => {
    signOut();
    expect((await call(one.GET, { params: { id: UNKNOWN } })).status).toBe(401);
  });

  it("returns the set with values", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const tpl = await createTemplate();
    const s = await createMeasurementSet(business.id, c.id, tpl.id);
    const res = await call(one.GET, { params: { id: s.id } });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: s.id, customerId: c.id });
    expect(res.body.values).toHaveLength(1);
  });

  it("404 for another business's set", async () => {
    const other = await createTailor("Other");
    const theirs = await createClient(other.business.id);
    const tpl = await createTemplate();
    const s = await createMeasurementSet(other.business.id, theirs.id, tpl.id);
    await createTailor();
    const res = await call(one.GET, { params: { id: s.id } });
    expect(res.status).toBe(404);
    expect(res.body).toBeNull();
  });

  it("404 for an unknown id", async () => {
    await createTailor();
    expect((await call(one.GET, { params: { id: UNKNOWN } })).status).toBe(404);
  });
});

describe("POST /api/measurements/[id]/restore", () => {
  it("401 when signed out", async () => {
    signOut();
    expect((await call(restore.POST, { params: { id: UNKNOWN }, body: {} })).status).toBe(401);
  });

  it("creates a new 'restored' version copying the values, linked to the original, with the given note", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const tpl = await createTemplate();
    const old = await createMeasurementSet(business.id, c.id, tpl.id);
    const res = await call(restore.POST, { params: { id: old.id }, body: { note: "Back to March" } });
    expect(res.status).toBe(201);
    expect(res.body.id).not.toBe(old.id);
    expect(res.body).toMatchObject({
      customerId: c.id,
      templateId: tpl.id,
      source: "restored",
      supersedesId: old.id,
      note: "Back to March",
      status: "final",
    });
    expect(res.body.values.map((v: { fieldKey: string; valueMm: number }) => [v.fieldKey, v.valueMm])).toEqual([["chest", 1000]]);
    expect(await prisma.measurementSet.count()).toBe(2);
  });

  it("writes a default note when none is given (also with no body at all)", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const tpl = await createTemplate();
    const old = await createMeasurementSet(business.id, c.id, tpl.id);
    const res = await call(restore.POST, { method: "POST", params: { id: old.id } });
    expect(res.status).toBe(201);
    expect(res.body.note).toMatch(/^Restored from version of /);
  });

  it("404 for another business's set, and nothing is written", async () => {
    const other = await createTailor("Other");
    const theirs = await createClient(other.business.id);
    const tpl = await createTemplate();
    const s = await createMeasurementSet(other.business.id, theirs.id, tpl.id);
    await createTailor();
    const res = await call(restore.POST, { params: { id: s.id }, body: {} });
    expect(res.status).toBe(404);
    expect(await prisma.measurementSet.count()).toBe(1);
  });

  it("404 for an unknown id", async () => {
    await createTailor();
    expect((await call(restore.POST, { params: { id: UNKNOWN }, body: {} })).status).toBe(404);
  });
});

describe("GET /api/customers/[id]/measurements", () => {
  it("401 when signed out", async () => {
    signOut();
    expect((await call(byClient.GET, { params: { id: UNKNOWN } })).status).toBe(401);
  });

  it("lists every version for the client, newest first, with values", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const other = await createClient(business.id);
    const tpl = await createTemplate();
    const older = await setAt(business.id, c.id, tpl.id, new Date("2026-01-01"));
    const newer = await setAt(business.id, c.id, tpl.id, new Date("2026-06-01"));
    await createMeasurementSet(business.id, other.id, tpl.id);
    const res = await call(byClient.GET, { params: { id: c.id }, path: `/api/customers/${c.id}/measurements` });
    expect(res.status).toBe(200);
    expect(res.body.map((s: { id: string }) => s.id)).toEqual([newer.id, older.id]);
    expect(res.body[0].values).toHaveLength(1);
  });

  it("returns [] for a client with no measurements", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const res = await call(byClient.GET, { params: { id: c.id }, path: `/api/customers/${c.id}/measurements` });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("?latest=true returns only the newest set", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const tpl = await createTemplate();
    await setAt(business.id, c.id, tpl.id, new Date("2026-01-01"));
    const newer = await setAt(business.id, c.id, tpl.id, new Date("2026-06-01"));
    const res = await call(byClient.GET, { params: { id: c.id }, path: `/api/customers/${c.id}/measurements?latest=true` });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(newer.id);
  });

  it("?latest=true&templateId= returns the newest set for that template", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const shirt = await createTemplate(null, "Shirt");
    const trouser = await createTemplate(null, "Trouser");
    const shirtSet = await setAt(business.id, c.id, shirt.id, new Date("2026-01-01"));
    await setAt(business.id, c.id, trouser.id, new Date("2026-06-01"));
    const res = await call(byClient.GET, {
      params: { id: c.id },
      path: `/api/customers/${c.id}/measurements?latest=true&templateId=${shirt.id}`,
    });
    expect(res.body.id).toBe(shirtSet.id);
  });

  it("?latest=true returns null when there are none", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const res = await call(byClient.GET, { params: { id: c.id }, path: `/api/customers/${c.id}/measurements?latest=true` });
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it("404 for another business's client (list and latest)", async () => {
    const other = await createTailor("Other");
    const theirs = await createClient(other.business.id);
    const tpl = await createTemplate();
    await createMeasurementSet(other.business.id, theirs.id, tpl.id);
    await createTailor();
    const list = await call(byClient.GET, { params: { id: theirs.id }, path: `/api/customers/${theirs.id}/measurements` });
    expect(list.status).toBe(404);
    expect(list.body).toEqual([]);
    const latest = await call(byClient.GET, { params: { id: theirs.id }, path: `/api/customers/${theirs.id}/measurements?latest=true` });
    expect(latest.status).toBe(404);
    expect(latest.body).toBeNull();
  });
});
