"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Ruler, Share2, RotateCcw, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/choice";
import { List, ListItem, IconTile } from "@/components/ui/list";
import { MeasurementSheet, type MeasurementRow } from "@/components/ui/measurement";
import { EmptyState } from "@/components/ui/states";
import { Tag } from "@/components/ui/tag";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { measurementRepo } from "@/lib/data/store";
import { formatDate, formatDelta, formatMeasurement, measurementDelta, unitLabel } from "@/lib/format";
import { buildRows, fieldInfoFor } from "@/lib/measurements";
import type { MeasurementSet, MeasurementTemplate, UnitSystem } from "@/types";

interface Props {
  clientId: string;
  measurements: MeasurementSet[];
  templates: MeasurementTemplate[];
  unit: UnitSystem;
  onChanged: (sets: MeasurementSet[]) => void;
  onShare: () => void;
}

export function MeasurementsTab({ clientId, measurements, templates, unit, onChanged, onShare }: Props) {
  const router = useRouter();
  const [view, setView] = React.useState<"current" | "history">("current");
  const [compareSet, setCompareSet] = React.useState<MeasurementSet | null>(null);
  const [restoring, setRestoring] = React.useState(false);

  const current = measurements[0];
  const previous = measurements.find((m, i) => i > 0 && m.templateId === current?.templateId);

  if (!current) {
    return (
      <EmptyState
        variant="inset"
        icon={<Ruler />}
        title="No measurements yet"
        description="Use the tape keypad to capture a full set in about a minute."
        action={
          <Button onClick={() => router.push(`/measure?clientId=${clientId}`)}>
            <Ruler />
            Record measurements
          </Button>
        }
      />
    );
  }

  const rows = buildRows(current, unit, fieldInfoFor(templates, current.templateId), previous);

  const handleRestore = async (id: string) => {
    setRestoring(true);
    try {
      const restored = await measurementRepo.restoreVersion(id);
      if (restored) {
        onChanged(await measurementRepo.listByCustomer(clientId));
        setCompareSet(null);
        setView("current");
        toast.success("Restored as the current set");
      }
    } catch {
      toast.error("Couldn't restore this version");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <SegmentedControl
          ariaLabel="Measurement view"
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { value: "current", label: "Current" },
            { value: "history", label: `History · ${measurements.length}` },
          ]}
        />
        <Button variant="ghost" size="sm" onClick={onShare}>
          <Share2 />
          Share
        </Button>
      </div>

      {view === "current" ? (
        <div className="animate-fade-in">
          <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 px-1">
            <h3 className="text-headline text-ink">{current.templateName}</h3>
            <span className="text-label text-text-tertiary">
              {formatDate(current.takenAt)} · {current.values.length} measurements · {unitLabel(unit)}
            </span>
            {current.note && <p className="w-full text-label text-text-secondary">“{current.note}”</p>}
          </div>
          <MeasurementSheet rows={rows} templateName={current.templateName} />
          {previous && (
            <p className="mt-3 px-1 text-caption text-text-tertiary">
              Changes are compared with the {current.templateName.toLowerCase()} set from {formatDate(previous.takenAt)}.
            </p>
          )}
        </div>
      ) : (
        <List className="animate-fade-in">
          {measurements.map((ms, idx) => (
            <ListItem
              key={ms.id}
              onClick={() => setCompareSet(ms)}
              leading={
                <IconTile tone={idx === 0 ? "olive" : "neutral"}>
                  <Ruler />
                </IconTile>
              }
              title={
                <span className="flex items-center gap-2">
                  {ms.templateName}
                  {idx === 0 && (
                    <Tag size="sm" variant="olive">
                      Current
                    </Tag>
                  )}
                  {ms.source === "restored" && (
                    <Tag size="sm" variant="default">
                      Restored
                    </Tag>
                  )}
                </span>
              }
              subtitle={`${formatDate(ms.takenAt)}${ms.note ? ` · ${ms.note}` : ""}`}
              trailing={<ChevronRight size={18} strokeWidth={1.75} className="text-text-tertiary" />}
            />
          ))}
        </List>
      )}

      <CompareDialog
        set={compareSet}
        current={current}
        unit={unit}
        templates={templates}
        restoring={restoring}
        onClose={() => setCompareSet(null)}
        onRestore={handleRestore}
      />
    </div>
  );
}

function CompareDialog({
  set,
  current,
  unit,
  templates,
  restoring,
  onClose,
  onRestore,
}: {
  set: MeasurementSet | null;
  current: MeasurementSet;
  unit: UnitSystem;
  templates: MeasurementTemplate[];
  restoring: boolean;
  onClose: () => void;
  onRestore: (id: string) => void;
}) {
  const isCurrent = set?.id === current.id;
  const info = set ? fieldInfoFor(templates, set.templateId) : {};
  const u = unitLabel(unit);

  // Rows show the selected version's value, with the current value for comparison.
  const rows: MeasurementRow[] = (set?.values ?? []).map(v => {
    const cur = current.values.find(c => c.fieldKey === v.fieldKey);
    const d = cur && !isCurrent ? measurementDelta(cur.valueMm, v.valueMm, unit) : 0;
    return {
      key: v.fieldKey,
      label: v.labelSnapshot,
      group: info[v.fieldKey]?.group,
      value: formatMeasurement(v.valueMm, unit),
      unit: u,
      compare: isCurrent ? undefined : cur ? formatMeasurement(cur.valueMm, unit) : "—",
      delta: d !== 0 ? { label: formatDelta(d, unit), direction: d > 0 ? ("up" as const) : ("down" as const) } : undefined,
    };
  });

  return (
    <Dialog open={!!set} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {set?.templateName} · {set ? formatDate(set.takenAt) : ""}
          </DialogTitle>
          <DialogDescription>
            {isCurrent
              ? "This is the current set."
              : "This version on the right, today's current value in grey. Changes show how the current set differs."}
          </DialogDescription>
        </DialogHeader>
        <MeasurementSheet rows={rows} templateName={set?.templateName} compareLabel={isCurrent ? undefined : "Now"} className="md:grid-cols-1" />
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {set && !isCurrent && (
            <Button onClick={() => onRestore(set.id)} loading={restoring}>
              <RotateCcw />
              Restore as current
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
