import { z } from "zod";
import type { Campaign } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendMarketingEmails, type MarketingEmail } from "@/lib/email";
import { sendPush, type PushMessage } from "@/lib/push";
import { audienceSchema, parseAudience, recipientsWhere } from "@/lib/marketing/audience";
import { unsubscribeUrl } from "@/lib/marketing/unsubscribe";

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
    audience: audienceSchema.default({ roles: [], plans: [], countries: [], activeWithinDays: null }),
  })
  .refine(c => c.sendEmail || c.sendPush, { message: "Choose email, push, or both" });

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** "Hi {name}" personalisation; falls back to "there". */
const personalise = (text: string, name: string | null) => text.replace(/\{\s*name\s*\}/gi, name?.trim() || "there");

type Content = Pick<Campaign, "subject" | "body" | "ctaLabel" | "ctaUrl">;

export function renderEmail(c: Content, recipient: { name: string | null }, links: { origin: string; unsubscribe: string }) {
  const body = personalise(c.body, recipient.name);
  const paragraphs = body.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const address = process.env.COMPANY_ADDRESS ? `<br>${esc(process.env.COMPANY_ADDRESS)}` : "";
  const html = `<!doctype html><html><body style="margin:0;background:#F4F2EC;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1E2019;">
  <img src="${links.origin}/lockup_olive.png" width="130" alt="Tayylo" style="display:block;margin:0 0 28px;height:auto;">
  <div style="background:#FBFAF7;border:1px solid #E3E0D6;border-radius:20px;padding:28px 24px;">
    <h1 style="margin:0 0 16px;font-size:22px;line-height:28px;font-weight:600;">${esc(personalise(c.subject, recipient.name))}</h1>
    ${paragraphs.map(p => `<p style="margin:0 0 14px;font-size:15px;line-height:23px;color:#33352C;">${esc(p).replace(/\n/g, "<br>")}</p>`).join("\n    ")}
    ${
      c.ctaLabel && c.ctaUrl
        ? `<a href="${esc(c.ctaUrl)}" style="display:inline-block;margin-top:8px;padding:13px 24px;background:#454F2C;color:#FFFFFF;text-decoration:none;border-radius:999px;font-weight:600;font-size:15px;">${esc(c.ctaLabel)}</a>`
        : ""
    }
  </div>
  <p style="margin:20px 4px 0;font-size:12px;line-height:18px;color:#6B6D62;">
    You're getting this because you have a Tayylo account.
    <a href="${links.unsubscribe}" style="color:#6B6D62;">Unsubscribe from updates</a>.${address}
  </p>
</div></body></html>`;
  const text = [personalise(c.subject, recipient.name), "", ...paragraphs.flatMap(p => [p, ""]), c.ctaLabel && c.ctaUrl ? `${c.ctaLabel}: ${c.ctaUrl}\n` : "", `Unsubscribe: ${links.unsubscribe}`].join("\n");
  return { html, text, subject: personalise(c.subject, recipient.name) };
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
