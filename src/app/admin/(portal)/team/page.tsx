import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { SUPER_ADMIN_EMAILS, isSuperAdmin, requireStaffPage } from "@/lib/admin/auth";
import { PageHeader, Pill, Section, cap, relative } from "@/components/admin/ui";
import { SelectAction } from "@/components/admin/action-button";
import { AddStaffForm } from "@/components/admin/team-form";

export const metadata: Metadata = { title: "Team" };

const ROLE_HELP = [
  ["Super admin", `Permanent owners: ${SUPER_ADMIN_EMAILS.join(" and ")}. They can add or remove anyone, including owners, and can't be removed themselves.`],
  ["Owner", "Everything, including adding and removing admins and moderators."],
  ["Admin", "Users (suspend, change type, reset password, delete), moderation and app controls."],
  ["Moderator", "Moderation, and read-only access to users, insights and settings."],
];

const RANK: Record<string, number> = { super: 0, owner: 1, admin: 2, moderator: 3 };

export default async function TeamPage() {
  const staff = await requireStaffPage("owner");
  const rows = await prisma.user.findMany({
    where: { OR: [{ staffRole: { not: null } }, { email: { in: [...SUPER_ADMIN_EMAILS] } }] },
    select: { id: true, email: true, name: true, staffRole: true, lastSeenAt: true },
  });
  const team = rows
    .map(m => ({ ...m, level: isSuperAdmin(m.email) ? "super" : (m.staffRole ?? "moderator") }))
    .sort((a, b) => RANK[a.level] - RANK[b.level] || a.email.localeCompare(b.email));
  const missingSupers = SUPER_ADMIN_EMAILS.filter(e => !rows.some(r => r.email === e));

  return (
    <>
      <PageHeader title="Team" description="Who can sign in to the admin portal, and what they can do. People sign in with a code emailed to their address." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="Add someone" description="They need a Tayylo account with this email. Their access starts straight away.">
            <AddStaffForm allowOwner={staff.isSuper} />
          </Section>
          <Section title={`Staff (${team.length})`}>
            <ul className="divide-y divide-divider">
              {team.map(m => {
                const locked = m.level === "super" || m.id === staff.id || (m.level === "owner" && !staff.isSuper);
                return (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link href={`/users/${m.id}`} className="block truncate text-[15px] font-semibold text-ink hover:underline">{m.name || m.email}</Link>
                      <p className="truncate text-caption text-text-tertiary">{m.email} · active {relative(m.lastSeenAt).toLowerCase()}</p>
                    </div>
                    {locked ? (
                      <Pill tone="olive">{m.level === "super" ? "Super admin" : cap(m.level)}</Pill>
                    ) : (
                      <SelectAction
                        url={`/api/admin/users/${m.id}`}
                        action="setStaffRole"
                        field="staffRole"
                        label={`Access for ${m.email}`}
                        value={m.staffRole ?? "none"}
                        options={[
                          ...(staff.isSuper ? [{ value: "owner", label: "Owner" }] : []),
                          { value: "admin", label: "Admin" },
                          { value: "moderator", label: "Moderator" },
                          { value: "none", label: "Remove access" },
                        ]}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
            {missingSupers.length > 0 && (
              <p className="mt-3 text-caption text-text-tertiary">
                Not signed up yet (super admin once they are): {missingSupers.join(", ")}
              </p>
            )}
          </Section>
        </div>
        <Section title="Access levels">
          <dl className="space-y-4 text-label">
            {ROLE_HELP.map(([k, v]) => (
              <div key={k}>
                <dt className="font-semibold text-ink">{k}</dt>
                <dd className="mt-0.5 text-text-secondary">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>
    </>
  );
}
