"use client";

// Measurement presentation. Values are always tabular, right-aligned,
// with the unit set smaller and muted so the number reads first.

import * as React from "react";
import { cn } from "@/lib/utils";
import { DeltaChip } from "./tag";
import { MeasurementIcon } from "@/components/brand/measurement-icon";

// ------------------------------------------------------- Hero value

interface MeasurementDisplayProps {
  fieldName: string;
  value: string;
  unit: string;
  previousValue?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const MeasurementDisplay: React.FC<MeasurementDisplayProps> = ({ fieldName, value, unit, previousValue, size = "lg", className }) => {
  const valueSize = { sm: "text-[36px]", md: "text-[48px]", lg: "text-[64px]" }[size];
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <span className="text-overline uppercase text-text-tertiary">{fieldName}</span>
      <div className="mt-2 flex items-baseline gap-2" aria-live="polite">
        <span className={cn("measurement-value font-semibold leading-none text-ink", valueSize, !value && "text-border-strong")}>
          {value || "0"}
        </span>
        <span className="text-[17px] font-medium text-text-tertiary">{unit}</span>
      </div>
      {previousValue && (
        <span className="mt-3 text-label text-text-tertiary">
          Last time <span className="tabular font-semibold text-text-secondary">{previousValue} {unit}</span>
        </span>
      )}
    </div>
  );
};
MeasurementDisplay.displayName = "MeasurementDisplay";

// ------------------------------------------------------- Grid cell

interface MeasurementCellProps {
  label: string;
  /** Template field key; shows the body-part illustration. */
  fieldKey?: string;
  value: string;
  unit: string;
  delta?: { label: string; direction: "up" | "down" };
  active?: boolean;
  empty?: boolean;
  onClick?: () => void;
  className?: string;
}

/** Compact tile used in grids (capture overview). */
const MeasurementCell: React.FC<MeasurementCellProps> = ({ label, fieldKey, value, unit, delta, active, empty, onClick, className }) => {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1.5 bg-surface p-4 text-left",
        onClick && "transition-colors hover:bg-beige-light/60",
        active && "bg-olive-soft hover:bg-olive-soft",
        className
      )}
    >
      <span className="flex items-center gap-1.5">
        {fieldKey !== undefined && <MeasurementIcon fieldKey={fieldKey} label={label} size={22} />}
        <span className="truncate text-caption font-medium text-text-tertiary">{label}</span>
      </span>
      <div className="flex items-baseline gap-1">
        <span className={cn("measurement-value text-[22px] font-semibold leading-none", empty ? "text-border-strong" : "text-ink")}>
          {empty ? "—" : value}
        </span>
        {!empty && <span className="text-caption font-medium text-text-tertiary">{unit}</span>}
        {delta && <DeltaChip className="ml-auto" label={delta.label} direction={delta.direction} />}
      </div>
    </Comp>
  );
};
MeasurementCell.displayName = "MeasurementCell";

/** Container that draws hairlines between MeasurementCells. */
function MeasurementGrid({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-border/70 bg-divider sm:grid-cols-3",
        className
      )}
      {...props}
    />
  );
}

// ------------------------------------------------------- Spec sheet

export interface MeasurementRow {
  key: string;
  label: string;
  group?: string;
  value: string;
  unit: string;
  delta?: { label: string; direction: "up" | "down" };
  /** Secondary value (e.g. older version in a comparison). */
  compare?: string;
}

/**
 * Spec-sheet layout: rows grouped by body area, label on the left,
 * aligned value on the right. Reads like a tailor's measurement card.
 */
function MeasurementSheet({
  rows,
  className,
  compareLabel,
  templateName,
  icons = true,
}: {
  rows: MeasurementRow[];
  className?: string;
  compareLabel?: string;
  templateName?: string;
  /** Show the body-part illustration beside each label. */
  icons?: boolean;
}) {
  const groups = React.useMemo(() => {
    const map = new Map<string, MeasurementRow[]>();
    for (const r of rows) {
      const g = r.group || "Measurements";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(r);
    }
    return Array.from(map.entries());
  }, [rows]);

  const showGroupTitles = groups.length > 1;

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 md:items-start", className)}>
      {groups.map(([group, items]) => (
        <div key={group} className="overflow-hidden rounded-[var(--radius-card)] border border-border/70 bg-surface">
          {showGroupTitles && (
            <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
              <span className="text-overline uppercase text-text-tertiary">{group}</span>
              {compareLabel && <span className="text-overline uppercase text-text-tertiary">{compareLabel}</span>}
            </div>
          )}
          <dl className="divide-y divide-divider">
            {items.map(r => (
              <div key={r.key} className="flex items-center gap-3 px-4 py-2.5">
                {icons && <MeasurementIcon fieldKey={r.key} label={r.label} templateName={templateName} size={30} tile />}
                <dt className="min-w-0 flex-1 truncate text-[15px] text-text-secondary">{r.label}</dt>
                {r.delta && <DeltaChip label={r.delta.label} direction={r.delta.direction} />}
                {r.compare !== undefined && (
                  <span className="measurement-value w-16 text-right text-label text-text-tertiary">{r.compare}</span>
                )}
                <dd className="flex w-20 items-baseline justify-end gap-1">
                  <span className="measurement-value text-[17px] font-semibold text-ink">{r.value}</span>
                  <span className="text-caption font-medium text-text-tertiary">{r.unit}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

export { MeasurementDisplay, MeasurementCell, MeasurementGrid, MeasurementSheet };
