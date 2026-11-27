import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/auth-helpers";
import { isSuperAdmin } from "@/lib/admin/super-admins";

export { SUPER_ADMIN_EMAILS, isSuperAdmin } from "@/lib/admin/super-admins";

/**
 * Tayylo staff roles for the admin portal. Ranked: an owner can do
 * everything; an admin runs the platform but can't manage the team; a
 * moderator reviews Explore and can look people up.
 */
export const STAFF_ROLES = ["owner", "admin", "moderator"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

const RANK: Record<StaffRole, number> = { moderator: 1, admin: 2, owner: 3 };

export const asStaffRole = (v: string | null | undefined): StaffRole | null =>
  STAFF_ROLES.includes(v as StaffRole) ? (v as StaffRole) : null;

export const atLeast = (role: StaffRole, min: StaffRole) => RANK[role] >= RANK[min];

/** The effective staff role: super admins are always owners. */
export const effectiveStaffRole = (user: { email: string; staffRole: string | null }): StaffRole | null =>
  isSuperAdmin(user.email) ? "owner" : asStaffRole(user.staffRole);

/**
 * Whether `actor` may change `target`'s account or access. Super admins are
 * untouchable; a super admin may change anyone else (owners included);
 * everyone else must strictly outrank the target.
 */
export function outranks(actor: Staff, target: { email: string; staffRole: string | null }) {
  if (isSuperAdmin(target.email)) return false;
  if (actor.isSuper) return true;
  const t = asStaffRole(target.staffRole);
  return !t || RANK[actor.staffRole] > RANK[t];
}

export interface Staff {
  id: string;
  email: string;
  name: string | null;
  staffRole: StaffRole;
  isSuper: boolean;
}

/** The signed-in staff member, re-read from the database (never trusted from the cookie). */
export async function currentStaff(): Promise<Staff | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, staffRole: true, suspendedAt: true },
  });
  if (!user) return null;
  const staffRole = effectiveStaffRole(user);
  const isSuper = isSuperAdmin(user.email);
  // A super admin can never be locked out by a suspension.
  if (!staffRole || (user.suspendedAt && !isSuper)) return null;
  return { id: user.id, email: user.email, name: user.name, staffRole, isSuper };
}

/** For admin Route Handlers: 401 when signed out, 403 without the role. */
export async function requireStaff(min: StaffRole = "moderator"): Promise<Staff> {
  const session = await auth();
  if (!session?.user?.id) throw new ApiError(401, "Not signed in");
  const staff = await currentStaff();
  if (!staff) throw new ApiError(403, "This account doesn't have admin access");
  if (!atLeast(staff.staffRole, min)) throw new ApiError(403, `Only ${min}s and above can do this`);
  return staff;
}

/** For admin pages: sends anyone without access to the portal's sign-in. */
export async function requireStaffPage(min: StaffRole = "moderator"): Promise<Staff> {
  const staff = await currentStaff();
  if (!staff) redirect("/login");
  if (!atLeast(staff.staffRole, min)) redirect("/?denied=1");
  return staff;
}

/** Records an admin action. Call after the change succeeds. */
export async function audit(
  actor: Staff,
  entry: { action: string; summary: string; targetType?: string; targetId?: string; meta?: Prisma.InputJsonValue },
) {
  await prisma.adminAuditLog.create({
    data: { actorId: actor.id, actorEmail: actor.email, ...entry },
  });
}
