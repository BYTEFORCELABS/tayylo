import { beforeEach, describe, expect, it } from "vitest";
import * as addMedia from "@/app/api/customers/[id]/media/route";
import * as oneMedia from "@/app/api/customers/[id]/media/[mediaId]/route";
import { call, createClient, createOrder, createTailor, createUser, prisma, resetDb, signInAs, signOut } from "../helpers";

beforeEach(resetDb);

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

async function addPhoto(businessId: string, ownerId: string, ownerType = "customer") {
  return prisma.media.create({ data: { businessId, ownerType, ownerId, url: PNG } });
}

describe("POST /api/customers/[id]/media", () => {
  it("401 when signed out", async () => {
    signOut();
    const res = await call(addMedia.POST, { params: { id: "x" }, body: { url: PNG } });
    expect(res.status).toBe(401);
  });

  it("403 for a customer-role account", async () => {
    signInAs(await createUser("customer"));
    const res = await call(addMedia.POST, { params: { id: "x" }, body: { url: PNG } });
    expect(res.status).toBe(403);
  });

  it("adds a photo to the client", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const res = await call(addMedia.POST, { params: { id: c.id }, body: { url: PNG, caption: "Front" } });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ businessId: business.id, ownerType: "customer", ownerId: c.id, url: PNG, caption: "Front" });
  });

  it("stores an empty caption as null", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const res = await call(addMedia.POST, { params: { id: c.id }, body: { url: PNG, caption: "" } });
    expect(res.body.caption).toBeNull();
  });

  it("404 when adding to another business's client, and nothing is written", async () => {
    const other = await createTailor("Other");
    const theirs = await createClient(other.business.id);
    await createTailor();
    const res = await call(addMedia.POST, { params: { id: theirs.id }, body: { url: PNG } });
    expect(res.status).toBe(404);
    expect(await prisma.media.count()).toBe(0);
  });

  it("404 for an unknown client id", async () => {
    await createTailor();
    const res = await call(addMedia.POST, { params: { id: "00000000-0000-0000-0000-000000000000" }, body: { url: PNG } });
    expect(res.status).toBe(404);
  });

  it("400 (not 500) when url is missing", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const res = await call(addMedia.POST, { params: { id: c.id }, body: { caption: "No url" } });
    expect(res.status).toBe(400);
  });

  it("400 (not 500) on malformed JSON", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const res = await call(addMedia.POST, { params: { id: c.id }, rawBody: "{bad", headers: { "Content-Type": "application/json" } });
    expect(res.status).toBe(400);
  });

  it("rejects a url that is not an image data URL or https URL", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    for (const url of ["data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==", "javascript:alert(1)"]) {
      const res = await call(addMedia.POST, { params: { id: c.id }, body: { url } });
      expect(res.status, url).toBe(400);
    }
    expect(await prisma.media.count()).toBe(0);
  });

  it("rejects an oversized photo (413) instead of storing it in the database", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const big = "data:image/jpeg;base64," + "A".repeat(8 * 1024 * 1024);
    const res = await call(addMedia.POST, { params: { id: c.id }, body: { url: big } });
    expect([400, 413]).toContain(res.status);
    expect(await prisma.media.count()).toBe(0);
  });
});

describe("DELETE /api/customers/[id]/media/[mediaId]", () => {
  it("401 when signed out", async () => {
    signOut();
    const res = await call(oneMedia.DELETE, { method: "DELETE", params: { id: "x", mediaId: "y" } });
    expect(res.status).toBe(401);
  });

  it("deletes the client's photo", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const m = await addPhoto(business.id, c.id);
    const res = await call(oneMedia.DELETE, { method: "DELETE", params: { id: c.id, mediaId: m.id } });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(await prisma.media.count()).toBe(0);
  });

  it("404 for another business's photo, which stays put", async () => {
    const other = await createTailor("Other");
    const theirs = await createClient(other.business.id);
    const m = await addPhoto(other.business.id, theirs.id);
    await createTailor();
    const res = await call(oneMedia.DELETE, { method: "DELETE", params: { id: theirs.id, mediaId: m.id } });
    expect(res.status).toBe(404);
    expect(await prisma.media.count()).toBe(1);
  });

  it("404 when the photo belongs to a different client of the same business", async () => {
    const { business } = await createTailor();
    const a = await createClient(business.id);
    const b = await createClient(business.id);
    const m = await addPhoto(business.id, b.id);
    const res = await call(oneMedia.DELETE, { method: "DELETE", params: { id: a.id, mediaId: m.id } });
    expect(res.status).toBe(404);
    expect(await prisma.media.count()).toBe(1);
  });

  it("404 when the media is an order photo, not a client photo", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const order = await createOrder(business.id, c.id);
    // An order photo addressed through the customer route with the order's id
    // as the "client" id must not be deletable here.
    const m = await addPhoto(business.id, order.id, "order");
    const res = await call(oneMedia.DELETE, { method: "DELETE", params: { id: order.id, mediaId: m.id } });
    expect(res.status).toBe(404);
    expect(await prisma.media.count()).toBe(1);
  });

  it("404 for an unknown media id", async () => {
    const { business } = await createTailor();
    const c = await createClient(business.id);
    const res = await call(oneMedia.DELETE, { method: "DELETE", params: { id: c.id, mediaId: "00000000-0000-0000-0000-000000000000" } });
    expect(res.status).toBe(404);
  });
});
