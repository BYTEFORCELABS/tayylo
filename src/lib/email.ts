import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
