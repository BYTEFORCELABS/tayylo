import crypto from "crypto";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour, matches the email copy

export const hashResetToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

/** Creates a one-hour reset token and emails the link. `siteUrl` is the app's origin. */
export async function sendResetLink(user: { id: string; email: string }, siteUrl: string) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashResetToken(rawToken), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  });
  await sendPasswordResetEmail(user.email, `${siteUrl}/auth/reset?token=${rawToken}`, siteUrl);
}

/** The main app's origin, even when the request came in on the admin host. */
export function appOrigin(request: Request) {
  if (process.env.AUTH_URL) return new URL(process.env.AUTH_URL).origin;
  const url = new URL(request.url);
  url.hostname = url.hostname.replace(/^admin\./, "");
  return url.origin;
}
