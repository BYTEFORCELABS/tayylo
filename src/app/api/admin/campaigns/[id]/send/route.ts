import { z } from "zod";
import { prisma } from "@/lib/db";
import { errorResponse, ApiError } from "@/lib/auth-helpers";
import { audit, requireStaff } from "@/lib/admin/auth";
import { sendNextBatch, sendTest } from "@/lib/marketing/campaigns";
import { appOrigin } from "@/lib/password-reset";
import { unfilled } from "@/lib/marketing/presets";

export const maxDuration = 300;

const schema = z.object({ test: z.boolean().default(false) });

// { test: true } sends a preview to you only. Otherwise sends the next batch;
// the portal calls this until it answers done: true.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await requireStaff("admin");
    const { id } = await params;
    const { test } = schema.parse(await request.json().catch(() => ({})));
    const campaign = await prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new ApiError(404, "Campaign not found");
    const origin = appOrigin(request);

    if (test) {
      const user = await prisma.user.findUnique({ where: { id: staff.id }, select: { name: true } });
      return Response.json({ test: await sendTest(campaign, { id: staff.id, email: staff.email, name: user?.name ?? null }, origin) });
    }
    if (campaign.status === "sent") return Response.json({ done: true, campaign });
    const gaps = unfilled(campaign.subject, campaign.body, campaign.pushTitle, campaign.pushBody, campaign.ctaLabel);
    if (gaps.length) throw new ApiError(400, `Fill in ${gaps.join(", ")} before sending`);
    if (campaign.status === "draft") {
      await audit(staff, { action: "campaign.send", targetType: "campaign", targetId: id, summary: `Started sending “${campaign.title}”` });
    }
    const result = await sendNextBatch(id, origin);
    return Response.json({ done: result.done, busy: result.busy, campaign: result.campaign });
  } catch (error) {
    return errorResponse(error);
  }
}
