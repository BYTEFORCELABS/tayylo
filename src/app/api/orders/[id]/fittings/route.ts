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
    const existingCount = await prisma.fitting.count({ where: { orderId: id } });

    const [fitting] = await prisma.$transaction([
      prisma.fitting.create({
        data: {
          orderId: id,
          number: existingCount + 1,
          fittedAt: body.fittedAt ? new Date(body.fittedAt) : undefined,
          outcome: body.outcome,
          notes: body.notes || null,
          adjustments: {
            create: (body.adjustments ?? []).map((a: { fieldKey: string; label: string; deltaMm: number; rawDelta: string }) => ({
              fieldKey: a.fieldKey,
              label: a.label,
              deltaMm: a.deltaMm,
              rawDelta: a.rawDelta,
            })),
          },
        },
        include: { adjustments: true },
      }),
      prisma.order.update({ where: { id }, data: { updatedAt: new Date() } }),
    ]);

    return Response.json(fitting, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
