import crypto from "crypto";

/**
 * Minimal Paystack REST client (https://paystack.com/docs/api/). Server only:
 * uses PAYSTACK_SECRET_KEY, which must never reach a browser.
 */
const BASE = "https://api.paystack.co";

export const paystackEnabled = () => !!process.env.PAYSTACK_SECRET_KEY;

export class PaystackError extends Error {}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new PaystackError("Paystack isn't set up (PAYSTACK_SECRET_KEY is missing)");
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T };
  if (!res.ok || !json.status) throw new PaystackError(json.message || `Paystack request failed (${res.status})`);
  return json.data as T;
}

/** Paystack's plan intervals. */
const INTERVAL = { monthly: "monthly", yearly: "annually" } as const;

export async function createPaystackPlan(p: { name: string; interval: "monthly" | "yearly"; amountMinor: number; currency: string }) {
  const data = await call<{ plan_code: string }>("POST", "/plan", {
    name: p.name,
    interval: INTERVAL[p.interval],
    amount: p.amountMinor,
    currency: p.currency,
  });
  return data.plan_code;
}

/** Starts a checkout for a subscription plan. Returns the page to send the user to. */
export async function initializeSubscription(p: {
  email: string;
  planCode: string;
  amountMinor: number;
  currency: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}) {
  const data = await call<{ authorization_url: string; reference: string }>("POST", "/transaction/initialize", {
    email: p.email,
    plan: p.planCode,
    amount: p.amountMinor, // Paystack uses the plan's amount; required by the API anyway
    currency: p.currency,
    callback_url: p.callbackUrl,
    metadata: p.metadata,
  });
  return data.authorization_url;
}

/** A Paystack-hosted page where the subscriber can update their card or cancel. */
export async function manageLink(subscriptionCode: string) {
  const data = await call<{ link: string }>("GET", `/subscription/${encodeURIComponent(subscriptionCode)}/manage/link`);
  return data.link;
}

/** Webhooks are signed: HMAC-SHA512 of the raw body with the secret key. */
export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || !signature) return false;
  const expected = crypto.createHmac("sha512", key).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
