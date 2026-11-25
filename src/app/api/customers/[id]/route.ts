import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse, ApiError } from "@/lib/auth-helpers";
import { mediaForOwner } from "@/lib/media";
import { customerPatchSchema } from "@/lib/customer-schema";
import { readBody } from "@/lib/validation";
import { clientDeletionBlockers } from "@/lib/orders";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { business } = await requireUserAndBusiness();
    const { id } = await params;

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer || customer.businessId !== business.id) {
      return Response.json(null, { status: 404 });
    }
    const media = await mediaForOwner(business.id, "customer", id);
    return Response.json({ ...customer, media });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { business } = await requireUserAndBusiness();
    const { id } = await params;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing || existing.businessId !== business.id) {
      throw new ApiError(404, "Client not found");
    }

    const body = await readBody(request, customerPatchSchema);
    // Only the fields present in the body change.
    const data: Record<string, unknown> = {};
    for (const key of ["fullName", "phones", "email", "tags", "notes", "photoUrl"] as const) {
      if (body[key] !== undefined) data[key] = body[key];
    }

    const customer = await prisma.customer.update({ where: { id }, data });
    const media = await mediaForOwner(business.id, "customer", id);
    return Response.json({ ...customer, media });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * Deletes a client with their measurement history, orders, payments, fittings
 * and photos. Refused (409) while they have orders in progress or a balance owed.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { business } = await requireUserAndBusiness();
    const { id } = await params;

    const existing = await prisma.customer.findUnique({
      where: { id },
      include: { orders: { select: { id: true, statusName: true, priceMinor: true, payments: { select: { amountMinor: true } }, fittings: { select: { id: true } } } } },
    });
    if (!existing || existing.businessId !== business.id) {
      return Response.json(null, { status: 404 });
    }

    const { activeOrders, outstandingMinor, canDelete } = clientDeletionBlockers(existing.orders);
    if (!canDelete) {
      const reasons = [
        activeOrders > 0 ? `${activeOrders} order${activeOrders === 1 ? " is" : "s are"} still in progress` : null,
        outstandingMinor > 0 ? "there is an unpaid balance" : null,
      ].filter(Boolean);
      throw new ApiError(409, `This client can't be deleted yet: ${reasons.join(" and ")}.`);
    }

    // Measurement sets, orders, payments and fittings cascade from the client.
    // Photos are polymorphic, so remove the client's, their orders' and their fittings' explicitly.
    const orderIds = existing.orders.map(o => o.id);
    const fittingIds = existing.orders.flatMap(o => o.fittings.map(f => f.id));
    await prisma.$transaction([
      prisma.media.deleteMany({
        where: {
          businessId: business.id,
          OR: [
            { ownerType: "customer", ownerId: id },
            { ownerType: "order", ownerId: { in: orderIds } },
            { ownerType: "fitting", ownerId: { in: fittingIds } },
          ],
        },
      }),
      prisma.customer.delete({ where: { id } }),
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
