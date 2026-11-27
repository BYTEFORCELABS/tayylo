/**
 * Tayylo email design system. Every email Tayylo sends is built from this
 * one layout so they all look like the same brand: warm canvas, a card,
 * the olive "rail" header with garments standing on a tailor's tape, and
 * dashed "stitching" details.
 *
 * Email clients are not browsers: layout is tables, styles are inline, no
 * SVG (Gmail drops it) — artwork is PNG in public/email/, built by
 * design/email/build-email-assets.mjs. Pure functions, no sending here.
 */

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const C = {
  canvas: "#F4F2EC",
  card: "#FFFFFF",
  panel: "#2E3420",
  olive: "#454F2C",
  oliveSoft: "#E6E8DA",
  beige: "#F0EDE5",
  ink: "#1E2019",
  body: "#4A4C42",
  muted: "#6B6D62",
  faint: "#9A9C8C",
  line: "#E3E0D6",
  stitch: "#C9C3B1",
  cream: "#E8E2D4",
  sage: "#C9CDB8",
  danger: "#9C3D2C",
};
const FONT = "'Urbanist','Helvetica Neue',Helvetica,Arial,sans-serif";

/** Where email images are loaded from (must be public on the internet). */
export function emailAssetOrigin() {
  const fromEnv = process.env.EMAIL_ASSETS_URL || process.env.AUTH_URL;
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin;
    } catch {}
  }
  return "https://app.tayylo.com";
}
/** The web app, for buttons. */
export const appUrl = () => emailAssetOrigin();

export const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// ---------------------------------------------------------------- building blocks

type Icon = "lock" | "key" | "sparkle" | "card" | "flag" | "hanger";

export type Block =
  | { type: "greeting"; text: string }
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "button"; label: string; url: string }
  | { type: "code"; code: string; caption?: string }
  | { type: "details"; rows: [string, string][] }
  | { type: "note"; text: string }
  | { type: "link"; label: string; url: string }
  | { type: "steps"; items: { title: string; text: string }[] }
  | { type: "divider" };

export interface Layout {
  /** Shown after the subject in the inbox list. */
  preheader: string;
  /** Small caps label top right of the header, e.g. "Sign-in code". */
  label: string;
  /** Dark garment band with a headline. */
  hero?: { eyebrow: string; title: string; subtitle?: string };
  /** Round seal at the top of the card (for emails without a hero). */
  icon?: Icon;
  blocks: Block[];
  /** Why they got it, for the footer. */
  reason: string;
  unsubscribeUrl?: string;
}

const p = (text: string, style = "") =>
  `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:26px;color:${C.body};${style}">${text}</p>`;

/** Paragraph text: escaped, with **bold** and line breaks. */
const rich = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, `<strong style="color:${C.ink};font-weight:700;">$1</strong>`).replace(/\n/g, "<br>");

function block(b: Block, origin: string): string {
  switch (b.type) {
    case "greeting":
      return `<p style="margin:0 0 10px;font-family:${FONT};font-size:13px;line-height:18px;letter-spacing:1.6px;text-transform:uppercase;font-weight:700;color:${C.olive};">${esc(b.text)}</p>`;
    case "heading":
      return `<h1 style="margin:0 0 16px;font-family:${FONT};font-size:28px;line-height:34px;font-weight:700;letter-spacing:-0.4px;color:${C.ink};">${esc(b.text)}</h1>`;
    case "paragraph":
      return p(rich(b.text));
    case "list":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px;">${b.items
        .map(
          i => `<tr><td valign="top" style="padding:3px 12px 7px 0;"><img src="${origin}/email/check.png" width="18" height="18" alt="" style="display:block;border:0;"></td>
<td style="padding:2px 0 7px;font-family:${FONT};font-size:16px;line-height:24px;color:${C.body};">${rich(i)}</td></tr>`,
        )
        .join("")}</table>`;
    case "button":
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 22px;"><tr>
<td align="center" bgcolor="${C.olive}" style="border-radius:999px;background:${C.olive};">
<a href="${esc(b.url)}" target="_blank" style="display:inline-block;padding:15px 30px;font-family:${FONT};font-size:16px;line-height:20px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px;">${esc(b.label)}&nbsp;&nbsp;&rarr;</a>
</td></tr></table>`;
    case "code":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 20px;"><tr>
<td align="center" bgcolor="${C.beige}" style="background:${C.beige};border:2px dashed ${C.stitch};border-radius:18px;padding:22px 12px 18px;">
<div style="font-family:'SF Mono',Menlo,Consolas,'Courier New',monospace;font-size:38px;line-height:44px;font-weight:700;letter-spacing:12px;color:${C.olive};padding-left:12px;">${esc(b.code)}</div>
${b.caption ? `<div style="margin-top:8px;font-family:${FONT};font-size:13px;line-height:18px;color:${C.muted};">${esc(b.caption)}</div>` : ""}
</td></tr></table>`;
    case "details":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px;border-top:1px solid ${C.line};">${b.rows
        .map(
          ([k, v]) => `<tr><td style="padding:12px 0;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:14px;line-height:20px;color:${C.muted};">${esc(k)}</td>
<td align="right" style="padding:12px 0;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:14px;line-height:20px;font-weight:700;color:${C.ink};">${esc(v)}</td></tr>`,
        )
        .join("")}</table>`;
    case "steps":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px;">${b.items
        .map(
          (s, i) => `<tr><td valign="top" width="44" style="padding:0 0 16px;">
<div style="width:32px;height:32px;line-height:32px;border-radius:16px;background:${C.oliveSoft};text-align:center;font-family:${FONT};font-size:14px;font-weight:700;color:${C.olive};">${i + 1}</div></td>
<td valign="top" style="padding:3px 0 16px;font-family:${FONT};"><div style="font-size:16px;line-height:22px;font-weight:700;color:${C.ink};">${esc(s.title)}</div>
<div style="font-size:15px;line-height:22px;color:${C.muted};">${esc(s.text)}</div></td></tr>`,
        )
        .join("")}</table>`;
    case "note":
      return `<p style="margin:0 0 14px;font-family:${FONT};font-size:14px;line-height:22px;color:${C.muted};">${rich(b.text)}</p>`;
    case "link":
      return `<p style="margin:0 0 16px;font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted};word-break:break-all;">${esc(b.label)}<br><a href="${esc(b.url)}" style="color:${C.olive};text-decoration:underline;">${esc(b.url)}</a></p>`;
    case "divider":
      return `<div style="margin:8px 0 22px;border-top:2px dashed ${C.line};font-size:0;line-height:0;">&nbsp;</div>`;
  }
}

/** The full email page. */
export function layout(l: Layout, origin = emailAssetOrigin()): string {
  const year = new Date().getFullYear();
  const address = process.env.COMPANY_ADDRESS ? `<br>${esc(process.env.COMPANY_ADDRESS)}` : "";
  const hero = l.hero
    ? `<tr><td style="padding:0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.panel}" style="background:${C.panel};border-radius:24px 24px 0 0;">
<tr><td style="padding:34px 36px 6px;">
<div style="font-family:${FONT};font-size:12px;line-height:16px;letter-spacing:2.4px;text-transform:uppercase;font-weight:700;color:${C.sage};">${esc(l.hero.eyebrow)}</div>
<div class="hero-title" style="margin-top:12px;font-family:${FONT};font-size:34px;line-height:40px;font-weight:700;letter-spacing:-0.6px;color:#FBFAF7;">${esc(l.hero.title)}</div>
${l.hero.subtitle ? `<div style="margin-top:10px;font-family:${FONT};font-size:16px;line-height:24px;color:${C.sage};">${esc(l.hero.subtitle)}</div>` : ""}
</td></tr>
<tr><td style="padding:18px 20px 0;"><img src="${origin}/email/hero-garments.png" width="560" alt="" style="display:block;width:100%;max-width:560px;height:auto;border:0;"></td></tr>
</table></td></tr>`
    : "";
  const seal = !l.hero && l.icon ? `<img src="${origin}/email/icon-${l.icon}.png" width="64" height="64" alt="" style="display:block;border:0;margin:0 0 22px;">` : "";

  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<meta name="x-apple-disable-message-reformatting">
<title>Tayylo</title>
<link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  body{margin:0;padding:0;background:${C.canvas};}
  a{color:${C.olive};}
  @media (max-width:620px){
    .px{padding-left:22px !important;padding-right:22px !important;}
    .hero-title{font-size:28px !important;line-height:34px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.canvas};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(l.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.canvas}" style="background:${C.canvas};">
<tr><td align="center" style="padding:32px 12px 40px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">

<tr><td style="padding:0 8px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td><a href="${appUrl()}" target="_blank"><img src="${origin}/lockup_olive.png" width="124" alt="Tayylo" style="display:block;width:124px;height:auto;border:0;"></a></td>
<td align="right" style="font-family:${FONT};font-size:11px;line-height:16px;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:${C.muted};">${esc(l.label)}</td>
</tr></table>
</td></tr>

<tr><td bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.line};border-radius:24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${hero}
<tr><td class="px" style="padding:${l.hero ? "34px" : "40px"} 40px 22px;">
${seal}
${l.blocks.map(b => block(b, origin)).join("\n")}
</td></tr>
</table>
</td></tr>

<tr><td align="center" style="padding:28px 24px 0;">
<img src="${origin}/email/footer-garments.png" width="86" alt="" style="display:block;width:86px;height:auto;border:0;margin:0 auto 14px;">
<div style="font-family:${FONT};font-size:14px;line-height:20px;font-weight:700;color:${C.olive};">Tayylo &middot; The modern tailor&rsquo;s notebook</div>
<div style="margin-top:10px;font-family:${FONT};font-size:13px;line-height:20px;">
<a href="${appUrl()}" style="color:${C.olive};text-decoration:none;font-weight:600;">Open Tayylo</a>
<span style="color:${C.faint};">&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>
<a href="mailto:support@tayylo.com" style="color:${C.olive};text-decoration:none;font-weight:600;">Get help</a>
</div>
<div style="margin-top:14px;font-family:${FONT};font-size:12px;line-height:19px;color:${C.faint};">
${esc(l.reason)}${l.unsubscribeUrl ? `<br><a href="${esc(l.unsubscribeUrl)}" style="color:${C.muted};text-decoration:underline;">Unsubscribe from updates</a>` : ""}
<br>&copy; ${year} Tayylo. All rights reserved.${address}
</div>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Plain-text twin of the same email (deliverability and accessibility). */
export function plainText(l: Layout, subject: string): string {
  const lines: string[] = [l.hero ? `${l.hero.title}\n${l.hero.subtitle ?? ""}`.trim() : subject, ""];
  const strip = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1");
  for (const b of l.blocks) {
    if (b.type === "greeting" || b.type === "heading" || b.type === "paragraph" || b.type === "note") lines.push(strip(b.text), "");
    if (b.type === "list") lines.push(...b.items.map(i => `- ${strip(i)}`), "");
    if (b.type === "steps") lines.push(...b.items.map((s, i) => `${i + 1}. ${s.title}: ${s.text}`), "");
    if (b.type === "button" || b.type === "link") lines.push(`${b.label}: ${b.url}`, "");
    if (b.type === "code") lines.push(b.code, b.caption ?? "", "");
    if (b.type === "details") lines.push(...b.rows.map(([k, v]) => `${k}: ${v}`), "");
  }
  lines.push("--", "Tayylo · The modern tailor's notebook", l.reason);
  if (l.unsubscribeUrl) lines.push(`Unsubscribe: ${l.unsubscribeUrl}`);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

const build = (subject: string, l: Layout, origin?: string): RenderedEmail => ({ subject, html: layout(l, origin), text: plainText(l, subject) });

const firstName = (name: string | null | undefined) => name?.trim().split(/\s+/)[0] || null;
const hi = (name: string | null | undefined) => (firstName(name) ? `Hi ${firstName(name)},` : "Hello,");

const longDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// ---------------------------------------------------------------- emails

export function adminCodeEmail(code: string, origin?: string): RenderedEmail {
  return build(
    `${code} is your Tayylo Admin sign-in code`,
    {
      preheader: `Your code is ${code}. It expires in 10 minutes.`,
      label: "Admin sign-in",
      icon: "lock",
      blocks: [
        { type: "heading", text: "Your sign-in code" },
        { type: "paragraph", text: "Enter this code on admin.tayylo.com to finish signing in." },
        { type: "code", code, caption: "Expires in 10 minutes · works once" },
        { type: "note", text: "Didn't try to sign in? You can ignore this email. Nobody can get in without this code, and if it keeps arriving, let us know." },
      ],
      reason: "You're getting this because someone asked to sign in to Tayylo Admin with this address.",
    },
    origin,
  );
}

export function passwordResetEmail(resetUrl: string, email: string, origin?: string): RenderedEmail {
  return build(
    "Reset your Tayylo password",
    {
      preheader: "Set a new password. The link expires in one hour.",
      label: "Password reset",
      icon: "key",
      blocks: [
        { type: "heading", text: "Let's get you back in" },
        { type: "paragraph", text: `We got a request to reset the password for **${email}**. Tap the button to choose a new one.` },
        { type: "button", label: "Set a new password", url: resetUrl },
        { type: "note", text: "The link expires in **one hour** and works once. If you didn't ask for this, ignore this email. Your password stays the same." },
        { type: "divider" },
        { type: "link", label: "Button not working? Paste this into your browser:", url: resetUrl },
      ],
      reason: "You're getting this because a password reset was requested for your Tayylo account.",
    },
    origin,
  );
}

export function welcomeEmail(u: { name?: string | null; role: "tailor" | "customer" }, origin?: string): RenderedEmail {
  const tailor = u.role === "tailor";
  return build(
    tailor ? "Welcome to Tayylo, your studio's new notebook" : "Welcome to Tayylo",
    tailor
      ? {
          preheader: "Find any client in two seconds and record measurements at the speed of a tape.",
          label: "Welcome",
          hero: { eyebrow: "Welcome to Tayylo", title: "Every measurement, beautifully kept.", subtitle: "Clients, measurements, orders and invoices, all in one place." },
          blocks: [
            { type: "greeting", text: hi(u.name) },
            { type: "paragraph", text: "Thanks for joining Tayylo. No more flipping through notebooks: every client's measurements are a search away, and every change is saved as a dated version." },
            {
              type: "steps",
              items: [
                { title: "Add your first client", text: "A name and phone number is all you need." },
                { title: "Record their measurements", text: "A fast keypad built for tailors, with ¼ ½ ¾ fractions." },
                { title: "Create an order", text: "Price, deposit and due date, then a clean invoice to share." },
              ],
            },
            { type: "button", label: "Open your studio", url: `${appUrl()}/today` },
            { type: "note", text: "Questions? Just reply to this email. A real person reads every message." },
          ],
          reason: "You're getting this because you just created a Tayylo account.",
        }
      : {
          preheader: "Discover styles from tailors and keep your measurements in one place.",
          label: "Welcome",
          hero: { eyebrow: "Welcome to Tayylo", title: "Your style, made to measure.", subtitle: "Discover styles from tailors around the world." },
          blocks: [
            { type: "greeting", text: hi(u.name) },
            { type: "paragraph", text: "Thanks for joining Tayylo. Browse Explore for inspiration from real tailors, save the looks you love, and share them with your tailor when it's time to make something." },
            { type: "button", label: "Start exploring", url: `${appUrl()}/explore` },
            { type: "note", text: "Questions? Just reply to this email." },
          ],
          reason: "You're getting this because you just created a Tayylo account.",
        },
    origin,
  );
}

export function planActivatedEmail(
  u: { name?: string | null; planName: string; features: string[]; renews: Date | null; gifted: boolean; amount?: string | null },
  origin?: string,
): RenderedEmail {
  return build(
    u.gifted ? `A gift from Tayylo: ${u.planName} is on us` : `You're on Tayylo ${u.planName}`,
    {
      preheader: u.gifted ? `We've upgraded your studio to ${u.planName}.` : `Thank you for upgrading. ${u.planName} is ready to use.`,
      label: u.gifted ? "A gift for you" : "Plan upgraded",
      hero: {
        eyebrow: u.gifted ? "On the house" : "Thank you",
        title: u.gifted ? `${u.planName} is on us.` : `Welcome to ${u.planName}.`,
        subtitle: u.gifted ? "We've upgraded your studio. No payment needed." : "Your upgrade is active right now, on the web and in the app.",
      },
      blocks: [
        { type: "greeting", text: hi(u.name) },
        ...(u.features.length ? [{ type: "paragraph" as const, text: `Here's what ${u.planName} unlocks for you:` }, { type: "list" as const, items: u.features }] : []),
        {
          type: "details",
          rows: [
            ["Plan", u.planName],
            ...(u.amount ? ([["Price", u.amount]] as [string, string][]) : []),
            [u.gifted ? "Free until" : "Renews", u.renews ? longDate(u.renews) : u.gifted ? "We'll let you know" : "Automatically"],
          ],
        },
        { type: "button", label: "Open Tayylo", url: `${appUrl()}/today` },
        { type: "note", text: u.gifted ? "Enjoy it. If you have ideas for making Tayylo better, reply and tell us." : "You can change or cancel any time from Settings → Plan." },
      ],
      reason: "You're getting this because your Tayylo plan changed.",
    },
    origin,
  );
}

export function paymentFailedEmail(u: { name?: string | null; planName: string; store?: "apple" | "google" | null }, origin?: string): RenderedEmail {
  const where = u.store === "apple" ? "in your Apple ID settings" : u.store === "google" ? "in Google Play" : "from Settings → Plan → Manage billing";
  return build(
    `Action needed: your ${u.planName} payment didn't go through`,
    {
      preheader: `Update your payment details to keep ${u.planName}.`,
      label: "Payment issue",
      icon: "card",
      blocks: [
        { type: "heading", text: "We couldn't take your payment" },
        { type: "paragraph", text: `${hi(u.name)} your latest payment for **Tayylo ${u.planName}** didn't go through. This usually means a card expired or the bank declined it.` },
        { type: "paragraph", text: `Nothing changes yet: we'll try again over the next few days. To keep ${u.planName} without interruption, update your payment details ${where}.` },
        ...(u.store ? [] : [{ type: "button" as const, label: "Update payment details", url: `${appUrl()}/settings` }]),
        { type: "note", text: "Already sorted it? Then you can ignore this email." },
      ],
      reason: "You're getting this because there's a problem with your Tayylo subscription.",
    },
    origin,
  );
}

/** A marketing campaign. `body` is plain text: blank lines split paragraphs, lines starting "- " make a list, **bold** works. */
export function campaignEmail(
  c: { subject: string; body: string; ctaLabel: string | null; ctaUrl: string | null },
  links: { unsubscribe: string },
  origin?: string,
): RenderedEmail {
  const chunks = c.body.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  const blocks: Block[] = [];
  chunks.forEach((chunk, i) => {
    const lines = chunk.split("\n");
    if (lines.every(l => /^\s*[-•]\s+/.test(l))) blocks.push({ type: "list", items: lines.map(l => l.replace(/^\s*[-•]\s+/, "")) });
    else if (i === 0 && /^(hi|hello|hey|dear)\b/i.test(chunk) && chunk.length < 40) blocks.push({ type: "greeting", text: chunk.replace(/,$/, "") + "," });
    else blocks.push({ type: "paragraph", text: chunk });
  });
  if (c.ctaLabel && c.ctaUrl) blocks.push({ type: "button", label: c.ctaLabel, url: c.ctaUrl });
  return build(
    c.subject,
    {
      preheader: chunks.find(x => !/^(hi|hello|hey|dear)\b/i.test(x))?.slice(0, 120) ?? c.subject,
      label: "News from Tayylo",
      hero: { eyebrow: "News from Tayylo", title: c.subject },
      blocks,
      reason: "You're getting this because you have a Tayylo account.",
      unsubscribeUrl: links.unsubscribe,
    },
    origin,
  );
}

export function moderationAlertEmail(
  a: { postId: string; imageUrl: string; authorName: string; authorEmail: string; reason: string; details: string | null; reporterEmail: string; reportCount: number; hidden: boolean },
  reviewUrl: string | null,
  origin?: string,
): RenderedEmail {
  const l: Layout = {
    preheader: `${a.reason} · ${a.reportCount} report${a.reportCount === 1 ? "" : "s"}${a.hidden ? " · now hidden" : ""}`,
    label: "Moderation",
    icon: "flag",
    blocks: [
      { type: "heading", text: a.hidden ? "A post was hidden after reports" : "An Explore post was reported" },
      { type: "paragraph", text: `A post by **${a.authorName}** was reported for **${a.reason}**.${a.details ? `\n“${a.details}”` : ""}` },
      {
        type: "details",
        rows: [
          ["Reports so far", String(a.reportCount)],
          ["Visible", a.hidden ? "Hidden from everyone" : "Still live"],
          ["Author", a.authorEmail],
          ["Reported by", a.reporterEmail],
          ["Post", a.postId],
        ],
      },
      ...(reviewUrl ? [{ type: "button" as const, label: "Review in the admin portal", url: reviewUrl }] : []),
      { type: "note", text: "Apple expects reports to be handled within 24 hours." },
    ],
    reason: "You're getting this because you're on Tayylo's moderation team.",
  };
  const r = build(`Explore report: ${a.reason} (${a.reportCount}${a.hidden ? ", now hidden" : ""})`, l, origin);
  // The reported photo, right under the heading area.
  r.html = r.html.replace(
    /(<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px;border-top)/,
    `<img src="${esc(a.imageUrl)}" width="240" alt="Reported photo" style="display:block;width:240px;max-width:100%;height:auto;border:0;border-radius:14px;margin:0 0 18px;">$1`,
  );
  return r;
}
