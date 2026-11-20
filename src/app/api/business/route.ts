import { prisma } from "@/lib/db";
import { requireUserId, errorResponse } from "@/lib/auth-helpers";

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
