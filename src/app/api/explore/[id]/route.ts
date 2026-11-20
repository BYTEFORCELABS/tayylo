import { prisma } from "@/lib/db";
import { requireTailorId, errorResponse, ApiError } from "@/lib/auth-helpers";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireTailorId();
    const { id } = await params;
    const post = await prisma.stylePost.findUnique({ where: { id } });
    if (!post || post.authorId !== userId) throw new ApiError(404, "Post not found");
    await prisma.stylePost.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
