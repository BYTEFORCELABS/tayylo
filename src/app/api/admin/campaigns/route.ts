import { prisma } from "@/lib/db";
import { errorResponse, ApiError } from "@/lib/auth-helpers";
import { audit, requireStaff } from "@/lib/admin/auth";
import { campaignSchema } from "@/lib/marketing/campaigns";

export async function POST(request: Request) {
  try {
    const staff = await requireStaff("admin");
    const parsed = campaignSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Check the campaign");
    const campaign = await prisma.campaign.create({
      data: { ...parsed.data, createdById: staff.id, createdByEmail: staff.email },
    });
    await audit(staff, { action: "campaign.create", targetType: "campaign", targetId: campaign.id, summary: `Drafted the campaign “${campaign.title}”` });
    return Response.json(campaign, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
