import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse, ApiError } from "@/lib/auth-helpers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { business } = await requireUserAndBusiness();
    const { id } = await params;

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer || customer.businessId !== business.id) {
      throw new ApiError(404, "Client not found");
    }

    const body = await request.json();
    const media = await prisma.media.create({
      data: {
        businessId: business.id,
        ownerType: "customer",
        ownerId: id,
        url: body.url,
        caption: body.caption || null,
      },
    });
    return Response.json(media, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
