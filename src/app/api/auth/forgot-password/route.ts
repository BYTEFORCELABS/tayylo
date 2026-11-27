import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendResetLink } from "@/lib/password-reset";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Enter a valid email" }, { status: 400 });
  }
  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  // Always respond the same way whether or not the account exists — don't
  // let this endpoint be used to discover which emails have accounts.
  if (user) await sendResetLink(user, new URL(request.url).origin);

  return Response.json({ ok: true });
}
