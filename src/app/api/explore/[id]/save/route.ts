import { prisma } from "@/lib/db";
import { requireUser, errorResponse, ApiError } from "@/lib/auth-helpers";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    if (!(await prisma.stylePost.findUnique({ where: { id }, select: { id: true } }))) throw new ApiError(404, "Post not found");
    await prisma.savedPost.upsert({
      where: { userId_postId: { userId, postId: id } },
      create: { userId, postId: id },
      update: {},
    });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await prisma.savedPost.deleteMany({ where: { userId, postId: id } });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
