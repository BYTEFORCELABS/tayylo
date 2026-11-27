import { z } from "zod";
import { prisma } from "@/lib/db";
import { errorResponse, ApiError } from "@/lib/auth-helpers";
import { audit, requireStaff } from "@/lib/admin/auth";
import { templateInput } from "@/lib/admin/template-schema";

const archiveSchema = z.object({ archived: z.boolean() });

async function globalTemplate(id: string) {
  const t = await prisma.measurementTemplate.findUnique({ where: { id } });
  if (!t || t.businessId !== null) throw new ApiError(404, "Template not found");
  return t;
}

/**
 * Edit a global template. Saved measurements keep their own copy of each
 * label, so editing never changes past records. Or { archived } to hide it
 * from tailors (past measurements stay readable).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await requireStaff("admin");
    const { id } = await params;
    const current = await globalTemplate(id);
    const raw = await request.json().catch(() => null);

    const archive = archiveSchema.safeParse(raw);
    if (archive.success) {
      await prisma.measurementTemplate.update({ where: { id }, data: { archivedAt: archive.data.archived ? new Date() : null } });
      await audit(staff, { action: archive.data.archived ? "template.archive" : "template.restore", targetType: "template", targetId: id, summary: `${archive.data.archived ? "Archived" : "Restored"} the ${current.name} template` });
      return Response.json({ ok: true });
    }

    const parsed = templateInput.safeParse(raw);
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Check the template");
    const { fields, ...t } = parsed.data;
    await prisma.$transaction([
      prisma.templateField.deleteMany({ where: { templateId: id } }),
      prisma.measurementTemplate.update({
        where: { id },
        data: { ...t, version: { increment: 1 }, fields: { create: fields.map((f, i) => ({ ...f, sortOrder: i })) } },
      }),
    ]);
    await audit(staff, { action: "template.update", targetType: "template", targetId: id, summary: `Edited the ${t.name} template` });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
