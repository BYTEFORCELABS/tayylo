import crypto from "crypto";
import { applyRevenueCatEvent } from "@/lib/billing/events";

// RevenueCat (App Store + Google Play) → Tayylo. In RevenueCat → Integrations
// → Webhooks, set the URL to https://<app domain>/api/billing/revenuecat/webhook
// and the Authorization header to the value of REVENUECAT_WEBHOOK_AUTH.
function authorized(header: string | null) {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!expected || !header) return false;
  const a = Buffer.from(header.replace(/^Bearer\s+/i, ""));
  const b = Buffer.from(expected.replace(/^Bearer\s+/i, ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request.headers.get("authorization"))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const event = body?.event;
    if (!event?.id || !event?.type || !event?.app_user_id) return Response.json({ ok: true });
    await applyRevenueCatEvent(event);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[billing] revenuecat webhook failed:", error);
    return Response.json({ error: "Failed" }, { status: 500 });
  }
}
