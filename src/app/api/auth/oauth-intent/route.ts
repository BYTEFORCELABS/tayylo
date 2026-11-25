import { z } from "zod";
import { requireUserId, errorResponse } from "@/lib/auth-helpers";
import {
  crossSiteCookieOptions,
  INTENT_TTL_SECONDS,
  isSecureRequest,
  OAUTH_INTENT_COOKIE,
  serializeCookie,
  type OAuthIntent,
} from "@/lib/oauth-intent";
import { signValue } from "@/lib/token-crypto";

const bodySchema = z.object({
  /** Role picked on "Create account" — used only if a new account is created. */
  role: z.enum(["tailor", "customer"]).optional(),
  /** Connect the provider to the signed-in account (Settings). */
  link: z.boolean().optional(),
  /** Where a link attempt reports back (allow-listed). */
  returnTo: z.enum(["/settings", "/account"]).optional(),
});

/**
 * Called by the web right before redirecting to Apple/Google. Stores what the
 * user meant in a signed, HttpOnly, 10-minute cookie that the Auth.js signIn
 * callback reads once. JSON-only, so a cross-site form can't set it.
 *
 * Every provider button (sign-in page and Settings) calls this first, so a
 * stale "link" intent from an abandoned Connect can never be picked up by a
 * later, unrelated Apple sign-in on the same browser — keep it that way.
 */
export async function POST(request: Request) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return Response.json({ error: "Expected JSON" }, { status: 415 });
    }
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

    const intent: OAuthIntent = {};
    if (parsed.data.role) intent.role = parsed.data.role;
    if (parsed.data.link) {
      intent.linkUserId = await requireUserId();
      intent.returnTo = parsed.data.returnTo ?? "/settings";
    }

    const cookie = serializeCookie(
      OAUTH_INTENT_COOKIE,
      signValue("oauth-intent", intent, INTENT_TTL_SECONDS),
      crossSiteCookieOptions(isSecureRequest(request)),
    );
    return Response.json({ ok: true }, { headers: { "Set-Cookie": cookie, "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
