import { appleNativeEnabled, createNoncePair } from "@/lib/apple";
import { APPLE_NONCE_COOKIE, INTENT_TTL_SECONDS, isSecureRequest, serializeCookie } from "@/lib/oauth-intent";
import { signValue } from "@/lib/token-crypto";

/**
 * Step 1 of native iOS Sign in with Apple. Returns the nonce the app passes to
 * Apple (a SHA-256 hash); the raw value goes back only as a signed, HttpOnly,
 * 10-minute cookie, so a token Apple issued for one request can't be replayed
 * by anyone who doesn't also hold that cookie.
 */
export async function POST(request: Request) {
  if (!appleNativeEnabled()) {
    return Response.json({ error: "Sign in with Apple isn't available yet" }, { status: 503 });
  }
  const { raw, hashed } = createNoncePair();
  const cookie = serializeCookie(APPLE_NONCE_COOKIE, signValue("apple-nonce", raw, INTENT_TTL_SECONDS), {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "lax",
    path: "/api",
    maxAge: INTENT_TTL_SECONDS,
  });
  return Response.json({ nonce: hashed }, { headers: { "Cache-Control": "no-store", "Set-Cookie": cookie } });
}
