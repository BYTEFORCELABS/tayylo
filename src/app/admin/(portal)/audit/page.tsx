import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaffPage } from "@/lib/admin/auth";
import { FilterTabs, PageHeader, dateTime } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Audit log" };

const PAGE = 50;
const KINDS = [
  { key: "all", label: "All" },
  { key: "user", label: "Users" },
  { key: "post", label: "Posts" },
  { key: "settings", label: "Settings" },
  { key: "team", label: "Team" },
];

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ kind?: string; page?: string }> }) {
  await requireStaffPage();
  const sp = await searchParams;
  const kind = KINDS.some(k => k.key === sp.kind) ? sp.kind! : "all";
  const page = Math.max(1, parseInt(sp.page ?? "1") || 1);
  const where = kind === "all" ? {} : { action: { startsWith: `${kind}.` } };

  const [total, rows] = await Promise.all([
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (k: string, p = 1) => {
    const q = new URLSearchParams();
    if (k !== "all") q.set("kind", k);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return `/audit${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Audit log" description="Every change made from the admin portal. Entries can't be edited or deleted from here." />
      <div className="mb-5">
        <FilterTabs options={KINDS} value={kind} hrefFor={k => href(k)} />
      </div>
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-border/70 bg-surface">
        <ul className="divide-y divide-divider">
          {rows.map(r => (
            <li key={r.id} className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-label font-medium text-ink">
                  {r.targetType === "user" && r.targetId && r.action !== "user.delete" ? (
                    <Link href={`/users/${r.targetId}`} className="hover:underline">{r.summary}</Link>
                  ) : (
                    r.summary
                  )}
                </p>
                <p className="text-caption text-text-tertiary">
                  {r.actorEmail} · <code>{r.action}</code>
                  {r.meta && typeof r.meta === "object" && "reason" in r.meta ? ` · “${String((r.meta as { reason: unknown }).reason)}”` : ""}
                </p>
              </div>
              <time className="shrink-0 text-caption text-text-tertiary tabular" dateTime={r.createdAt.toISOString()}>{dateTime(r.createdAt)}</time>
            </li>
          ))}
          {!rows.length && <li className="px-5 py-12 text-center text-label text-text-tertiary">No admin actions yet.</li>}
        </ul>
      </div>
      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-label" aria-label="Pages">
          <span className="text-text-tertiary">Page {page} of {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link className="rounded-full border border-border px-4 py-2 font-semibold" href={href(kind, page - 1)}>Previous</Link>}
            {page < pages && <Link className="rounded-full border border-border px-4 py-2 font-semibold" href={href(kind, page + 1)}>Next</Link>}
          </div>
        </nav>
      )}
    </>
  );
}
