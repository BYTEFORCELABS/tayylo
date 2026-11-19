import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse, ApiError } from "@/lib/auth-helpers";
import { mediaForOwner } from "@/lib/media";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { business } = await requireUserAndBusiness();
    const { id } = await params;

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer || customer.businessId !== business.id) {
      return Response.json(null, { status: 404 });
    }
    const media = await mediaForOwner(business.id, "customer", id);
    return Response.json({ ...customer, media });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { business } = await requireUserAndBusiness();
    const { id } = await params;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing || existing.businessId !== business.id) {
      throw new ApiError(404, "Client not found");
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (typeof body.fullName === "string") data.fullName = body.fullName;
    if (Array.isArray(body.phones)) data.phones = body.phones;
    if (body.email !== undefined) data.email = body.email || null;
    if (Array.isArray(body.tags)) data.tags = body.tags;
    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.photoUrl !== undefined) data.photoUrl = body.photoUrl || null;

    const customer = await prisma.customer.update({ where: { id }, data });
    const media = await mediaForOwner(business.id, "customer", id);
    return Response.json({ ...customer, media });
  } catch (error) {
    return errorResponse(error);
  }
}
