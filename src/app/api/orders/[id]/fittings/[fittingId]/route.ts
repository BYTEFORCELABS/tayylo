import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse, ApiError } from "@/lib/auth-helpers";

/** Removes a fitting recorded by mistake; later fittings are renumbered so the sequence stays 1, 2, 3… */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; fittingId: string }> }) {
  try {
    const { business } = await requireUserAndBusiness();
    const { id, fittingId } = await params;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.businessId !== business.id) {
      throw new ApiError(404, "Order not found");
    }
    const fitting = await prisma.fitting.findUnique({ where: { id: fittingId } });
    if (!fitting || fitting.orderId !== id) {
      throw new ApiError(404, "Fitting not found");
    }

    await prisma.$transaction([
      prisma.fitting.delete({ where: { id: fittingId } }),
      prisma.fitting.updateMany({
        where: { orderId: id, number: { gt: fitting.number } },
        data: { number: { decrement: 1 } },
      }),
      prisma.order.update({ where: { id }, data: { updatedAt: new Date() } }),
    ]);

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
