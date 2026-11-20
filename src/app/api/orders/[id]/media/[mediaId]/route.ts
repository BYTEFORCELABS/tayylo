import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse } from "@/lib/auth-helpers";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; mediaId: string }> }) {
  try {
    const { business } = await requireUserAndBusiness();
    const { id, mediaId } = await params;

    const media = await prisma.media.findUnique({ where: { id: mediaId } });
    if (!media || media.businessId !== business.id || media.ownerType !== "order" || media.ownerId !== id) {
      return Response.json({ ok: false }, { status: 404 });
    }

    await prisma.media.delete({ where: { id: mediaId } });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
