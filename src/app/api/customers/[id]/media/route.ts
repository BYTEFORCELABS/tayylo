import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse, ApiError } from "@/lib/auth-helpers";
import { imageUrl, MAX_IMAGE_CHARS, optionalText, parse, readJson } from "@/lib/validation";

const bodySchema = z.object({
  url: imageUrl,
  caption: optionalText(300),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { business } = await requireUserAndBusiness();
    const { id } = await params;

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer || customer.businessId !== business.id) {
      throw new ApiError(404, "Client not found");
    }

    const raw = await readJson(request);
    const url = (raw as { url?: unknown } | null)?.url;
    if (typeof url === "string" && url.length > MAX_IMAGE_CHARS) {
      throw new ApiError(413, "That photo is too large");
    }
    const body = parse(bodySchema, raw);

    const media = await prisma.media.create({
      data: {
        businessId: business.id,
        ownerType: "customer",
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
