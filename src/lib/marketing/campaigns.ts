import { z } from "zod";
import type { Campaign } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendMarketingEmails, type MarketingEmail } from "@/lib/email";
import { sendPush, type PushMessage } from "@/lib/push";
import { audienceSchema, parseAudience, recipientsWhere } from "@/lib/marketing/audience";
import { unsubscribeUrl } from "@/lib/marketing/unsubscribe";
import { campaignEmail } from "@/lib/email-templates";

export const campaignSchema = z
  .object({
    title: z.string().trim().min(1, "Give the campaign a name").max(120),
    subject: z.string().trim().min(1, "Add an email subject").max(150),
    body: z.string().trim().min(1, "Write the message").max(10_000),
    ctaLabel: z.string().trim().max(40).nullable().default(null),
    ctaUrl: z
      .string()
      .trim()
      .max(500)
      .refine(u => /^https:\/\//i.test(u), "Button links must start with https://")
      .nullable()
      .default(null),
    sendEmail: z.boolean().default(true),
    sendPush: z.boolean().default(false),
    pushTitle: z.string().trim().max(65).nullable().default(null),
    pushBody: z.string().trim().max(178).nullable().default(null),
    audience: audienceSchema.default({ roles: [], plans: [], countries: [], activeWithinDays: null, inactiveForDays: null }),
  })
  .refine(c => c.sendEmail || c.sendPush, { message: "Choose email, push, or both" });

/** "Hi {name}" personalisation; falls back to "there". */
const personalise = (text: string, name: string | null) => text.replace(/\{\s*name\s*\}/gi, name?.trim() || "there");

type Content = Pick<Campaign, "subject" | "body" | "ctaLabel" | "ctaUrl">;

/** The branded campaign email for one recipient (design in src/lib/email-templates.ts). */
export function renderEmail(c: Content, recipient: { name: string | null }, links: { origin?: string; unsubscribe: string }) {
  return campaignEmail(
    { subject: personalise(c.subject, recipient.name), body: personalise(c.body, recipient.name), ctaLabel: c.ctaLabel, ctaUrl: c.ctaUrl },
    { unsubscribe: links.unsubscribe },
  );
}

const pushContent = (c: Pick<Campaign, "pushTitle" | "pushBody" | "subject" | "body">, name: string | null) => ({
  title: personalise(c.pushTitle || c.subject, name).slice(0, 65),
  body: personalise(c.pushBody || c.body.split(/\n/)[0], name).slice(0, 178),
});

const BATCH = 200;
const LOCK_MS = 2 * 60 * 1000;

/**
 * Sends the next batch of a campaign. Call repeatedly until `done`; the
 * portal does this and shows progress. A lock stops two tabs sending the
 * same batch twice.
 */
export async function sendNextBatch(campaignId: string, origin: string) {
  const now = new Date();
  const claimed = await prisma.campaign.updateMany({
    where: {
      id: campaignId,
      status: { in: ["draft", "sending"] },
      OR: [{ lockedAt: null }, { lockedAt: { lt: new Date(now.getTime() - LOCK_MS) } }],
    },
    data: { lockedAt: now, status: "sending" },
  });
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error("Campaign not found");
  if (!claimed.count) return { done: campaign.status === "sent", busy: campaign.status !== "sent", campaign };

  try {
    const where = await recipientsWhere(parseAudience(campaign.audience), { email: campaign.sendEmail, push: campaign.sendPush });
    const users = await prisma.user.findMany({
      where: { AND: [where, ...(campaign.cursor ? [{ id: { gt: campaign.cursor } }] : [])] },
      orderBy: { id: "asc" },
      take: BATCH,
      select: { id: true, email: true, name: true, marketingEmails: true, pushNotifications: true, pushTokens: { select: { token: true } }, business: { select: { ownerName: true } } },
    });

    const emails: MarketingEmail[] = [];
    const pushes: PushMessage[] = [];
    for (const u of users) {
      const name = (u.name || u.business?.ownerName || "").split(" ")[0] || null;
      if (campaign.sendEmail && u.marketingEmails) {
        const unsubscribe = unsubscribeUrl(origin, u.id);
        const r = renderEmail(campaign, { name }, { origin, unsubscribe });
        emails.push({ to: u.email, subject: r.subject, html: r.html, text: r.text, unsubscribeUrl: unsubscribe });
      }
      if (campaign.sendPush && u.pushNotifications) {
        const p = pushContent(campaign, name);
        for (const t of u.pushTokens) pushes.push({ to: t.token, ...p, data: { campaignId: campaign.id, url: campaign.ctaUrl } });
      }
    }

    const [e, p] = await Promise.all([
      emails.length ? sendMarketingEmails(emails) : { sent: 0, failed: 0 },
      pushes.length ? sendPush(pushes) : { sent: 0, failed: 0 },
    ]);
    const done = users.length < BATCH;
    const updated = await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        cursor: users.at(-1)?.id ?? campaign.cursor,
        recipients: { increment: users.length },
        emailsSent: { increment: e.sent },
        pushSent: { increment: p.sent },
        failures: { increment: e.failed + p.failed },
        lockedAt: null,
        ...(done ? { status: "sent", sentAt: new Date() } : {}),
      },
    });
    return { done, busy: false, campaign: updated };
  } catch (error) {
    await prisma.campaign.update({ where: { id: campaign.id }, data: { lockedAt: null } });
    throw error;
  }
}

/** A preview to the staff member only: their email and their own devices. */
export async function sendTest(campaign: Campaign, staff: { id: string; email: string; name: string | null }, origin: string) {
  const name = staff.name?.split(" ")[0] ?? null;
  const results = { email: false, push: 0 };
  if (campaign.sendEmail) {
    const r = renderEmail(campaign, { name }, { origin, unsubscribe: unsubscribeUrl(origin, staff.id) });
    const out = await sendMarketingEmails([
      { to: staff.email, subject: `[Test] ${r.subject}`, html: r.html, text: r.text, unsubscribeUrl: unsubscribeUrl(origin, staff.id) },
    ]);
    results.email = out.sent > 0;
  }
  if (campaign.sendPush) {
    const tokens = await prisma.pushToken.findMany({ where: { userId: staff.id } });
    const p = pushContent(campaign, name);
    results.push = (await sendPush(tokens.map(t => ({ to: t.token, ...p, data: { campaignId: campaign.id, url: campaign.ctaUrl } })))).sent;
  }
  return results;
}
