import { prisma } from "@/lib/db";
import { requireUser, errorResponse, ApiError } from "@/lib/auth-helpers";

// Block the person who posted this. Neither side sees the other's posts after.
// The post id is the handle so author ids never leave the server.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    const post = await prisma.stylePost.findUnique({ where: { id }, select: { authorId: true } });
    if (!post) throw new ApiError(404, "Post not found");
    if (post.authorId === userId) throw new ApiError(400, "You can't block yourself");
    await prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: post.authorId } },
      create: { blockerId: userId, blockedId: post.authorId },
      update: {},
    });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
