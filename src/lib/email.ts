import { Resend } from "resend";
import {
  adminCodeEmail,
  moderationAlertEmail,
  passwordResetEmail,
  paymentFailedEmail,
  planActivatedEmail,
  welcomeEmail,
  type RenderedEmail,
} from "@/lib/email-templates";

// Created on first send, not at import: this module is loaded by sign-in, and
// Resend's constructor throws without a key, which would break all sign-in.
let client: Resend | null = null;
const getClient = () => (client ??= new Resend(process.env.RESEND_API_KEY));
const resend = {
  emails: {
    send: (...args: Parameters<Resend["emails"]["send"]>) => getClient().emails.send(...args),
  },
  batch: {
    send: (...args: Parameters<Resend["batch"]["send"]>) => getClient().batch.send(...args),
  },
};

const FROM = process.env.EMAIL_FROM ?? "Tayylo <noreply@cyberziktechnologies.online>";

// Every email's design lives in src/lib/email-templates.ts; preview them all
// in the admin portal under Emails.
export async function sendPasswordResetEmail(email: string, resetUrl: string, siteUrl: string) {
  void siteUrl; // images come from emailAssetOrigin()
  const e = passwordResetEmail(resetUrl, email);
  await resend.emails.send({ from: FROM, to: email, subject: e.subject, html: e.html, text: e.text });
}

/**
 * Tell the team an Explore post was reported, so it can be reviewed within
 * 24 hours. Best effort: a failed email must never fail the report itself.
 */
export async function sendModerationAlert(alert: {
  postId: string;
  imageUrl: string;
  authorName: string;
  authorEmail: string;
  reason: string;
  details: string | null;
  reporterEmail: string;
  reportCount: number;
  hidden: boolean;
}) {
  const to = process.env.MODERATION_EMAIL;
  if (!to || !process.env.RESEND_API_KEY) return;
  const reviewUrl = process.env.ADMIN_HOST ? `https://${process.env.ADMIN_HOST}/moderation?view=all&post=${alert.postId}` : null;
  const e = moderationAlertEmail(alert, reviewUrl);
  try {
    await resend.emails.send({ from: FROM, to, subject: e.subject, html: e.html, text: e.text });
  } catch (error) {
    console.error("moderation alert failed", error);
  }
}

/** The admin portal's one-time sign-in code. */
export async function sendAdminCodeEmail(email: string, code: string) {
  if (!process.env.RESEND_API_KEY) {
    // Local development without email: print it instead.
    console.log(`[admin] sign-in code for ${email}: ${code}`);
    return;
  }
  const e = adminCodeEmail(code);
  const { error } = await resend.emails.send({ from: FROM, to: email, subject: e.subject, html: e.html, text: e.text });
  if (error) throw new Error(error.message);
}

/**
 * Lifecycle emails (welcome, plan changes). Best effort: a failed email must
 * never fail the sign-up or payment that triggered it.
 */
async function sendLifecycle(to: string, e: RenderedEmail, replyTo?: string) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject: e.subject, html: e.html, text: e.text, ...(replyTo ? { replyTo } : {}) });
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error(`[email] "${e.subject}" to ${to} failed:`, (err as Error).message);
  }
}

export const sendWelcomeEmail = (to: string, u: Parameters<typeof welcomeEmail>[0]) => sendLifecycle(to, welcomeEmail(u));
export const sendPlanActivatedEmail = (to: string, u: Parameters<typeof planActivatedEmail>[0]) => sendLifecycle(to, planActivatedEmail(u));
/** A tailor's client hears their order moved on; replies go to the tailor. */
export const sendOrderUpdateEmail = (to: string, e: RenderedEmail, replyTo?: string) => sendLifecycle(to, e, replyTo);
export const sendPaymentFailedEmail = (to: string, u: Parameters<typeof paymentFailedEmail>[0]) => sendLifecycle(to, paymentFailedEmail(u));

export interface MarketingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
}

/**
 * Promotional emails, sent in batches of up to 100 (Resend's batch limit).
 * Each carries one-click unsubscribe headers. Returns how many were accepted.
 */
export async function sendMarketingEmails(messages: MarketingEmail[]): Promise<{ sent: number; failed: number }> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[marketing] email not configured; would send ${messages.length}: ${messages[0]?.subject ?? ""}`);
    return { sent: 0, failed: messages.length };
  }
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const { error } = await resend.batch.send(
        chunk.map(m => ({
          from: process.env.MARKETING_EMAIL_FROM ?? FROM,
          to: m.to,
          subject: m.subject,
          html: m.html,
          text: m.text,
          headers: { "List-Unsubscribe": `<${m.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        })),
      );
      if (error) throw new Error(error.message);
      sent += chunk.length;
    } catch (e) {
      console.error("[marketing] batch failed:", (e as Error).message);
      failed += chunk.length;
    }
  }
  return { sent, failed };
}
