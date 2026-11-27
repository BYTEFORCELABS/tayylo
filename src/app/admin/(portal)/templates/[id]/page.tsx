import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { atLeast, requireStaffPage } from "@/lib/admin/auth";
import { templateCategories } from "@/lib/admin/template-categories";
import { PageHeader, Pill } from "@/components/admin/ui";
import { TemplateEditor } from "@/components/admin/template-editor";
import { ActionButton } from "@/components/admin/action-button";

export const metadata: Metadata = { title: "Template" };

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaffPage();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const t = await prisma.measurementTemplate.findFirst({ where: { id, businessId: null }, include: { fields: { orderBy: { sortOrder: "asc" } } } });
  if (!t) notFound();
  const uses = await prisma.measurementSet.count({ where: { templateId: id } });
  const canEdit = atLeast(staff.staffRole, "admin");
  const api = `/api/admin/templates/${id}`;

  return (
    <>
      <Link href="/templates" className="mb-4 inline-flex items-center gap-1.5 text-label font-semibold !text-text-secondary hover:!text-ink">
        <ArrowLeft size={16} aria-hidden /> Templates
      </Link>
      <PageHeader
        title={t.name}
        description={`${t.category} · version ${t.version} · used ${uses.toLocaleString()} times`}
        actions={
          canEdit ? (
            <div className="flex flex-wrap items-center gap-2">
              {t.archivedAt ? <Pill>Archived</Pill> : (
                <Link href={`/campaigns/new?template=${t.id}`} className="rounded-full bg-olive px-4 py-2 text-[13px] font-semibold !text-text-inverse hover:bg-olive-deep">Announce it</Link>
              )}
              <ActionButton url={api} method="PATCH" body={{ archived: !t.archivedAt }} success={t.archivedAt ? "Template restored" : "Template archived"}
                confirm={t.archivedAt ? undefined : { title: `Archive ${t.name}?`, description: "Tailors won't be offered it for new measurements. Measurements already taken with it stay as they are.", action: "Archive" }}>
                {t.archivedAt ? "Restore" : "Archive"}
              </ActionButton>
            </div>
          ) : undefined
        }
      />
      {canEdit ? (
        <div className="max-w-4xl">
          <p className="mb-4 text-label text-text-tertiary">Edits apply to new measurements. Saved measurements keep their own labels and values.</p>
          <TemplateEditor
            key={t.version}
            initial={{ id: t.id, name: t.name, category: t.category, fields: t.fields.map(f => ({ key: f.key, label: f.label, group: f.group, minMm: f.minMm, maxMm: f.maxMm })) }}
            categories={await templateCategories()}
          />
        </div>
      ) : (
        <ul className="max-w-xl divide-y divide-divider rounded-[var(--radius-card)] border border-border/70 bg-surface px-5">
          {t.fields.map(f => <li key={f.id} className="py-2.5 text-label text-ink">{f.label} <span className="text-text-tertiary">· {f.group}</span></li>)}
        </ul>
      )}
    </>
  );
}
