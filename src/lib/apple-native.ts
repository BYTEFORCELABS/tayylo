// ============================================================
// Native iOS Sign in with Apple → Tayylo user.
//
// The app:
//   1. POST /api/auth/apple/nonce          → { nonce } (raw value kept in a
//                                             signed HttpOnly cookie)
//   2. AppleAuthentication.signInAsync({ nonce })
//   3. POST /api/auth/callback/apple-native (Auth.js credentials provider)
//      with identityToken, authorizationCode, givenName, familyName, role
//      → the same Auth.js session cookie the web uses.
//
// Linking from Settings uses the same verification via
// POST /api/me/identities/apple.
// ============================================================

import { appleConfig, exchangeAppleCode, hashNonce, verifyAppleIdToken } from "@/lib/apple";
import { cleanName, IdentityError, resolveIdentityUser, type ResolvedUser, type Role } from "@/lib/identity";
import { APPLE_NONCE_COOKIE } from "@/lib/oauth-intent";
import { cookieFromHeader, readSignedValue } from "@/lib/token-crypto";

export type AppleNativeErrorCode =
  | IdentityError["code"]
  | "not_configured"
  | "invalid_token"
  | "nonce_expired";

export class AppleNativeError extends Error {
  code: AppleNativeErrorCode;
  constructor(code: AppleNativeErrorCode) {
    super(code);
    this.code = code;
  }
}

const str = (v: unknown, max = 8192) => (typeof v === "string" && v.length <= max ? v.trim() : "");

export async function appleNativeSignIn(
  input: Record<string, unknown> | undefined,
  cookieHeader: string | null,
  opts: { linkToUserId?: string } = {},
): Promise<ResolvedUser> {
  const config = appleConfig();
  if (!config) throw new AppleNativeError("not_configured");

  const identityToken = str(input?.identityToken);
  if (!identityToken) throw new AppleNativeError("invalid_token");

  const rawNonce = readSignedValue<string>("apple-nonce", cookieFromHeader(cookieHeader, APPLE_NONCE_COOKIE));
  if (!rawNonce) throw new AppleNativeError("nonce_expired");

  let identity;
  try {
    identity = await verifyAppleIdToken(identityToken, { audience: config.bundleId, nonce: hashNonce(rawNonce) });
  } catch {
    throw new AppleNativeError("invalid_token");
  }

  // Exchange the one-time code for a refresh token, kept (encrypted) only so
  // the grant can be revoked when the account is deleted. The identity token
  // above already proves who this is, so a failed exchange (Apple outage,
  // key not yet enabled for the App ID) doesn't block sign-in.
  let refreshToken: string | null = null;
  const code = str(input?.authorizationCode, 2048);
  if (code) {
    try {
      const tokens = await exchangeAppleCode(code, config.bundleId);
      if (tokens.id_token) {
        const exchanged = await verifyAppleIdToken(tokens.id_token, { audience: config.bundleId });
        if (exchanged.sub !== identity.sub) throw new AppleNativeError("invalid_token");
      }
      refreshToken = tokens.refresh_token ?? null;
    } catch (e) {
      if (e instanceof AppleNativeError) throw e;
      console.warn("[apple] native code exchange failed:", (e as Error).message);
    }
  }

  const role: Role = input?.role === "customer" ? "customer" : "tailor";
  try {
    return await resolveIdentityUser(
      {
        provider: "apple",
        providerUserId: identity.sub,
        email: identity.email,
        isPrivateEmail: identity.isPrivateEmail,
        // Apple only sends the name on the first authorization, and only to the
        // app (it is not in the signed token). Used to fill an empty name only.
        name: cleanName(str(input?.givenName, 200), str(input?.familyName, 200)),
        refreshToken,
        tokenClientId: refreshToken ? config.bundleId : null,
      },
      { role, linkToUserId: opts.linkToUserId },
    );
  } catch (e) {
    if (e instanceof IdentityError) throw new AppleNativeError(e.code);
    throw e;
  }
}
