import { prisma } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/auth-helpers";
import { shape } from "@/lib/explore-server";
import { visibleTo } from "@/lib/explore-moderation";

export async function GET() {
  try {
    const { userId } = await requireUser();
    const rows = await prisma.savedPost.findMany({
      where: { userId, post: await visibleTo(userId) },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { post: true },
    });
    const ids = new Set(rows.map(r => r.postId));
    return Response.json(rows.map(r => shape(r.post, userId, ids)));
  } catch (error) {
    return errorResponse(error);
  }
}
