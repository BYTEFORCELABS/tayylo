import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse, ApiError } from "@/lib/auth-helpers";
import { mediaForOwner } from "@/lib/media";
import { customerPatchSchema } from "@/lib/customer-schema";
import { readBody } from "@/lib/validation";

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

    const body = await readBody(request, customerPatchSchema);
    // Only the fields present in the body change.
    const data: Record<string, unknown> = {};
    for (const key of ["fullName", "phones", "email", "tags", "notes", "photoUrl"] as const) {
      if (body[key] !== undefined) data[key] = body[key];
    }

    const customer = await prisma.customer.update({ where: { id }, data });
    const media = await mediaForOwner(business.id, "customer", id);
    return Response.json({ ...customer, media });
  } catch (error) {
    return errorResponse(error);
  }
}
