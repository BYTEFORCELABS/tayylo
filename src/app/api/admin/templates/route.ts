import { prisma } from "@/lib/db";
import { errorResponse, ApiError } from "@/lib/auth-helpers";
import { audit, requireStaff } from "@/lib/admin/auth";
import { templateInput } from "@/lib/admin/template-schema";

// A new global template: every tailor sees it in Record measurements.
export async function POST(request: Request) {
  try {
    const staff = await requireStaff("admin");
    const parsed = templateInput.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Check the template");
    const { fields, ...t } = parsed.data;
    if (await prisma.measurementTemplate.findFirst({ where: { businessId: null, name: { equals: t.name, mode: "insensitive" }, archivedAt: null } })) {
      throw new ApiError(409, "A template with that name already exists");
    }
    const template = await prisma.measurementTemplate.create({
      data: { ...t, businessId: null, fields: { create: fields.map((f, i) => ({ ...f, sortOrder: i })) } },
      include: { fields: true },
    });
    await audit(staff, { action: "template.create", targetType: "template", targetId: template.id, summary: `Added the ${template.name} template (${fields.length} measurements)` });
    return Response.json(template, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
