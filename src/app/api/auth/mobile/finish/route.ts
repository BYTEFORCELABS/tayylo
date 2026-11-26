import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { appRedirectUrl, issueMobileCode, MOBILE_OAUTH_COOKIE, MOBILE_OAUTH_MARKER, readMobilePending } from "@/lib/mobile-oauth";

const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"];

/**
 * Step 2 of mobile Google/Apple sign-in (see src/lib/mobile-oauth.ts). Auth.js
 * lands here after the provider; errors from our signIn callback (and the
 * /auth error page) forward here with ?code=…&provider=….
 *
 * Hands the app a one-time code bound to its PKCE challenge and leaves the
 * browser signed out — the app holds the session, not the browser sheet.
 */
export async function GET(request: Request) {
  const pending = await readMobilePending();
  const store = await cookies();
  for (const name of [MOBILE_OAUTH_COOKIE, MOBILE_OAUTH_MARKER]) store.delete(name);

  const go = (location: string) => new Response(null, { status: 302, headers: { Location: location, "Cache-Control": "no-store" } });
  // Not a mobile sign-in (or it expired): nothing to hand back.
  if (!pending) return go(new URL("/", request.url).toString());

  const params = new URL(request.url).searchParams;
  const provider = params.get("provider") ?? "";
  const errorCode = params.get("code") ?? (params.get("error") ? params.get("error") === "AccessDenied" ? "access_denied" : "oauth_failed" : null);
  if (errorCode) return go(appRedirectUrl({ error: errorCode, ...(provider ? { provider } : {}) }));

  const session = await auth();
  if (!session?.user?.id) return go(appRedirectUrl({ error: "oauth_failed" }));

  const code = issueMobileCode(session.user.id, pending.ch);
  for (const name of SESSION_COOKIES) store.delete(name);
  return go(appRedirectUrl({ code }));
}
