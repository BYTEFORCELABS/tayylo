import { prisma } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/auth-helpers";

export async function DELETE(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await requireUser();
    const { userId: blockedId } = await params;
    await prisma.userBlock.deleteMany({ where: { blockerId: userId, blockedId } });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
