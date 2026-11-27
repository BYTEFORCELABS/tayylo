import { z } from "zod";
import { prisma } from "@/lib/db";
import { errorResponse, ApiError } from "@/lib/auth-helpers";
import { audit, isSuperAdmin, requireStaff } from "@/lib/admin/auth";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  staffRole: z.enum(["owner", "admin", "moderator"]),
});

// Owners add staff by email (super admins can also add owners). The person
// needs a Tayylo account already, and signs in to the portal with a code
// emailed to that address.
export async function POST(request: Request) {
  try {
    const staff = await requireStaff("owner");
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, "Enter an email and a role");
    const { email, staffRole } = parsed.data;
    if (staffRole === "owner" && !staff.isSuper) throw new ApiError(403, "Only super admins can make someone an owner");
    if (isSuperAdmin(email)) throw new ApiError(409, `${email} is a super admin already`);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new ApiError(404, "No Tayylo account uses that email. Ask them to sign up first.");
    if (user.staffRole) throw new ApiError(409, `${email} is already on the team`);
    if (user.suspendedAt) throw new ApiError(400, "That account is suspended");

    await prisma.user.update({ where: { id: user.id }, data: { staffRole } });
    await audit(staff, { action: "team.add", targetType: "user", targetId: user.id, summary: `Gave ${email} ${staffRole} access` });
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
