"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminRequest } from "@/components/admin/request";
import { cn } from "@/lib/utils";

interface Field {
  key: string;
  label: string;
  group: string;
  minCm: string;
  maxCm: string;
}
export interface TemplateDraft {
  id?: string;
  name: string;
  category: string;
  fields: { key: string; label: string; group: string; minMm: number | null; maxMm: number | null }[];
}

const input =
  "w-full rounded-[var(--radius-input)] border border-border bg-surface-raised px-3 py-2 text-[14px] text-ink focus:border-olive focus:outline-none focus:ring-4 focus:ring-olive/12";
const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^(\d)/, "m_$1").slice(0, 40);
const cm = (mm: number | null) => (mm == null ? "" : String(mm / 10));
const mm = (cmText: string) => (cmText.trim() ? Math.round(parseFloat(cmText) * 10) : null);

export function TemplateEditor({ initial, categories }: { initial: TemplateDraft; categories: string[] }) {
  const router = useRouter();
  const [name, setName] = React.useState(initial.name);
  const [category, setCategory] = React.useState(initial.category);
  const [fields, setFields] = React.useState<Field[]>(
    initial.fields.length
      ? initial.fields.map(f => ({ key: f.key, label: f.label, group: f.group, minCm: cm(f.minMm), maxCm: cm(f.maxMm) }))
      : [{ key: "", label: "", group: "Body", minCm: "", maxCm: "" }]
  );
  const [busy, setBusy] = React.useState(false);
  const setField = (i: number, patch: Partial<Field>) => setFields(fs => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const move = (i: number, d: -1 | 1) =>
    setFields(fs => {
      const next = [...fs];
      const [x] = next.splice(i, 1);
      next.splice(i + d, 0, x);
      return next;
    });

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        name,
        category,
        fields: fields
          .filter(f => f.label.trim())
          .map(f => ({ key: f.key.trim() || slug(f.label), label: f.label.trim(), group: f.group.trim() || "Body", minMm: mm(f.minCm), maxMm: mm(f.maxCm) })),
      };
      if (initial.id) await adminRequest(`/api/admin/templates/${initial.id}`, "PATCH", body);
      else {
        const t = await adminRequest("/api/admin/templates", "POST", body);
        toast.success(`${name} is live for every tailor`, { action: { label: "Announce it", onClick: () => router.push(`/campaigns/new?template=${t.id}`) } });
        router.push(`/templates/${t.id}`);
        router.refresh();
        return;
      }
      toast.success("Template saved");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 rounded-[var(--radius-card)] border border-border/70 bg-surface p-5 sm:grid-cols-2 sm:p-6">
        <label className="text-label font-semibold text-ink">
          Name
          <input className={cn(input, "mt-2 py-2.5 text-[15px]")} value={name} maxLength={60} onChange={e => setName(e.target.value)} placeholder="e.g. Agbada" />
        </label>
        <label className="text-label font-semibold text-ink">
          Category
          <input className={cn(input, "mt-2 py-2.5 text-[15px]")} value={category} maxLength={40} list="template-categories" onChange={e => setCategory(e.target.value)} placeholder="e.g. Traditional" />
          <datalist id="template-categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
        </label>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border/70 bg-surface p-5 sm:p-6">
        <h2 className="text-headline text-ink">Measurements</h2>
        <p className="mb-4 mt-0.5 text-label text-text-tertiary">In the order tailors take them. The range (in cm) warns about likely typos; leave it blank for none.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-label">
            <thead className="text-caption uppercase tracking-wide text-text-tertiary">
              <tr>
                <th className="pb-2 pr-2 font-semibold">Label</th>
                <th className="pb-2 pr-2 font-semibold">Group</th>
                <th className="pb-2 pr-2 font-semibold">Min cm</th>
                <th className="pb-2 pr-2 font-semibold">Max cm</th>
                <th className="pb-2 font-semibold"><span className="sr-only">Order</span></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2">
                    <input className={input} value={f.label} placeholder="e.g. Chest" maxLength={40} aria-label={`Measurement ${i + 1} label`} onChange={e => setField(i, { label: e.target.value })} />
                  </td>
                  <td className="w-36 py-1 pr-2">
                    <input className={input} value={f.group} placeholder="Torso" maxLength={30} aria-label="Group" onChange={e => setField(i, { group: e.target.value })} />
                  </td>
                  <td className="w-24 py-1 pr-2">
                    <input className={cn(input, "tabular")} value={f.minCm} inputMode="decimal" aria-label="Minimum cm" onChange={e => setField(i, { minCm: e.target.value })} />
                  </td>
                  <td className="w-24 py-1 pr-2">
                    <input className={cn(input, "tabular")} value={f.maxCm} inputMode="decimal" aria-label="Maximum cm" onChange={e => setField(i, { maxCm: e.target.value })} />
                  </td>
                  <td className="w-28 py-1">
                    <div className="flex">
                      <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-full p-2 text-text-tertiary hover:bg-surface-sunken disabled:opacity-30" aria-label="Move up"><ArrowUp size={15} /></button>
                      <button type="button" disabled={i === fields.length - 1} onClick={() => move(i, 1)} className="rounded-full p-2 text-text-tertiary hover:bg-surface-sunken disabled:opacity-30" aria-label="Move down"><ArrowDown size={15} /></button>
                      <button type="button" disabled={fields.length === 1} onClick={() => setFields(fs => fs.filter((_, j) => j !== i))} className="rounded-full p-2 text-text-tertiary hover:bg-surface-sunken hover:text-danger disabled:opacity-30" aria-label="Remove"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={() => setFields(fs => [...fs, { key: "", label: "", group: fs.at(-1)?.group ?? "Body", minCm: "", maxCm: "" }])}
          className="mt-3 inline-flex items-center gap-1.5 text-label font-semibold text-olive"
        >
          <Plus size={16} /> Add a measurement
        </button>
      </section>

      <div className="flex justify-end">
        <Button onClick={save} loading={busy} disabled={!name.trim() || !category.trim()}>
          {initial.id ? "Save changes" : "Publish to every tailor"}
        </Button>
      </div>
    </div>
  );
}
