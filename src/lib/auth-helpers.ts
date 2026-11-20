import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Every data Route Handler must call this first. Throws a 401 if there's no
 * signed-in session — there is no database-level Row Level Security here
 * (unlike the old Supabase setup), so this check, plus requireBusiness()
 * below, is the ONLY thing standing between one tailor's data and another's.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, "Not signed in");
  }
  return session.user.id;
}

/** Signed-in user plus role. Role comes from the session token. */
export async function requireUser(): Promise<{ userId: string; role: "tailor" | "customer" }> {
  const session = await auth();
  if (!session?.user?.id) throw new ApiError(401, "Not signed in");
  return { userId: session.user.id, role: session.user.role === "customer" ? "customer" : "tailor" };
}

/** Tailor-only actions (invoices, receipts, orders, clients, posting styles…). */
export async function requireTailorId(): Promise<string> {
  const { userId, role } = await requireUser();
  if (role !== "tailor") throw new ApiError(403, "This is only available to tailors");
  return userId;
}

/**
 * Loads the signed-in user's business. Every business-scoped query MUST be
 * filtered by this id (e.g. `where: { businessId: business.id }`), and every
 * fetch-by-id route MUST re-check the row's businessId matches before
 * returning or mutating it. Never trust a businessId that came from the
 * client (query params, body) — always derive it from the session via this
 * function.
 */
// userId → businessId. A user's business id never changes once created, so
// caching it saves one database round trip on every API request. Only
// positive results are cached (a user mid-onboarding has no business yet),
// and entries expire so a deleted account can't linger.
const businessIdCache = new Map<string, { id: string; expires: number }>();
const BUSINESS_ID_TTL_MS = 5 * 60_000;

export async function requireBusiness(userId: string): Promise<{ id: string }> {
  const hit = businessIdCache.get(userId);
  if (hit && hit.expires > Date.now()) return { id: hit.id };

  const business = await prisma.business.findUnique({ where: { ownerId: userId }, select: { id: true } });
  if (!business) {
    businessIdCache.delete(userId);
    throw new ApiError(404, "No business found for the signed-in user yet");
  }
  businessIdCache.set(userId, { id: business.id, expires: Date.now() + BUSINESS_ID_TTL_MS });
  return business;
}

/** Drop the cached business id (e.g. after the account is deleted). */
export function forgetBusiness(userId: string) {
  businessIdCache.delete(userId);
}

/** Convenience: session + business in one call, for the common case. */
export async function requireUserAndBusiness() {
  const userId = await requireTailorId();
  const business = await requireBusiness(userId);
  return { userId, business };
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}
