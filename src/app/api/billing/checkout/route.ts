import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTailorId, errorResponse, ApiError } from "@/lib/auth-helpers";
import { getAppSettings } from "@/lib/app-settings";
import { effectivePlan } from "@/lib/billing/plans";
import { createPaystackPlan, initializeSubscription, paystackEnabled, PaystackError } from "@/lib/billing/paystack";
import { appOrigin } from "@/lib/password-reset";

const schema = z.object({
  planKey: z.string().min(1).max(40),
  interval: z.enum(["monthly", "yearly"]),
  currency: z.string().length(3).optional(),
});

// Web checkout: returns a Paystack page to send the tailor to. The
// subscription itself is recorded when Paystack's webhook arrives.
export async function POST(request: Request) {
  try {
    const userId = await requireTailorId();
    if (!(await getAppSettings()).billingEnabled || !paystackEnabled()) throw new ApiError(503, "Upgrades aren't available yet");
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, "Choose a plan");
    const { planKey, interval } = parsed.data;

    const [user, business, current] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
      prisma.business.findUnique({ where: { ownerId: userId }, select: { currency: true } }),
      effectivePlan(userId),
    ]);
    if (current.paid && current.subscription?.planKey === planKey) throw new ApiError(409, "You're already on this plan");

    const currency = (parsed.data.currency ?? business?.currency ?? "NGN").toUpperCase();
    const plan = await prisma.plan.findUnique({
      where: { key: planKey },
      include: { prices: { where: { interval, active: true } } },
    });
    if (!plan || !plan.active || plan.isDefault) throw new ApiError(404, "That plan isn't available");
    const price = plan.prices.find(p => p.currency === currency) ?? plan.prices.find(p => p.currency === "NGN") ?? plan.prices[0];
    if (!price) throw new ApiError(404, "That plan has no price for this billing period");

    let planCode = price.paystackPlanCode;
    if (!planCode) {
      planCode = await createPaystackPlan({ name: `Tayylo ${plan.name} (${interval}, ${price.currency})`, interval, amountMinor: price.amountMinor, currency: price.currency });
      await prisma.planPrice.update({ where: { id: price.id }, data: { paystackPlanCode: planCode } });
    }

    const url = await initializeSubscription({
      email: user!.email,
      planCode,
      amountMinor: price.amountMinor,
      currency: price.currency,
      callbackUrl: `${appOrigin(request)}/settings?billing=success`,
      metadata: { userId, planKey, interval },
    });
    return Response.json({ url });
  } catch (error) {
    if (error instanceof PaystackError) {
      console.error("[billing] paystack:", error.message);
      return Response.json({ error: "Couldn't start the payment. Please try again." }, { status: 502 });
    }
    return errorResponse(error);
  }
}
