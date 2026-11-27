import { prisma } from "@/lib/db";
import { errorResponse, ApiError } from "@/lib/auth-helpers";
import { audit, requireStaff } from "@/lib/admin/auth";
import { planInput } from "@/lib/admin/plan-schema";

/**
 * Saves a plan and its prices. A changed amount retires the old price row
 * and adds a new one (with a new Paystack plan on next checkout); existing
 * subscribers keep paying the old amount until they change plan.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const staff = await requireStaff("owner");
    const { key } = await params;
    const plan = await prisma.plan.findUnique({ where: { key }, include: { prices: { where: { active: true } } } });
    if (!plan) throw new ApiError(404, "Plan not found");
    const parsed = planInput.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Check the plan");
    const { prices, ...fields } = parsed.data;
    if (plan.isDefault && !fields.active) throw new ApiError(400, "The free plan can't be switched off");
    if (plan.isDefault && prices.length) throw new ApiError(400, "The free plan can't have prices");
    const dupes = new Set(prices.map(p => `${p.interval}:${p.currency}`));
    if (dupes.size !== prices.length) throw new ApiError(400, "Each billing period and currency can only have one price");

    const ops = [];
    for (const p of prices) {
      const current = plan.prices.find(x => x.interval === p.interval && x.currency === p.currency);
      if (current?.amountMinor === p.amountMinor) continue;
      if (current) ops.push(prisma.planPrice.update({ where: { id: current.id }, data: { active: false } }));
      ops.push(prisma.planPrice.create({ data: { planKey: key, ...p } }));
    }
    for (const old of plan.prices) {
      if (!prices.some(p => p.interval === old.interval && p.currency === old.currency)) {
        ops.push(prisma.planPrice.update({ where: { id: old.id }, data: { active: false } }));
      }
    }
    await prisma.$transaction([prisma.plan.update({ where: { key }, data: fields }), ...ops]);
    await audit(staff, { action: "plan.update", targetType: "plan", targetId: key, summary: `Updated the ${fields.name} plan`, meta: { prices } });
    return Response.json(await prisma.plan.findUnique({ where: { key }, include: { prices: { where: { active: true } } } }));
  } catch (error) {
    return errorResponse(error);
  }
}
