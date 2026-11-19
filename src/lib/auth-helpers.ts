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

/**
 * Loads the signed-in user's business. Every business-scoped query MUST be
 * filtered by this id (e.g. `where: { businessId: business.id }`), and every
 * fetch-by-id route MUST re-check the row's businessId matches before
 * returning or mutating it. Never trust a businessId that came from the
 * client (query params, body) — always derive it from the session via this
 * function.
 */
export async function requireBusiness(userId: string) {
  const business = await prisma.business.findUnique({ where: { ownerId: userId } });
  if (!business) {
    throw new ApiError(404, "No business found for the signed-in user yet");
  }
  return business;
}

/** Convenience: session + business in one call, for the common case. */
export async function requireUserAndBusiness() {
  const userId = await requireUserId();
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
