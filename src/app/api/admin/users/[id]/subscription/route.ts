import { z } from "zod";
import { prisma } from "@/lib/db";
import { errorResponse, ApiError } from "@/lib/auth-helpers";
import { audit, requireStaff } from "@/lib/admin/auth";
import { isLive } from "@/lib/billing/plans";
import { notifySubscriptionChange } from "@/lib/billing/events";

const schema = z.object({
  planKey: z.string().min(1).max(40),
  /** ISO date the free access ends; null = until removed. */
  until: z.string().datetime({ offset: true }).nullable(),
  note: z.string().trim().min(3, "Say why (kept in the audit log)").max(300),
});

/** Gives someone a paid plan for free (a promotion, a partner, a refund). */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await requireStaff("admin");
    const { id } = await params;
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Choose a plan");
    const { planKey, until, note } = parsed.data;
    const [user, plan, existing] = await Promise.all([
      prisma.user.findUnique({ where: { id }, select: { email: true } }),
      prisma.plan.findUnique({ where: { key: planKey } }),
      prisma.subscription.findUnique({ where: { userId: id } }),
    ]);
    if (!user) throw new ApiError(404, "User not found");
    if (!plan || plan.isDefault) throw new ApiError(400, "Choose a paid plan");
    if (existing && existing.provider !== "manual" && isLive(existing)) {
      throw new ApiError(409, `They already pay through ${existing.provider}. Cancel that first.`);
    }
    const end = until ? new Date(until) : null;
    if (end && end <= new Date()) throw new ApiError(400, "Pick a date in the future");
    const data = {
      planKey,
      status: "active",
      provider: "manual",
      interval: null,
      currency: null,
      amountMinor: 0,
      providerSubscriptionId: null,
      providerCustomerId: null,
      currentPeriodEnd: end,
      cancelAtPeriodEnd: false,
      note,
    };
    await prisma.subscription.upsert({ where: { userId: id }, create: { userId: id, ...data }, update: data });
    await notifySubscriptionChange(id, existing);
    await audit(staff, {
      action: "user.plan_grant",
      targetType: "user",
      targetId: id,
      summary: `Gave ${user.email} ${plan.name}${end ? ` until ${end.toISOString().slice(0, 10)}` : ""} for free`,
      meta: { reason: note },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await requireStaff("admin");
    const { id } = await params;
    const sub = await prisma.subscription.findUnique({ where: { userId: id }, include: { user: { select: { email: true } } } });
    if (!sub || sub.provider !== "manual") throw new ApiError(404, "No free plan to remove. Paid subscriptions are cancelled by the subscriber.");
    await prisma.subscription.delete({ where: { userId: id } });
    await audit(staff, { action: "user.plan_revoke", targetType: "user", targetId: id, summary: `Removed the free ${sub.planKey} plan from ${sub.user.email}` });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
