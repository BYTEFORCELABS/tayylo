import { Resend } from "resend";

// Created on first send, not at import: this module is loaded by sign-in, and
// Resend's constructor throws without a key, which would break all sign-in.
let client: Resend | null = null;
const resend = {
  emails: {
    send: (...args: Parameters<Resend["emails"]["send"]>) => (client ??= new Resend(process.env.RESEND_API_KEY)).emails.send(...args),
  },
};

const FROM = process.env.EMAIL_FROM ?? "Tayylo <noreply@cyberziktechnologies.online>";

// Adapted from the hand-built supabase/email-templates/reset-password.html —
// same branded design, just with {{ .ConfirmationURL }}/{{ .Email }}/
// {{ .SiteURL }} (Supabase's own template tokens) replaced with plain JS
// template-string interpolation, since we're sending this ourselves now.
function resetPasswordHtml(resetUrl: string, email: string, siteUrl: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background-color:#F7F6F3;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F7F6F3;">Reset your Tayylo password.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F7F6F3;">
<tr><td align="center" style="padding:40px 16px;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
    <tr><td align="center" style="background-color:#30371F;border-radius:20px 20px 0 0;padding:36px 24px;">
      <img src="${siteUrl}/lockup_cream.png" width="150" alt="Tayylo" style="display:block;border:0;outline:none;height:auto;width:150px;">
    </td></tr>

    <tr><td style="background-color:#FFFFFF;border:1px solid #EBEAE5;border-top:0;border-radius:0 0 20px 20px;padding:40px 32px 36px 32px;font-family:'Urbanist',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      <h1 style="margin:0 0 12px 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:34px;font-weight:700;color:#24261F;">Reset your password</h1>
      <p style="margin:0 0 28px 0;font-size:16px;line-height:25px;color:#6A6C61;">We got a request to reset the password for your Tayylo account. Tap the button below to choose a new one.</p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td align="center" bgcolor="#454F2C" style="border-radius:8px;background-color:#454F2C;">
          <a href="${resetUrl}" target="_blank" style="display:block;padding:17px 24px;font-family:'Urbanist',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:8px;">Set a new password</a>
        </td></tr>
      </table>

      <p style="margin:28px 0 0 0;font-size:14px;line-height:22px;color:#73756A;">This link expires in 1 hour. If you didn&rsquo;t ask for this, you can safely ignore this email — your password won&rsquo;t change.</p>

      <hr style="border:0;border-top:1px solid #EBEAE5;margin:28px 0 20px 0;">
      <p style="margin:0 0 6px 0;font-size:13px;line-height:20px;color:#73756A;">Button not working? Paste this link into your browser:</p>
      <p style="margin:0;font-size:13px;line-height:20px;word-break:break-all;"><a href="${resetUrl}" target="_blank" style="color:#454F2C;text-decoration:underline;">${resetUrl}</a></p>
    </td></tr>

    <tr><td align="center" style="padding:24px 16px 0 16px;font-family:'Urbanist',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#73756A;">
      Tayylo &middot; Made for tailors<br>
      Sent to ${email}
    </td></tr>
  </table>

</td></tr>
</table>
</body>
</html>`;
}

export async function sendPasswordResetEmail(email: string, resetUrl: string, siteUrl: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Reset your Tayylo password",
    html: resetPasswordHtml(resetUrl, email, siteUrl),
  });
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
  const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Explore report: ${alert.reason} (${alert.reportCount}${alert.hidden ? ", now hidden" : ""})`,
      html: `<p><b>Post</b> ${esc(alert.postId)} by ${esc(alert.authorName)} &lt;${esc(alert.authorEmail)}&gt;</p>
<p><b>Reason</b> ${esc(alert.reason)}${alert.details ? `<br>${esc(alert.details)}` : ""}</p>
<p><b>Reported by</b> ${esc(alert.reporterEmail)}</p>
<p><b>Reports so far</b> ${alert.reportCount}${alert.hidden ? " (hidden from everyone)" : ""}</p>
<p><img src="${esc(alert.imageUrl)}" width="320" alt=""></p>${
        process.env.ADMIN_HOST
          ? `<p><a href="https://${esc(process.env.ADMIN_HOST)}/moderation">Review it in the admin portal</a></p>`
          : ""
      }`,
    });
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
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `${code} is your Tayylo Admin sign-in code`,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:440px;margin:0 auto;padding:32px 24px;color:#1E2019">
<p style="margin:0 0 8px;font-size:15px">Your Tayylo Admin sign-in code:</p>
<p style="margin:0 0 20px;font-size:34px;font-weight:700;letter-spacing:8px;color:#454F2C">${code}</p>
<p style="margin:0;font-size:13px;line-height:20px;color:#55574C">It expires in 10 minutes and works once. If you didn't try to sign in to admin.tayylo.com, you can ignore this email.</p>
</div>`,
    text: `Your Tayylo Admin sign-in code: ${code}\n\nIt expires in 10 minutes and works once. If you didn't try to sign in, ignore this email.`,
  });
}
