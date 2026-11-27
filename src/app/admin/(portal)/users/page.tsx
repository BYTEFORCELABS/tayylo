import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaffPage } from "@/lib/admin/auth";
import { FilterTabs, PageHeader, Pill, cap, relative, shortDate } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Users" };

const PAGE = 50;
const FILTERS = [
  { key: "all", label: "All" },
  { key: "tailor", label: "Tailors" },
  { key: "customer", label: "Customers" },
  { key: "suspended", label: "Suspended" },
  { key: "staff", label: "Staff" },
];
const SORTS = [
  { key: "new", label: "Newest" },
  { key: "active", label: "Recently active" },
];

type Params = { q?: string; filter?: string; sort?: string; page?: string };

export default async function UsersPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireStaffPage();
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const filter = FILTERS.some(f => f.key === sp.filter) ? sp.filter! : "all";
  const sort = sp.sort === "active" ? "active" : "new";
  const page = Math.max(1, parseInt(sp.page ?? "1") || 1);

  const where: Prisma.UserWhereInput = {
    ...(filter === "tailor" || filter === "customer" ? { role: filter } : {}),
    ...(filter === "suspended" ? { suspendedAt: { not: null } } : {}),
    ...(filter === "staff" ? { staffRole: { not: null } } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { business: { name: { contains: q, mode: "insensitive" } } },
            { business: { ownerName: { contains: q, mode: "insensitive" } } },
            ...(/^[0-9a-f-]{36}$/i.test(q) ? [{ id: q }] : []),
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: sort === "active" ? [{ lastSeenAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }] : [{ createdAt: "desc" }],
      skip: (page - 1) * PAGE,
      take: PAGE,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        staffRole: true,
        suspendedAt: true,
        createdAt: true,
        lastSeenAt: true,
        lastSeenClient: true,
        business: { select: { name: true, country: true, _count: { select: { customers: true, orders: true } } } },
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (patch: Partial<Params>) => {
    const p = new URLSearchParams();
    const merged = { q, filter, sort, page: "1", ...patch };
    Object.entries(merged).forEach(([k, v]) => v && !(k === "page" && v === "1") && !(k === "filter" && v === "all") && !(k === "sort" && v === "new") && p.set(k, v));
    const s = p.toString();
    return `/users${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Users" description={`${total.toLocaleString()} ${total === 1 ? "account" : "accounts"}${q ? ` matching “${q}”` : ""}`} />

      <form method="get" className="mb-4 flex gap-2" role="search">
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        {sort !== "new" && <input type="hidden" name="sort" value={sort} />}
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" aria-hidden />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search email, name or studio"
            aria-label="Search users"
            className="h-11 w-full rounded-full border border-border bg-surface-raised pl-11 pr-4 text-[15px] focus:border-olive focus:outline-none focus:ring-4 focus:ring-olive/12"
          />
        </div>
        <button className="h-11 rounded-full bg-olive px-5 text-sm font-semibold text-text-inverse hover:bg-olive-deep">Search</button>
      </form>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs options={FILTERS} value={filter} hrefFor={k => href({ filter: k })} />
        <FilterTabs options={SORTS} value={sort} hrefFor={k => href({ sort: k })} />
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border/70 bg-surface">
        <table className="w-full min-w-[760px] text-left text-label">
          <thead className="border-b border-divider text-caption uppercase tracking-wide text-text-tertiary">
            <tr>
              <th className="px-5 py-3 font-semibold">Account</th>
              <th className="px-3 py-3 font-semibold">Type</th>
              <th className="px-3 py-3 font-semibold">Studio</th>
              <th className="px-3 py-3 font-semibold">Joined</th>
              <th className="px-3 py-3 font-semibold">Last active</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-beige-light/50">
                <td className="max-w-[260px] px-5 py-3">
                  <Link href={`/users/${u.id}`} className="block">
                    <span className="block truncate font-semibold text-ink hover:underline">{u.name || u.business?.name || u.email}</span>
                    <span className="block truncate text-caption text-text-tertiary">{u.email}</span>
                  </Link>
                </td>
                <td className="px-3 py-3">
                  <span className="capitalize text-text-secondary">{u.role}</span>
                  {u.staffRole && <span className="ml-1.5"><Pill tone="olive">{cap(u.staffRole)}</Pill></span>}
                </td>
                <td className="px-3 py-3 text-text-secondary">
                  {u.business ? (
                    <>
                      <span className="block truncate">{u.business.name}</span>
                      <span className="text-caption text-text-tertiary">
                        {u.business._count.customers} clients · {u.business._count.orders} orders
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-3 text-text-secondary tabular">{shortDate(u.createdAt)}</td>
                <td className="px-3 py-3 text-text-secondary">
                  {relative(u.lastSeenAt)}
                  {u.lastSeenClient && <span className="block text-caption text-text-tertiary">{u.lastSeenClient === "app" ? "Mobile app" : "Web"}</span>}
                </td>
                <td className="px-5 py-3">{u.suspendedAt ? <Pill tone="danger">Suspended</Pill> : <Pill tone="success">Active</Pill>}</td>
              </tr>
            ))}
            {!users.length && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-text-tertiary">No accounts match.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-label" aria-label="Pages">
          <span className="text-text-tertiary">Page {page} of {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link className="rounded-full border border-border px-4 py-2 font-semibold" href={href({ page: String(page - 1) })}>Previous</Link>}
            {page < pages && <Link className="rounded-full border border-border px-4 py-2 font-semibold" href={href({ page: String(page + 1) })}>Next</Link>}
          </div>
        </nav>
      )}
    </>
  );
}
