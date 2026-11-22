import { prisma } from "@/lib/db";
import { requireUserId, errorResponse } from "@/lib/auth-helpers";

/**
 * Deletes the signed-in user's account entirely — business, customers,
 * orders, measurements, everything cascades from the User row via Prisma's
 * onDelete: Cascade. Unlike the Supabase version, there's no separate "auth
 * account" to worry about leaving behind — we own the User table directly,
 * so this one delete removes the whole account in one step.
 *
 * The client is responsible for calling next-auth's signOut() right after
 * this succeeds, to clear the session cookie.
 */
export async function DELETE() {
  try {
    const userId = await requireUserId();
    await prisma.user.delete({ where: { id: userId } });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
