// ============================================================
// Short-lived, signed cookies that carry context across a provider redirect.
//
//  - OAUTH_INTENT_COOKIE: what the user meant when they pressed "Continue with
//    Apple/Google" on the web — the role picked on "Create account", or "link
//    to my signed-in account" from Settings. Read once in the Auth.js signIn
//    callback.
//  - APPLE_NONCE_COOKIE: the raw nonce for the native iOS flow; the app only
//    ever sees its SHA-256.
//
// Apple returns to the web callback with a cross-site POST (response_mode=
// form_post), so on HTTPS these cookies must be SameSite=None to come back.
// ============================================================

import { cookies } from "next/headers";
import { readSignedValue } from "@/lib/token-crypto";
import type { Role } from "@/lib/identity";

export const OAUTH_INTENT_COOKIE = "tayylo.oauth-intent";
export const APPLE_NONCE_COOKIE = "tayylo.apple-nonce";
export const INTENT_TTL_SECONDS = 10 * 60;

export interface OAuthIntent {
  role?: Role;
  /** Set only by an authenticated request: link the provider to this user. */
  linkUserId?: string;
  /** Page a link attempt returns to with its outcome. */
  returnTo?: "/settings" | "/account";
}

export function isSecureRequest(request: Request) {
  const forwarded = request.headers.get("x-forwarded-proto");
  return (forwarded ?? new URL(request.url).protocol.replace(":", "")) === "https";
}

/** Options for a cookie that must survive a cross-site return from the provider. */
export function crossSiteCookieOptions(secure: boolean, path = "/") {
  return {
    httpOnly: true,
    secure,
    // SameSite=None requires Secure; plain-http development falls back to Lax.
    sameSite: secure ? ("none" as const) : ("lax" as const),
    path,
    maxAge: INTENT_TTL_SECONDS,
  };
}

/** A Set-Cookie header value (route handlers return it directly). */
export function serializeCookie(
  name: string,
  value: string,
  o: { httpOnly?: boolean; secure?: boolean; sameSite?: "lax" | "none" | "strict"; path?: string; maxAge?: number },
) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${o.path ?? "/"}`];
  if (o.maxAge !== undefined) parts.push(`Max-Age=${o.maxAge}`);
  if (o.httpOnly) parts.push("HttpOnly");
  if (o.secure) parts.push("Secure");
  if (o.sameSite) parts.push(`SameSite=${o.sameSite[0].toUpperCase()}${o.sameSite.slice(1)}`);
  return parts.join("; ");
}

/** Reads and clears the intent cookie. Null outside a request or when absent/invalid. */
export async function consumeOAuthIntent(): Promise<OAuthIntent | null> {
  try {
    const store = await cookies();
    const intent = readSignedValue<OAuthIntent>("oauth-intent", store.get(OAUTH_INTENT_COOKIE)?.value);
    if (store.has(OAUTH_INTENT_COOKIE)) {
      try {
        store.delete(OAUTH_INTENT_COOKIE);
      } catch {
        // Read-only context — it expires on its own within minutes.
      }
    }
    return intent;
  } catch {
    return null;
  }
}
