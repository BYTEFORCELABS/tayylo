import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse, ApiError } from "@/lib/auth-helpers";
import { dateString, optionalText, readBody, text } from "@/lib/validation";

const fittingSchema = z.object({
  outcome: z.enum(["adjustments_needed", "approved", "skipped"], "Choose the fitting outcome"),
  fittedAt: dateString.optional(),
  notes: optionalText(2000),
  adjustments: z
    .array(
      z.object({
        fieldKey: text(64),
        label: text(80),
        // Clients send tenths of a millimetre (½" = 12.7); the column stores
        // whole millimetres.
        deltaMm: z.number().finite().min(-5000).max(5000).transform(Math.round),
        rawDelta: z.string().max(40),
      }),
    )
    .max(100)
    .optional()
    .default([]),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { business } = await requireUserAndBusiness();
    const { id } = await params;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.businessId !== business.id) {
      throw new ApiError(404, "Order not found");
    }

    const body = await readBody(request, fittingSchema);

    const fitting = await prisma.$transaction(async tx => {
      // Lock the order row so fittings saved at the same moment get distinct numbers.
      await tx.$executeRaw`SELECT id FROM "Order" WHERE id = ${id} FOR UPDATE`;
      const existingCount = await tx.fitting.count({ where: { orderId: id } });
      const created = await tx.fitting.create({
        data: {
          orderId: id,
          number: existingCount + 1,
          fittedAt: body.fittedAt ? new Date(body.fittedAt) : undefined,
          outcome: body.outcome,
          notes: body.notes,
          adjustments: { create: body.adjustments },
        },
        include: { adjustments: true },
      });
      await tx.order.update({ where: { id }, data: { updatedAt: new Date() } });
      return created;
    });

    return Response.json(fitting, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
