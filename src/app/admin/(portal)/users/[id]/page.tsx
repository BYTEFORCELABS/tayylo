import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { atLeast, outranks, requireStaffPage } from "@/lib/admin/auth";
import { PageHeader, Pill, Section, cap, dateTime, relative, shortDate } from "@/components/admin/ui";
import { ActionButton, SelectAction } from "@/components/admin/action-button";

export const metadata: Metadata = { title: "User" };

export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaffPage();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      identities: { select: { provider: true, email: true, linkedAt: true, lastSignInAt: true } },
      business: {
        include: { _count: { select: { customers: true, orders: true, measurementSets: true, media: true } } },
      },
      _count: { select: { stylePosts: true, postReports: true, blocking: true, blockedBy: true, savedPosts: true } },
    },
  });
  if (!user) notFound();

  const [posts, reportsAgainst, history, lastOrder] = await Promise.all([
    prisma.stylePost.findMany({
      where: { authorId: id },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, imageUrl: true, category: true, hiddenAt: true, _count: { select: { reports: true, saves: true } } },
    }),
    prisma.postReport.count({ where: { post: { authorId: id } } }),
    prisma.adminAuditLog.findMany({ where: { targetType: "user", targetId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
    user.business ? prisma.order.findFirst({ where: { businessId: user.business.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }) : null,
  ]);

  const self = staff.id === user.id;
  const canManage = !self && atLeast(staff.staffRole, "admin") && outranks(staff.staffRole, user.staffRole);
  const canTeam = !self && staff.staffRole === "owner" && user.staffRole !== "owner";
  const api = `/api/admin/users/${user.id}`;
  const signInMethods = [user.passwordHash ? "Email & password" : null, ...user.identities.map(i => (i.provider === "apple" ? "Apple" : "Google"))].filter(Boolean);

  return (
    <>
      <Link href="/users" className="mb-4 inline-flex items-center gap-1.5 text-label font-semibold !text-text-secondary hover:!text-ink">
        <ArrowLeft size={16} aria-hidden /> Users
      </Link>
      <PageHeader
        title={user.name || user.business?.name || user.email}
        description={user.email}
        actions={
          <div className="flex flex-wrap gap-2">
            {user.suspendedAt ? <Pill tone="danger">Suspended</Pill> : <Pill tone="success">Active</Pill>}
            <Pill>{cap(user.role)}</Pill>
            {user.staffRole && <Pill tone="olive">Staff · {cap(user.staffRole)}</Pill>}
          </div>
        }
      />

      {user.suspendedAt && (
        <div className="mb-6 rounded-[var(--radius-card)] bg-danger-bg px-5 py-4 text-label text-danger">
          <p className="font-semibold">Suspended {dateTime(user.suspendedAt)}</p>
          {user.suspendedReason && <p className="mt-1">Reason: {user.suspendedReason}</p>}
          <p className="mt-1 opacity-80">They can&rsquo;t sign in or use the apps, and their Explore posts are hidden.</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="Account">
            <dl className="grid gap-x-6 gap-y-4 text-label sm:grid-cols-2">
              <Item k="User ID" v={<code className="text-caption">{user.id}</code>} />
              <Item k="Joined" v={dateTime(user.createdAt)} />
              <Item k="Last active" v={`${relative(user.lastSeenAt)}${user.lastSeenClient ? ` · ${user.lastSeenClient === "app" ? "mobile app" : "web"}` : ""}`} />
              <Item k="Sign-in methods" v={signInMethods.join(", ") || "None"} />
              {user.identities.map(i => (
                <Item key={i.provider} k={`${i.provider === "apple" ? "Apple" : "Google"} account`} v={`${i.email ?? "no email"} · last used ${relative(i.lastSignInAt)}`} />
              ))}
            </dl>
          </Section>

          {user.business && (
            <Section title="Studio" description={user.business.name}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Mini k="Clients" v={user.business._count.customers} />
                <Mini k="Orders" v={user.business._count.orders} />
                <Mini k="Measurements" v={user.business._count.measurementSets} />
                <Mini k="Photos" v={user.business._count.media} />
              </div>
              <dl className="mt-5 grid gap-x-6 gap-y-4 text-label sm:grid-cols-2">
                <Item k="Owner name" v={user.business.ownerName || "—"} />
                <Item k="Country" v={user.business.country || "—"} />
                <Item k="Currency · units" v={`${user.business.currency} · ${user.business.unitSystem}`} />
                <Item k="Last order" v={lastOrder ? relative(lastOrder.createdAt) : "None yet"} />
                <Item k="Studio created" v={shortDate(user.business.createdAt)} />
              </dl>
              <p className="mt-4 text-caption text-text-tertiary">Client details, measurements and invoices stay private to the studio and aren&rsquo;t shown here.</p>
            </Section>
          )}

          <Section
            title="Explore"
            description={`${user._count.stylePosts} posts · ${reportsAgainst} reports received · ${user._count.postReports} reports filed · blocked by ${user._count.blockedBy}`}
          >
            {posts.length ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {posts.map(p => (
                  <Link key={p.id} href={`/moderation?view=all&post=${p.id}`} className="group relative aspect-square overflow-hidden rounded-[var(--radius-sm)] bg-surface-sunken">
                    {/* eslint-disable-next-line @next/next/no-img-element -- user uploads on Blob, not optimised */}
                    <img src={p.imageUrl} alt={p.category} className="size-full object-cover" loading="lazy" />
                    {(p.hiddenAt || p._count.reports > 0) && (
                      <span className="absolute left-1 top-1 rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">
                        {p.hiddenAt ? "Hidden" : `${p._count.reports} reports`}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-label text-text-tertiary">No posts.</p>
            )}
          </Section>

          <Section title="Admin history" description="Actions staff have taken on this account">
            {history.length ? (
              <ul className="space-y-3 text-label">
                {history.map(h => (
                  <li key={h.id}>
                    <p className="text-ink">{h.summary}</p>
                    <p className="text-caption text-text-tertiary">{h.actorEmail} · {dateTime(h.createdAt)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-label text-text-tertiary">Nothing yet.</p>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Actions">
            {self ? (
              <p className="text-label text-text-tertiary">This is your own account.</p>
            ) : !canManage ? (
              <p className="text-label text-text-tertiary">
                {atLeast(staff.staffRole, "admin") ? "You can't change a staff member at or above your level." : "Moderators can view accounts. Ask an admin to change one."}
              </p>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-label font-semibold text-ink">Account type</p>
                  <SelectAction
                    url={api}
                    action="setRole"
                    field="role"
                    label="Account type"
                    value={user.role}
                    options={[{ value: "tailor", label: "Tailor (full workspace)" }, { value: "customer", label: "Customer (Explore only)" }]}
                  />
                </div>

                <div className="flex flex-col items-start gap-2">
                  {user.suspendedAt ? (
                    <ActionButton url={api} method="PATCH" body={{ action: "unsuspend" }} success="Suspension lifted" variant="primary"
                      confirm={{ title: "Lift the suspension?", description: "They'll be able to sign in again straight away, and their Explore posts come back.", action: "Lift suspension" }}>
                      Lift suspension
                    </ActionButton>
                  ) : (
                    <ActionButton url={api} method="PATCH" body={{ action: "suspend" }} success="Account suspended" variant="secondary"
                      confirm={{ title: `Suspend ${user.email}?`, description: "They're signed out of the web and mobile apps on their next request, can't sign back in, and their Explore posts are hidden. Nothing is deleted.", action: "Suspend", destructive: true }}
                      reason={{ label: "Reason (kept in the audit log)", placeholder: "e.g. Repeated spam on Explore" }}>
                      Suspend account
                    </ActionButton>
                  )}
                  <ActionButton url={`${api}/password-reset`} method="POST" success="Reset link sent" variant="secondary"
                    confirm={{ title: "Send a password reset link?", description: `We'll email ${user.email} a link to set a new password. It expires in an hour.`, action: "Send link" }}>
                    Send password reset
                  </ActionButton>
                </div>

                <div className="border-t border-divider pt-5">
                  <p className="mb-2 text-label font-semibold text-danger">Danger zone</p>
                  <ActionButton url={api} method="DELETE" success="Account deleted" variant="destructive" redirectTo="/users"
                    confirm={{
                      title: "Delete this account for good?",
                      description: `This permanently deletes ${user.email}${user.business ? `, the studio “${user.business.name}”, its clients, measurements and orders` : ""}, and their Explore posts. It can't be undone.`,
                      action: "Delete permanently",
                      destructive: true,
                    }}>
                    Delete account
                  </ActionButton>
                </div>
              </div>
            )}
          </Section>

          {canTeam && (
            <Section title="Admin access" description="Owners only">
              <SelectAction
                url={api}
                action="setStaffRole"
                field="staffRole"
                label="Admin access"
                value={user.staffRole ?? "none"}
                options={[{ value: "none", label: "No access" }, { value: "moderator", label: "Moderator" }, { value: "admin", label: "Admin" }]}
              />
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

function Item({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-text-tertiary">{k}</dt>
      <dd className="mt-0.5 break-words font-medium text-ink">{v}</dd>
    </div>
  );
}

function Mini({ k, v }: { k: string; v: number }) {
  return (
    <div className="rounded-[var(--radius-control)] bg-surface-sunken/60 px-4 py-3">
      <p className="text-caption text-text-tertiary">{k}</p>
      <p className="text-[20px] font-semibold text-ink tabular">{v.toLocaleString()}</p>
    </div>
  );
}
