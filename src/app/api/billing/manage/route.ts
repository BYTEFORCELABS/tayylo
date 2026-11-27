import { requireUser, errorResponse, ApiError } from "@/lib/auth-helpers";
import { effectivePlan } from "@/lib/billing/plans";
import { manageLink, PaystackError } from "@/lib/billing/paystack";

// Where a subscriber updates their card or cancels.
export async function POST() {
  try {
    const { userId } = await requireUser();
    const { subscription, paid } = await effectivePlan(userId);
    if (!subscription || !paid) throw new ApiError(404, "You don't have a paid plan");
    if (subscription.provider === "apple") return Response.json({ url: "https://apps.apple.com/account/subscriptions" });
    if (subscription.provider === "google") return Response.json({ url: "https://play.google.com/store/account/subscriptions" });
    if (subscription.provider === "manual") throw new ApiError(400, "Your plan was given by Tayylo. Contact support to change it.");
    if (!subscription.providerSubscriptionId) throw new ApiError(400, "Contact support to change your plan");
    return Response.json({ url: await manageLink(subscription.providerSubscriptionId) });
  } catch (error) {
    if (error instanceof PaystackError) return Response.json({ error: "Couldn't open billing. Please try again." }, { status: 502 });
    return errorResponse(error);
  }
}
