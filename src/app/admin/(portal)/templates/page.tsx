import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { atLeast, requireStaffPage } from "@/lib/admin/auth";
import { PageHeader, Pill, shortDate } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Templates" };

export default async function TemplatesPage() {
  const staff = await requireStaffPage();
  const [templates, usage] = await Promise.all([
    prisma.measurementTemplate.findMany({
      where: { businessId: null },
      orderBy: [{ archivedAt: { sort: "asc", nulls: "first" } }, { category: "asc" }, { name: "asc" }],
      include: { _count: { select: { fields: true } } },
    }),
    prisma.measurementSet.groupBy({ by: ["templateId"], _count: { _all: true } }),
  ]);
  const used = (id: string) => usage.find(u => u.templateId === id)?._count._all ?? 0;
  const canEdit = atLeast(staff.staffRole, "admin");

  return (
    <>
      <PageHeader
        title="Measurement templates"
        description="The templates every tailor can pick in Record measurements. Add one, then announce it."
        actions={
          canEdit ? (
            <Link href="/templates/new" className="inline-flex items-center gap-2 rounded-full bg-olive px-5 py-2.5 text-sm font-semibold !text-text-inverse hover:bg-olive-deep">
              <Plus size={18} aria-hidden /> New template
            </Link>
          ) : undefined
        }
      />
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border/70 bg-surface">
        <table className="w-full min-w-[640px] text-left text-label">
          <thead className="border-b border-divider text-caption uppercase tracking-wide text-text-tertiary">
            <tr>
              <th className="px-5 py-3 font-semibold">Template</th>
              <th className="px-3 py-3 font-semibold">Category</th>
              <th className="px-3 py-3 font-semibold">Measurements</th>
              <th className="px-3 py-3 font-semibold">Times used</th>
              <th className="px-5 py-3 font-semibold"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {templates.map(t => (
              <tr key={t.id} className={t.archivedAt ? "opacity-60" : "hover:bg-beige-light/50"}>
                <td className="px-5 py-3">
                  <Link href={`/templates/${t.id}`} className="font-semibold text-ink hover:underline">{t.name}</Link>
                  {t.archivedAt && <span className="ml-2"><Pill>Archived {shortDate(t.archivedAt)}</Pill></span>}
                </td>
                <td className="px-3 py-3 text-text-secondary">{t.category}</td>
                <td className="px-3 py-3 text-text-secondary tabular">{t._count.fields}</td>
                <td className="px-3 py-3 text-text-secondary tabular">{used(t.id).toLocaleString()}</td>
                <td className="px-5 py-3 text-right">
                  {canEdit && !t.archivedAt && (
                    <Link href={`/campaigns/new?template=${t.id}`} className="text-label font-semibold !text-olive hover:underline">Announce</Link>
                  )}
                </td>
              </tr>
            ))}
            {!templates.length && (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-text-tertiary">No global templates yet. Run the seed or add one.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
