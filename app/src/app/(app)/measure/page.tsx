"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Grid3X3,
  X,
  Check,
  Search,
  Plus,
  User,
  Sparkles,
  AlertTriangle,
  Share2,
  Copy,
  ShoppingBag,
  ChevronRight,
  Shirt,
  Info,
} from "lucide-react";
import { Keypad } from "@/components/ui/keypad";
import { MeasurementCell } from "@/components/ui/measurement";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Tag } from "@/components/ui/tag";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { customerRepo, measurementRepo, templateRepo, businessRepo } from "@/lib/mock/store";
import { getGarmentImage } from "@/lib/mock/seed-data";
import type { Customer, MeasurementTemplate, MeasurementSet, Business } from "@/types";
import { toast } from "sonner";

function parseToMm(raw: string): number {
  let val = 0;
  const clean = raw.trim();
  if (clean.includes("¼")) {
    val = parseFloat(clean.replace("¼", "")) + 0.25;
  } else if (clean.includes("½")) {
    val = parseFloat(clean.replace("½", "")) + 0.5;
  } else if (clean.includes("¾")) {
    val = parseFloat(clean.replace("¾", "")) + 0.75;
  } else {
    val = parseFloat(clean) || 0;
  }
  return Math.round(val * 25.4);
}

function rawFromMm(mm: number): string {
  const inches = mm / 25.4;
  const whole = Math.floor(inches);
  const frac = inches - whole;
  if (frac < 0.125) return `${whole}`;
  if (frac < 0.375) return `${whole}¼`;
  if (frac < 0.625) return `${whole}½`;
  if (frac < 0.875) return `${whole}¾`;
  return `${whole + 1}`;
}

type MeasureStep = "client" | "template" | "capture" | "review";

function MeasurePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialClientId = searchParams.get("clientId") || "";
  const initialTemplateParam = searchParams.get("template") || "";

  const [step, setStep] = React.useState<MeasureStep>(initialClientId ? "template" : "client");
  const [business, setBusiness] = React.useState<Business | null>(null);
  const [client, setClient] = React.useState<Customer | null>(null);
  const [allClients, setAllClients] = React.useState<Customer[]>([]);
  const [clientSearch, setClientSearch] = React.useState("");

  const [templates, setTemplates] = React.useState<MeasurementTemplate[]>([]);
  const [templateCategory, setTemplateCategory] = React.useState<string>("All");
  const [template, setTemplate] = React.useState<MeasurementTemplate | null>(null);
  const [previousSet, setPreviousSet] = React.useState<MeasurementSet | null>(null);
  const [fieldIndex, setFieldIndex] = React.useState(0);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [gridMode, setGridMode] = React.useState(false);
  const [reviewNote, setReviewNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Success dialog after saving
  const [savedSet, setSavedSet] = React.useState<MeasurementSet | null>(null);

  // Load clients and templates
  React.useEffect(() => {
    businessRepo.get().then(setBusiness);
    templateRepo.list().then(tpls => {
      setTemplates(tpls);
      if (initialTemplateParam) {
        const found = tpls.find(
          t => t.id === initialTemplateParam || t.name.toLowerCase().includes(initialTemplateParam.toLowerCase().replace("tpl-", ""))
        );
        if (found) setTemplate(found);
      }
    });
    customerRepo.list().then(setAllClients);

    if (initialClientId) {
      customerRepo.getById(initialClientId).then(c => {
        if (c) {
          setClient(c);
          setStep("template");
        } else {
          setStep("client");
        }
      });
    }
  }, [initialClientId, initialTemplateParam]);

  // Draft auto-saving
  const getDraftKey = (cId: string, tId: string) => `tayylo_draft_${cId}_${tId}`;

  const fields = template?.fields || [];
  const currentField = fields[fieldIndex];
  const currentValue = currentField ? values[currentField.key] || "" : "";

  const setCurrentValue = (v: string) => {
    if (!currentField || !client || !template) return;
    setValues(prev => {
      const next = { ...prev, [currentField.key]: v };
      try {
        localStorage.setItem(getDraftKey(client.id, template.id), JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleSelectClient = (c: Customer) => {
    setClient(c);
    if (template) {
      // If template was already picked via URL query
      handleSelectTemplate(template, c);
    } else {
      setStep("template");
    }
  };

  const handleSelectTemplate = async (tpl: MeasurementTemplate, overrideClient?: Customer) => {
    const activeClient = overrideClient || client;
    if (!activeClient) return;
    setTemplate(tpl);

    // Check draft first
    let loadedValues: Record<string, string> = {};
    try {
      const draft = localStorage.getItem(getDraftKey(activeClient.id, tpl.id));
      if (draft) loadedValues = JSON.parse(draft);
    } catch {}

    // Get previous measurements
    const prev = await measurementRepo.getLatest(activeClient.id, tpl.id);
    setPreviousSet(prev);

    if (Object.keys(loadedValues).length > 0) {
      setValues(loadedValues);
      toast("Restored in-progress draft for this garment");
    } else if (prev) {
      // Pre-fill from previous
      const prefilled: Record<string, string> = {};
      prev.values.forEach(v => {
        prefilled[v.fieldKey] = rawFromMm(v.valueMm);
      });
      setValues(prefilled);
    } else {
      setValues({});
    }

    setStep("capture");
    setFieldIndex(0);
  };

  const handleNext = () => {
    if (fieldIndex < fields.length - 1) {
      setFieldIndex(fieldIndex + 1);
    } else {
      setStep("review");
    }
  };

  const handlePrevious = () => {
    if (fieldIndex > 0) setFieldIndex(fieldIndex - 1);
  };

  const handleSkip = () => handleNext();

  const handleSave = async () => {
    if (!template || !client) return;
    setSaving(true);
    const measurementValues = fields
      .filter(f => values[f.key])
      .map(f => ({
        fieldKey: f.key,
        labelSnapshot: f.label,
        valueMm: parseToMm(values[f.key]),
        rawInput: values[f.key],
      }));

    const created = await measurementRepo.createVersion({
      customerId: client.id,
      templateId: template.id,
      templateName: template.name,
      source: "manual",
      supersedesId: previousSet?.id,
      note: reviewNote || undefined,
      values: measurementValues,
    });

    // Clear draft
    try {
      localStorage.removeItem(getDraftKey(client.id, template.id));
    } catch {}

    // Haptic
    try { navigator.vibrate?.(15); } catch {}

    setSavedSet(created);
    setSaving(false);
  };

  // Keyboard navigation
  React.useEffect(() => {
    if (step !== "capture" || gridMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (e.shiftKey) handlePrevious();
        else handleNext();
      } else if (e.key === "Backspace") {
        setCurrentValue(currentValue.slice(0, -1));
      } else if (/^\d$/.test(e.key)) {
        setCurrentValue(currentValue + e.key);
      } else if (e.key === ".") {
        if (!currentValue.includes(".")) setCurrentValue(currentValue + ".");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step, gridMode, fieldIndex, currentValue]);

  const getPreviousValue = (fieldKey: string) => {
    if (!previousSet) return undefined;
    const v = previousSet.values.find(x => x.fieldKey === fieldKey);
    return v ? rawFromMm(v.valueMm) : undefined;
  };

  const getWarning = (fieldKey: string, raw: string) => {
    if (!raw || !template) return undefined;
    const field = template.fields.find(f => f.key === fieldKey);
    if (!field || !field.minMm || !field.maxMm) return undefined;
    const mm = parseToMm(raw);
    if (mm < field.minMm || mm > field.maxMm) {
      const prev = getPreviousValue(fieldKey);
      if (prev) return `Noticeably different from last time (${prev} in). Double check.`;
      return "Measurement seems outside expected range. Please verify.";
    }
    return undefined;
  };

  // Filter clients
  const filteredClients = clientSearch.trim()
    ? allClients.filter(c =>
        c.fullName.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.phones.some(p => p.includes(clientSearch))
      )
    : allClients.slice(0, 15);

  // Filter templates
  const filteredTemplates = templates.filter(t =>
    templateCategory === "All" ? true : t.category === templateCategory
  );

  // ============================================================
  // STEP 0: SELECT CLIENT (With real customer avatars)
  // ============================================================
  if (step === "client") {
    return (
      <div className="min-h-[100dvh] bg-cream max-w-xl mx-auto pb-16">
        <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm px-4 pt-safe">
          <div className="flex items-center gap-3 pt-6 mb-6">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-beige-light transition-colors"
            >
              <ArrowLeft size={20} strokeWidth={1.5} />
            </button>
            <div>
              <h1 className="font-serif text-2xl font-bold text-text-primary">Select Client</h1>
              <p className="text-xs text-text-secondary">Who are you measuring in the atelier today?</p>
            </div>
          </div>

          {/* Client Search */}
          <div className="relative mb-4">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" strokeWidth={1.5} />
            <input
              type="text"
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              placeholder="Search by client name or phone..."
              className="w-full h-11 pl-10 pr-4 rounded-full border border-border bg-white-warm text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-olive shadow-xs"
            />
          </div>
        </div>

        <div className="px-4">
        {/* Client List with Photo Avatars & VIP Badges */}
        <div className="space-y-2 mb-6">
          {filteredClients.map(c => (
            <div
              key={c.id}
              onClick={() => handleSelectClient(c)}
              className="flex items-center gap-3.5 p-3 rounded-[var(--radius-card)] bg-white-warm border border-border hover:border-olive/50 hover:bg-beige-light/30 cursor-pointer transition-all active:scale-[0.99] group shadow-xs"
            >
              <Avatar name={c.fullName} src={c.photoUrl} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-text-primary truncate">{c.fullName}</p>
                  {c.tags.includes("VIP") && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-olive/10 text-olive">
                      VIP
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary">{c.phones[0] || "No phone recorded"}</p>
              </div>
              <span className="text-xs text-olive font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Select <ChevronRight size={14} />
              </span>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => router.push("/clients?add=true")}
          >
            <Plus size={16} />
            Add new client first
          </Button>
        </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // STEP 1: TEMPLATE PICKER (With Rich Garment Photography)
  // ============================================================
  if (step === "template") {
    return (
      <div className="min-h-[100dvh] bg-cream max-w-2xl mx-auto pb-16">
        <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm px-4 pt-safe">
          <div className="flex items-center justify-between pt-6 mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => (initialClientId ? router.back() : setStep("client"))}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-beige-light transition-colors"
              >
                <ArrowLeft size={20} strokeWidth={1.5} />
              </button>
              <div>
                <h1 className="font-serif text-2xl font-bold text-text-primary">Select Garment Cut</h1>
                {client && (
                  <p className="text-xs text-text-secondary flex items-center gap-1.5 mt-0.5">
                    Measuring: <strong className="text-text-primary">{client.fullName}</strong>
                  </p>
                )}
              </div>
            </div>
            {client && (
              <button
                onClick={() => setStep("client")}
                className="text-xs text-olive font-semibold hover:underline"
              >
                Change client
              </button>
            )}
          </div>

          {/* Categories */}
          <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-none pb-1">
            {["All", "Western", "Traditional"].map(cat => (
              <button
                key={cat}
                onClick={() => setTemplateCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  templateCategory === cat
                    ? "bg-olive text-white-warm shadow-xs"
                    : "bg-white-warm text-text-secondary border border-border hover:bg-beige-light"
                }`}
              >
                {cat} ({templates.filter(t => cat === "All" || t.category === cat).length})
              </button>
            ))}
          </div>
        </div>

        <div className="px-4">
        {/* 15 Starter Templates Grid with Real Garment Photography */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pb-8">
          {filteredTemplates.map(t => {
            const garmentImg = getGarmentImage(t.id);
            return (
              <button
                key={t.id}
                onClick={() => handleSelectTemplate(t)}
                className="flex flex-col items-start rounded-[var(--radius-card)] bg-white-warm border border-border hover:border-olive hover:shadow-card transition-all text-left group overflow-hidden active:scale-[0.98] shadow-xs"
              >
                <div className="w-full h-32 bg-beige-light relative overflow-hidden">
                  <img
                    src={garmentImg}
                    alt={t.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/65 text-white-warm backdrop-blur-xs">
                    {t.category}
                  </span>
                  <span className="absolute bottom-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/75 text-white-warm backdrop-blur-xs">
                    {t.fields.length} pts
                  </span>
                </div>
                <div className="p-3 w-full">
                  <span className="text-sm font-bold text-text-primary block truncate group-hover:text-olive transition-colors">
                    {t.name}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    {t.fields.length} measurement points
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // STEP 2: REVIEW MEASUREMENTS
  // ============================================================
  if (step === "review") {
    return (
      <div className="min-h-[100dvh] bg-cream max-w-2xl mx-auto pb-16">
        <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm px-4 pt-safe">
          <div className="flex items-center gap-3 pt-6 mb-4">
            <button
              onClick={() => { setStep("capture"); setFieldIndex(fields.length - 1); }}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-beige-light transition-colors"
            >
              <ArrowLeft size={20} strokeWidth={1.5} />
            </button>
            <div>
              <h1 className="font-serif text-2xl font-bold text-text-primary">Review Measurements</h1>
              <p className="text-xs text-text-secondary">
                {client?.fullName} · {template?.name} · {fields.filter(f => values[f.key]).length} of {fields.length} recorded
              </p>
            </div>
          </div>
        </div>

        <div className="px-4">
        {/* Garment Header Card */}
        <div className="p-3 rounded-[var(--radius-card)] bg-white-warm border border-border flex items-center gap-3 mb-4 shadow-xs">
          <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-border">
            <img
              src={getGarmentImage(template?.id)}
              alt={template?.name || "Garment"}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">{template?.name} Bespoke Specification</h3>
            <p className="text-xs text-text-secondary">Client: {client?.fullName}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
          {fields.map(f => {
            const v = values[f.key] || "";
            const prev = getPreviousValue(f.key);
            const changed = prev && v && v !== prev;
            return (
              <MeasurementCell
                key={f.key}
                label={f.label}
                value={v || "—"}
                unit="in"
                highlighted={!!changed}
              />
            );
          })}
        </div>

        <div className="mb-6 bg-white-warm p-4 rounded-[var(--radius-card)] border border-border">
          <label className="block text-xs font-semibold text-text-primary mb-1">
            Version Note (Optional)
          </label>
          <input
            type="text"
            value={reviewNote}
            onChange={e => setReviewNote(e.target.value)}
            placeholder="e.g. Added 1 inch ease for wedding attire; fitted with dress shoes"
            className="w-full h-11 px-3 rounded-[var(--radius-input)] border border-border bg-white-warm text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-olive"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleSave}
            disabled={saving}
          >
            <Check size={16} />
            {saving ? "Saving..." : "Save measurements"}
          </Button>
          <Button
            variant="tertiary"
            className="w-full"
            onClick={() => { setStep("capture"); setFieldIndex(0); }}
          >
            Edit values
          </Button>
        </div>

        {/* Save Confirmation Dialog */}
        <Dialog open={!!savedSet} onOpenChange={open => { if (!open && client) router.push(`/clients/${client.id}`); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="w-12 h-12 rounded-full bg-success-bg text-success flex items-center justify-center mx-auto mb-2">
                <Check size={24} strokeWidth={2.5} />
              </div>
              <DialogTitle className="text-center font-serif text-xl">
                Measurements Recorded!
              </DialogTitle>
              <DialogDescription className="text-center text-xs">
                Successfully saved <strong>{template?.name}</strong> measurements for{" "}
                <strong>{client?.fullName}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="p-3 bg-beige-light/40 rounded-[var(--radius-card)] text-xs text-text-secondary space-y-1">
              <p>✓ Recorded at speed of a tape with tabular figures</p>
              <p>✓ Saved as a dated, versioned record</p>
              <p>✓ Available across orders and fitting sessions</p>
            </div>

            <DialogFooter className="flex-col gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  if (client) router.push(`/orders/new?clientId=${client.id}`);
                }}
              >
                <ShoppingBag size={16} />
                Create order for this client
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (client) router.push(`/clients/${client.id}`);
                }}
              >
                View client profile & share card
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    );
  }

  // ============================================================
  // STEP 3: CAPTURE WITH GARMENT VISUAL GUIDE & KEYPAD
  // ============================================================
  const warning = currentField ? getWarning(currentField.key, currentValue) : undefined;
  const prevVal = currentField ? getPreviousValue(currentField.key) : undefined;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-cream max-w-xl mx-auto">
      {/* Top Bar with Client Avatar Photo — fixed on scroll */}
      <div className="sticky top-0 z-20 bg-white-warm/95 backdrop-blur-xs">
        <div className="flex items-center justify-between px-4 pt-safe pt-3 pb-2 border-b border-border">
          <button
            onClick={() => setStep("template")}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-beige-light transition-colors"
          >
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>

          <div className="flex items-center gap-2.5">
            <Avatar name={client?.fullName || ""} src={client?.photoUrl} size="md" />
            <p className="text-xs text-text-tertiary">
              {template?.name} · {fieldIndex + 1}/{fields.length}
            </p>
          </div>

          <button
            onClick={() => setGridMode(!gridMode)}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
              gridMode ? "bg-olive text-white-warm" : "hover:bg-beige-light text-text-primary"
            }`}
            title="Toggle grid view"
          >
            <Grid3X3 size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-border">
          <div
            className="h-full bg-olive transition-all duration-200"
            style={{ width: `${((fieldIndex + 1) / fields.length) * 100}%` }}
          />
        </div>
      </div>

      {gridMode ? (
        /* Grid mode */
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
          <p className="text-xs text-text-secondary mb-3">All fields for {template?.name}:</p>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {fields.map((f, i) => (
              <div
                key={f.key}
                onClick={() => { setFieldIndex(i); setGridMode(false); }}
                className={`cursor-pointer transition-all ${i === fieldIndex ? "ring-2 ring-olive" : ""}`}
              >
                <MeasurementCell
                  label={f.label}
                  value={values[f.key] || "—"}
                  unit="in"
                />
              </div>
            ))}
          </div>
          <Button variant="primary" className="w-full" onClick={() => setStep("review")}>
            Review and finish &rarr;
          </Button>
        </div>
      ) : (
        /* Rapid one-field-at-a-time capture with Mannequin Visual Aid */
        <div className="flex-1 flex flex-col justify-center gap-8 px-4 pb-safe pb-4">
          {/* Garment Visual Header with Active Point Indicator */}
          <div className="pt-3 pb-1">
            <div className="p-3 rounded-[var(--radius-card)] bg-white-warm border border-border shadow-xs flex items-center gap-3.5 mb-2">
              <div className="w-14 h-14 rounded-lg overflow-hidden border border-border/80 shrink-0 bg-dark-surface-1">
                <img
                  src={getGarmentImage(template?.id)}
                  alt={template?.name || "Garment"}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-olive bg-olive/10 px-2 py-0.5 rounded-full">
                    {currentField?.group} Group
                  </span>
                  <span className="text-xs text-text-tertiary">
                    Point {fieldIndex + 1} of {fields.length}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-text-primary truncate mt-0.5">
                  {currentField?.label}
                </h3>
                <p className="text-[11px] text-text-secondary truncate">
                  Tape measurement position for {template?.name}
                </p>
              </div>
            </div>

            {/* Field in focus */}
            <div className="text-center pt-2">
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-text-primary">
                {currentField?.label}
              </h2>

              {/* Huge numeral display */}
              <div className="my-2 flex items-baseline justify-center gap-2">
                <span className="font-serif text-5xl md:text-6xl font-bold text-text-primary tracking-tight measurement-value">
                  {currentValue || "0"}
                </span>
                <span className="text-lg text-text-tertiary font-medium">inches</span>
              </div>

              {/* Previous value sanity check */}
              {prevVal && (
                <p className="text-xs text-text-secondary">
                  Last time: <span className="font-semibold text-text-primary">{prevVal} in</span>
                </p>
              )}

              {/* Warning pill */}
              {warning && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning-bg text-warning text-xs font-medium">
                  <AlertTriangle size={13} />
                  <span>{warning}</span>
                </div>
              )}
            </div>
          </div>

          {/* Keypad */}
          <div>
            <Keypad
              value={currentValue}
              onChange={setCurrentValue}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onSkip={handleSkip}
              nextLabel={fieldIndex < fields.length - 1 ? `Next: ${fields[fieldIndex + 1]?.label}` : "Review"}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function MeasurePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center bg-cream">
          <p className="text-sm text-text-secondary">Loading measurement studio...</p>
        </div>
      }
    >
      <MeasurePageInner />
    </Suspense>
  );
}
