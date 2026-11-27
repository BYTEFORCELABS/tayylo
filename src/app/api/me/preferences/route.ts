import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId, errorResponse, ApiError } from "@/lib/auth-helpers";

const schema = z.object({ marketingEmails: z.boolean().optional(), pushNotifications: z.boolean().optional() }).strict();

export async function GET() {
  try {
    const userId = await requireUserId();
    return Response.json(await prisma.user.findUnique({ where: { id: userId }, select: { marketingEmails: true, pushNotifications: true } }));
  } catch (error) {
    return errorResponse(error);
  }
}

// Whether the user gets product updates and promotions by email / push.
export async function PATCH(request: Request) {
  try {
    const userId = await requireUserId();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, "Invalid preferences");
    const user = await prisma.user.update({ where: { id: userId }, data: parsed.data, select: { marketingEmails: true, pushNotifications: true } });
    return Response.json(user);
  } catch (error) {
    return errorResponse(error);
  }
}
