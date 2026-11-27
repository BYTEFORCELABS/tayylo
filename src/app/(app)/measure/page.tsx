"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, Check, AlertTriangle, ClipboardList, User, Ruler } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { Keypad } from "@/components/ui/keypad";
import { MeasurementCell, MeasurementGrid } from "@/components/ui/measurement";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/choice";
import { List, ListItem } from "@/components/ui/list";
import { PageBody, PageHeader } from "@/components/ui/page";
import { BrandLoader } from "@/components/brand/brand-loader";
import { SuccessMark } from "@/components/brand/success-mark";
import { EmptyState, ListSkeleton } from "@/components/ui/states";
import { DeltaChip } from "@/components/ui/tag";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClientPicker } from "@/components/client-picker";
import { customerRepo, measurementRepo } from "@/lib/data/store";
import { getQueryData } from "@/lib/query";
import { qk, useCustomers, useTemplates } from "@/lib/queries";
import { useBusiness } from "@/lib/use-business";
import { GarmentIcon } from "@/components/brand/garment-icon";
import { MeasurementFigure, MeasurementIcon, measurementMethod } from "@/components/brand/measurement-icon";
import { inferBodySex } from "@/lib/measurement-art";
import { formatDate, formatDelta, formatMeasurement, measurementDelta, parseMeasurement, unitLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Customer, MeasurementTemplate, MeasurementSet } from "@/types";

type Step = "client" | "template" | "capture" | "review";

const draftKey = (clientId: string, templateId: string) => `tayylo_draft_${clientId}_${templateId}`;

function MeasurePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClientId = searchParams.get("clientId") || "";
  const initialTemplateParam = searchParams.get("template") || "";
  const { unit } = useBusiness();
  const u = unitLabel(unit);

  const [step, setStep] = React.useState<Step>(initialClientId ? "template" : "client");
  const [client, setClient] = React.useState<Customer | null>(null);
  const clientsQ = useCustomers();
  const templatesQ = useTemplates();
  const clients = clientsQ.data ?? [];
  const clientsLoading = !clientsQ.data;
  // Templates retired from the admin portal aren't offered for new measurements.
  const templates = React.useMemo(() => (templatesQ.data ?? []).filter(t => !t.archivedAt), [templatesQ.data]);
  const templatesLoading = !templatesQ.data;
  const [category, setCategory] = React.useState("All");
  const [template, setTemplate] = React.useState<MeasurementTemplate | null>(null);
  const [previousSet, setPreviousSet] = React.useState<MeasurementSet | null>(null);
  const [fieldIndex, setFieldIndex] = React.useState(0);
  // Which way the measurement card slides: forward (next) or back (previous).
  const [slideDir, setSlideDir] = React.useState(1);
  const [lastFieldIndex, setLastFieldIndex] = React.useState(0);
  if (fieldIndex !== lastFieldIndex) {
    setSlideDir(fieldIndex > lastFieldIndex ? 1 : -1);
    setLastFieldIndex(fieldIndex);
  }
  const reduceMotion = useReducedMotion();
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [gridMode, setGridMode] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [savedSet, setSavedSet] = React.useState<MeasurementSet | null>(null);

  // A template passed in the URL is applied once templates are available.
  const [appliedTemplateParam, setAppliedTemplateParam] = React.useState(false);
  if (!appliedTemplateParam && initialTemplateParam && templatesQ.data) {
    setAppliedTemplateParam(true);
    const found = templatesQ.data.find(
      t => t.id === initialTemplateParam || t.name.toLowerCase().includes(initialTemplateParam.toLowerCase().replace("tpl-", ""))
    );
    if (found) setTemplate(found);
  }

  React.useEffect(() => {
    if (!initialClientId) return;
    // Use the cached client instantly when we have it; otherwise fetch.
    const cached = getQueryData<Customer[]>(qk.customers)?.find(c => c.id === initialClientId);
    const lookup = cached ? Promise.resolve(cached) : customerRepo.getById(initialClientId);
    lookup.then(c => {
      if (c) setClient(c);
      else setStep("client");
    });
  }, [initialClientId, initialTemplateParam]);

  const fields = React.useMemo(
    () => [...(template?.fields ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [template]
  );
  const currentField = fields[fieldIndex];
  const bodySex = React.useMemo(() => inferBodySex(fields.map(f => f.key), template?.name), [fields, template]);
  const currentValue = currentField ? values[currentField.key] || "" : "";
  const recordedCount = fields.filter(f => values[f.key]).length;

  const setCurrentValue = (v: string) => {
      if (!currentField || !client || !template) return;
      setValues(prev => {
        const next = { ...prev, [currentField.key]: v };
        try {
          localStorage.setItem(draftKey(client.id, template.id), JSON.stringify(next));
        } catch {}
        return next;
      });
    };

  const selectTemplate = async (tpl: MeasurementTemplate, forClient?: Customer) => {
    const c = forClient || client;
    if (!c) return;
    setTemplate(tpl);

    let draft: Record<string, string> = {};
    try {
      const raw = localStorage.getItem(draftKey(c.id, tpl.id));
      if (raw) draft = JSON.parse(raw);
    } catch {}

    const prev = await measurementRepo.getLatest(c.id, tpl.id).catch(() => null);
    setPreviousSet(prev);

    if (Object.keys(draft).length > 0) {
      setValues(draft);
      toast("Picked up your unsaved draft");
    } else if (prev) {
      const prefilled: Record<string, string> = {};
      prev.values.forEach(v => {
        prefilled[v.fieldKey] = formatMeasurement(v.valueMm, unit);
      });
      setValues(prefilled);
    } else {
      setValues({});
    }
    setFieldIndex(0);
    setGridMode(false);
    setStep("capture");
  };

  const selectClient = (c: Customer) => {
    setClient(c);
    if (template) selectTemplate(template, c);
    else setStep("template");
  };

  const next = () => {
    if (fieldIndex < fields.length - 1) setFieldIndex(i => i + 1);
    else setStep("review");
  };
  const prev = () => setFieldIndex(i => Math.max(0, i - 1));

  // Physical keyboard support while capturing. The listener is attached once
  // per capture session and always calls the latest handler via a ref.
  const onKeyRef = React.useRef<(e: KeyboardEvent) => void>(() => {});
  React.useEffect(() => {
    onKeyRef.current = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (e.shiftKey) prev();
        else next();
      } else if (e.key === "Backspace") {
        setCurrentValue(currentValue.slice(0, -1));
      } else if (/^\d$/.test(e.key)) {
        if (!/[¼½¾]/.test(currentValue)) setCurrentValue(currentValue + e.key);
      } else if (e.key === ".") {
        if (!currentValue.includes(".") && !/[¼½¾]/.test(currentValue)) setCurrentValue(currentValue + ".");
      }
    };
  });
  React.useEffect(() => {
    if (step !== "capture" || gridMode) return;
    const onKey = (e: KeyboardEvent) => onKeyRef.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, gridMode]);

  const previousValue = (key: string) => {
    const v = previousSet?.values.find(x => x.fieldKey === key);
    return v ? formatMeasurement(v.valueMm, unit) : undefined;
  };

  const warningFor = (key: string, raw: string) => {
    if (!raw || !template) return undefined;
    const f = template.fields.find(x => x.key === key);
    if (!f?.minMm || !f?.maxMm) return undefined;
    const mm = parseMeasurement(raw, unit);
    if (mm >= f.minMm && mm <= f.maxMm) return undefined;
    const p = previousValue(key);
    return p ? `Far from last time (${p} ${u}). Double-check the tape.` : "Outside the usual range. Double-check the tape.";
  };

  const deltaFor = (key: string, raw: string) => {
    const p = previousSet?.values.find(x => x.fieldKey === key);
    if (!p || !raw) return undefined;
    const d = measurementDelta(parseMeasurement(raw, unit), p.valueMm, unit);
    return d === 0 ? undefined : { label: formatDelta(d, unit), direction: d > 0 ? ("up" as const) : ("down" as const) };
  };

  const save = async () => {
    if (!template || !client) return;
    setSaving(true);
    try {
      const created = await measurementRepo.createVersion({
        customerId: client.id,
        templateId: template.id,
        templateName: template.name,
        source: "manual",
        supersedesId: previousSet?.id,
        note: note.trim() || undefined,
        values: fields
          .filter(f => values[f.key])
          .map(f => ({
            fieldKey: f.key,
            labelSnapshot: f.label,
            valueMm: parseMeasurement(values[f.key], unit),
            rawInput: values[f.key],
          })),
      });
      try {
        localStorage.removeItem(draftKey(client.id, template.id));
      } catch {}
      try {
        navigator.vibrate?.(15);
      } catch {}
      setSavedSet(created);
    } catch {
      toast.error("Couldn't save. Your values are kept as a draft on this device.");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================ STEP: client
  if (step === "client") {
    return (
      <>
        <PageHeader
          variant="compact"
          eyebrow="Record measurements · Step 1 of 3"
          title="Who are you measuring?"
          back={true}
          width="md"
        />
        <PageBody width="md" className="pb-10">
          <ClientPicker
            clients={clients}
            loading={clientsLoading}
            onSelect={selectClient}
            onAddNew={() => router.push("/clients?add=true")}
          />
        </PageBody>
      </>
    );
  }

  // ========================================================== STEP: template
  if (step === "template") {
    const categories = ["All", ...Array.from(new Set(templates.map(t => t.category)))];
    const shown = templates.filter(t => category === "All" || t.category === category);
    return (
      <>
        <PageHeader
          variant="compact"
          eyebrow="Record measurements · Step 2 of 3"
          title="Choose a template"
          back={initialClientId ? true : undefined}
          onBack={initialClientId ? undefined : () => setStep("client")}
          backLabel={initialClientId ? "Back" : "Change client"}
          width="sm"
        />
        <PageBody width="sm" className="pb-10">
          {client && (
            <div className="mb-5 flex items-center gap-3 rounded-[var(--radius-card)] bg-surface px-4 py-3 border border-border/70">
              <Avatar name={client.fullName} src={client.photoUrl} size="sm" />
              <p className="min-w-0 flex-1 truncate text-label text-text-secondary">
                Measuring <span className="font-semibold text-ink">{client.fullName}</span>
              </p>
            </div>
          )}
          {categories.length > 2 && (
            <SegmentedControl
              ariaLabel="Template category"
              block
              className="mb-5"
              value={category}
              onChange={setCategory}
              options={categories.map(c => ({ value: c, label: c }))}
            />
          )}
          {templatesLoading ? (
            <ListSkeleton count={6} />
          ) : shown.length === 0 ? (
            <EmptyState variant="inset" icon={<Ruler />} title="No templates available" description="Measurement templates couldn't be found for your workspace." />
          ) : (
            <List>
              {shown.map(t => {
                const groups = Array.from(new Set(t.fields.map(f => f.group))).slice(0, 3).join(", ");
                return (
                  <ListItem
                    key={t.id}
                    onClick={() => selectTemplate(t)}
                    leading={
                      <span className="flex size-12 items-center justify-center rounded-[var(--radius-sm)] bg-surface-sunken text-ink">
                        <GarmentIcon garment={t.name} size={32} label="" />
                      </span>
                    }
                    title={t.name}
                    subtitle={`${t.fields.length} measurements · ${groups}`}
                    chevron
                  />
                );
              })}
            </List>
          )}
        </PageBody>
      </>
    );
  }

  // ============================================================ STEP: review
  if (step === "review") {
    return (
      <>
        <PageHeader
          variant="compact"
          eyebrow="Record measurements · Step 3 of 3"
          title="Review and save"
          width="sm"
          backLabel="Back to capture"
          onBack={() => {
            setStep("capture");
            setFieldIndex(fields.length - 1);
          }}
        />
        <PageBody width="sm" className="pb-40">
          <div className="mb-4 px-1">
            <p className="text-label text-text-secondary">
              <span className="font-semibold text-ink">{template?.name}</span> for {client?.fullName} ·{" "}
              <span className="tabular">
                {recordedCount} of {fields.length}
              </span>{" "}
              recorded
            </p>
          </div>

          <List>
            {fields.map((f, i) => {
              const v = values[f.key];
              const delta = deltaFor(f.key, v || "");
              return (
                <ListItem
                  key={f.key}
                  onClick={() => {
                    setFieldIndex(i);
                    setStep("capture");
                  }}
                  leading={<MeasurementIcon fieldKey={f.key} label={f.label} templateName={template?.name} size={30} tile />}
                  title={<span className="font-medium text-text-secondary">{f.label}</span>}
                  subtitle={f.group}
                  trailing={
                    <span className="flex items-center gap-2">
                      {delta && <DeltaChip label={delta.label} direction={delta.direction} />}
                      <span className={cn("measurement-value text-[17px] font-semibold", v ? "text-ink" : "text-border-strong")}>
                        {v || "—"}
                      </span>
                      {v && <span className="text-caption font-medium text-text-tertiary">{u}</span>}
                    </span>
                  }
                />
              );
            })}
          </List>

          <Input
            containerClassName="mt-6"
            label="Version note"
            hint="Optional"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Added 1 in ease for wedding agbada"
          />
        </PageBody>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-canvas/90 backdrop-blur-xl lg:pl-64">
          <div className="mx-auto flex max-w-xl gap-2.5 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-6">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                setStep("capture");
                setFieldIndex(0);
              }}
            >
              Edit
            </Button>
            <Button size="lg" className="flex-1" onClick={save} loading={saving} disabled={recordedCount === 0}>
              <Check />
              Save measurements
            </Button>
          </div>
        </div>

        <Dialog
          open={!!savedSet}
          onOpenChange={open => {
            if (!open && client) router.push(`/clients/${client.id}`);
          }}
        >
          <DialogContent hideClose>
            <DialogHeader className="items-center pr-0 text-center">
              <SuccessMark size={72} className="mb-3" label="Saved" />
              <DialogTitle>Measurements saved</DialogTitle>
              <DialogDescription>
                {template?.name} for {client?.fullName} is saved as a dated version
                {savedSet ? ` (${formatDate(savedSet.takenAt)})` : ""}. Earlier versions are kept.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:flex-col-reverse sm:items-stretch">
              <Button variant="secondary" onClick={() => client && router.push(`/clients/${client.id}`)}>
                <User />
                View client
              </Button>
              <Button onClick={() => client && router.push(`/orders/new?clientId=${client.id}`)}>
                <ClipboardList />
                Create an order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // =========================================================== STEP: capture
  const warning = currentField ? warningFor(currentField.key, currentValue) : undefined;
  const prevVal = currentField ? previousValue(currentField.key) : undefined;
  const nextField = fields[fieldIndex + 1];
  const method = currentField ? measurementMethod({ key: currentField.key, label: currentField.label, templateName: template?.name }) : undefined;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <PageHeader
        variant="compact"
        width="sm"
        eyebrow={client?.fullName}
        title={template?.name ?? "Measurements"}
        onBack={() => setStep("template")}
        backLabel="Back to templates"
        actions={
          <Button
            variant={gridMode ? "primary" : "secondary"}
            size="icon"
            onClick={() => setGridMode(g => !g)}
            aria-pressed={gridMode}
            aria-label={gridMode ? "Back to one-at-a-time" : "See all measurements"}
          >
            <LayoutGrid />
          </Button>
        }
      >
        {/* Progress — one segment per measurement point */}
        <div className="pb-3" aria-hidden>
          <div className="flex h-1 gap-[3px]">
            {fields.map((f, i) => (
              <span
                key={f.key}
                className={cn(
                  "h-full flex-1 rounded-full transition-colors duration-[var(--duration-normal)]",
                  i === fieldIndex ? "bg-ink" : values[f.key] ? "bg-olive" : "bg-surface-sunken"
                )}
              />
            ))}
          </div>
        </div>
      </PageHeader>

      {gridMode ? (
        <div className="mx-auto w-full max-w-xl flex-1 px-4 pb-10 pt-2 sm:px-6 animate-fade-in">
          <p className="mb-3 text-label text-text-tertiary">
            <span className="tabular">{recordedCount}</span> of {fields.length} recorded · tap any to edit
          </p>
          <MeasurementGrid>
            {fields.map((f, i) => (
              <MeasurementCell
                key={f.key}
                label={f.label}
                fieldKey={f.key}
                value={values[f.key] || ""}
                empty={!values[f.key]}
                unit={u}
                active={i === fieldIndex}
                delta={deltaFor(f.key, values[f.key] || "")}
                onClick={() => {
                  setFieldIndex(i);
                  setGridMode(false);
                }}
              />
            ))}
          </MeasurementGrid>
          <Button block size="lg" className="mt-6" onClick={() => setStep("review")}>
            Review and save
          </Button>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 sm:px-6">
          {/* Field in focus — slides to the next body part (or back) */}
          <div className="relative flex flex-1 flex-col justify-center overflow-hidden py-4">
            <AnimatePresence mode="popLayout" initial={false} custom={slideDir}>
              <motion.div
                key={currentField?.key}
                custom={slideDir}
                variants={reduceMotion ? fadeOnly : slideCard}
                initial="enter"
                animate="center"
                exit="exit"
              >
            <div className="flex items-center gap-4 sm:gap-6">
              <motion.div custom={slideDir} variants={reduceMotion ? undefined : figureIn} className="shrink-0">
              <MeasurementFigure
                fieldKey={currentField?.key}
                label={currentField?.label}
                templateName={template?.name}
                sex={bodySex}
                height={196}
                className="shrink-0 rounded-[var(--radius-card)] bg-surface px-3 pt-3 pb-2 border border-border/70"
              />
              </motion.div>
              <motion.div custom={slideDir} variants={reduceMotion ? undefined : detailsIn} className="flex min-w-0 flex-1 flex-col items-start">
                <span className="rounded-full bg-surface-sunken px-3 py-1 text-overline uppercase text-text-secondary">
                  {currentField?.group} · {fieldIndex + 1}/{fields.length}
                </span>
                <h1 className="mt-3 text-title text-ink">{currentField?.label}</h1>

                <div className="mt-2 flex items-baseline gap-2" aria-live="polite" aria-label={`${currentValue || 0} ${u}`}>
                  <motion.span
                    key={currentValue || "empty"}
                    initial={reduceMotion || !currentValue ? false : { scale: 0.9, y: 4 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 600, damping: 26 }}
                    className={cn(
                      "measurement-value origin-bottom-left text-[60px] font-semibold leading-none sm:text-[76px]",
                      currentValue ? "text-ink" : "text-border-strong"
                    )}
                  >
                    {currentValue || "0"}
                  </motion.span>
                  <span className="text-[18px] font-medium text-text-tertiary">{u}</span>
                </div>

                {prevVal && (
                  <p className="mt-2 text-label text-text-tertiary">
                    Last time <span className="tabular font-semibold text-text-secondary">{prevVal} {u}</span>
                    {previousSet && <> · {formatDate(previousSet.takenAt, { year: false })}</>}
                  </p>
                )}
              </motion.div>
            </div>

            <div className="mt-3 flex min-h-7 flex-col items-center gap-2 text-center">
              {method && <p className="line-clamp-2 max-w-md text-caption text-text-tertiary">{method}</p>}
              {warning && (
                <p role="alert" className="inline-flex items-center gap-1.5 rounded-full bg-warning-bg px-3 py-1.5 text-caption font-semibold text-warning animate-rise-in">
                  <AlertTriangle size={14} strokeWidth={2} />
                  {warning}
                </p>
              )}
            </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="pb-[max(16px,env(safe-area-inset-bottom))]">
            <Keypad
              value={currentValue}
              onChange={setCurrentValue}
              onNext={next}
              onPrevious={prev}
              onSkip={next}
              showPrevious={fieldIndex > 0}
              nextLabel={nextField ? `Next · ${nextField.label}` : "Review"}
              unit={unit}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function MeasurePage() {
  return (
    <Suspense fallback={<BrandLoader label="Opening measurements" />}>
      <MeasurePageInner />
    </Suspense>
  );
}

// ---------------------------------------------------- measurement slides

const slideSpring = { type: "spring" as const, stiffness: 320, damping: 32, mass: 0.9 };

/** The whole card glides in from the side you're heading towards. */
const slideCard: Variants = {
  enter: (dir: number) => ({ x: dir * 72, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { ...slideSpring, staggerChildren: 0.05 } },
  exit: (dir: number) => ({ x: dir * -72, opacity: 0, transition: { duration: 0.16, ease: "easeIn" } }),
};

/** The body figure turns in slightly behind the card for depth. */
const figureIn: Variants = {
  enter: (dir: number) => ({ x: dir * 28, scale: 0.94, rotate: dir * 2 }),
  center: { x: 0, scale: 1, rotate: 0, transition: slideSpring },
  exit: { scale: 0.97 },
};

/** Name and value follow a beat later. */
const detailsIn: Variants = {
  enter: (dir: number) => ({ x: dir * 44, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { ...slideSpring, delay: 0.04 } },
  exit: { opacity: 0 },
};

const fadeOnly: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};
