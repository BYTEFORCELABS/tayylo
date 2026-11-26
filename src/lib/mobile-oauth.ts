// ============================================================
// Google / Apple sign-in for the mobile app, through the web's existing
// Auth.js providers (no extra OAuth clients to register).
//
//   1. The app makes a random `verifier`, keeps it, and opens the system's
//      secure browser sheet at
//        GET /api/auth/mobile/<provider>?challenge=<S256(verifier)>&role=…
//      which remembers the challenge in a signed cookie and starts the normal
//      Auth.js redirect to the provider.
//   2. The provider returns to the usual web callback. Auth.js signs the user
//      in (creating the account per src/lib/identity.ts) and lands on
//        GET /api/auth/mobile/finish
//      which swaps the browser session for a one-time `code` bound to the
//      challenge, clears that browser session, and redirects to
//        tayylo://auth/callback?code=…   (or ?error=<code>&provider=…)
//   3. The app redeems it with its own cookie jar:
//        POST /api/auth/callback/mobile-oauth   { code, verifier }
//      → the same session cookie every other sign-in gets.
//
// The code lives two minutes and is useless without the verifier, which never
// leaves the app (PKCE, RFC 7636 S256) — so a code leaked from the redirect
// can't be replayed by anyone else.
// ============================================================

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { readSignedValue, signValue } from "@/lib/token-crypto";
import { googleEnabled } from "@/lib/google";
import { appleWebEnabled } from "@/lib/apple";

export type MobileProvider = "google" | "apple";

/** HttpOnly, signed: the PKCE challenge for the sign-in in progress. */
export const MOBILE_OAUTH_COOKIE = "tayylo.mobile-oauth";
/** Readable "1" so the client /auth page can hand provider errors back to the app. */
export const MOBILE_OAUTH_MARKER = "tayylo.mobile-oauth-pending";
export const MOBILE_REDIRECT = "tayylo://auth/callback";
export const MOBILE_CODE_TTL_SECONDS = 120;

/** base64url SHA-256 is always 43 characters. */
export const CHALLENGE_RE = /^[A-Za-z0-9_-]{43}$/;
/** RFC 7636 verifier: 43–128 unreserved characters. */
const VERIFIER_RE = /^[A-Za-z0-9._~-]{43,128}$/;

export function mobileProviderEnabled(p: string): p is MobileProvider {
  return (p === "google" && googleEnabled()) || (p === "apple" && appleWebEnabled());
}

export function challengeFor(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

/** tayylo://auth/callback?… */
export function appRedirectUrl(params: Record<string, string>) {
  return `${MOBILE_REDIRECT}?${new URLSearchParams(params)}`;
}

/** The pending mobile sign-in on this browser, if any (doesn't clear it). */
export async function readMobilePending(): Promise<{ ch: string } | null> {
  try {
    return readSignedValue<{ ch: string }>("mobile-oauth", (await cookies()).get(MOBILE_OAUTH_COOKIE)?.value);
  } catch {
    return null;
  }
}

export function signMobilePending(challenge: string, ttlSeconds: number) {
  return signValue("mobile-oauth", { ch: challenge }, ttlSeconds);
}

export function issueMobileCode(userId: string, challenge: string) {
  return signValue("mobile-oauth-code", { uid: userId, ch: challenge }, MOBILE_CODE_TTL_SECONDS);
}

export class MobileCodeError extends Error {}

/** The user behind a code, if `verifier` matches the challenge it was issued for. */
export async function redeemMobileCode(code: unknown, verifier: unknown) {
  if (typeof code !== "string" || typeof verifier !== "string" || !VERIFIER_RE.test(verifier)) {
    throw new MobileCodeError("invalid");
  }
  const payload = readSignedValue<{ uid: string; ch: string }>("mobile-oauth-code", code);
  if (!payload?.uid || !payload.ch) throw new MobileCodeError("invalid");

  const expected = Buffer.from(payload.ch);
  const given = Buffer.from(challengeFor(verifier));
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw new MobileCodeError("invalid");

  const user = await prisma.user.findUnique({ where: { id: payload.uid }, select: { id: true, email: true, role: true } });
  if (!user) throw new MobileCodeError("invalid");
  return user;
}
