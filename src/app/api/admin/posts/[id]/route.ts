import { z } from "zod";
import { prisma } from "@/lib/db";
import { errorResponse, ApiError } from "@/lib/auth-helpers";
import { audit, requireStaff } from "@/lib/admin/auth";

const schema = z.object({ action: z.enum(["hide", "restore", "dismiss"]) });

async function load(id: string) {
  const post = await prisma.stylePost.findUnique({ where: { id }, include: { _count: { select: { reports: true } } } });
  if (!post) throw new ApiError(404, "Post not found");
  return post;
}

/**
 * hide     — take it off Explore for everyone (except its author)
 * restore  — put it back and clear its reports (reviewed, it's fine)
 * dismiss  — clear its reports without changing visibility
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await requireStaff("moderator");
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, "Invalid request");
    const { id } = await params;
    const post = await load(id);
    const { action } = parsed.data;

    if (action === "hide") {
      await prisma.stylePost.update({ where: { id }, data: { hiddenAt: post.hiddenAt ?? new Date() } });
    } else {
      await prisma.$transaction([
        prisma.postReport.deleteMany({ where: { postId: id } }),
        ...(action === "restore" ? [prisma.stylePost.update({ where: { id }, data: { hiddenAt: null } })] : []),
      ]);
    }
    const verb = { hide: "Hid", restore: "Restored", dismiss: "Dismissed reports on" }[action];
    await audit(staff, {
      action: `post.${action}`,
      targetType: "post",
      targetId: id,
      summary: `${verb} a ${post.category} post by ${post.authorName}`,
      meta: { reports: post._count.reports, authorId: post.authorId },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await requireStaff("moderator");
    const { id } = await params;
    const post = await load(id);
    await prisma.stylePost.delete({ where: { id } });
    await audit(staff, {
      action: "post.delete",
      targetType: "post",
      targetId: id,
      summary: `Removed a ${post.category} post by ${post.authorName}`,
      meta: { reports: post._count.reports, authorId: post.authorId, caption: post.caption, imageUrl: post.imageUrl },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
