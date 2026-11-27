import { beforeEach, describe, expect, it } from "vitest";
import * as userAdmin from "@/app/api/admin/users/[id]/route";
import * as resetAdmin from "@/app/api/admin/users/[id]/password-reset/route";
import * as postAdmin from "@/app/api/admin/posts/[id]/route";
import * as settingsAdmin from "@/app/api/admin/settings/route";
import * as teamAdmin from "@/app/api/admin/team/route";
import * as appConfig from "@/app/api/app-config/route";
import * as me from "@/app/api/me/route";
import * as feed from "@/app/api/explore/route";
import * as register from "@/app/api/auth/register/route";
import { clearAppSettingsCache } from "@/lib/app-settings";
import { insights, overview } from "@/lib/admin/stats";
import { call, createClient, createOrder, createTailor, createUser, prisma, resetDb, signInAs, signOut } from "../helpers";
import { sentEmails } from "../session-state";

beforeEach(async () => {
  await resetDb();
  clearAppSettingsCache();
  sentEmails.length = 0;
});

async function staff(staffRole: "owner" | "admin" | "moderator") {
  const user = await createUser("tailor");
  await prisma.user.update({ where: { id: user.id }, data: { staffRole } });
  signInAs(user);
  return user;
}

const post = (authorId: string, authorName = "Studio") =>
  prisma.stylePost.create({
    data: { authorId, authorName, country: "Nigeria", category: "Traditional", imageUrl: "https://images.example.com/x.jpg" },
  });

const patchUser = (id: string, body: unknown) => call(userAdmin.PATCH, { method: "PATCH", params: { id }, body });
const patchPost = (id: string, body: unknown) => call(postAdmin.PATCH, { method: "PATCH", params: { id }, body });
const patchSettings = (body: unknown) => call(settingsAdmin.PATCH, { method: "PATCH", body });

describe("admin access", () => {
  it("401 signed out, 403 for ordinary users, 403 for suspended staff", async () => {
    const target = await createUser();
    signOut();
    expect((await patchUser(target.id, { action: "unsuspend" })).status).toBe(401);
    signInAs(await createUser());
    expect((await patchUser(target.id, { action: "unsuspend" })).status).toBe(403);
    expect((await call(settingsAdmin.GET)).status).toBe(403);
    const s = await staff("owner");
    await prisma.user.update({ where: { id: s.id }, data: { suspendedAt: new Date() } });
    expect((await call(settingsAdmin.GET)).status).toBe(403);
  });

  it("moderators can moderate but not manage users or settings", async () => {
    const { user: author } = await createTailor();
    const p = await post(author.id);
    await staff("moderator");
    expect((await patchPost(p.id, { action: "hide" })).status).toBe(200);
    expect((await patchUser(author.id, { action: "suspend", reason: "spam" })).status).toBe(403);
    expect((await patchSettings({ signupsEnabled: false })).status).toBe(403);
    expect((await call(settingsAdmin.GET)).status).toBe(200);
  });

  it("nobody can act on themselves or on staff at or above their level", async () => {
    const owner = await createUser();
    await prisma.user.update({ where: { id: owner.id }, data: { staffRole: "owner" } });
    const otherAdmin = await createUser();
    await prisma.user.update({ where: { id: otherAdmin.id }, data: { staffRole: "admin" } });
    const admin = await staff("admin");
    expect((await patchUser(admin.id, { action: "suspend", reason: "test" })).status).toBe(400);
    expect((await patchUser(owner.id, { action: "suspend", reason: "test" })).status).toBe(403);
    expect((await patchUser(otherAdmin.id, { action: "suspend", reason: "test" })).status).toBe(403);
    expect((await call(userAdmin.DELETE, { method: "DELETE", params: { id: owner.id } })).status).toBe(403);
  });
});

describe("suspending an account", () => {
  it("locks them out of the API, hides their Explore posts, and is logged; lifting it restores both", async () => {
    const { user: tailor } = await createTailor("Bad Studio");
    const p = await post(tailor.id, "Bad Studio");
    const viewer = await createUser("customer");
    const admin = await staff("admin");

    expect((await patchUser(tailor.id, { action: "suspend" })).status).toBe(400); // reason required
    expect((await patchUser(tailor.id, { action: "suspend", reason: "Repeated spam" })).status).toBe(200);

    signInAs(tailor);
    expect((await call(me.GET)).status).toBe(403);
    signInAs(viewer);
    expect((await call(feed.GET, { path: "/api/explore" })).body.posts).toEqual([]);

    signInAs(admin);
    expect((await patchUser(tailor.id, { action: "unsuspend" })).status).toBe(200);
    signInAs(tailor);
    expect((await call(me.GET)).status).toBe(200);
    signInAs(viewer);
    expect((await call(feed.GET, { path: "/api/explore" })).body.posts.map((x: { id: string }) => x.id)).toEqual([p.id]);

    const log = await prisma.adminAuditLog.findMany({ orderBy: { createdAt: "asc" } });
    expect(log.map(l => l.action)).toEqual(["user.suspend", "user.unsuspend"]);
    expect(log[0]).toMatchObject({ actorId: admin.id, targetId: tailor.id, meta: { reason: "Repeated spam" } });
  });
});

describe("other user actions", () => {
  it("changes the account type", async () => {
    const u = await createUser("customer");
    await staff("admin");
    expect((await patchUser(u.id, { action: "setRole", role: "tailor" })).status).toBe(200);
    expect((await prisma.user.findUnique({ where: { id: u.id } }))?.role).toBe("tailor");
  });

  it("deletes an account and everything it owns", async () => {
    const { user, business } = await createTailor();
    const c = await createClient(business.id);
    await createOrder(business.id, c.id);
    await staff("admin");
    expect((await call(userAdmin.DELETE, { method: "DELETE", params: { id: user.id } })).status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect(await prisma.order.count()).toBe(0);
    expect((await prisma.adminAuditLog.findFirst())?.action).toBe("user.delete");
  });

  it("sends a password reset link that points at the app, not the admin host", async () => {
    const u = await createUser();
    await staff("admin");
    const res = await call(resetAdmin.POST, { method: "POST", params: { id: u.id }, path: "/api/admin/users/x/password-reset" });
    expect(res.status).toBe(200);
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe(u.email);
    expect(new URL(sentEmails[0].resetUrl).pathname).toBe("/auth/reset");
  });

  it("only owners manage the team", async () => {
    const u = await createUser();
    await staff("admin");
    expect((await call(teamAdmin.POST, { body: { email: u.email, staffRole: "moderator" } })).status).toBe(403);
    expect((await patchUser(u.id, { action: "setStaffRole", staffRole: "moderator" })).status).toBe(403);

    await staff("owner");
    expect((await call(teamAdmin.POST, { body: { email: u.email.toUpperCase(), staffRole: "moderator" } })).status).toBe(201);
    expect((await call(teamAdmin.POST, { body: { email: u.email, staffRole: "admin" } })).status).toBe(409);
    expect((await call(teamAdmin.POST, { body: { email: "nobody@test.local", staffRole: "admin" } })).status).toBe(404);
    expect((await patchUser(u.id, { action: "setStaffRole", staffRole: null })).status).toBe(200);
    expect((await prisma.user.findUnique({ where: { id: u.id } }))?.staffRole).toBeNull();
  });
});

describe("moderating posts", () => {
  it("hide, restore (clears reports), dismiss, and delete", async () => {
    const { user: author } = await createTailor();
    const p = await post(author.id);
    const reporter = await createUser("customer");
    await prisma.postReport.create({ data: { postId: p.id, reporterId: reporter.id, reason: "spam" } });
    await staff("moderator");

    await patchPost(p.id, { action: "hide" });
    expect((await prisma.stylePost.findUnique({ where: { id: p.id } }))?.hiddenAt).not.toBeNull();

    await patchPost(p.id, { action: "restore" });
    expect((await prisma.stylePost.findUnique({ where: { id: p.id } }))?.hiddenAt).toBeNull();
    expect(await prisma.postReport.count()).toBe(0);

    await prisma.postReport.create({ data: { postId: p.id, reporterId: reporter.id, reason: "hate" } });
    await patchPost(p.id, { action: "dismiss" });
    expect(await prisma.postReport.count()).toBe(0);

    expect((await patchPost(p.id, { action: "nope" })).status).toBe(400);
    expect((await call(postAdmin.DELETE, { method: "DELETE", params: { id: p.id } })).status).toBe(200);
    expect(await prisma.stylePost.count()).toBe(0);
    expect((await call(postAdmin.DELETE, { method: "DELETE", params: { id: p.id } })).status).toBe(404);

    const actions = (await prisma.adminAuditLog.findMany({ orderBy: { createdAt: "asc" } })).map(l => l.action);
    expect(actions).toEqual(["post.hide", "post.restore", "post.dismiss", "post.delete"]);
  });
});

describe("app controls", () => {
  it("validates input and only logs real changes", async () => {
    await staff("admin");
    expect((await patchSettings({ minIosVersion: "abc" })).status).toBe(400);
    expect((await patchSettings({ unknownKey: true })).status).toBe(400);
    expect((await patchSettings({ signupsEnabled: true })).status).toBe(200); // already true
    expect(await prisma.adminAuditLog.count()).toBe(0);
    const res = await patchSettings({ announcement: "New invoices!", minIosVersion: "1.2.0" });
    expect(res.body).toMatchObject({ announcement: "New invoices!", minIosVersion: "1.2.0" });
    expect(await prisma.adminAuditLog.count()).toBe(1);
  });

  it("maintenance mode blocks everyone but staff, and is public in /api/app-config", async () => {
    const admin = await staff("admin");
    await patchSettings({ maintenanceMode: true, maintenanceMessage: "Back at 6pm" });

    signInAs(await createUser());
    const res = await call(me.GET);
    expect(res.status).toBe(503);
    expect(res.body.error).toBe("Back at 6pm");

    signInAs(admin);
    expect((await call(me.GET)).status).toBe(200);

    signOut();
    const cfg = await call(appConfig.GET);
    expect(cfg.status).toBe(200);
    expect(cfg.body).toMatchObject({ maintenance: { message: "Back at 6pm" }, signupsEnabled: true, minAppVersion: { ios: null, android: null } });
  });

  it("closing sign-ups stops new accounts; pausing posting stops new Explore posts", async () => {
    await staff("admin");
    await patchSettings({ signupsEnabled: false, explorePostingEnabled: false });

    const reg = await call(register.POST, { body: { email: "new@test.local", password: "secret123" } });
    expect(reg.status).toBe(403);
    expect(await prisma.user.count({ where: { email: "new@test.local" } })).toBe(0);

    await createTailor();
    const created = await call(feed.POST, {
      body: { imageUrl: "https://images.example.com/y.jpg", country: "Nigeria", category: "Traditional" },
    });
    expect(created.status).toBe(503);
  });
});

describe("activity and stats", () => {
  it("records when a user was last seen", async () => {
    const u = await createUser();
    signInAs(u);
    await call(me.GET);
    expect((await prisma.user.findUnique({ where: { id: u.id } }))?.lastSeenAt).not.toBeNull();
  });

  it("overview and insights add up", async () => {
    const { user, business } = await createTailor("Top Studio");
    const c = await createClient(business.id);
    await createOrder(business.id, c.id);
    await createOrder(business.id, c.id);
    await createUser("customer");
    await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date(), lastSeenClient: "app" } });

    const o = await overview();
    expect(o.users).toMatchObject({ total: 2, tailors: 1, customers: 1, new7: 2 });
    expect(o.active).toMatchObject({ day: 1, month: 1, app: 1, web: 0 });
    expect(o.workspace.orders30).toBe(2);
    expect(o.series.signups).toHaveLength(30);
    expect(o.series.signups.at(-1)?.count).toBe(2);
    expect(o.series.orders.reduce((s, d) => s + d.count, 0)).toBe(2);
    expect(o.health.db.ok).toBe(true);

    const i = await insights("30d");
    expect(i.studios[0]).toMatchObject({ label: "Top Studio", count: 2, href: `/users/${user.id}` });
    expect(i.garments[0]).toMatchObject({ label: "Shirt", count: 2 });
  });
});
