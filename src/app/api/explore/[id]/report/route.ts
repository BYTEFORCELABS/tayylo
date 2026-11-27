import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, errorResponse, ApiError } from "@/lib/auth-helpers";
import { HIDE_AFTER_REPORTS, REPORT_REASONS } from "@/lib/explore-moderation";
import { sendModerationAlert } from "@/lib/email";

const schema = z.object({
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(500).optional(),
});

// Any signed-in user can report a post they can see. It disappears for them
// at once; enough distinct reports hide it for everyone, and the team is told.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, "Choose a reason for the report");
    const { reason, details } = parsed.data;

    const post = await prisma.stylePost.findUnique({
      where: { id },
      include: { author: { select: { email: true } } },
    });
    if (!post) throw new ApiError(404, "Post not found");
    if (post.authorId === userId) throw new ApiError(400, "You can't report your own post");

    await prisma.postReport.upsert({
      where: { reporterId_postId: { reporterId: userId, postId: id } },
      create: { postId: id, reporterId: userId, reason, details: details || null },
      update: { reason, details: details || null },
    });

    const reportCount = await prisma.postReport.count({ where: { postId: id } });
    const hide = reportCount >= HIDE_AFTER_REPORTS && !post.hiddenAt;
    if (hide) await prisma.stylePost.update({ where: { id }, data: { hiddenAt: new Date() } });

    const reporter = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    await sendModerationAlert({
      postId: id,
      imageUrl: post.imageUrl,
      authorName: post.authorName,
      authorEmail: post.author.email,
      reason,
      details: details || null,
      reporterEmail: reporter?.email ?? userId,
      reportCount,
      hidden: hide || !!post.hiddenAt,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
