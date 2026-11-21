// Turns stored measurement sets into display rows: grouped by body area
// (from the template), converted to the business's unit, with deltas.

import type { MeasurementSet, MeasurementTemplate, UnitSystem } from "@/types";
import type { MeasurementRow } from "@/components/ui/measurement";
import { formatDelta, formatMeasurement, measurementDelta, unitLabel } from "./format";

type FieldInfo = { group: string; sortOrder: number };

export function fieldInfoFor(templates: MeasurementTemplate[], templateId: string): Record<string, FieldInfo> {
  const t = templates.find(x => x.id === templateId);
  const map: Record<string, FieldInfo> = {};
  t?.fields.forEach(f => {
    map[f.key] = { group: f.group, sortOrder: f.sortOrder };
  });
  return map;
}

export function buildRows(
  set: MeasurementSet,
  unit: UnitSystem,
  info: Record<string, FieldInfo>,
  previous?: MeasurementSet | null
): MeasurementRow[] {
  const u = unitLabel(unit);
  return [...set.values]
    .sort((a, b) => (info[a.fieldKey]?.sortOrder ?? 999) - (info[b.fieldKey]?.sortOrder ?? 999))
    .map(v => {
      const prev = previous?.values.find(p => p.fieldKey === v.fieldKey);
      const d = prev ? measurementDelta(v.valueMm, prev.valueMm, unit) : 0;
      return {
        key: v.fieldKey,
        label: v.labelSnapshot,
        group: info[v.fieldKey]?.group,
        value: formatMeasurement(v.valueMm, unit),
        unit: u,
        delta: d !== 0 ? { label: formatDelta(d, unit), direction: d > 0 ? ("up" as const) : ("down" as const) } : undefined,
      };
    });
}

/** Plain-text card used for copy / WhatsApp sharing. */
export function shareText(opts: {
  businessName?: string;
  clientName: string;
  set: MeasurementSet;
  unit: UnitSystem;
  dateLabel: string;
}) {
  const u = unitLabel(opts.unit);
  const lines = opts.set.values.map(v => `${v.labelSnapshot}: ${formatMeasurement(v.valueMm, opts.unit)} ${u}`);
  return [
    `*${opts.clientName} — ${opts.set.templateName} measurements*`,
    `Taken by ${opts.businessName?.trim() || "your tailor"} on ${opts.dateLabel}`,
    "",
    ...lines,
    "",
    "_Measured and recorded with Tayylo_",
  ].join("\n");
}
