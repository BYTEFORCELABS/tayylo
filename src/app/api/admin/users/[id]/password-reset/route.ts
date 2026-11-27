import { prisma } from "@/lib/db";
import { errorResponse, ApiError } from "@/lib/auth-helpers";
import { audit, requireStaff } from "@/lib/admin/auth";
import { appOrigin, sendResetLink } from "@/lib/password-reset";

// Emails the user a link to set a new password (works for Apple/Google-only
// accounts too: it lets them add a password). Staff never see or set it.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await requireStaff("admin");
    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
    if (!user) throw new ApiError(404, "User not found");
    await sendResetLink(user, appOrigin(request));
    await audit(staff, { action: "user.password_reset", targetType: "user", targetId: id, summary: `Sent a password reset link to ${user.email}` });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
