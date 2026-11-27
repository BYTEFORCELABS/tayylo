import { verifyPaystackSignature } from "@/lib/billing/paystack";
import { applyPaystackEvent } from "@/lib/billing/events";

// Paystack → Tayylo. Set this URL in Paystack → Settings → API Keys & Webhooks:
//   https://<app domain>/api/billing/paystack/webhook
// Signed with the secret key; anything unsigned is refused.
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyPaystackSignature(raw, request.headers.get("x-paystack-signature"))) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }
  try {
    const event = JSON.parse(raw);
    if (typeof event?.event !== "string" || typeof event?.data !== "object") return Response.json({ ok: true });
    await applyPaystackEvent(event);
    return Response.json({ ok: true });
  } catch (error) {
    // A 500 makes Paystack retry later.
    console.error("[billing] paystack webhook failed:", error);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
