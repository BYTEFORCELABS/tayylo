import { beforeEach, describe, expect, it, vi } from "vitest";
import * as campaigns from "@/app/api/admin/campaigns/route";
import * as campaign from "@/app/api/admin/campaigns/[id]/route";
import * as send from "@/app/api/admin/campaigns/[id]/send/route";
import * as estimate from "@/app/api/admin/campaigns/estimate/route";
import * as pushTokens from "@/app/api/me/push-tokens/route";
import * as prefs from "@/app/api/me/preferences/route";
import * as unsubscribe from "@/app/api/unsubscribe/route";
import * as templates from "@/app/api/admin/templates/route";
import * as template from "@/app/api/admin/templates/[id]/route";
import { clearAppSettingsCache } from "@/lib/app-settings";
import { unsubscribeUrl } from "@/lib/marketing/unsubscribe";
import { call, createTailor, createUser, prisma, resetDb, signInAs } from "../helpers";

const emails: { to: string; subject: string; html: string; unsubscribeUrl: string }[] = [];
const pushes: { to: string; title: string; body: string }[] = [];

vi.mock("@/lib/email", () => ({
  sendPasswordResetEmail: vi.fn(),
  sendModerationAlert: vi.fn(),
  sendAdminCodeEmail: vi.fn(),
  sendWelcomeEmail: vi.fn(async () => {}),
  sendPlanActivatedEmail: vi.fn(async () => {}),
  sendPaymentFailedEmail: vi.fn(async () => {}),
  sendMarketingEmails: vi.fn(async (list: typeof emails) => {
    emails.push(...list);
    return { sent: list.length, failed: 0 };
  }),
}));
vi.mock("@/lib/push", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/push")>()),
  sendPush: vi.fn(async (list: typeof pushes) => {
    pushes.push(...list);
    return { sent: list.length, failed: 0 };
  }),
}));

beforeEach(async () => {
  await resetDb();
  clearAppSettingsCache();
  emails.length = 0;
  pushes.length = 0;
});

async function admin() {
  const u = await createUser();
  await prisma.user.update({ where: { id: u.id }, data: { staffRole: "admin", name: "Ada Admin" } });
  signInAs(u);
  return u;
}
const token = (n: number | string) => `ExponentPushToken[device-${n}]`;
const draft = (extra: Record<string, unknown> = {}) => ({
  title: "Launch",
  subject: "Hello {name}",
  body: "Hi {name},\n\nNew templates are here.",
  ctaLabel: "Open",
  ctaUrl: "https://tayylo.com/measure",
  sendEmail: true,
  sendPush: true,
  audience: { roles: [], plans: [], countries: [], activeWithinDays: null },
  ...extra,
});

describe("push tokens and preferences", () => {
  it("registers Expo tokens, moves them to the latest user, and removes them", async () => {
    const a = await createUser();
    const b = await createUser();
    signInAs(a);
    expect((await call(pushTokens.POST, { body: { token: "not-a-token" } })).status).toBe(400);
    expect((await call(pushTokens.POST, { body: { token: token(1), platform: "ios" } })).status).toBe(200);
    signInAs(b);
    await call(pushTokens.POST, { body: { token: token(1), platform: "android" } });
    expect(await prisma.pushToken.findMany()).toEqual([expect.objectContaining({ userId: b.id, platform: "android" })]);
    await call(pushTokens.DELETE, { method: "DELETE", body: { token: token(1) } });
    expect(await prisma.pushToken.count()).toBe(0);
  });

  it("lets people turn updates off", async () => {
    signInAs(await createUser());
    expect((await call(prefs.GET)).body).toEqual({ marketingEmails: true, pushNotifications: true });
    expect((await call(prefs.PATCH, { method: "PATCH", body: { marketingEmails: false } })).body).toEqual({ marketingEmails: false, pushNotifications: true });
    expect((await call(prefs.PATCH, { method: "PATCH", body: { role: "admin" } })).status).toBe(400);
  });
});

describe("unsubscribe links", () => {
  it("GET asks, POST unsubscribes; forged links do nothing", async () => {
    const u = await createUser();
    const url = unsubscribeUrl("http://localhost:3000", u.id);
    const path = url.replace("http://localhost:3000", "");
    const page = await call(unsubscribe.GET, { path });
    expect(page.body).toContain("Unsubscribe from updates?");
    expect((await prisma.user.findUnique({ where: { id: u.id } }))?.marketingEmails).toBe(true);

    const other = await createUser();
    await call(unsubscribe.POST, { method: "POST", path: path.replace(u.id, other.id) });
    expect((await prisma.user.findUnique({ where: { id: other.id } }))?.marketingEmails).toBe(true);

    await call(unsubscribe.POST, { method: "POST", path });
    expect((await prisma.user.findUnique({ where: { id: u.id } }))?.marketingEmails).toBe(false);
  });
});

describe("campaigns", () => {
  it("only admins can create; content is validated", async () => {
    const mod = await createUser();
    await prisma.user.update({ where: { id: mod.id }, data: { staffRole: "moderator" } });
    signInAs(mod);
    expect((await call(campaigns.POST, { body: draft() })).status).toBe(403);
    await admin();
    expect((await call(campaigns.POST, { body: draft({ ctaUrl: "javascript:alert(1)" }) })).status).toBe(400);
    expect((await call(campaigns.POST, { body: draft({ sendEmail: false, sendPush: false }) })).status).toBe(400);
    expect((await call(campaigns.POST, { body: draft() })).status).toBe(201);
  });

  it("targets the audience, respects unsubscribes, personalises, and sends each person once", async () => {
    const { user: t1 } = await createTailor("Kente House");
    await prisma.business.update({ where: { ownerId: t1.id }, data: { ownerName: "Kofi Mensah", country: "Ghana" } });
    const { user: t2 } = await createTailor("Lagos Bespoke");
    await prisma.user.update({ where: { id: t2.id }, data: { marketingEmails: false } });
    await prisma.pushToken.create({ data: { userId: t2.id, token: token(2), platform: "ios" } });
    const { user: t3 } = await createTailor("Paid Studio");
    await prisma.plan.create({ data: { key: "free", name: "Free", isDefault: true, customBranding: false, explorePosting: true } });
    await prisma.plan.create({ data: { key: "pro", name: "Pro", customBranding: true, explorePosting: true } });
    await prisma.subscription.create({ data: { userId: t3.id, planKey: "pro", status: "active", provider: "manual" } });
    const suspended = await createUser("tailor");
    await prisma.user.update({ where: { id: suspended.id }, data: { suspendedAt: new Date() } });
    await createUser("customer");
    const me = await admin();

    const est = await call(estimate.POST, { body: { roles: ["tailor"], plans: ["free"], countries: [], activeWithinDays: null } });
    // t1, t2 and the admin (a tailor on the free plan); not t3 (paid), not the suspended one.
    expect(est.body).toEqual({ total: 3, email: 2, push: 1 });

    const created = await call(campaigns.POST, { body: draft({ audience: { roles: ["tailor"], plans: ["free"], countries: [], activeWithinDays: null } }) });
    const id = created.body.id;

    const test = await call(send.POST, { method: "POST", params: { id }, body: { test: true } });
    expect(test.body.test).toEqual({ email: true, push: 0 });
    expect(emails.map(e => e.to)).toEqual([me.email]);
    expect(emails[0].subject).toBe("[Test] Hello Ada");
    emails.length = 0;

    const res = await call(send.POST, { method: "POST", params: { id }, body: {} });
    expect(res.body.done).toBe(true);
    expect(new Set(emails.map(e => e.to))).toEqual(new Set([t1.email, me.email]));
    expect(emails.find(e => e.to === t1.email)!.subject).toBe("Hello Kofi");
    expect(emails[0].html).toContain("/api/unsubscribe?u=");
    expect(pushes).toEqual([expect.objectContaining({ to: token(2), title: "Hello there" })]);
    expect(res.body.campaign).toMatchObject({ status: "sent", recipients: 3, emailsSent: 2, pushSent: 1 });

    // Sending again doesn't resend, and a sent campaign can't be edited.
    await call(send.POST, { method: "POST", params: { id }, body: {} });
    expect(emails).toHaveLength(2);
    expect((await call(campaign.PATCH, { method: "PATCH", params: { id }, body: draft() })).status).toBe(409);
    expect((await prisma.adminAuditLog.findMany()).map(l => l.action)).toEqual(expect.arrayContaining(["campaign.create", "campaign.send"]));
  });

  it("win-back audiences pick people who've been away", async () => {
    const { user: away } = await createTailor();
    await prisma.user.update({ where: { id: away.id }, data: { lastSeenAt: new Date(Date.now() - 45 * 864e5) } });
    const { user: recent } = await createTailor();
    await prisma.user.update({ where: { id: recent.id }, data: { lastSeenAt: new Date() } });
    await admin(); // never seen: counts as away too
    const est = await call(estimate.POST, { body: { roles: ["tailor"], inactiveForDays: 30 } });
    expect(est.body.total).toBe(2);
  });

  it("refuses to send while [placeholders] are left in", async () => {
    await createTailor();
    await admin();
    const { body } = await call(campaigns.POST, { body: draft({ subject: "Maintenance on [day]" }) });
    const res = await call(send.POST, { method: "POST", params: { id: body.id }, body: {} });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("[day]");
    expect((await call(send.POST, { method: "POST", params: { id: body.id }, body: { test: true } })).status).toBe(200); // tests are fine
  });

  it("a second sender can't double-send while one holds the lock", async () => {
    await createTailor();
    await admin();
    const { body } = await call(campaigns.POST, { body: draft({ sendPush: false }) });
    await prisma.campaign.update({ where: { id: body.id }, data: { status: "sending", lockedAt: new Date() } });
    const res = await call(send.POST, { method: "POST", params: { id: body.id }, body: {} });
    expect(res.body).toMatchObject({ done: false, busy: true });
    expect(emails).toHaveLength(0);
  });
});

describe("global measurement templates", () => {
  const fields = [
    { key: "chest", label: "Chest", group: "Torso", minMm: 700, maxMm: 1500 },
    { key: "agbada_length", label: "Agbada length", group: "Length", minMm: null, maxMm: null },
  ];

  it("admins add, edit and archive templates every tailor sees", async () => {
    await admin();
    expect((await call(templates.POST, { body: { name: "Agbada", category: "Traditional", fields: [] } })).status).toBe(400);
    expect((await call(templates.POST, { body: { name: "Agbada", category: "Traditional", fields: [fields[0], fields[0]] } })).status).toBe(400);
    const created = await call(templates.POST, { body: { name: "Agbada", category: "Traditional", fields } });
    expect(created.status).toBe(201);
    expect((await call(templates.POST, { body: { name: "agbada", category: "Traditional", fields } })).status).toBe(409);

    const id = created.body.id;
    expect((await call(template.PATCH, { method: "PATCH", params: { id }, body: { name: "Agbada", category: "Traditional", fields: [fields[1]] } })).status).toBe(200);
    const t = await prisma.measurementTemplate.findUnique({ where: { id }, include: { fields: true } });
    expect(t).toMatchObject({ businessId: null, version: 2 });
    expect(t!.fields.map(f => f.key)).toEqual(["agbada_length"]);

    await call(template.PATCH, { method: "PATCH", params: { id }, body: { archived: true } });
    expect((await prisma.measurementTemplate.findUnique({ where: { id } }))?.archivedAt).not.toBeNull();
  });

  it("can't touch a studio's own template", async () => {
    const { business } = await createTailor();
    const own = await prisma.measurementTemplate.create({ data: { businessId: business.id, name: "Mine", category: "X" } });
    await admin();
    expect((await call(template.PATCH, { method: "PATCH", params: { id: own.id }, body: { archived: true } })).status).toBe(404);
  });
});
