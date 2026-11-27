import { z } from "zod";
import { prisma } from "@/lib/db";
import { errorResponse, ApiError } from "@/lib/auth-helpers";
import { revokeProviderTokens } from "@/lib/identity";
import { atLeast, audit, isSuperAdmin, outranks, requireStaff, type Staff } from "@/lib/admin/auth";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("suspend"), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("unsuspend") }),
  z.object({ action: z.literal("setRole"), role: z.enum(["tailor", "customer"]) }),
  z.object({ action: z.literal("setStaffRole"), staffRole: z.enum(["owner", "admin", "moderator"]).nullable() }),
]);

/** Loads the target and refuses actions on yourself or on staff at or above your rank. */
async function target(staff: Staff, id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, "User not found");
  if (user.id === staff.id) throw new ApiError(400, "You can't do this to your own account");
  if (isSuperAdmin(user.email)) throw new ApiError(403, "Super admins can't be changed from the portal");
  if (!outranks(staff, user)) throw new ApiError(403, "You can't change a staff member at or above your level");
  return user;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await requireStaff("admin");
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, "Invalid request");
    const body = parsed.data;
    if (body.action === "setStaffRole" && !atLeast(staff.staffRole, "owner")) throw new ApiError(403, "Only owners can change the team");
    if (body.action === "setStaffRole" && body.staffRole === "owner" && !staff.isSuper) throw new ApiError(403, "Only super admins can make someone an owner");
    const { id } = await params;
    const user = await target(staff, id);

    switch (body.action) {
      case "suspend":
        await prisma.user.update({ where: { id }, data: { suspendedAt: new Date(), suspendedReason: body.reason } });
        await audit(staff, { action: "user.suspend", targetType: "user", targetId: id, summary: `Suspended ${user.email}`, meta: { reason: body.reason } });
        break;
      case "unsuspend":
        await prisma.user.update({ where: { id }, data: { suspendedAt: null, suspendedReason: null } });
        await audit(staff, { action: "user.unsuspend", targetType: "user", targetId: id, summary: `Lifted suspension on ${user.email}` });
        break;
      case "setRole":
        if (user.role === body.role) break;
        await prisma.user.update({ where: { id }, data: { role: body.role } });
        await audit(staff, { action: "user.role", targetType: "user", targetId: id, summary: `Changed ${user.email} from ${user.role} to ${body.role}` });
        break;
      case "setStaffRole":
        if (user.staffRole === body.staffRole) break;
        await prisma.user.update({ where: { id }, data: { staffRole: body.staffRole } });
        await audit(staff, {
          action: "team.role",
          targetType: "user",
          targetId: id,
          summary: body.staffRole ? `Gave ${user.email} ${body.staffRole} access` : `Removed admin access from ${user.email}`,
          meta: { from: user.staffRole, to: body.staffRole },
        });
        break;
    }
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

// Permanently deletes the account and everything it owns, exactly like the
// user deleting it themselves (including revoking Sign in with Apple).
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await requireStaff("admin");
    const { id } = await params;
    const user = await target(staff, id);
    await revokeProviderTokens(id);
    await prisma.user.delete({ where: { id } });
    await audit(staff, { action: "user.delete", targetType: "user", targetId: id, summary: `Deleted the account ${user.email}`, meta: { role: user.role } });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
