import { cookies } from "next/headers";
import { signIn } from "@/lib/auth";
import {
  appRedirectUrl,
  CHALLENGE_RE,
  MOBILE_OAUTH_COOKIE,
  MOBILE_OAUTH_MARKER,
  mobileProviderEnabled,
  signMobilePending,
} from "@/lib/mobile-oauth";
import { crossSiteCookieOptions, INTENT_TTL_SECONDS, isSecureRequest, OAUTH_INTENT_COOKIE, type OAuthIntent } from "@/lib/oauth-intent";
import { signValue } from "@/lib/token-crypto";

/**
 * Step 1 of mobile Google/Apple sign-in (see src/lib/mobile-oauth.ts), opened
 * by the app in the system's secure browser sheet:
 *   GET /api/auth/mobile/google?challenge=<S256 of the app's verifier>&role=tailor
 * Remembers the challenge (and the role for a new account), then starts the
 * normal Auth.js redirect to the provider.
 */
export async function GET(request: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const url = new URL(request.url);
  const challenge = url.searchParams.get("challenge") ?? "";
  const role = url.searchParams.get("role");

  const back = (error: string) =>
    new Response(null, { status: 302, headers: { Location: appRedirectUrl({ error, provider }), "Cache-Control": "no-store" } });
  if (!CHALLENGE_RE.test(challenge)) return back("invalid_request");
  if (!mobileProviderEnabled(provider)) return back("not_configured");

  const store = await cookies();
  const options = crossSiteCookieOptions(isSecureRequest(request));
  // A fresh intent every time, so a stale "link" intent can never apply here.
  const intent: OAuthIntent = role === "tailor" || role === "customer" ? { role } : {};
  store.set(OAUTH_INTENT_COOKIE, signValue("oauth-intent", intent, INTENT_TTL_SECONDS), options);
  store.set(MOBILE_OAUTH_COOKIE, signMobilePending(challenge, INTENT_TTL_SECONDS), options);
  store.set(MOBILE_OAUTH_MARKER, "1", { ...options, httpOnly: false });

  // Auth.js sets its own state/PKCE cookies on this response and returns the provider URL.
  const to = await signIn(provider, { redirect: false, redirectTo: "/api/auth/mobile/finish" });
  return new Response(null, { status: 302, headers: { Location: String(to), "Cache-Control": "no-store" } });
}
