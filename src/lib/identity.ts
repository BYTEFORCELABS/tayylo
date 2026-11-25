// ============================================================
// Third-party identities (Apple, Google) → Tayylo users.
//
// Rules (shared by web and mobile, so one Apple ID = one account everywhere):
//  1. Identities match ONLY on (provider, provider's stable `sub`).
//  2. Known identity → that user. Refresh the stored email/relay flag; fill
//     the name only if the user has none (Apple sends it once, first time).
//  3. Unknown identity while the user is deliberately linking (signed in) →
//     attach to that user.
//  4. Unknown identity, not linking → create a new user, UNLESS the email
//     already belongs to an account: we never merge on email alone. The user
//     is told to sign in the usual way and connect Apple from Settings.
// ============================================================

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { revokeAppleToken } from "@/lib/apple";
import { openToken, sealToken } from "@/lib/token-crypto";

export type IdentityProvider = "apple" | "google";
export type Role = "tailor" | "customer";

export interface ProviderProfile {
  provider: IdentityProvider;
  providerUserId: string;
  email?: string | null;
  emailVerified?: boolean;
  isPrivateEmail?: boolean;
  name?: string | null;
  /** Plain refresh token (sealed before storage). Apple only. */
  refreshToken?: string | null;
  tokenClientId?: string | null;
}

export type IdentityErrorCode =
  /** Email belongs to an existing account that hasn't connected this provider. */
  | "email_in_use"
  /** Provider gave no (verified) email and there's no account to attach to. */
  | "no_email"
  /** This Apple/Google account is already connected to a different Tayylo user. */
  | "identity_taken"
  /** The user already has a different Apple/Google account connected. */
  | "provider_already_linked";

export class IdentityError extends Error {
  code: IdentityErrorCode;
  constructor(code: IdentityErrorCode) {
    super(code);
    this.code = code;
  }
}

export interface ResolvedUser {
  id: string;
  email: string;
  role: Role;
  isNewUser: boolean;
}

const asRole = (r: string): Role => (r === "customer" ? "customer" : "tailor");

/** Trimmed, length-capped display name, or null for empty/whitespace. */
export function cleanName(...parts: (string | null | undefined)[]): string | null {
  const name = parts
    .map(p => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .slice(0, 120);
  return name || null;
}

function identityData(p: ProviderProfile) {
  return {
    email: p.email?.trim().toLowerCase() || undefined,
    isPrivateEmail: p.isPrivateEmail ?? false,
    ...(p.refreshToken ? { refreshToken: sealToken(p.refreshToken), tokenClientId: p.tokenClientId ?? null } : {}),
  };
}

async function fillNameIfMissing(userId: string, current: string | null, incoming: string | null | undefined) {
  const name = cleanName(incoming);
  if (!current && name) await prisma.user.update({ where: { id: userId }, data: { name } });
}

const isUniqueViolation = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

export async function resolveIdentityUser(
  profile: ProviderProfile,
  opts: { role?: Role; linkToUserId?: string | null } = {},
  attempt = 0,
): Promise<ResolvedUser> {
  const where = { provider_providerUserId: { provider: profile.provider, providerUserId: profile.providerUserId } };

  // 1–2. Known identity.
  const existing = await prisma.authIdentity.findUnique({ where, include: { user: true } });
  if (existing) {
    if (opts.linkToUserId && opts.linkToUserId !== existing.userId) throw new IdentityError("identity_taken");
    await prisma.authIdentity.update({
      where: { id: existing.id },
      // An undefined email (Apple omitted it) leaves the stored one untouched.
      data: { ...identityData(profile), lastSignInAt: new Date() },
    });
    await fillNameIfMissing(existing.userId, existing.user.name, profile.name);
    return { id: existing.user.id, email: existing.user.email, role: asRole(existing.user.role), isNewUser: false };
  }

  try {
    // 3. Deliberate link from a signed-in account.
    if (opts.linkToUserId) {
      const user = await prisma.user.findUnique({ where: { id: opts.linkToUserId } });
      if (!user) throw new Error("The account being linked no longer exists");
      const other = await prisma.authIdentity.findUnique({
        where: { userId_provider: { userId: user.id, provider: profile.provider } },
      });
      if (other) throw new IdentityError("provider_already_linked");
      await prisma.authIdentity.create({
        data: { userId: user.id, provider: profile.provider, providerUserId: profile.providerUserId, ...identityData(profile) },
      });
      await fillNameIfMissing(user.id, user.name, profile.name);
      return { id: user.id, email: user.email, role: asRole(user.role), isNewUser: false };
    }

    // 4. New account.
    const email = profile.email?.trim().toLowerCase();
    // Apple's emails (including relays) are verified by Apple; Google says so explicitly.
    if (!email || profile.emailVerified === false) throw new IdentityError("no_email");
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) throw new IdentityError("email_in_use");

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: null,
        name: cleanName(profile.name),
        role: opts.role ?? "tailor",
        identities: {
          create: { provider: profile.provider, providerUserId: profile.providerUserId, ...identityData(profile) },
        },
      },
    });
    return { id: user.id, email: user.email, role: asRole(user.role), isNewUser: true };
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
    // Lost a race: the same identity was created concurrently (double tap,
    // web + app at once) — resolve it as a known identity. Otherwise the
    // email was taken in between.
    if (attempt === 0 && (await prisma.authIdentity.findUnique({ where }))) {
      return resolveIdentityUser(profile, opts, attempt + 1);
    }
    throw new IdentityError(opts.linkToUserId ? "provider_already_linked" : "email_in_use");
  }
}

/** Connected sign-in methods, for Settings. */
export async function listSignInMethods(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      passwordHash: true,
      identities: { select: { provider: true, email: true, isPrivateEmail: true, linkedAt: true, lastSignInAt: true } },
    },
  });
  if (!user) return null;
  return { hasPassword: !!user.passwordHash, identities: user.identities };
}

/**
 * Best-effort revocation of every stored Apple grant for a user. Called before
 * deleting an account (App Store requirement) and when unlinking Apple.
 * Never throws: a failed revocation must not block the user's deletion.
 */
export async function revokeProviderTokens(userId: string, provider?: IdentityProvider) {
  const identities = await prisma.authIdentity.findMany({
    where: { userId, provider: provider ?? "apple", refreshToken: { not: null } },
    select: { provider: true, refreshToken: true, tokenClientId: true },
  });
  for (const identity of identities) {
    if (identity.provider !== "apple" || !identity.refreshToken || !identity.tokenClientId) continue;
    const token = openToken(identity.refreshToken);
    if (!token) continue;
    try {
      await revokeAppleToken(token, identity.tokenClientId);
    } catch (e) {
      console.warn("[apple] token revocation failed:", (e as Error).message);
    }
  }
}
