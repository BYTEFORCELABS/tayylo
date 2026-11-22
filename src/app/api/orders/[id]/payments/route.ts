import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse, ApiError } from "@/lib/auth-helpers";
import { dateString, optionalText, positiveMoneyMinor, readBody, text } from "@/lib/validation";

const paymentSchema = z.object({
  amountMinor: positiveMoneyMinor,
  method: text(40),
  reference: optionalText(120),
  paidAt: dateString.optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { business } = await requireUserAndBusiness();
    const { id } = await params;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.businessId !== business.id) {
      throw new ApiError(404, "Order not found");
    }

    const body = await readBody(request, paymentSchema);

    const payment = await prisma.$transaction(async tx => {
      // Lock the order row so two payments recorded at once can't both pass
      // the balance check.
      await tx.$executeRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;
      // A price of 0 means "not agreed yet" — there's no balance to exceed.
      if (order.priceMinor > 0) {
        const paid = await tx.payment.aggregate({ where: { orderId: id }, _sum: { amountMinor: true } });
        if ((paid._sum.amountMinor ?? 0) + body.amountMinor > order.priceMinor) {
          throw new ApiError(400, "That's more than the balance due");
        }
      }
      const created = await tx.payment.create({
        data: {
          orderId: id,
          amountMinor: body.amountMinor,
          method: body.method,
          reference: body.reference,
          paidAt: body.paidAt ? new Date(body.paidAt) : undefined,
        },
      });
      await tx.order.update({ where: { id }, data: { updatedAt: new Date() } });
      return created;
    });

    return Response.json(payment, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
