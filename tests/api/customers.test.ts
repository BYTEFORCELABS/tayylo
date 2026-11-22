import { beforeEach, describe, expect, it } from "vitest";
import * as list from "@/app/api/customers/route";
import * as one from "@/app/api/customers/[id]/route";
import { call, createClient, createMeasurementSet, createTailor, createTemplate, createUser, resetDb, signInAs, signOut } from "../helpers";

beforeEach(resetDb);

describe("GET /api/customers", () => {
  it("401 when signed out", async () => {
    signOut();
    const res = await call(list.GET, { path: "/api/customers" });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Not signed in" });
  });

  it("403 for a customer-role account", async () => {
    signInAs(await createUser("customer"));
    const res = await call(list.GET, { path: "/api/customers" });
    expect(res.status).toBe(403);
  });

  it("404 for a tailor who hasn't finished onboarding", async () => {
    signInAs(await createUser("tailor"));
    const res = await call(list.GET, { path: "/api/customers" });
    expect(res.status).toBe(404);
  });

  it("lists only this business's clients, sorted by name, with lastMeasuredAt", async () => {
    const other = await createTailor("Other");
    await createClient(other.business.id, { fullName: "Not Mine" });
    const { business } = await createTailor();
    const zara = await createClient(business.id, { fullName: "Zara" });
    await createClient(business.id, { fullName: "Ada" });
    const tpl = await createTemplate();
    await createMeasurementSet(business.id, zara.id, tpl.id);

    const res = await call(list.GET, { path: "/api/customers" });
    expect(res.status).toBe(200);
    expect(res.body.map((c: { fullName: string }) => c.fullName)).toEqual(["Ada", "Zara"]);
    expect(res.body[0].lastMeasuredAt).toBeNull();
    expect(res.body[1].lastMeasuredAt).not.toBeNull();
    expect(res.body[0].media).toBeUndefined();
  });

  it("includes media only with ?include=media", async () => {
    const { business } = await createTailor();
    await createClient(business.id);
    const res = await call(list.GET, { path: "/api/customers?include=media" });
    expect(res.body[0].media).toEqual([]);
  });

  it("searches name, phone (ignoring spaces), notes and email", async () => {
    const { business } = await createTailor();
    await createClient(business.id, { fullName: "Ada Obi", phones: ["+234 800 111 2222"] });
    await createClient(business.id, { fullName: "Bola" });
    const byName = await call(list.GET, { path: "/api/customers?q=ada" });
    expect(byName.body).toHaveLength(1);
    const byPhone = await call(list.GET, { path: `/api/customers?q=${encodeURIComponent("8001112222")}` });
    expect(byPhone.body).toHaveLength(1);
    const none = await call(list.GET, { path: "/api/customers?q=zzz" });
    expect(none.body).toEqual([]);
  });
});

describe("POST /api/customers", () => {
  it("creates a client in the signed-in business", async () => {
    const { business } = await createTailor();
    const res = await call(list.POST, { body: { fullName: "Ada", phones: ["+2348000000001"], tags: ["vip"], email: "" } });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ fullName: "Ada", phones: ["+2348000000001"], tags: ["vip"], email: null, media: [] });
    expect(res.body.businessId).toBe(business.id);
  });

  it("ignores a businessId sent by the client", async () => {
    const other = await createTailor("Other");
    const { business } = await createTailor();
    const res = await call(list.POST, { body: { fullName: "Ada", businessId: other.business.id } });
    expect(res.body.businessId).toBe(business.id);
  });

  it("400 (not 500) when fullName is missing", async () => {
    await createTailor();
    const res = await call(list.POST, { body: { phones: [] } });
    expect(res.status).toBe(400);
  });

  it("400 (not 500) on malformed JSON", async () => {
    await createTailor();
    const res = await call(list.POST, { rawBody: "{not json", headers: { "Content-Type": "application/json" } });
    expect(res.status).toBe(400);
  });

  it("400 when phones is not an array of strings", async () => {
    await createTailor();
    const res = await call(list.POST, { body: { fullName: "Ada", phones: "0800" } });
    expect(res.status).toBe(400);
  });
});

describe("GET/PATCH /api/customers/[id]", () => {
  it("returns the client with media", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id, { fullName: "Ada" });
    const res = await call(one.GET, { params: { id: c.id } });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: c.id, fullName: "Ada", media: [] });
  });

  it("404 for another business's client (read and write)", async () => {
    const other = await createTailor("Other");
    const theirs = await createClient(other.business.id, { fullName: "Theirs" });
    await createTailor();
    expect((await call(one.GET, { params: { id: theirs.id } })).status).toBe(404);
    const patch = await call(one.PATCH, { method: "PATCH", params: { id: theirs.id }, body: { fullName: "Hacked" } });
    expect(patch.status).toBe(404);
    expect((await createdName(theirs.id))).toBe("Theirs");
  });

  it("404 for an unknown id", async () => {
    await createTailor();
    expect((await call(one.GET, { params: { id: "00000000-0000-0000-0000-000000000000" } })).status).toBe(404);
  });

  it("updates only the fields sent, and clears email/notes with empty strings", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id, { fullName: "Ada", phones: ["1"] });
    let res = await call(one.PATCH, { method: "PATCH", params: { id: c.id }, body: { notes: "Slim fit", email: "a@b.co" } });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ fullName: "Ada", phones: ["1"], notes: "Slim fit", email: "a@b.co" });
    res = await call(one.PATCH, { method: "PATCH", params: { id: c.id }, body: { notes: "", email: "" } });
    expect(res.body).toMatchObject({ notes: null, email: null });
  });

  it("400 (not 500) on malformed JSON", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const res = await call(one.PATCH, { method: "PATCH", params: { id: c.id }, rawBody: "nope" });
    expect(res.status).toBe(400);
  });
});

async function createdName(id: string) {
  const { prisma } = await import("../helpers");
  return (await prisma.customer.findUnique({ where: { id } }))?.fullName;
}
