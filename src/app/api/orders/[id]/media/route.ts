import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse, ApiError } from "@/lib/auth-helpers";

// Fabric / material / style-reference photos for an order. Stored in the
// shared polymorphic Media table (ownerType "order"), same as client photos.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { business } = await requireUserAndBusiness();
    const { id } = await params;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.businessId !== business.id) {
      throw new ApiError(404, "Order not found");
    }

    const body = await request.json();
    if (typeof body.url !== "string" || !body.url) {
      throw new ApiError(400, "An image is required");
    }

    const media = await prisma.media.create({
      data: {
        businessId: business.id,
        ownerType: "order",
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
