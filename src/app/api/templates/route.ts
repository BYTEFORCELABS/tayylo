import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const { business } = await requireUserAndBusiness();
    const templates = await prisma.measurementTemplate.findMany({
      where: { OR: [{ businessId: null }, { businessId: business.id }] },
      include: { fields: { orderBy: { sortOrder: "asc" } } },
      orderBy: { name: "asc" },
    });
    return Response.json(templates);
  } catch (error) {
    return errorResponse(error);
  }
}
