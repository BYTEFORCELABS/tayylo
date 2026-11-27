import { z } from "zod";
import { requestAdminCode } from "@/lib/admin/otp";

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

// Step 1 of admin sign-in: email a one-time code. Always answers the same
// way, so it doesn't reveal who is staff. Step 2 is signIn("admin-code").
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a valid email" }, { status: 400 });
  try {
    await requestAdminCode(parsed.data.email);
  } catch (error) {
    console.error("[admin] could not send sign-in code:", (error as Error).message);
    return Response.json({ error: "Couldn't send the code. Try again in a minute." }, { status: 500 });
  }
  return Response.json({ ok: true });
}
