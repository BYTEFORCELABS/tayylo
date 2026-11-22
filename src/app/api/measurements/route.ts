import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse, ApiError } from "@/lib/auth-helpers";
import { id, optionalText, readBody, text } from "@/lib/validation";

const valueSchema = z.object({
  fieldKey: text(64),
  labelSnapshot: text(120),
  // Millimetres; 10 m is far beyond any body measurement.
  valueMm: z.number().int("valueMm must be a whole number of millimetres").min(0).max(10_000),
  rawInput: z.string().max(32),
});

const bodySchema = z.object({
  customerId: id,
  templateId: id,
  templateName: text(120),
  source: z.enum(["manual", "import", "restored"]).default("manual"),
  supersedesId: id.nullish(),
  note: optionalText(1000),
  values: z.array(valueSchema).max(200, "Too many measurements").default([]),
});

export async function POST(request: Request) {
  try {
    const { business } = await requireUserAndBusiness();
    const body = await readBody(request, bodySchema);

    const customer = await prisma.customer.findUnique({ where: { id: body.customerId } });
    if (!customer || customer.businessId !== business.id) {
      throw new ApiError(404, "Client not found");
    }

    // System templates (businessId null) are shared; any other template must be this business's own.
    const template = await prisma.measurementTemplate.findUnique({
      where: { id: body.templateId },
      select: { businessId: true },
    });
    if (!template || (template.businessId !== null && template.businessId !== business.id)) {
      throw new ApiError(404, "Template not found");
    }

    // A new version may only supersede an earlier set of this same client.
    if (body.supersedesId) {
      const previous = await prisma.measurementSet.findUnique({
        where: { id: body.supersedesId },
        select: { businessId: true, customerId: true },
      });
      if (!previous || previous.businessId !== business.id || previous.customerId !== body.customerId) {
        throw new ApiError(404, "Previous measurement version not found");
      }
    }

    const set = await prisma.measurementSet.create({
      data: {
        businessId: business.id,
        customerId: body.customerId,
        templateId: body.templateId,
        templateName: body.templateName,
        source: body.source,
        supersedesId: body.supersedesId || null,
        note: body.note,
        status: "final",
        values: {
          create: body.values.map(v => ({
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
