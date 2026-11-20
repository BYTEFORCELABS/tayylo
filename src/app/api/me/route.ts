import { requireUser, errorResponse } from "@/lib/auth-helpers";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const { userId, role } = await requireUser();
    const session = await auth();
    return Response.json({ id: userId, email: session?.user?.email ?? "", role });
  } catch (error) {
    return errorResponse(error);
  }
}
