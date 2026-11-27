import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId, errorResponse, ApiError } from "@/lib/auth-helpers";
import { isExpoToken } from "@/lib/push";

const schema = z.object({ token: z.string().trim().max(200), platform: z.enum(["ios", "android"]).optional() });

// The mobile app registers its Expo push token after sign-in (and on every
// launch), and removes it on sign-out. A token moves to whoever signed in last.
export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || !isExpoToken(parsed.data.token)) throw new ApiError(400, "Send an Expo push token");
    const { token, platform = "ios" } = parsed.data;
    await prisma.pushToken.upsert({
      where: { token },
      create: { token, platform, userId },
      update: { userId, platform, lastUsedAt: new Date() },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await requireUserId();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, "Send the token to remove");
    await prisma.pushToken.deleteMany({ where: { token: parsed.data.token, userId } });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
