import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse, ApiError } from "@/lib/auth-helpers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { business } = await requireUserAndBusiness();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const existing = await prisma.measurementSet.findUnique({ where: { id }, include: { values: true } });
    if (!existing || existing.businessId !== business.id) {
      throw new ApiError(404, "Measurement version not found");
    }

    const restored = await prisma.measurementSet.create({
      data: {
        businessId: business.id,
        customerId: existing.customerId,
        templateId: existing.templateId,
        templateName: existing.templateName,
        source: "restored",
        supersedesId: existing.id,
        note: body.note || `Restored from version of ${existing.takenAt.toLocaleDateString("en-GB")}`,
        status: "final",
        values: {
          create: existing.values.map(v => ({
            fieldKey: v.fieldKey,
            labelSnapshot: v.labelSnapshot,
            valueMm: v.valueMm,
            rawInput: v.rawInput,
          })),
        },
      },
      include: { values: true },
    });

    return Response.json(restored, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
