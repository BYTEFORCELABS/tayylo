import { prisma } from "@/lib/db";
import { z } from "zod";
import { requireUserAndBusiness, errorResponse, ApiError } from "@/lib/auth-helpers";
import { imageUrl, optionalText, readBody } from "@/lib/validation";

const mediaSchema = z.object({
  url: imageUrl,
  caption: optionalText(500),
});

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

    const body = await readBody(request, mediaSchema);

    const media = await prisma.media.create({
      data: {
        businessId: business.id,
        ownerType: "order",
        ownerId: id,
        url: body.url,
        caption: body.caption,
      },
    });
    return Response.json(media, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
