import { prisma } from "@/lib/db";
import { AppleTokenError, appleConfig, verifyAppleNotification } from "@/lib/apple";

/**
 * Apple server-to-server notifications (register this URL in the Apple
 * Developer portal for the App ID / Services ID). Apple POSTs
 * `{ "payload": "<signed JWT>" }` when a user:
 *  - stops using their Apple ID with Tayylo (consent-revoked) → forget the
 *    stored refresh token; the link stays so signing in again reaches the
 *    same account.
 *  - deletes their Apple account (account-delete) → that `sub` will never
 *    sign in again; remove the link. The Tayylo account itself is kept (it
 *    may hold a password or another sign-in method, and business records).
 *  - turns relay forwarding off/on (email-disabled / email-enabled) → noted
 *    on the identity.
 */
export async function POST(request: Request) {
  if (!appleConfig()) return Response.json({ error: "Not configured" }, { status: 503 });

  const body = (await request.json().catch(() => null)) as { payload?: unknown } | null;
  if (typeof body?.payload !== "string") return Response.json({ error: "Missing payload" }, { status: 400 });

  let event;
  try {
    event = await verifyAppleNotification(body.payload);
  } catch (e) {
    if (e instanceof AppleTokenError) return Response.json({ error: "Invalid payload" }, { status: 400 });
    throw e;
  }

  const where = { provider: "apple", providerUserId: event.sub };
  switch (event.type) {
    case "consent-revoked":
      await prisma.authIdentity.updateMany({ where, data: { refreshToken: null, tokenClientId: null } });
      break;
    case "account-delete":
      await prisma.authIdentity.deleteMany({ where });
      break;
    case "email-disabled":
    case "email-enabled":
      await prisma.authIdentity.updateMany({
        where,
        data: { ...(event.email ? { email: event.email.toLowerCase() } : {}), isPrivateEmail: event.isPrivateEmail ?? true },
      });
      break;
  }
  return Response.json({ ok: true });
}
