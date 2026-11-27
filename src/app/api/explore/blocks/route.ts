import { prisma } from "@/lib/db";
import { requireUser, errorResponse } from "@/lib/auth-helpers";

// The studios the signed-in user has blocked, so they can unblock them.
export async function GET() {
  try {
    const { userId } = await requireUser();
    const rows = await prisma.userBlock.findMany({
      where: { blockerId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        blocked: {
          select: { id: true, name: true, business: { select: { name: true } }, stylePosts: { select: { authorName: true }, take: 1, orderBy: { createdAt: "desc" } } },
        },
      },
    });
    return Response.json(
      rows.map(r => ({
        id: r.blockedId,
        name: r.blocked.business?.name || r.blocked.stylePosts[0]?.authorName || r.blocked.name || "A Tayylo user",
        blockedAt: r.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
