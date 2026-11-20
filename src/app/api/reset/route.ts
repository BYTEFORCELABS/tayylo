import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse } from "@/lib/auth-helpers";

/** Wipes this business's clients, orders and measurements — not the business profile itself. */
export async function POST() {
  try {
    const { business } = await requireUserAndBusiness();
    await prisma.$transaction([
      prisma.media.deleteMany({ where: { businessId: business.id } }),
      prisma.order.deleteMany({ where: { businessId: business.id } }), // cascades items/payments/fittings/adjustments
      prisma.customer.deleteMany({ where: { businessId: business.id } }), // cascades measurement sets/values
    ]);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
