import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse } from "@/lib/auth-helpers";

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
    return Response.json(order);
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
    const order = await prisma.order.update({
      where: { id },
      data: { statusName: body.statusName },
      include: ORDER_INCLUDE,
    });
    return Response.json(order);
  } catch (error) {
    return errorResponse(error);
  }
}
