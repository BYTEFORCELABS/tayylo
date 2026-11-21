import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse, ApiError } from "@/lib/auth-helpers";
import { mediaForOwner } from "@/lib/media";
import { MAX_PRICE_CHANGES } from "@/lib/orders";

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

    const data: { statusName?: string; bankAccountId?: string | null; priceMinor?: number; priceChangeCount?: number } = {};
    if (typeof body.statusName === "string") data.statusName = body.statusName;

    if (body.priceMinor !== undefined) {
      const price = Number(body.priceMinor);
      if (!Number.isInteger(price) || price <= 0) throw new ApiError(400, "Enter a valid price");
      if (price !== existing.priceMinor) {
        const paid = await prisma.payment.aggregate({ where: { orderId: id }, _sum: { amountMinor: true } });
        if (price < (paid._sum.amountMinor ?? 0)) throw new ApiError(400, "The price can't be less than what's already been paid");
        // Setting the first price is free; every later change counts toward the cap.
        if (existing.priceMinor > 0) {
          if (existing.priceChangeCount >= MAX_PRICE_CHANGES) {
            throw new ApiError(409, `The agreed price has already been changed ${MAX_PRICE_CHANGES} times and is now locked`);
          }
          data.priceChangeCount = existing.priceChangeCount + 1;
        }
        data.priceMinor = price;
      }
    }
    if (body.bankAccountId === null || typeof body.bankAccountId === "string") data.bankAccountId = body.bankAccountId;

    const order = await prisma.order.update({
      where: { id },
      data,
      include: ORDER_INCLUDE,
    });
    const media = await mediaForOwner(business.id, "order", id);
    return Response.json({ ...order, media });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { business } = await requireUserAndBusiness();
    const { id } = await params;

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing || existing.businessId !== business.id) {
      return Response.json(null, { status: 404 });
    }
    // Items, payments and fittings cascade; photos are polymorphic, so remove them explicitly.
    await prisma.$transaction([
      prisma.media.deleteMany({ where: { businessId: business.id, ownerType: "order", ownerId: id } }),
      prisma.order.delete({ where: { id } }),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
