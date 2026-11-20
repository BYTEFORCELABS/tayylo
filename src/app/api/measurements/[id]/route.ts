import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse } from "@/lib/auth-helpers";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { business } = await requireUserAndBusiness();
    const { id } = await params;

    const set = await prisma.measurementSet.findUnique({ where: { id }, include: { values: true } });
    if (!set || set.businessId !== business.id) {
      return Response.json(null, { status: 404 });
    }
    return Response.json(set);
  } catch (error) {
    return errorResponse(error);
  }
}
