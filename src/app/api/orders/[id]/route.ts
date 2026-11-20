import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse, ApiError } from "@/lib/auth-helpers";
import { mediaForOwner } from "@/lib/media";

const ORDER_INCLUDE = {
  items: true,
  payments: true,
  fittings: { include: { adjustments: true } },
} as const;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { business } = await requireUserAndBusiness();
    const { id } = await params;

    const order = await prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order || order.businessId !== business.id) {
      return Response.json(null, { status: 404 });
    }
    const media = await mediaForOwner(business.id, "order", id);
    return Response.json({ ...order, media });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { business } = await requireUserAndBusiness();
    const { id } = await params;

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing || existing.businessId !== business.id) {
      return Response.json(null, { status: 404 });
    }

    const body = await request.json();

    // Cover photo: the chosen media id is kept in the first item's `photos`
    // and a small thumbnail in its `imageUrl`, so order lists can show the
    // fabric without loading every full-size photo.
    if (body.cover !== undefined) {
      const firstItem = await prisma.orderItem.findFirst({ where: { orderId: id }, orderBy: { id: "asc" } });
      if (!firstItem) throw new ApiError(400, "Order has no items");
      if (body.cover === null) {
        await prisma.orderItem.update({ where: { id: firstItem.id }, data: { photos: [], imageUrl: null } });
      } else {
        const { mediaId, thumbUrl } = body.cover as { mediaId?: string; thumbUrl?: string };
        const media = mediaId ? await prisma.media.findUnique({ where: { id: mediaId } }) : null;
        if (!media || media.businessId !== business.id || media.ownerType !== "order" || media.ownerId !== id) {
          throw new ApiError(400, "Cover photo not found on this order");
        }
        await prisma.orderItem.update({
          where: { id: firstItem.id },
          data: { photos: [media.id], imageUrl: typeof thumbUrl === "string" && thumbUrl ? thumbUrl : media.url },
        });
      }
    }

    const order = await prisma.order.update({
      where: { id },
      data: typeof body.statusName === "string" ? { statusName: body.statusName } : {},
      include: ORDER_INCLUDE,
    });
    const media = await mediaForOwner(business.id, "order", id);
    return Response.json({ ...order, media });
  } catch (error) {
    return errorResponse(error);
  }
}
