"use client";

import React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/choice";
import { Select, Textarea } from "@/components/ui/input";
import { Tag } from "@/components/ui/tag";
import { orderRepo } from "@/lib/data/store";
import { unitLabel } from "@/lib/format";
import type { FittingAdjustment, UnitSystem } from "@/types";

const FALLBACK_FIELDS = ["Waist", "Trouser length", "Chest", "Sleeve length", "Shoulder", "Hips", "Neck", "Crotch rise"];

const IMPERIAL_DELTAS = [-1, -0.75, -0.5, -0.25, 0.25, 0.5, 0.75, 1];
const METRIC_DELTAS = [-3, -2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 3];

function deltaText(v: number, unit: UnitSystem) {
  const sign = v > 0 ? "+" : "−";
  const abs = Math.abs(v);
  if (unit === "metric") return `${sign}${abs} cm`;
  const whole = Math.floor(abs);
  const frac = abs - whole;
  const f = frac === 0.25 ? "¼" : frac === 0.5 ? "½" : frac === 0.75 ? "¾" : "";
  return `${sign}${whole > 0 ? whole : ""}${f || (whole === 0 ? "0" : "")} in`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  fittingNumber: number;
  unit: UnitSystem;
  /** Labels from the client's measurement set, when one is linked. */
  fieldOptions?: { key: string; label: string }[];
  onRecorded: () => void | Promise<void>;
}

export function RecordFittingDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>{props.open && <FittingForm {...props} />}</DialogContent>
    </Dialog>
  );
}

function FittingForm({ onOpenChange, orderId, fittingNumber, unit, fieldOptions, onRecorded }: Props) {
  const fields = fieldOptions?.length ? fieldOptions : FALLBACK_FIELDS.map(l => ({ key: l.toLowerCase().replace(/\s/g, "_"), label: l }));
  const deltas = unit === "metric" ? METRIC_DELTAS : IMPERIAL_DELTAS;

  const [outcome, setOutcome] = React.useState<"approved" | "adjustments_needed">("adjustments_needed");
  const [fieldKey, setFieldKey] = React.useState(fields[0].key);
  const [delta, setDelta] = React.useState<number>(unit === "metric" ? -1 : -0.5);
  const [adjustments, setAdjustments] = React.useState<FittingAdjustment[]>([]);
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const add = () => {
    const field = fields.find(f => f.key === fieldKey);
    if (!field) return;
    const deltaMm = unit === "metric" ? delta * 10 : delta * 25.4;
    setAdjustments(prev => [
      ...prev.filter(a => a.fieldKey !== field.key),
      { fieldKey: field.key, label: field.label, deltaMm: Math.round(deltaMm * 10) / 10, rawDelta: deltaText(delta, unit) },
    ]);
  };

  const save = async () => {
    setSaving(true);
    try {
      await orderRepo.addFitting(orderId, {
        outcome,
        adjustments: outcome === "approved" ? [] : adjustments,
        notes: notes.trim() || undefined,
      });
      await onRecorded();
      toast.success(`Fitting ${fittingNumber} recorded`);
      onOpenChange(false);
    } catch {
      toast.error("Couldn't save this fitting");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
        <DialogHeader>
          <DialogTitle>Fitting {fittingNumber}</DialogTitle>
          <DialogDescription>Record how the garment fitted and any changes to make.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <SegmentedControl
            ariaLabel="Fitting outcome"
            block
            value={outcome}
            onChange={setOutcome}
            options={[
              { value: "adjustments_needed", label: "Needs adjustments" },
              { value: "approved", label: "Approved" },
            ]}
          />

          {outcome === "adjustments_needed" && (
            <div className="rounded-[var(--radius-card)] bg-surface-sunken/60 p-4">
              <p className="mb-3 text-label font-semibold text-ink">Adjustments</p>
              <div className="flex gap-2">
                <Select
                  aria-label="Measurement"
                  containerClassName="flex-1 min-w-0"
                  value={fieldKey}
                  onChange={e => setFieldKey(e.target.value)}
                >
                  {fields.map(f => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </Select>
                <Select
                  aria-label={`Change in ${unitLabel(unit)}`}
                  containerClassName="w-[112px] shrink-0"
                  className="tabular"
                  value={String(delta)}
                  onChange={e => setDelta(parseFloat(e.target.value))}
                >
                  {deltas.map(d => (
                    <option key={d} value={d}>
                      {deltaText(d, unit)}
                    </option>
                  ))}
                </Select>
                <Button variant="secondary" size="icon" type="button" onClick={add} aria-label="Add adjustment" className="h-12 w-12">
                  <Plus />
                </Button>
              </div>
              {adjustments.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {adjustments.map(a => (
                    <Tag
                      key={a.fieldKey}
                      variant="olive"
                      className="tabular"
                      removable
                      onRemove={() => setAdjustments(prev => prev.filter(x => x.fieldKey !== a.fieldKey))}
                    >
                      {a.label} {a.rawDelta}
                    </Tag>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-caption text-text-tertiary">Pick a measurement and change, then add it.</p>
              )}
            </div>
          )}

          <Textarea
            label="Notes"
            hint="Optional"
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Taper trouser from the knee. Client happy with the shoulder."
          />
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            Save fitting
          </Button>
        </DialogFooter>
    </>
  );
}
