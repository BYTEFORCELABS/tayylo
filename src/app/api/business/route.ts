import { prisma } from "@/lib/db";
import { requireUserId, errorResponse, ApiError } from "@/lib/auth-helpers";

// Logos are stored inline as small data URLs (resized on the client).
const MAX_LOGO_CHARS = 400_000;

/** Keeps only well-formed accounts, with exactly one default when any exist. */
function cleanAccounts(input: unknown[]) {
  const accounts = input
    .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
    .map(a => ({
      id: typeof a.id === "string" && a.id ? a.id : crypto.randomUUID(),
      bankName: String(a.bankName ?? "").trim().slice(0, 80),
      accountName: String(a.accountName ?? "").trim().slice(0, 120),
      accountNumber: String(a.accountNumber ?? "").trim().slice(0, 40),
      isDefault: a.isDefault === true,
    }))
    .filter(a => a.bankName && a.accountNumber)
    .slice(0, 10);
  const def = accounts.findIndex(a => a.isDefault);
  return accounts.map((a, i) => ({ ...a, isDefault: i === (def < 0 ? 0 : def) }));
}

export async function GET() {
  try {
    const userId = await requireUserId();
    const business = await prisma.business.findUnique({ where: { ownerId: userId } });
    return Response.json(business);
  } catch (error) {
    return errorResponse(error);
  }
}

// Upsert — onboarding calls this before any Business row exists; Settings
// calls it afterward to edit it. Only the fields present in the body are
// changed on an existing row.
export async function PATCH(request: Request) {
  try {
    const userId = await requireUserId();
    const body = await request.json().catch(() => ({}));

    const data: Record<string, unknown> = {};
    if (typeof body.name === "string") data.name = body.name;
    if (typeof body.country === "string") data.country = body.country;
    if (typeof body.currency === "string") data.currency = body.currency;
    if (body.unitSystem === "imperial" || body.unitSystem === "metric") data.unitSystem = body.unitSystem;
    if (typeof body.timezone === "string") data.timezone = body.timezone;
    if (typeof body.ownerName === "string") data.ownerName = body.ownerName;
    if (Array.isArray(body.garmentTypes)) data.garmentTypes = body.garmentTypes;
    if (body.logoUrl === null) data.logoUrl = null;
    else if (typeof body.logoUrl === "string") {
      if (!body.logoUrl.startsWith("data:image/")) throw new ApiError(400, "Logo must be an image");
      if (body.logoUrl.length > MAX_LOGO_CHARS) throw new ApiError(413, "That logo is too large");
      data.logoUrl = body.logoUrl;
    }
    if (Array.isArray(body.bankAccounts)) data.bankAccounts = cleanAccounts(body.bankAccounts);

    const business = await prisma.business.upsert({
      where: { ownerId: userId },
      create: { ownerId: userId, name: typeof data.name === "string" ? data.name : "My Atelier", ...data },
      update: data,
    });

    return Response.json(business);
  } catch (error) {
    return errorResponse(error);
  }
}
