import crypto from "crypto";

/** Signed, per-user unsubscribe links: no sign-in needed, can't be forged for someone else. */
const sign = (userId: string) =>
  crypto.createHmac("sha256", process.env.AUTH_SECRET ?? "dev-secret").update(`unsubscribe:${userId}`).digest("base64url");

export const unsubscribeUrl = (origin: string, userId: string) =>
  `${origin}/api/unsubscribe?u=${encodeURIComponent(userId)}&t=${sign(userId)}`;

export function verifyUnsubscribe(userId: string | null, token: string | null) {
  if (!userId || !token) return false;
  const a = Buffer.from(sign(userId));
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
