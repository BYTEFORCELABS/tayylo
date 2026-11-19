import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse, ApiError } from "@/lib/auth-helpers";

export async function POST(request: Request) {
  try {
    const { business } = await requireUserAndBusiness();
    const body = await request.json();

    const customer = await prisma.customer.findUnique({ where: { id: body.customerId } });
    if (!customer || customer.businessId !== business.id) {
      throw new ApiError(404, "Client not found");
    }

    const values = Array.isArray(body.values) ? body.values : [];

    const set = await prisma.measurementSet.create({
      data: {
        businessId: business.id,
        customerId: body.customerId,
        templateId: body.templateId,
        templateName: body.templateName,
        source: body.source ?? "manual",
        supersedesId: body.supersedesId || null,
        note: body.note || null,
        status: "final",
        values: {
          create: values.map((v: { fieldKey: string; labelSnapshot: string; valueMm: number; rawInput: string }) => ({
            fieldKey: v.fieldKey,
            labelSnapshot: v.labelSnapshot,
            valueMm: v.valueMm,
            rawInput: v.rawInput,
          })),
        },
      },
      include: { values: true },
    });

    return Response.json(set, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
