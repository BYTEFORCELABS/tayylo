import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Enter a valid email and a password of at least 6 characters" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { email, passwordHash } });

  return Response.json({ ok: true });
}
