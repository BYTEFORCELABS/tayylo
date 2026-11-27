import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse, ApiError } from "@/lib/auth-helpers";
import { mediaForOwner } from "@/lib/media";
import { MAX_PRICE_CHANGES, normalizeStatus } from "@/lib/orders";
import { id, imageUrl, readBody } from "@/lib/validation";
import { notifyOrderStatusLater } from "@/lib/order-notifications";

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

const patchSchema = z.object({
  statusName: z.string().optional(),
  priceMinor: z.unknown().optional(),
  bankAccountId: z.string().max(64).nullable().optional(),
  cover: z
    .object({ mediaId: id, thumbUrl: imageUrl.optional().or(z.literal("")) })
    .nullable()
    .optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { business } = await requireUserAndBusiness();
    const { id: orderId } = await params;

    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existing || existing.businessId !== business.id) {
      return Response.json(null, { status: 404 });
    }

    const body = await readBody(request, patchSchema);

    // ---- validate everything first; nothing is written until all checks pass

    const data: { statusName?: string; bankAccountId?: string | null; priceMinor?: number; priceChangeCount?: number } = {};

    if (body.statusName !== undefined) {
      const status = normalizeStatus(body.statusName);
      if (!status) throw new ApiError(400, "Unknown order status");
      data.statusName = status;
    }

    if (body.priceMinor !== undefined) {
      const price = Number(body.priceMinor);
      if (!Number.isInteger(price) || price <= 0) throw new ApiError(400, "Enter a valid price");
      if (price !== existing.priceMinor) {
        const paid = await prisma.payment.aggregate({ where: { orderId }, _sum: { amountMinor: true } });
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

    if (body.bankAccountId !== undefined) {
      if (body.bankAccountId !== null) {
        const owner = await prisma.business.findUnique({ where: { id: business.id }, select: { bankAccounts: true } });
        const accounts = Array.isArray(owner?.bankAccounts) ? (owner.bankAccounts as { id?: unknown }[]) : [];
        if (!accounts.some(a => a && a.id === body.bankAccountId)) throw new ApiError(400, "That bank account isn't on your business");
      }
      data.bankAccountId = body.bankAccountId;
    }

    // Cover photo: the chosen media id is kept in the first item's `photos`
    // and a small thumbnail in its `imageUrl`, so order lists can show the
    // fabric without loading every full-size photo.
    let coverWrite: { itemId: string; photos: string[]; imageUrl: string | null } | null = null;
    if (body.cover !== undefined) {
      const firstItem = await prisma.orderItem.findFirst({ where: { orderId }, orderBy: { id: "asc" } });
      if (!firstItem) throw new ApiError(400, "Order has no items");
      if (body.cover === null) {
        coverWrite = { itemId: firstItem.id, photos: [], imageUrl: null };
      } else {
        const media = await prisma.media.findUnique({ where: { id: body.cover.mediaId } });
        if (!media || media.businessId !== business.id || media.ownerType !== "order" || media.ownerId !== orderId) {
          throw new ApiError(400, "Cover photo not found on this order");
        }
        coverWrite = { itemId: firstItem.id, photos: [media.id], imageUrl: body.cover.thumbUrl || media.url };
      }
    }

    // ---- write everything in one transaction

    const order = await prisma.$transaction(async tx => {
      if (coverWrite) {
        await tx.orderItem.update({
          where: { id: coverWrite.itemId },
          data: { photos: coverWrite.photos, imageUrl: coverWrite.imageUrl },
        });
      }
      return tx.order.update({ where: { id: orderId }, data, include: ORDER_INCLUDE });
    });
    if (data.statusName && data.statusName !== normalizeStatus(existing.statusName)) notifyOrderStatusLater(orderId);
    const media = await mediaForOwner(business.id, "order", orderId);
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
