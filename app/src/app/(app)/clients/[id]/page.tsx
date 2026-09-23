"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Ruler,
  Phone,
  MessageCircle,
  ShoppingBag,
  Edit2,
  ChevronRight,
  Share2,
  Copy,
  History as HistoryIcon,
  RotateCcw,
  Sparkles,
  Camera,
  Trash2,
  Check,
  Calendar,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MeasurementCell } from "@/components/ui/measurement";
import { StatusTag, Tag } from "@/components/ui/tag";
import { Skeleton } from "@/components/ui/states";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { customerRepo, measurementRepo, orderRepo, businessRepo } from "@/lib/mock/store";
import { getGarmentImage } from "@/lib/mock/seed-data";
import type { Customer, MeasurementSet, Order, Business, Media } from "@/types";
import { toast } from "sonner";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
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

type Tab = "measurements" | "orders" | "fittings" | "notes" | "media";

export default function ClientProfilePage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [loading, setLoading] = React.useState(true);
  const [business, setBusiness] = React.useState<Business | null>(null);
  const [client, setClient] = React.useState<Customer | null>(null);
  const [measurements, setMeasurements] = React.useState<MeasurementSet[]>([]);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [tab, setTab] = React.useState<Tab>("measurements");
  const [viewMode, setViewMode] = React.useState<"current" | "history">("current");

  // Version comparison modal
  const [selectedHistorySet, setSelectedHistorySet] = React.useState<MeasurementSet | null>(null);
  const [restoring, setRestoring] = React.useState(false);

  // Share card modal
  const [shareOpen, setShareOpen] = React.useState(false);

  // Notes state
  const [notesText, setNotesText] = React.useState("");
  const [savingNotes, setSavingNotes] = React.useState(false);

  // Media state
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadingMedia, setUploadingMedia] = React.useState(false);

  React.useEffect(() => {
    async function load() {
      const [biz, c, m, o] = await Promise.all([
        businessRepo.get(),
        customerRepo.getById(clientId),
        measurementRepo.listByCustomer(clientId),
        orderRepo.getByCustomer(clientId),
      ]);
      setBusiness(biz);
      setClient(c);
      if (c?.notes) setNotesText(c.notes);
      setMeasurements(m);
      setOrders(o);
      setLoading(false);
    }
    load();
  }, [clientId]);

  if (loading) {
    return (
      <div className="px-4 pt-safe">
        <div className="pt-4 pb-6 space-y-3">
          <Skeleton width={40} height={40} variant="circular" />
          <Skeleton width={200} height={24} />
          <Skeleton width={150} height={16} />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="px-4 pt-safe pt-8 text-center">
        <p className="text-text-secondary">Client not found</p>
        <Button variant="tertiary" onClick={() => router.push("/clients")} className="mt-4">
          Back to clients
        </Button>
      </div>
    );
  }

  const current = measurements[0];
  const previousSet = measurements[1];

  // Delta between current and previous
  function getDelta(fieldKey: string): number | undefined {
    if (!current || !previousSet) return undefined;
    const curVal = current.values.find(v => v.fieldKey === fieldKey);
    const prevVal = previousSet.values.find(v => v.fieldKey === fieldKey);
    if (!curVal || !prevVal) return undefined;
    const diffInches = (curVal.valueMm - prevVal.valueMm) / 25.4;
    if (Math.abs(diffInches) < 0.1) return 0;
    return Math.round(diffInches * 4) / 4;
  }

  // Version comparison diff between current and selected historical version
  function getComparisonDelta(curValMm: number, histValMm: number): { diff: string; rawNum: number } {
    const diffInches = (curValMm - histValMm) / 25.4;
    if (Math.abs(diffInches) < 0.1) return { diff: "No change", rawNum: 0 };
    const sign = diffInches > 0 ? "+" : "";
    const rounded = Math.round(diffInches * 4) / 4;
    return { diff: `${sign}${rounded} in`, rawNum: rounded };
  }

  // Restore older version
  async function handleRestore(versionId: string) {
    setRestoring(true);
    const restored = await measurementRepo.restoreVersion(versionId);
    if (restored) {
      const updated = await measurementRepo.listByCustomer(clientId);
      setMeasurements(updated);
      setSelectedHistorySet(null);
      setViewMode("current");
      toast.success("Older version restored as your current record");
    }
    setRestoring(false);
  }

  // Save notes
  async function handleSaveNotes() {
    setSavingNotes(true);
    await customerRepo.update(client!.id, { notes: notesText.trim() });
    setClient(prev => (prev ? { ...prev, notes: notesText.trim() } : null));
    setSavingNotes(false);
    toast.success("Client notes saved");
  }

  // Upload photo
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const mediaItem = await customerRepo.addMedia(client!.id, {
        url: dataUrl,
        caption: `Style reference · ${new Date().toLocaleDateString("en-GB")}`,
      });
      if (mediaItem) {
        setClient(prev => prev ? { ...prev, media: [mediaItem, ...(prev.media || [])] } : null);
        toast.success("Photo added to client profile");
      }
      setUploadingMedia(false);
    };
    reader.readAsDataURL(file);
  }

  // Delete photo
  async function handleDeleteMedia(mediaId: string) {
    await customerRepo.deleteMedia(client!.id, mediaId);
    setClient(prev => prev ? { ...prev, media: (prev.media || []).filter(m => m.id !== mediaId) } : null);
    toast.success("Photo removed");
  }

  // Share card WhatsApp link & Copy
  const clientPhone = client.phones[0] ? client.phones[0].replace(/\s/g, "").replace("+", "") : "";
  const shareMeasurementsText = current
    ? current.values.map(v => `${v.labelSnapshot}: ${rawFromMm(v.valueMm)} in`).join("\n")
    : "No measurements recorded";

  const shareMessage = `*${business?.name || "Tayylo Bespoke Studio"}*\nClient: ${client.fullName}\nDate: ${current ? formatDate(current.takenAt) : ""}\nGarment: ${current?.templateName || "Bespoke"}\n\n*Measurements:*\n${shareMeasurementsText}\n\n_Crafted with Tayylo._`;

  function handleCopyShareText() {
    navigator.clipboard.writeText(shareMessage);
    toast.success("Measurements card copied to clipboard");
  }

  const allFittings = orders.flatMap(o =>
    o.fittings.map(f => ({ ...f, orderNumber: o.number, garmentType: o.items[0]?.garmentType || "Garment" }))
  );

  const clientSince = formatDate(client.createdAt);

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {/* Slim bar — fixed on scroll so context is never lost */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm px-4 lg:px-8 pt-safe">
        <div className="flex items-center gap-3 py-3">
          <button
            onClick={() => router.push("/clients")}
            className="w-9 h-9 -ml-1.5 flex items-center justify-center rounded-full hover:bg-beige-light transition-colors shrink-0"
            aria-label="Back to clients"
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
          </button>
          <Avatar name={client.fullName} src={client.photoUrl} size="sm" className="shrink-0" />
          <p className="text-sm font-semibold text-text-primary truncate">{client.fullName}</p>
        </div>
      </div>

      {/* Header */}
      <div className="px-4 lg:px-8">
        {/* Profile header */}
        <div className="flex items-start gap-4 pb-4 pt-2">
          <Avatar name={client.fullName} src={client.photoUrl} size="xl" className="ring-2 ring-olive/20 shadow-sm" />
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-2xl text-text-primary truncate">{client.fullName}</h1>
            <p className="text-sm text-text-secondary mt-0.5">{client.phones[0] || "No phone recorded"}</p>
            <p className="text-xs text-text-tertiary mt-1">Client since {clientSince}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {client.tags.map(t => (
                <Tag key={t} size="sm">{t}</Tag>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pb-4">
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push(`/measure?clientId=${clientId}`)}
          >
            <Ruler size={16} strokeWidth={1.5} />
            New measurement
          </Button>
          <Button variant="secondary" size="sm" onClick={() => router.push(`/orders/new?clientId=${clientId}`)}>
            <ShoppingBag size={16} strokeWidth={1.5} />
            New order
          </Button>
          {current && (
            <Button variant="secondary" size="sm" onClick={() => setShareOpen(true)}>
              <Share2 size={16} strokeWidth={1.5} />
              Share card
            </Button>
          )}
          {client.phones[0] && (
            <>
              <Button variant="ghost" size="icon-sm" asChild>
                <a href={`tel:${client.phones[0]}`} aria-label="Call">
                  <Phone size={16} strokeWidth={1.5} />
                </a>
              </Button>
              <Button variant="ghost" size="icon-sm" asChild>
                <a
                  href={`https://wa.me/${clientPhone}?text=${encodeURIComponent(shareMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                >
                  <MessageCircle size={16} strokeWidth={1.5} />
                </a>
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon-sm" onClick={() => router.push(`/clients/${clientId}/edit`)}>
            <Edit2 size={16} strokeWidth={1.5} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 lg:px-8 border-b border-border">
        <div className="flex gap-6 overflow-x-auto scrollbar-none">
          {([
            { key: "measurements", label: "Measurements", count: measurements.length },
            { key: "orders", label: "Orders", count: orders.length },
            { key: "fittings", label: "Fittings", count: allFittings.length },
            { key: "notes", label: "Notes" },
            { key: "media", label: "Photos", count: client.media?.length || 0 },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.key
                  ? "text-olive border-olive"
                  : "text-text-tertiary border-transparent hover:text-text-secondary"
              }`}
            >
              {t.label}
              {"count" in t && t.count != null && t.count > 0 && (
                <span className="ml-1.5 text-xs text-text-tertiary">({t.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 lg:px-8 py-4">
        {/* ---- MEASUREMENTS TAB ---- */}
        {tab === "measurements" && (
          <div>
            {measurements.length === 0 ? (
              <div className="py-12 text-center bg-white-warm rounded-[var(--radius-card)] border border-border p-6">
                <Ruler size={36} className="mx-auto text-text-tertiary mb-3" strokeWidth={1.5} />
                <p className="text-sm font-medium text-text-primary mb-1">No measurements recorded yet</p>
                <p className="text-xs text-text-secondary mb-4">Capture measurements with the tailor's keypad in 90 seconds</p>
                <Button variant="primary" size="sm" onClick={() => router.push(`/measure?clientId=${clientId}`)}>
                  <Ruler size={16} />
                  Record first measurement
                </Button>
              </div>
            ) : (
              <>
                {/* Current / History toggle */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-1 bg-beige-light rounded-[var(--radius-button)] p-1 w-fit">
                    <button
                      onClick={() => setViewMode("current")}
                      className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-colors ${
                        viewMode === "current" ? "bg-white-warm text-text-primary shadow-sm" : "text-text-tertiary"
                      }`}
                    >
                      Current set
                    </button>
                    <button
                      onClick={() => setViewMode("history")}
                      className={`px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-colors ${
                        viewMode === "history" ? "bg-white-warm text-text-primary shadow-sm" : "text-text-tertiary"
                      }`}
                    >
                      Version history ({measurements.length})
                    </button>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShareOpen(true)}>
                    <Share2 size={14} />
                    <span className="hidden sm:inline">Share</span>
                  </Button>
                </div>

                {viewMode === "current" && current && (
                  <div>
                    <div className="flex items-center justify-between mb-3 text-xs text-text-secondary bg-beige-light/40 px-3 py-2 rounded-[var(--radius-sm)]">
                      <span>
                        <strong className="text-text-primary">{current.templateName}</strong> · {formatDate(current.takenAt)}
                        {current.note && <span className="ml-1 text-text-tertiary">({current.note})</span>}
                      </span>
                      <span className="text-olive font-medium">{current.values.length} fields</span>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                      {current.values.map(v => (
                        <MeasurementCell
                          key={v.fieldKey}
                          label={v.labelSnapshot}
                          value={rawFromMm(v.valueMm)}
                          unit="in"
                          delta={getDelta(v.fieldKey)}
                          highlighted={!!getDelta(v.fieldKey) && getDelta(v.fieldKey) !== 0}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {viewMode === "history" && (
                  <div className="space-y-3">
                    <p className="text-xs text-text-secondary mb-2">
                      Tap any version to compare side-by-side or restore it as the current active set:
                    </p>
                    {measurements.map((ms, idx) => (
                      <Card
                        key={ms.id}
                        padding="sm"
                        className="cursor-pointer hover:border-olive/50 hover:bg-beige-light/20 transition-all"
                        onClick={() => setSelectedHistorySet(ms)}
                      >
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-text-primary">{ms.templateName}</p>
                                {idx === 0 ? (
                                  <Tag size="sm" variant="olive">Current active</Tag>
                                ) : (
                                  <Tag size="sm" variant="beige">Version {measurements.length - idx}</Tag>
                                )}
                              </div>
                              <p className="text-xs text-text-secondary mt-1 flex items-center gap-1.5">
                                <Calendar size={12} strokeWidth={1.5} />
                                {formatDate(ms.takenAt)}
                                {ms.note && <span> · {ms.note}</span>}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-olive font-medium">Compare &gt;</span>
                              <ChevronRight size={16} className="text-text-tertiary" strokeWidth={1.5} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ---- ORDERS TAB ---- */}
        {tab === "orders" && (
          <div>
            {orders.length === 0 ? (
              <div className="py-12 text-center bg-white-warm rounded-[var(--radius-card)] border border-border p-6">
                <ShoppingBag size={36} className="mx-auto text-text-tertiary mb-3" strokeWidth={1.5} />
                <p className="text-sm font-medium text-text-primary mb-1">No orders yet</p>
                <p className="text-xs text-text-secondary mb-4">Create a new garment order linked to this client</p>
                <Button variant="primary" size="sm" onClick={() => router.push(`/orders/new?clientId=${clientId}`)}>
                  <ShoppingBag size={16} />
                  Create order
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-text-secondary">{orders.length} order{orders.length !== 1 ? "s" : ""} on record</span>
                  <Button variant="secondary" size="sm" onClick={() => router.push(`/orders/new?clientId=${clientId}`)}>
                    <ShoppingBag size={14} />
                    New order
                  </Button>
                </div>
                {orders.map(o => {
                  const paid = o.payments.reduce((s, p) => s + p.amountMinor, 0);
                  const balance = o.priceMinor - paid;
                  const garmentImg = o.items[0]?.imageUrl || getGarmentImage(o.items[0]?.garmentType);
                  return (
                    <Card
                      key={o.id}
                      padding="sm"
                      className="cursor-pointer hover:border-olive/50 hover:shadow-xs transition-all overflow-hidden"
                      onClick={() => router.push(`/orders/${o.id}`)}
                    >
                      <CardContent>
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-border bg-beige-light">
                            <img
                              src={garmentImg}
                              alt={o.items[0]?.garmentType || "Garment"}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="text-sm font-bold text-text-primary truncate">
                                #{o.number} · {o.items[0]?.garmentType || "Bespoke Garment"}
                              </p>
                              <StatusTag status={o.statusName} />
                            </div>
                            <p className="text-xs text-text-secondary">Due {formatDate(o.dueAt)}</p>
                            <div className="flex items-center justify-between text-xs pt-1.5 mt-1 border-t border-border/60">
                              <span className="text-text-primary font-mono font-semibold">
                                ₦{(o.priceMinor / 100).toLocaleString()}
                              </span>
                              {balance > 0 ? (
                                <span className="text-warning font-semibold">
                                  ₦{(balance / 100).toLocaleString()} balance
                                </span>
                              ) : (
                                <span className="text-success font-medium">Paid in full</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ---- FITTINGS TAB ---- */}
        {tab === "fittings" && (
          <div>
            {allFittings.length === 0 ? (
              <div className="py-12 text-center bg-white-warm rounded-[var(--radius-card)] border border-border p-6">
                <HistoryIcon size={36} className="mx-auto text-text-tertiary mb-3" strokeWidth={1.5} />
                <p className="text-sm font-medium text-text-primary mb-1">No fitting records</p>
                <p className="text-xs text-text-secondary mb-4">Fitting sessions recorded on orders will appear here</p>
                {orders.length > 0 && (
                  <Button variant="secondary" size="sm" onClick={() => router.push(`/orders/${orders[0].id}`)}>
                    Go to latest order
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-text-secondary mb-2">Fitting log across all orders:</p>
                {allFittings.map(f => (
                  <Card key={f.id} padding="sm" className="bg-white-warm">
                    <CardContent>
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">
                            Fitting #{f.number} · {f.garmentType} (#{f.orderNumber})
                          </p>
                          <p className="text-xs text-text-secondary">{formatDate(f.fittedAt)}</p>
                        </div>
                        <Tag size="sm" variant={f.outcome === "approved" ? "success" : "warning"}>
                          {f.outcome === "approved" ? "Approved" : "Adjustments needed"}
                        </Tag>
                      </div>
                      {f.adjustments && f.adjustments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {f.adjustments.map(a => (
                            <Tag key={a.fieldKey} size="sm" variant="beige">
                              {a.label} {a.rawDelta}
                            </Tag>
                          ))}
                        </div>
                      )}
                      {f.notes && (
                        <p className="text-xs text-text-tertiary mt-2 bg-beige-light/30 p-2 rounded-[var(--radius-sm)]">
                          {f.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---- NOTES TAB ---- */}
        {tab === "notes" && (
          <div className="bg-white-warm p-4 rounded-[var(--radius-card)] border border-border">
            <h3 className="text-sm font-semibold text-text-primary mb-1">Client Notes & Fitting Preferences</h3>
            <p className="text-xs text-text-secondary mb-3">
              Record posture quirks (e.g. dropped right shoulder, erect posture, preferred fit ease, allergies).
            </p>
            <textarea
              value={notesText}
              onChange={e => setNotesText(e.target.value)}
              placeholder="e.g. Prefers relaxed drape on shoulders. Dropped right shoulder by ½ inch. High waist trouser preference..."
              rows={6}
              className="w-full p-3 rounded-[var(--radius-input)] border border-border bg-cream/40 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-olive focus:ring-offset-2"
            />
            <div className="mt-3 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveNotes}
                disabled={savingNotes}
              >
                {savingNotes ? "Saving..." : "Save notes"}
              </Button>
            </div>
          </div>
        )}

        {/* ---- MEDIA / PHOTOS TAB ---- */}
        {tab === "media" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">Fit & Style Photos</h3>
                <p className="text-xs text-text-secondary">Capture garment references, posture, and fabric swatches</p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingMedia}
              >
                <Camera size={16} />
                {uploadingMedia ? "Adding..." : "Add photo"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            {(!client.media || client.media.length === 0) ? (
              <div className="py-12 text-center bg-white-warm rounded-[var(--radius-card)] border border-border p-6">
                <Camera size={36} className="mx-auto text-text-tertiary mb-3" strokeWidth={1.5} />
                <p className="text-sm font-medium text-text-primary mb-1">No photos added yet</p>
                <p className="text-xs text-text-secondary mb-4">
                  Add photos of fittings, fabric swatches, or client style references
                </p>
                <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Camera size={16} />
                  Upload style photo
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {client.media.map(m => (
                  <div key={m.id} className="relative group rounded-[var(--radius-card)] overflow-hidden border border-border bg-white-warm">
                    <img src={m.url} alt={m.caption || "Client photo"} className="w-full h-44 object-cover" />
                    <div className="p-2">
                      <p className="text-xs text-text-secondary truncate">{m.caption || "Fitting photo"}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteMedia(m.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-dark-surface-1/80 text-white-warm hover:bg-danger transition-colors opacity-90 group-hover:opacity-100"
                      title="Delete photo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---- VERSION COMPARISON MODAL ---- */}
      <Dialog open={!!selectedHistorySet} onOpenChange={open => { if (!open) setSelectedHistorySet(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HistoryIcon size={18} className="text-olive" />
              Version Comparison
            </DialogTitle>
            <DialogDescription>
              Comparing <strong>{selectedHistorySet?.templateName}</strong> from{" "}
              {selectedHistorySet ? formatDate(selectedHistorySet.takenAt) : ""} with the current active set.
            </DialogDescription>
          </DialogHeader>

          {selectedHistorySet && current && (
            <div className="max-h-[50vh] overflow-y-auto -mx-6 px-6 py-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-text-tertiary">
                    <th className="py-2 font-medium">Field</th>
                    <th className="py-2 font-medium text-right">Current</th>
                    <th className="py-2 font-medium text-right">Older Version</th>
                    <th className="py-2 font-medium text-right">Difference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {current.values.map(curV => {
                    const histV = selectedHistorySet.values.find(v => v.fieldKey === curV.fieldKey);
                    const diffInfo = histV ? getComparisonDelta(curV.valueMm, histV.valueMm) : null;
                    return (
                      <tr key={curV.fieldKey} className="hover:bg-beige-light/30">
                        <td className="py-2 font-medium text-text-primary">{curV.labelSnapshot}</td>
                        <td className="py-2 text-right measurement-value font-semibold text-text-primary">
                          {rawFromMm(curV.valueMm)} in
                        </td>
                        <td className="py-2 text-right measurement-value text-text-secondary">
                          {histV ? `${rawFromMm(histV.valueMm)} in` : "—"}
                        </td>
                        <td className="py-2 text-right">
                          {diffInfo ? (
                            diffInfo.rawNum === 0 ? (
                              <span className="text-text-tertiary">No change</span>
                            ) : (
                              <span className={`font-semibold ${diffInfo.rawNum > 0 ? "text-olive" : "text-warning"}`}>
                                {diffInfo.diff}
                              </span>
                            )
                          ) : (
                            <span className="text-text-tertiary">New</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="secondary"
              onClick={() => setSelectedHistorySet(null)}
            >
              Close
            </Button>
            {selectedHistorySet && selectedHistorySet.id !== current?.id && (
              <Button
                variant="primary"
                onClick={() => handleRestore(selectedHistorySet.id)}
                disabled={restoring}
              >
                <RotateCcw size={16} />
                {restoring ? "Restoring..." : "Restore as new version"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- SHARE MEASUREMENTS CARD MODAL ---- */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 size={18} className="text-olive" />
              Digital Measurement Card
            </DialogTitle>
            <DialogDescription>
              Share this client's bespoke measurements directly via WhatsApp or copy formatted summary.
            </DialogDescription>
          </DialogHeader>

          {/* Card Preview */}
          <div className="p-4 rounded-[var(--radius-card)] bg-beige-light/30 border border-border space-y-3">
            <div className="border-b border-border pb-2 flex justify-between items-start">
              <div>
                <h4 className="font-serif text-lg font-bold text-text-primary">{client.fullName}</h4>
                <p className="text-xs text-text-secondary">{current?.templateName} · {current ? formatDate(current.takenAt) : ""}</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-olive text-white-warm">
                Tayylo
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {current?.values.slice(0, 10).map(v => (
                <div key={v.fieldKey} className="flex justify-between border-b border-border/40 py-1">
                  <span className="text-text-secondary">{v.labelSnapshot}:</span>
                  <span className="font-bold text-text-primary">{rawFromMm(v.valueMm)} in</span>
                </div>
              ))}
            </div>
            {current && current.values.length > 10 && (
              <p className="text-xs text-text-tertiary italic text-center">
                + {current.values.length - 10} more measurements included
              </p>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={handleCopyShareText}>
              <Copy size={16} />
              Copy text
            </Button>
            {client.phones[0] && (
              <Button variant="primary" asChild>
                <a
                  href={`https://wa.me/${clientPhone}?text=${encodeURIComponent(shareMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={16} />
                  Send on WhatsApp
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
