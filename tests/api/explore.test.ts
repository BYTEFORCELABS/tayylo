import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as feed from "@/app/api/explore/route";
import * as post from "@/app/api/explore/[id]/route";
import * as save from "@/app/api/explore/[id]/save/route";
import * as saved from "@/app/api/explore/saved/route";
import * as upload from "@/app/api/explore/upload/route";
import { call, createTailor, createUser, prisma, resetDb, signInAs, signOut } from "../helpers";

vi.mock("@vercel/blob", () => ({
  put: vi.fn(async (pathname: string) => ({ url: `https://blob.test/${pathname}` })),
}));

beforeEach(resetDb);
afterEach(() => {
  process.env.BLOB_READ_WRITE_TOKEN = "";
});

const IMG = "https://images.example.com/look.jpg";
let n = 0;

async function createPost(authorId: string, data: Partial<{ country: string; category: string; caption: string; tags: string[]; authorName: string; createdAt: Date }> = {}) {
  return prisma.stylePost.create({
    data: {
      authorId,
      authorName: data.authorName ?? "Studio",
      country: data.country ?? "Nigeria",
      category: data.category ?? "Traditional",
      caption: data.caption ?? `Look ${++n}`,
      tags: data.tags ?? [],
      imageUrl: IMG,
      ...(data.createdAt ? { createdAt: data.createdAt } : {}),
    },
  });
}

const valid = { imageUrl: IMG, country: "Nigeria", category: "Traditional", caption: "Agbada", tags: ["Lace", "lace", "gold"] };

describe("GET /api/explore", () => {
  it("401 when signed out", async () => {
    signOut();
    expect((await call(feed.GET, { path: "/api/explore" })).status).toBe(401);
  });

  it("customers can browse, with saved/mine flags", async () => {
    const { user: tailor } = await createTailor();
    const p = await createPost(tailor.id);
    const customer = await createUser("customer");
    await prisma.savedPost.create({ data: { userId: customer.id, postId: p.id } });
    signInAs(customer);
    const res = await call(feed.GET, { path: "/api/explore" });
    expect(res.status).toBe(200);
    expect(res.body.posts).toHaveLength(1);
    expect(res.body.posts[0]).toMatchObject({ id: p.id, saved: true, mine: false });
    expect(res.body.posts[0].authorId).toBeUndefined();
    expect(res.body.nextCursor).toBeNull();
  });

  it("marks the viewer's own posts as mine", async () => {
    const { user } = await createTailor();
    await createPost(user.id);
    const res = await call(feed.GET, { path: "/api/explore" });
    expect(res.body.posts[0].mine).toBe(true);
  });

  it("paginates 24 at a time, newest first, with a working cursor and no duplicates", async () => {
    const { user } = await createTailor();
    const base = Date.now();
    for (let i = 0; i < 30; i++) await createPost(user.id, { createdAt: new Date(base - i * 1000) });
    const first = await call(feed.GET, { path: "/api/explore" });
    expect(first.body.posts).toHaveLength(24);
    expect(first.body.nextCursor).toBe(first.body.posts[23].id);
    const times = first.body.posts.map((p: { createdAt: string }) => Date.parse(p.createdAt));
    expect([...times].sort((a, b) => b - a)).toEqual(times);

    const second = await call(feed.GET, { path: `/api/explore?cursor=${first.body.nextCursor}` });
    expect(second.body.posts).toHaveLength(6);
    expect(second.body.nextCursor).toBeNull();
    expect(second.body.countries).toEqual([]);
    const ids = new Set([...first.body.posts, ...second.body.posts].map((p: { id: string }) => p.id));
    expect(ids.size).toBe(30);
  });

  it("an unknown cursor is not a server error", async () => {
    await createTailor();
    const res = await call(feed.GET, { path: "/api/explore?cursor=does-not-exist" });
    expect(res.status).toBeLessThan(500);
  });

  it("filters by country and category, and lists country counts ignoring the country filter", async () => {
    const { user } = await createTailor();
    await createPost(user.id, { country: "Nigeria", category: "Traditional" });
    await createPost(user.id, { country: "Nigeria", category: "Formal" });
    await createPost(user.id, { country: "Ghana", category: "Traditional" });

    const ng = await call(feed.GET, { path: "/api/explore?country=Nigeria" });
    expect(ng.body.posts).toHaveLength(2);
    expect(ng.body.countries).toEqual([
      { name: "Nigeria", count: 2 },
      { name: "Ghana", count: 1 },
    ]);
    const trad = await call(feed.GET, { path: "/api/explore?category=Traditional" });
    expect(trad.body.posts).toHaveLength(2);
    const both = await call(feed.GET, { path: "/api/explore?country=Ghana&category=Traditional" });
    expect(both.body.posts).toHaveLength(1);
  });

  it("searches caption and author name case-insensitively, and tags exactly", async () => {
    const { user } = await createTailor();
    await createPost(user.id, { caption: "Royal Agbada", tags: [] });
    await createPost(user.id, { caption: "Kaftan", tags: ["lace"] });
    await createPost(user.id, { caption: "Suit", authorName: "Bespoke House" });
    expect((await call(feed.GET, { path: "/api/explore?q=agbada" })).body.posts).toHaveLength(1);
    expect((await call(feed.GET, { path: "/api/explore?q=LACE" })).body.posts).toHaveLength(1);
    expect((await call(feed.GET, { path: "/api/explore?q=bespoke" })).body.posts).toHaveLength(1);
    expect((await call(feed.GET, { path: "/api/explore?q=nothing" })).body.posts).toHaveLength(0);
  });
});

describe("POST /api/explore", () => {
  it("401 signed out, 403 for customers", async () => {
    signOut();
    expect((await call(feed.POST, { body: valid })).status).toBe(401);
    signInAs(await createUser("customer"));
    expect((await call(feed.POST, { body: valid })).status).toBe(403);
  });

  it("creates a post with the studio name and de-duplicated lowercase tags", async () => {
    await createTailor("Lagos Atelier");
    const res = await call(feed.POST, { body: valid });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ authorName: "Lagos Atelier", country: "Nigeria", category: "Traditional", caption: "Agbada", saved: false, mine: true });
    expect(res.body.tags).toEqual(["lace", "gold"]);
  });

  it("falls back to a generic author name for a tailor without a business", async () => {
    signInAs(await createUser("tailor"));
    const res = await call(feed.POST, { body: valid });
    expect(res.status).toBe(201);
    expect(res.body.authorName).toBe("A Tayylo tailor");
  });

  it.each([
    ["missing imageUrl", { ...valid, imageUrl: undefined }],
    ["bad imageUrl", { ...valid, imageUrl: "not a url" }],
    ["missing country", { ...valid, country: "" }],
    ["unknown category", { ...valid, category: "Pyjamas" }],
    ["caption too long", { ...valid, caption: "x".repeat(281) }],
    ["too many tags", { ...valid, tags: ["a", "b", "c", "d", "e", "f", "g", "h", "i"] }],
    ["non-integer width", { ...valid, width: 10.5 }],
  ])("400 for %s", async (_name, body) => {
    await createTailor();
    const res = await call(feed.POST, { body });
    expect(res.status).toBe(400);
  });

  it("400 on malformed JSON", async () => {
    await createTailor();
    expect((await call(feed.POST, { rawBody: "{oops", headers: { "Content-Type": "application/json" } })).status).toBe(400);
  });

  it("rejects non-http(s) image URLs such as javascript:", async () => {
    await createTailor();
    const res = await call(feed.POST, { body: { ...valid, imageUrl: "javascript:alert(1)" } });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/explore/[id]", () => {
  it("the author can delete; saves are removed with it", async () => {
    const { user } = await createTailor();
    const p = await createPost(user.id);
    const fan = await createUser("customer");
    await prisma.savedPost.create({ data: { userId: fan.id, postId: p.id } });
    const res = await call(post.DELETE, { method: "DELETE", params: { id: p.id } });
    expect(res).toEqual({ status: 200, body: { ok: true } });
    expect(await prisma.stylePost.count()).toBe(0);
    expect(await prisma.savedPost.count()).toBe(0);
  });

  it("404 for another tailor's post (and it survives)", async () => {
    const { user: author } = await createTailor("Author");
    const p = await createPost(author.id);
    await createTailor("Intruder");
    expect((await call(post.DELETE, { method: "DELETE", params: { id: p.id } })).status).toBe(404);
    expect(await prisma.stylePost.count()).toBe(1);
  });

  it("403 for customers, 401 signed out, 404 unknown id", async () => {
    const { user } = await createTailor();
    const p = await createPost(user.id);
    signInAs(await createUser("customer"));
    expect((await call(post.DELETE, { method: "DELETE", params: { id: p.id } })).status).toBe(403);
    signOut();
    expect((await call(post.DELETE, { method: "DELETE", params: { id: p.id } })).status).toBe(401);
    signInAs(user);
    expect((await call(post.DELETE, { method: "DELETE", params: { id: "nope" } })).status).toBe(404);
  });
});

describe("POST/DELETE /api/explore/[id]/save and GET /api/explore/saved", () => {
  it("saving is idempotent and shows up in the saved list (customers too)", async () => {
    const { user } = await createTailor();
    const p = await createPost(user.id);
    const c = await createUser("customer");
    signInAs(c);
    expect((await call(save.POST, { params: { id: p.id } })).body).toEqual({ ok: true });
    expect((await call(save.POST, { params: { id: p.id } })).status).toBe(200);
    expect(await prisma.savedPost.count({ where: { userId: c.id } })).toBe(1);

    const list = await call(saved.GET);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]).toMatchObject({ id: p.id, saved: true, mine: false });
  });

  it("unsaving is idempotent", async () => {
    const { user } = await createTailor();
    const p = await createPost(user.id);
    await call(save.POST, { params: { id: p.id } });
    expect((await call(save.DELETE, { method: "DELETE", params: { id: p.id } })).body).toEqual({ ok: true });
    expect((await call(save.DELETE, { method: "DELETE", params: { id: p.id } })).status).toBe(200);
    expect((await call(saved.GET)).body).toEqual([]);
  });

  it("404 saving an unknown post; 401 signed out", async () => {
    await createTailor();
    expect((await call(save.POST, { params: { id: "nope" } })).status).toBe(404);
    signOut();
    expect((await call(save.POST, { params: { id: "nope" } })).status).toBe(401);
    expect((await call(save.DELETE, { method: "DELETE", params: { id: "nope" } })).status).toBe(401);
    expect((await call(saved.GET)).status).toBe(401);
  });

  it("one user's saves are not visible to another", async () => {
    const { user } = await createTailor();
    const p = await createPost(user.id);
    await call(save.POST, { params: { id: p.id } });
    signInAs(await createUser("customer"));
    expect((await call(saved.GET)).body).toEqual([]);
    const f = await call(feed.GET, { path: "/api/explore" });
    expect(f.body.posts[0].saved).toBe(false);
  });
});

describe("POST /api/explore/upload", () => {
  function fileForm(type: string, bytes: number) {
    const form = new FormData();
    form.set("file", new File([new Uint8Array(bytes)], "style.jpg", { type }));
    return form;
  }

  it("401 signed out, 403 for customers", async () => {
    signOut();
    expect((await call(upload.POST, { rawBody: fileForm("image/jpeg", 10) })).status).toBe(401);
    signInAs(await createUser("customer"));
    expect((await call(upload.POST, { rawBody: fileForm("image/jpeg", 10) })).status).toBe(403);
  });

  it("503 with a clear message when blob storage isn't configured", async () => {
    await createTailor();
    const res = await call(upload.POST, { rawBody: fileForm("image/jpeg", 10) });
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/BLOB_READ_WRITE_TOKEN/);
  });

  it("uploads an image under the tailor's folder", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
    const { user } = await createTailor();
    const res = await call(upload.POST, { rawBody: fileForm("image/jpeg", 1024) });
    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(new RegExp(`^https://blob\\.test/explore/${user.id}/[0-9a-f-]+\\.jpg$`));
  });

  it("400 for a non-image file or no file", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
    await createTailor();
    expect((await call(upload.POST, { rawBody: fileForm("application/pdf", 10) })).status).toBe(400);
    expect((await call(upload.POST, { rawBody: new FormData() })).status).toBe(400);
  });

  it("413 for an image over 6 MB", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
    await createTailor();
    expect((await call(upload.POST, { rawBody: fileForm("image/jpeg", 6 * 1024 * 1024 + 1) })).status).toBe(413);
  });

  it("400 (not 500) when the body isn't multipart form data", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
    await createTailor();
    const res = await call(upload.POST, { body: { file: "x" } });
    expect(res.status).toBe(400);
  });
});
