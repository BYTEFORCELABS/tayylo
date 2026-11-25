import { prisma } from "@/lib/db";
import { requireUserId, errorResponse } from "@/lib/auth-helpers";
import { revokeProviderTokens } from "@/lib/identity";

/**
 * Deletes the signed-in user's account entirely — business, customers,
 * orders, measurements, everything cascades from the User row via Prisma's
 * onDelete: Cascade. Unlike the Supabase version, there's no separate "auth
 * account" to worry about leaving behind — we own the User table directly,
 * so this one delete removes the whole account in one step.
 *
 * Sign in with Apple grants are revoked with Apple first (App Store
 * requirement for account deletion) — best effort, so an Apple outage never
 * blocks the deletion. Linked identities then cascade with the user.
 *
 * The client is responsible for calling next-auth's signOut() right after
 * this succeeds, to clear the session cookie.
 */
export async function DELETE() {
  try {
    const userId = await requireUserId();
    await revokeProviderTokens(userId);
    await prisma.user.delete({ where: { id: userId } });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
