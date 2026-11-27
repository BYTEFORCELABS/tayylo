import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaffPage } from "@/lib/admin/auth";
import { HIDE_AFTER_REPORTS } from "@/lib/explore-moderation";
import { FilterTabs, PageHeader, Pill, relative } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/action-button";

export const metadata: Metadata = { title: "Moderation" };

const VIEWS = [
  { key: "reported", label: "Reported" },
  { key: "hidden", label: "Hidden" },
  { key: "all", label: "All posts" },
];
const PAGE = 30;

type Params = { view?: string; q?: string; post?: string; page?: string };

export default async function ModerationPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireStaffPage();
  const sp = await searchParams;
  const view = VIEWS.some(v => v.key === sp.view) ? sp.view! : "reported";
  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1") || 1);
  const single = sp.post && /^[0-9a-f-]{36}$/i.test(sp.post) ? sp.post : null;

  const where: Prisma.StylePostWhereInput = single
    ? { id: single }
    : {
        ...(view === "reported" ? { reports: { some: {} } } : {}),
        ...(view === "hidden" ? { hiddenAt: { not: null } } : {}),
        ...(q
          ? {
              OR: [
                { caption: { contains: q, mode: "insensitive" } },
                { authorName: { contains: q, mode: "insensitive" } },
                { author: { email: { contains: q, mode: "insensitive" } } },
                { tags: { has: q.toLowerCase() } },
              ],
            }
          : {}),
      };

  const [total, posts, counts] = await Promise.all([
    prisma.stylePost.count({ where }),
    prisma.stylePost.findMany({
      where,
      orderBy: view === "reported" && !single ? [{ reports: { _count: "desc" } }, { createdAt: "desc" }] : [{ createdAt: "desc" }],
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: {
        author: { select: { id: true, email: true, suspendedAt: true } },
        reports: { orderBy: { createdAt: "desc" }, include: { reporter: { select: { email: true } } } },
        _count: { select: { saves: true } },
      },
    }),
    Promise.all([
      prisma.stylePost.count({ where: { reports: { some: {} } } }),
      prisma.stylePost.count({ where: { hiddenAt: { not: null } } }),
    ]),
  ]);
  const [reportedCount, hiddenCount] = counts;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const link = (patch: Partial<Params>) => {
    const p = new URLSearchParams();
    Object.entries({ view, q, ...patch }).forEach(([k, v]) => v && !(k === "view" && v === "reported") && p.set(k, v));
    const s = p.toString();
    return `/moderation${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Moderation"
        description={`Explore posts people reported. ${HIDE_AFTER_REPORTS} reports hide a post from everyone automatically until you review it. Apple expects reports to be handled within 24 hours.`}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          options={VIEWS.map(v => ({ ...v, label: v.key === "reported" ? `Reported (${reportedCount})` : v.key === "hidden" ? `Hidden (${hiddenCount})` : v.label }))}
          value={single ? "" : view}
          hrefFor={k => link({ view: k, q: "" })}
        />
        <form method="get" className="relative sm:w-72" role="search">
          {view !== "reported" && <input type="hidden" name="view" value={view} />}
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" aria-hidden />
          <input
            name="q"
            defaultValue={q}
            placeholder="Caption, studio, email or tag"
            aria-label="Search posts"
            className="h-10 w-full rounded-full border border-border bg-surface-raised pl-10 pr-4 text-[14px] focus:border-olive focus:outline-none"
          />
        </form>
      </div>

      {single && (
        <p className="mb-4 text-label text-text-secondary">
          Showing one post. <Link href={link({ post: undefined })} className="font-semibold !text-olive">Back to the list</Link>
        </p>
      )}

      {posts.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-border/70 bg-surface px-6 py-16 text-center">
          <p className="text-headline text-ink">{view === "reported" ? "All clear" : "Nothing here"}</p>
          <p className="mt-1 text-label text-text-tertiary">{view === "reported" ? "No reported posts are waiting for review." : "No posts match."}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {posts.map(p => {
            const api = `/api/admin/posts/${p.id}`;
            const reasons = Object.entries(
              p.reports.reduce<Record<string, number>>((acc, r) => ((acc[r.reason] = (acc[r.reason] ?? 0) + 1), acc), {}),
            ).sort((a, b) => b[1] - a[1]);
            return (
              <article key={p.id} className="flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-border/70 bg-surface sm:flex-row">
                <a href={p.imageUrl} target="_blank" rel="noreferrer" className="relative block aspect-square shrink-0 bg-surface-sunken sm:w-48">
                  {/* eslint-disable-next-line @next/next/no-img-element -- user uploads on Blob, not optimised */}
                  <img src={p.imageUrl} alt={p.caption || `${p.category} post`} className="size-full object-cover" loading="lazy" />
                </a>
                <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {p.hiddenAt ? <Pill tone="danger">Hidden</Pill> : <Pill tone="success">Live</Pill>}
                    {p.reports.length > 0 && <Pill tone="warning">{p.reports.length} {p.reports.length === 1 ? "report" : "reports"}</Pill>}
                    {p.author.suspendedAt && <Pill tone="danger">Author suspended</Pill>}
                  </div>
                  <div>
                    <Link href={`/users/${p.author.id}`} className="block truncate text-[15px] font-semibold text-ink hover:underline">{p.authorName}</Link>
                    <p className="truncate text-caption text-text-tertiary">{p.author.email}</p>
                    <p className="mt-1 text-caption text-text-tertiary">
                      {p.category} · {p.country} · {relative(p.createdAt)} · {p._count.saves} {p._count.saves === 1 ? "save" : "saves"}
                    </p>
                    {p.caption && <p className="mt-2 line-clamp-3 text-label text-text-secondary">{p.caption}</p>}
                  </div>
                  {p.reports.length > 0 && (
                    <details className="rounded-[var(--radius-control)] bg-surface-sunken/60 px-3 py-2 text-caption">
                      <summary className="cursor-pointer font-semibold text-ink">
                        {reasons.map(([r, n]) => `${r}${n > 1 ? ` ×${n}` : ""}`).join(", ")}
                      </summary>
                      <ul className="mt-2 space-y-2">
                        {p.reports.map(r => (
                          <li key={r.id}>
                            <span className="font-semibold capitalize text-ink">{r.reason}</span>
                            {r.details && <span className="text-text-secondary"> — {r.details}</span>}
                            <span className="block text-text-tertiary">{r.reporter.email} · {relative(r.createdAt)}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  <div className="mt-auto flex flex-wrap gap-2">
                    {p.hiddenAt ? (
                      <ActionButton url={api} method="PATCH" body={{ action: "restore" }} success="Post restored" variant="secondary">
                        Restore
                      </ActionButton>
                    ) : (
                      <ActionButton url={api} method="PATCH" body={{ action: "hide" }} success="Post hidden" variant="secondary">
                        Hide
                      </ActionButton>
                    )}
                    {p.reports.length > 0 && !p.hiddenAt && (
                      <ActionButton url={api} method="PATCH" body={{ action: "dismiss" }} success="Reports dismissed" variant="ghost">
                        Dismiss reports
                      </ActionButton>
                    )}
                    <ActionButton
                      url={api}
                      method="DELETE"
                      success="Post removed"
                      variant="destructive"
                      confirm={{ title: "Remove this post?", description: `It's deleted from Explore for everyone, including ${p.authorName}. This can't be undone.`, action: "Remove post", destructive: true }}
                    >
                      Remove
                    </ActionButton>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {pages > 1 && !single && (
        <nav className="mt-4 flex items-center justify-between text-label" aria-label="Pages">
          <span className="text-text-tertiary">Page {page} of {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link className="rounded-full border border-border px-4 py-2 font-semibold" href={link({ page: String(page - 1) })}>Previous</Link>}
            {page < pages && <Link className="rounded-full border border-border px-4 py-2 font-semibold" href={link({ page: String(page + 1) })}>Next</Link>}
          </div>
        </nav>
      )}
    </>
  );
}
