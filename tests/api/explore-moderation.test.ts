import { beforeEach, describe, expect, it, vi } from "vitest";
import * as feed from "@/app/api/explore/route";
import * as saved from "@/app/api/explore/saved/route";
import * as report from "@/app/api/explore/[id]/report/route";
import * as block from "@/app/api/explore/[id]/block/route";
import * as blocks from "@/app/api/explore/blocks/route";
import * as unblock from "@/app/api/explore/blocks/[userId]/route";
import { call, createTailor, createUser, prisma, resetDb, signInAs, signOut } from "../helpers";

const sendModerationAlert = vi.fn();
vi.mock("@/lib/email", () => ({ sendModerationAlert: (...a: unknown[]) => sendModerationAlert(...a) }));

beforeEach(async () => {
  await resetDb();
  sendModerationAlert.mockReset();
});

async function createPost(authorId: string, authorName = "Studio") {
  return prisma.stylePost.create({
    data: { authorId, authorName, country: "Nigeria", category: "Traditional", imageUrl: "https://images.example.com/x.jpg" },
  });
}
const feedIds = async () => (await call(feed.GET, { path: "/api/explore" })).body.posts.map((p: { id: string }) => p.id);

describe("POST /api/explore/[id]/report", () => {
  it("401 when signed out", async () => {
    signOut();
    expect((await call(report.POST, { method: "POST", params: { id: "x" }, body: { reason: "spam" } })).status).toBe(401);
  });

  it("needs a known reason", async () => {
    const { user } = await createTailor();
    const p = await createPost(user.id);
    signInAs(await createUser("customer"));
    expect((await call(report.POST, { method: "POST", params: { id: p.id }, body: { reason: "meh" } })).status).toBe(400);
  });

  it("404 for a missing post, 400 for your own", async () => {
    const { user } = await createTailor();
    const p = await createPost(user.id);
    expect((await call(report.POST, { method: "POST", params: { id: p.id }, body: { reason: "spam" } })).status).toBe(400);
    expect((await call(report.POST, { method: "POST", params: { id: "00000000-0000-0000-0000-000000000000" }, body: { reason: "spam" } })).status).toBe(404);
  });

  it("hides the post from the reporter only, and alerts the team", async () => {
    const { user: author } = await createTailor();
    const p = await createPost(author.id, "Adewale");
    const reporter = await createUser("customer");
    const other = await createUser("customer");
    await prisma.savedPost.create({ data: { userId: reporter.id, postId: p.id } });

    signInAs(reporter);
    const res = await call(report.POST, { method: "POST", params: { id: p.id }, body: { reason: "nudity", details: "  not ok " } });
    expect(res.status).toBe(200);
    expect(await feedIds()).toEqual([]);
    expect((await call(saved.GET)).body).toEqual([]);
    expect(sendModerationAlert).toHaveBeenCalledWith(expect.objectContaining({ postId: p.id, reason: "nudity", details: "not ok", reportCount: 1, hidden: false }));

    signInAs(other);
    expect(await feedIds()).toEqual([p.id]);
  });

  it("reporting twice keeps one report", async () => {
    const { user: author } = await createTailor();
    const p = await createPost(author.id);
    signInAs(await createUser("customer"));
    await call(report.POST, { method: "POST", params: { id: p.id }, body: { reason: "spam" } });
    await call(report.POST, { method: "POST", params: { id: p.id }, body: { reason: "hate" } });
    const rows = await prisma.postReport.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].reason).toBe("hate");
  });

  it("three reports hide the post for everyone except its author", async () => {
    const { user: author } = await createTailor();
    const p = await createPost(author.id);
    for (let i = 0; i < 3; i++) {
      signInAs(await createUser("customer"));
      await call(report.POST, { method: "POST", params: { id: p.id }, body: { reason: "spam" } });
    }
    expect((await prisma.stylePost.findUnique({ where: { id: p.id } }))?.hiddenAt).not.toBeNull();
    expect(sendModerationAlert).toHaveBeenLastCalledWith(expect.objectContaining({ reportCount: 3, hidden: true }));
    signInAs(await createUser("customer"));
    expect(await feedIds()).toEqual([]);
    signInAs(author);
    expect(await feedIds()).toEqual([p.id]);
  });
});

describe("blocking", () => {
  it("hides every post by the blocked studio, both ways, and can be undone", async () => {
    const { user: a } = await createTailor("Adewale Atelier");
    const p1 = await createPost(a.id, "Adewale Atelier");
    const p2 = await createPost(a.id, "Adewale Atelier");
    const { user: b } = await createTailor("Other");
    const p3 = await createPost(b.id, "Other");
    const viewer = await createTailor("Viewer");
    const mine = await createPost(viewer.user.id, "Viewer");

    signInAs(viewer.user);
    expect((await call(block.POST, { method: "POST", params: { id: p1.id } })).status).toBe(200);
    expect(new Set(await feedIds())).toEqual(new Set([p3.id, mine.id]));

    const list = await call(blocks.GET);
    expect(list.body).toEqual([expect.objectContaining({ id: a.id, name: "Adewale Atelier" })]);

    // The blocked studio no longer sees the blocker either.
    signInAs(a);
    expect(new Set(await feedIds())).toEqual(new Set([p1.id, p2.id, p3.id]));

    signInAs(viewer.user);
    expect((await call(unblock.DELETE, { method: "DELETE", params: { userId: a.id } })).status).toBe(200);
    expect(new Set(await feedIds())).toEqual(new Set([p1.id, p2.id, p3.id, mine.id]));
  });

  it("can't block yourself; blocking twice is fine", async () => {
    const { user } = await createTailor();
    const own = await createPost(user.id);
    expect((await call(block.POST, { method: "POST", params: { id: own.id } })).status).toBe(400);
    const { user: other } = await createTailor();
    const p = await createPost(other.id);
    signInAs(user);
    await call(block.POST, { method: "POST", params: { id: p.id } });
    expect((await call(block.POST, { method: "POST", params: { id: p.id } })).status).toBe(200);
    expect(await prisma.userBlock.count()).toBe(1);
  });
});
