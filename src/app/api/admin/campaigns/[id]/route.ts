import { prisma } from "@/lib/db";
import { errorResponse, ApiError } from "@/lib/auth-helpers";
import { audit, requireStaff } from "@/lib/admin/auth";
import { campaignSchema } from "@/lib/marketing/campaigns";

async function draft(id: string) {
  const c = await prisma.campaign.findUnique({ where: { id } });
  if (!c) throw new ApiError(404, "Campaign not found");
  if (c.status !== "draft") throw new ApiError(409, "This campaign has already started sending and can't be changed");
  return c;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff("admin");
    const { id } = await params;
    await draft(id);
    const parsed = campaignSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Check the campaign");
    return Response.json(await prisma.campaign.update({ where: { id }, data: parsed.data }));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await requireStaff("admin");
    const { id } = await params;
    const c = await draft(id);
    await prisma.campaign.delete({ where: { id } });
    await audit(staff, { action: "campaign.delete", targetType: "campaign", targetId: id, summary: `Deleted the draft “${c.title}”` });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
