import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse } from "@/lib/auth-helpers";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { business } = await requireUserAndBusiness();
    const { id } = await params;
    const url = new URL(request.url);
    const templateId = url.searchParams.get("templateId") ?? undefined;
    const latestOnly = url.searchParams.get("latest") === "true";

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer || customer.businessId !== business.id) {
      return Response.json(latestOnly ? null : [], { status: 404 });
    }

    if (latestOnly) {
      const set = await prisma.measurementSet.findFirst({
        where: { customerId: id, ...(templateId ? { templateId } : {}) },
        include: { values: true },
        orderBy: { takenAt: "desc" },
      });
      return Response.json(set);
    }

    const sets = await prisma.measurementSet.findMany({
      where: { customerId: id },
      include: { values: true },
      orderBy: { takenAt: "desc" },
    });
    return Response.json(sets);
  } catch (error) {
    return errorResponse(error);
  }
}
