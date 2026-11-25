import { requireUser, errorResponse } from "@/lib/auth-helpers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const { userId, role } = await requireUser();
    const [session, user] = await Promise.all([
      auth(),
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    ]);
    return Response.json({ id: userId, email: session?.user?.email ?? "", role, name: user?.name ?? null });
  } catch (error) {
    return errorResponse(error);
  }
}
