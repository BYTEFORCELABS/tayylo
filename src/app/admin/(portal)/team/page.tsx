import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaffPage } from "@/lib/admin/auth";
import { PageHeader, Pill, Section, cap, relative } from "@/components/admin/ui";
import { SelectAction } from "@/components/admin/action-button";
import { AddStaffForm } from "@/components/admin/team-form";

export const metadata: Metadata = { title: "Team" };

const ROLE_HELP = [
  ["Owner", "Everything, including managing the team. Owners are added with the grant-admin script."],
  ["Admin", "Users (suspend, change type, reset password, delete), moderation and app controls."],
  ["Moderator", "Moderation, and read-only access to users, insights and settings."],
];

export default async function TeamPage() {
  const staff = await requireStaffPage("owner");
  const team = await prisma.user.findMany({
    where: { staffRole: { not: null } },
    orderBy: [{ staffRole: "asc" }, { email: "asc" }],
    select: { id: true, email: true, name: true, staffRole: true, lastSeenAt: true },
  });

  return (
    <>
      <PageHeader title="Team" description="Who can sign in to the admin portal, and what they can do." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="Add someone" description="They need a Tayylo account first, and sign in here with its email and password.">
            <AddStaffForm />
          </Section>
          <Section title={`Staff (${team.length})`}>
            <ul className="divide-y divide-divider">
              {team.map(m => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/users/${m.id}`} className="block truncate text-[15px] font-semibold text-ink hover:underline">{m.name || m.email}</Link>
                    <p className="truncate text-caption text-text-tertiary">{m.email} · active {relative(m.lastSeenAt).toLowerCase()}</p>
                  </div>
                  {m.staffRole === "owner" || m.id === staff.id ? (
                    <Pill tone="olive">{cap(m.staffRole ?? "")}</Pill>
                  ) : (
                    <SelectAction
                      url={`/api/admin/users/${m.id}`}
                      action="setStaffRole"
                      field="staffRole"
                      label={`Access for ${m.email}`}
                      value={m.staffRole ?? "none"}
                      options={[{ value: "moderator", label: "Moderator" }, { value: "admin", label: "Admin" }, { value: "none", label: "Remove access" }]}
                    />
                  )}
                </li>
              ))}
            </ul>
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
