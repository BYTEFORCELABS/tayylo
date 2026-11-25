// ============================================================
// Sign in with Apple — server side only.
//
//  - Client secret: an ES256 JWT signed with the .p8 key (Apple has no static
//    client secret). Generated on demand, cached, renewed well before expiry.
//  - Identity tokens: verified against Apple's published keys (JWKS, refetched
//    when Apple rotates to a key id we haven't seen), plus iss / aud / exp /
//    nonce.
//  - Code exchange + revocation (revocation is required by App Store review
//    when an account is deleted).
//
// Two Apple client ids share the same Team ID and key:
//   APPLE_CLIENT_ID  — the Services ID, used by the web flow.
//   APPLE_BUNDLE_ID  — the iOS App ID (com.tayylo.app), used by the app.
// ============================================================

import { createHash, createPrivateKey, randomBytes, sign, type KeyObject } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export const APPLE_ISSUER = "https://appleid.apple.com";
const TOKEN_URL = "https://appleid.apple.com/auth/token";
const REVOKE_URL = "https://appleid.apple.com/auth/revoke";
const JWKS_URL = new URL("https://appleid.apple.com/auth/keys");

/** Private relay addresses Apple hands out for "Hide My Email". */
export const isPrivateRelayEmail = (email: string | null | undefined) => !!email && /@privaterelay\.appleid\.com$/i.test(email);

// ---------------------------------------------------------------- config

export interface AppleConfig {
  teamId: string;
  keyId: string;
  privateKey: string;
  /** Services ID — web. */
  servicesId: string | null;
  /** App ID / bundle id — native iOS. */
  bundleId: string;
}

/**
 * Accepts the .p8 contents however it was pasted into the environment: real
 * newlines, literal "\n" escapes (Vercel's UI, most .env files), or just the
 * base64 body without the BEGIN/END lines.
 */
export function normalizePrivateKey(raw: string): string {
  let key = raw.trim().replace(/^"|"$/g, "").replace(/\\n/g, "\n").trim();
  if (!key.includes("-----BEGIN")) {
    const body = key.replace(/\s+/g, "");
    key = `-----BEGIN PRIVATE KEY-----\n${body.match(/.{1,64}/g)?.join("\n") ?? body}\n-----END PRIVATE KEY-----`;
  }
  return key;
}

export function appleConfig(): AppleConfig | null {
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  const keyId = process.env.APPLE_KEY_ID?.trim();
  const privateKey = process.env.APPLE_PRIVATE_KEY?.trim();
  if (!teamId || !keyId || !privateKey) return null;
  return {
    teamId,
    keyId,
    privateKey: normalizePrivateKey(privateKey),
    servicesId: process.env.APPLE_CLIENT_ID?.trim() || null,
    bundleId: process.env.APPLE_BUNDLE_ID?.trim() || "com.tayylo.app",
  };
}

/** Web Sign in with Apple needs the shared key plus a Services ID. */
export const appleWebEnabled = () => !!appleConfig()?.servicesId;
/** Native iOS sign-in needs the shared key (for code exchange / revocation). */
export const appleNativeEnabled = () => !!appleConfig();

/** Every Apple client id this backend accepts tokens for. */
export function appleAudiences(): string[] {
  const c = appleConfig();
  if (!c) return [];
  return [c.servicesId, c.bundleId].filter((v): v is string => !!v);
}

// ---------------------------------------------------------------- client secret

// Apple allows up to 6 months. A shorter life limits the blast radius if a
// generated secret ever leaks; renewing a day early avoids edge-of-expiry
// failures on long-lived server instances.
const CLIENT_SECRET_TTL = 60 * 60 * 24 * 30;
const CLIENT_SECRET_RENEW_BEFORE = 60 * 60 * 24;

const secretCache = new Map<string, { jwt: string; exp: number }>();
let keyCache: { pem: string; key: KeyObject } | null = null;

function signingKey(pem: string): KeyObject {
  if (keyCache?.pem !== pem) keyCache = { pem, key: createPrivateKey(pem) };
  return keyCache.key;
}

const b64urlJson = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");

/**
 * The client_secret Apple expects for `clientId`: an ES256 JWT, iss = Team ID,
 * sub = client id, aud = Apple. Synchronous so it can sit behind the Auth.js
 * provider option getter.
 */
export function appleClientSecret(clientId: string, now = Math.floor(Date.now() / 1000)): string {
  const c = appleConfig();
  if (!c) throw new Error("Sign in with Apple is not configured");
  const cacheKey = `${c.teamId}:${c.keyId}:${clientId}`;
  const cached = secretCache.get(cacheKey);
  if (cached && cached.exp - CLIENT_SECRET_RENEW_BEFORE > now) return cached.jwt;

  const exp = now + CLIENT_SECRET_TTL;
  const input = `${b64urlJson({ alg: "ES256", kid: c.keyId })}.${b64urlJson({ iss: c.teamId, iat: now, exp, aud: APPLE_ISSUER, sub: clientId })}`;
  // ieee-p1363 gives the raw r||s signature JWS requires (not DER).
  const signature = sign("sha256", Buffer.from(input), { key: signingKey(c.privateKey), dsaEncoding: "ieee-p1363" });
  const jwt = `${input}.${signature.toString("base64url")}`;
  secretCache.set(cacheKey, { jwt, exp });
  return jwt;
}

// ---------------------------------------------------------------- identity tokens

// jose caches keys and refetches when it meets an unknown `kid` (key
// rotation), at most once per cooldown.
type KeySet = Parameters<typeof jwtVerify>[1] & ((...args: never[]) => unknown);
let jwks: KeySet = createRemoteJWKSet(JWKS_URL, { cooldownDuration: 30_000, cacheMaxAge: 60 * 60 * 1000 });

/** Tests swap in a local key set. */
export function __setAppleJwksForTests(keySet: KeySet) {
  jwks = keySet;
}

export class AppleTokenError extends Error {}

export interface AppleIdentity {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  isPrivateEmail: boolean;
  audience: string;
}

const truthy = (v: unknown) => v === true || v === "true";

/**
 * Verifies an Apple identity token: RS256 signature against Apple's keys,
 * issuer, audience (one of `audience`), expiry, and — when given — the nonce.
 */
export async function verifyAppleIdToken(
  idToken: string,
  opts: { audience: string | string[]; nonce?: string },
): Promise<AppleIdentity> {
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(idToken, jwks, {
      issuer: APPLE_ISSUER,
      audience: opts.audience,
      algorithms: ["RS256"],
      clockTolerance: 30,
      requiredClaims: ["sub", "exp", "iat"],
    }));
  } catch (e) {
    throw new AppleTokenError(`Apple identity token rejected: ${(e as Error).name}`);
  }
  if (opts.nonce !== undefined && payload.nonce !== opts.nonce) {
    throw new AppleTokenError("Apple identity token nonce mismatch");
  }
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : null;
  return {
    sub: payload.sub!,
    email,
    emailVerified: truthy(payload.email_verified),
    isPrivateEmail: truthy(payload.is_private_email) || isPrivateRelayEmail(email),
    audience: Array.isArray(payload.aud) ? payload.aud[0] : (payload.aud as string),
  };
}

// ---------------------------------------------------------------- nonce (native)

/**
 * A fresh nonce pair for the native flow. The raw value stays on the server
 * (in a signed cookie); the app passes `hashed` to Apple, which echoes it in
 * the identity token's `nonce` claim.
 */
export function createNoncePair() {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hashed: hashNonce(raw) };
}
export const hashNonce = (raw: string) => createHash("sha256").update(raw).digest("hex");

// ---------------------------------------------------------------- code exchange / revoke

export interface AppleTokenResponse {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
}

/** Exchanges an authorization code. `redirectUri` only for the web flow. */
export async function exchangeAppleCode(code: string, clientId: string, redirectUri?: string): Promise<AppleTokenResponse> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: appleClientSecret(clientId),
    code,
    grant_type: "authorization_code",
  });
  if (redirectUri) body.set("redirect_uri", redirectUri);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    // Apple's error body is just { error: "invalid_grant" } etc. — safe to log.
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new AppleTokenError(`Apple code exchange failed (${res.status} ${err.error ?? ""})`.trim());
  }
  return (await res.json()) as AppleTokenResponse;
}

/** Revokes a refresh token so the user's Apple ID no longer lists Tayylo. */
export async function revokeAppleToken(token: string, clientId: string): Promise<void> {
  const res = await fetch(REVOKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: appleClientSecret(clientId),
      token,
      token_type_hint: "refresh_token",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new AppleTokenError(`Apple token revocation failed (${res.status})`);
}

// ---------------------------------------------------------------- server notifications

export type AppleNotificationType = "email-disabled" | "email-enabled" | "consent-revoked" | "account-delete";

export interface AppleNotificationEvent {
  type: AppleNotificationType;
  sub: string;
  email?: string;
  isPrivateEmail?: boolean;
}

/** Verifies the signed `payload` Apple POSTs to the server-to-server notification endpoint. */
export async function verifyAppleNotification(signedPayload: string): Promise<AppleNotificationEvent> {
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(signedPayload, jwks, {
      issuer: APPLE_ISSUER,
      audience: appleAudiences(),
      algorithms: ["RS256"],
      clockTolerance: 30,
    }));
  } catch (e) {
    throw new AppleTokenError(`Apple notification rejected: ${(e as Error).name}`);
  }
  const raw = typeof payload.events === "string" ? JSON.parse(payload.events) : payload.events;
  const events = raw as { type?: string; sub?: string; email?: string; is_private_email?: unknown } | undefined;
  if (!events?.type || !events.sub) throw new AppleTokenError("Apple notification missing events");
  return {
    type: events.type as AppleNotificationType,
    sub: events.sub,
    email: events.email,
    isPrivateEmail: truthy(events.is_private_email),
  };
}
