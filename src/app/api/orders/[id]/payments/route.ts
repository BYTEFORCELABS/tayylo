import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse, ApiError } from "@/lib/auth-helpers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { business } = await requireUserAndBusiness();
    const { id } = await params;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.businessId !== business.id) {
      throw new ApiError(404, "Order not found");
    }

    const body = await request.json();
    const [payment] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          orderId: id,
          amountMinor: body.amountMinor,
          method: body.method,
          reference: body.reference || null,
          paidAt: body.paidAt ? new Date(body.paidAt) : undefined,
        },
      }),
      prisma.order.update({ where: { id }, data: { updatedAt: new Date() } }),
    ]);

    return Response.json(payment, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
