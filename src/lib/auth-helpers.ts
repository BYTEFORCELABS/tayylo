import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAppSettings } from "@/lib/app-settings";
import { isSuperAdmin } from "@/lib/admin/super-admins";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface SessionUser {
  userId: string;
  role: "tailor" | "customer";
  businessId: string | null;
}

const SEEN_EVERY_MS = 10 * 60 * 1000;

/**
 * Browsers send a "Mozilla/…" user agent; the native app's networking stack
 * (CFNetwork / okhttp) doesn't. The app can also say so explicitly with an
 * `X-Tayylo-Client: app` header.
 */
async function requestClient(): Promise<"web" | "app" | null> {
  try {
    const h = await headers();
    const explicit = h.get("x-tayylo-client");
    if (explicit === "app" || explicit === "web") return explicit;
    const ua = h.get("user-agent");
    if (!ua) return null;
    return /mozilla\//i.test(ua) ? "web" : "app";
  } catch {
    return null; // outside a request (tests, scripts)
  }
}

/** Records activity for the admin portal's active-user counts, at most every 10 minutes. */
async function touchLastSeen(userId: string, lastSeenAt: Date | null) {
  if (lastSeenAt && Date.now() - lastSeenAt.getTime() < SEEN_EVERY_MS) return;
  try {
    const client = await requestClient();
    await prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date(), ...(client ? { lastSeenClient: client } : {}) },
    });
  } catch (e) {
    console.error("[activity] could not record last seen:", (e as Error).message);
  }
}

/**
 * Resolves the signed-in user from the session AND the database. The session
 * is a signed JWT, so on its own it stays valid after the account is deleted;
 * checking the row on every request makes a deleted account's cookie useless
 * immediately. The role comes from the database too (not the token), and the
 * business id is fetched in the same query.
 */
async function sessionUser(): Promise<SessionUser> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new ApiError(401, "Not signed in");

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      staffRole: true,
      suspendedAt: true,
      lastSeenAt: true,
      business: { select: { id: true } },
    },
  });
  if (!user) throw new ApiError(401, "Not signed in");
  if (user.suspendedAt) throw new ApiError(403, "This account has been suspended. Contact support@tayylo.com.");

  // Staff keep access during maintenance so they can check the fix.
  if (!user.staffRole && !isSuperAdmin(user.email)) {
    const settings = await getAppSettings();
    if (settings.maintenanceMode) throw new ApiError(503, settings.maintenanceMessage);
  }

  await touchLastSeen(user.id, user.lastSeenAt);

  return {
    userId: user.id,
    role: user.role === "customer" ? "customer" : "tailor",
    businessId: user.business?.id ?? null,
  };
}

/**
 * Every data Route Handler must call one of these first. Throws a 401 if
 * there's no signed-in session (or its account no longer exists) — there is
 * no database-level Row Level Security here, so these checks, plus the
 * business scoping below, are the ONLY thing standing between one tailor's
 * data and another's.
 */
export async function requireUserId(): Promise<string> {
  return (await sessionUser()).userId;
}

/** Signed-in user plus role (read from the database). */
export async function requireUser(): Promise<{ userId: string; role: "tailor" | "customer" }> {
  const { userId, role } = await sessionUser();
  return { userId, role };
}

/** Tailor-only actions (invoices, receipts, orders, clients, posting styles…). */
export async function requireTailorId(): Promise<string> {
  const { userId, role } = await sessionUser();
  if (role !== "tailor") throw new ApiError(403, "This is only available to tailors");
  return userId;
}

/**
 * Session + the signed-in tailor's business. Every business-scoped query
 * MUST be filtered by this id (e.g. `where: { businessId: business.id }`),
 * and every fetch-by-id route MUST re-check the row's businessId matches
 * before returning or mutating it. Never trust a businessId (or any other
 * id) that came from the client without checking it belongs to this
 * business.
 */
export async function requireUserAndBusiness(): Promise<{ userId: string; business: { id: string } }> {
  const { userId, role, businessId } = await sessionUser();
  if (role !== "tailor") throw new ApiError(403, "This is only available to tailors");
  if (!businessId) throw new ApiError(404, "No business found for the signed-in user yet");
  return { userId, business: { id: businessId } };
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}
