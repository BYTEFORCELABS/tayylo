import crypto from "crypto";
import { prisma } from "@/lib/db";
import { sendAdminCodeEmail } from "@/lib/email";
import { isSuperAdmin } from "@/lib/admin/super-admins";

/**
 * Admin portal sign-in with a 6-digit code emailed to staff. Only a keyed
 * hash of the code is stored; a code lasts 10 minutes, allows 5 guesses,
 * works once, and asking for a new one cancels the old one.
 */
const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_AFTER_MS = 30 * 1000;
const MAX_PER_HOUR = 6;

const hashCode = (userId: string, code: string) =>
  crypto.createHmac("sha256", process.env.AUTH_SECRET ?? "dev-secret").update(`${userId}:${code}`).digest("hex");

/** The staff account behind an email, or null. Super admins always qualify (and get an account if they have none). */
async function staffAccount(rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user && isSuperAdmin(email)) {
    user = await prisma.user.create({ data: { email, role: "customer", staffRole: "owner" } });
  }
  if (!user) return null;
  if (isSuperAdmin(email)) return user;
  // (Not imported from admin/auth: that module imports lib/auth, which imports this one.)
  if (!["owner", "admin", "moderator"].includes(user.staffRole ?? "") || user.suspendedAt) return null;
  return user;
}

export type CodeRequestResult = "sent" | "not_staff" | "too_soon" | "too_many";

/**
 * Emails a fresh code to a staff member. The route answers the same way
 * whatever this returns, so it can't be used to find out who is staff.
 */
export async function requestAdminCode(email: string): Promise<CodeRequestResult> {
  const user = await staffAccount(email);
  if (!user) return "not_staff";

  const recent = await prisma.adminLoginCode.findMany({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (recent[0] && Date.now() - recent[0].createdAt.getTime() < RESEND_AFTER_MS) return "too_soon";
  if (recent.length >= MAX_PER_HOUR) return "too_many";

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  await prisma.$transaction([
    // Only the newest code works.
    prisma.adminLoginCode.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.adminLoginCode.create({
      data: { userId: user.id, codeHash: hashCode(user.id, code), expiresAt: new Date(Date.now() + TTL_MS) },
    }),
  ]);
  await sendAdminCodeEmail(user.email, code);
  return "sent";
}

/** Checks a code and uses it up. Returns the user to sign in, or null. */
export async function verifyAdminCode(email: unknown, code: unknown) {
  if (typeof email !== "string" || typeof code !== "string" || !/^\d{6}$/.test(code.trim())) return null;
  const user = await staffAccount(email);
  if (!user) return null;

  const row = await prisma.adminLoginCode.findFirst({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!row || row.attempts >= MAX_ATTEMPTS) return null;

  const expected = Buffer.from(row.codeHash, "hex");
  const given = Buffer.from(hashCode(user.id, code.trim()), "hex");
  if (!crypto.timingSafeEqual(expected, given)) {
    await prisma.adminLoginCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return null;
  }
  // Use it exactly once, even if two requests race.
  const used = await prisma.adminLoginCode.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  if (used.count !== 1) return null;
  return { id: user.id, email: user.email, role: user.role };
}
