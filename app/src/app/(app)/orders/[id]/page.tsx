"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CreditCard,
  Edit2,
  Plus,
  Calendar,
  Ruler,
  AlertCircle,
  Clock,
  Sparkles,
  DollarSign,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { orderRepo, customerRepo } from "@/lib/mock/store";
import { getGarmentImage } from "@/lib/mock/seed-data";
import type { Order, OrderStatusName, FittingAdjustment, Customer } from "@/types";
import { toast } from "sonner";

const allStatuses: OrderStatusName[] = [
  "pending",
  "cutting",
  "sewing",
  "fitting",
  "alterations",
  "ready",
  "delivered",
  "cancelled",
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [loading, setLoading] = React.useState(true);
  const [order, setOrder] = React.useState<Order | null>(null);
  const [customer, setCustomer] = React.useState<Customer | null>(null);
  const [editingStatus, setEditingStatus] = React.useState(false);

  // Record Payment Modal
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("Transfer");
  const [paymentRef, setPaymentRef] = React.useState("");
  const [recordingPayment, setRecordingPayment] = React.useState(false);

  // Record Fitting Modal
  const [fittingOpen, setFittingOpen] = React.useState(false);
  const [fittingOutcome, setFittingOutcome] = React.useState<"approved" | "adjustments_needed">("adjustments_needed");
  const [fittingNotes, setFittingNotes] = React.useState("");
  const [adjustments, setAdjustments] = React.useState<FittingAdjustment[]>([]);
  const [selectedField, setSelectedField] = React.useState("Waist");
  const [selectedDelta, setSelectedDelta] = React.useState("-½");
  const [recordingFitting, setRecordingFitting] = React.useState(false);

  React.useEffect(() => {
    orderRepo.getById(orderId).then(async o => {
      setOrder(o);
      if (o) {
        const c = await customerRepo.getById(o.customerId);
        setCustomer(c);
      }
      setLoading(false);
    });
  }, [orderId]);

  const handleStatusChange = async (status: OrderStatusName) => {
    if (!order) return;
    await orderRepo.updateStatus(order.id, status);
    setOrder({ ...order, statusName: status });
    setEditingStatus(false);
    toast.success(`Status updated to ${status}`);
  };

  const handleRecordPayment = async () => {
    if (!order) return;
    const num = parseFloat(paymentAmount);
    if (isNaN(num) || num <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }
    setRecordingPayment(true);
    const amountMinor = Math.round(num * 100);
    const newPayment = await orderRepo.addPayment(order.id, {
      amountMinor,
      method: paymentMethod,
      reference: paymentRef.trim() || undefined,
    });
    if (newPayment) {
      const updated = await orderRepo.getById(order.id);
      setOrder(updated);
      toast.success(`Payment of ₦${num.toLocaleString()} recorded`);
      setPaymentOpen(false);
      setPaymentAmount("");
      setPaymentRef("");
    }
    setRecordingPayment(false);
  };

  const handleAddAdjustment = () => {
    if (!selectedField) return;
    const deltaMm = selectedDelta.includes("-") ? -12.7 : 12.7;
    setAdjustments(prev => [
      ...prev.filter(a => a.label !== selectedField),
      {
        fieldKey: selectedField.toLowerCase().replace(/\s/g, "_"),
        label: selectedField,
        deltaMm,
        rawDelta: selectedDelta,
      },
    ]);
  };

  const handleRemoveAdjustment = (fieldKey: string) => {
    setAdjustments(prev => prev.filter(a => a.fieldKey !== fieldKey));
  };

  const handleRecordFitting = async () => {
    if (!order) return;
    setRecordingFitting(true);
    const newFit = await orderRepo.addFitting(order.id, {
      outcome: fittingOutcome,
      adjustments: fittingOutcome === "approved" ? [] : adjustments,
      notes: fittingNotes.trim() || undefined,
    });
    if (newFit) {
      const updated = await orderRepo.getById(order.id);
      setOrder(updated);
      toast.success("Fitting session recorded");
      setFittingOpen(false);
      setFittingNotes("");
      setAdjustments([]);
    }
    setRecordingFitting(false);
  };

  if (loading) {
    return (
      <div className="px-4 pt-safe pt-8 space-y-4">
        <Skeleton width={200} height={24} />
        <Skeleton width={300} height={16} />
        <Skeleton width="100%" height={120} className="rounded-[var(--radius-card)]" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="px-4 pt-safe pt-8 text-center">
        <p className="text-text-secondary">Order not found</p>
      </div>
    );
  }

  const paid = order.payments.reduce((s, p) => s + p.amountMinor, 0);
  const balance = order.priceMinor - paid;

  return (
    <div className="max-w-3xl mx-auto pb-16">
      {/* Slim bar — fixed on scroll so context is never lost */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm px-4 lg:px-8 pt-safe">
        <div className="flex items-center gap-3 py-3">
          <button
            onClick={() => router.push("/orders")}
            className="w-9 h-9 -ml-1.5 flex items-center justify-center rounded-full hover:bg-beige-light transition-colors shrink-0"
            aria-label="Back to orders"
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
          </button>
          <p className="text-sm font-semibold text-text-primary truncate flex-1">Order #{order.number}</p>
          <StatusTag status={order.statusName} className="shrink-0" />
        </div>
      </div>

      <div className="px-4 lg:px-8">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6 pt-2">
        <Avatar name={order.customerName} src={customer?.photoUrl} size="lg" className="ring-2 ring-olive/20 shadow-sm" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-bold text-text-primary">Order #{order.number}</h1>
            <StatusTag status={order.statusName} />
          </div>
          <button
            onClick={() => router.push(`/clients/${order.customerId}`)}
            className="text-sm text-olive hover:underline font-semibold mt-0.5 inline-block"
          >
            {order.customerName} &rarr;
          </button>
          <p className="text-xs text-text-tertiary mt-1">
            Created {formatDate(order.createdAt)} · Due {formatDate(order.dueAt)}
          </p>
        </div>
      </div>

      {/* Status Editor */}
      <Card className="mb-4 shadow-xs">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm">
            <span>Workflow Status</span>
            <button
              onClick={() => setEditingStatus(!editingStatus)}
              className="text-xs text-olive hover:underline flex items-center gap-1 font-semibold"
            >
              <Edit2 size={13} strokeWidth={1.5} />
              {editingStatus ? "Done" : "Update status"}
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editingStatus ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {allStatuses.map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`h-8 px-3 rounded-full text-xs font-semibold capitalize transition-all active:scale-[0.97] ${
                    order.statusName === s
                      ? "bg-olive text-white-warm ring-2 ring-olive ring-offset-2 shadow-xs"
                      : "bg-beige-light text-text-secondary hover:bg-beige"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <StatusTag status={order.statusName} />
              <span className="text-xs text-text-tertiary">
                Step in custom tailoring workflow
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Garment Piece Showcase Card with High Resolution Imagery */}
      <Card className="mb-4 shadow-xs overflow-hidden">
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center justify-between">
            <span>Bespoke Garment Piece</span>
            <span className="text-xs text-olive font-semibold">Atelier Cut</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {order.items.map(item => {
              const garmentImg = item.imageUrl || getGarmentImage(item.garmentType);
              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-[var(--radius-card)] bg-beige-light/25 border border-border/80 flex flex-col sm:flex-row gap-4 items-start sm:items-center"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 border border-border bg-dark-surface-1 shadow-xs">
                    <img
                      src={garmentImg}
                      alt={item.garmentType}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <h4 className="text-base font-bold text-text-primary">{item.garmentType}</h4>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 text-xs font-semibold"
                        onClick={() => router.push(`/clients/${order.customerId}`)}
                      >
                        <Ruler size={13} />
                        View measurements
                      </Button>
                    </div>
                    {item.styleNotes && (
                      <p className="text-xs text-text-secondary bg-white-warm p-2 rounded-[var(--radius-sm)] border border-border/60 mb-2">
                        {item.styleNotes}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-text-tertiary">
                      <span>Fabric: Hand-selected textile</span>
                      <span>·</span>
                      <span className="text-olive font-medium">Bespoke construction</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment Ledger */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm">
            <span>Payment Ledger</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setPaymentAmount(balance > 0 ? (balance / 100).toString() : "");
                setPaymentOpen(true);
              }}
            >
              <CreditCard size={14} strokeWidth={1.5} />
              Record payment
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-3">
            <div className="flex justify-between text-sm py-1 border-b border-border/40">
              <span className="text-text-secondary">Agreed Price</span>
              <span className="font-semibold text-text-primary">₦{(order.priceMinor / 100).toLocaleString()}</span>
            </div>
            {order.payments.map(p => (
              <div key={p.id} className="flex justify-between items-center text-sm py-1">
                <div>
                  <span className="text-text-primary font-medium">{p.method}</span>
                  <span className="text-xs text-text-tertiary ml-2">
                    {formatDate(p.paidAt)} {p.reference && `· ${p.reference}`}
                  </span>
                </div>
                <span className="text-success font-semibold">₦{(p.amountMinor / 100).toLocaleString()}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2.5 flex justify-between text-sm font-bold">
              <span>Outstanding Balance</span>
              <span className={balance > 0 ? "text-warning" : "text-success"}>
                {balance > 0 ? `₦${(balance / 100).toLocaleString()}` : "Paid in full ✓"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fitting Log */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm">
            <span>Fitting Log ({order.fittings.length})</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFittingOpen(true)}
            >
              <Plus size={14} strokeWidth={1.5} />
              Record fitting
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {order.fittings.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-xs text-text-secondary mb-3">No fitting sessions logged for this order yet</p>
              <Button
                variant="ghost"
                size="sm"
                className="text-olive text-xs"
                onClick={() => setFittingOpen(true)}
              >
                + Log fitting session #1
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {order.fittings.map(f => (
                <div key={f.id} className="pb-3 border-b border-border last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-text-primary">Fitting #{f.number}</p>
                    <Tag size="sm" variant={f.outcome === "approved" ? "success" : "warning"}>
                      {f.outcome === "approved" ? "Approved ✓" : "Adjustments needed"}
                    </Tag>
                  </div>
                  <p className="text-xs text-text-secondary">{formatDate(f.fittedAt)}</p>
                  {f.adjustments && f.adjustments.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {f.adjustments.map(a => (
                        <Tag key={a.fieldKey} size="sm" variant="beige">
                          {a.label} {a.rawDelta}
                        </Tag>
                      ))}
                    </div>
                  )}
                  {f.notes && (
                    <p className="text-xs text-text-tertiary mt-1.5 bg-beige-light/30 p-2 rounded-[var(--radius-sm)]">
                      {f.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- RECORD PAYMENT MODAL ---- */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard size={18} className="text-olive" />
              Record Payment
            </DialogTitle>
            <DialogDescription>
              Record an installment, deposit, or final settlement for Order #{order.number}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Amount (₦)</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                placeholder="e.g. 25000"
                className="w-full h-11 px-3 rounded-[var(--radius-input)] border border-border bg-white-warm text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-olive"
              />
              {balance > 0 && (
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setPaymentAmount((balance / 100).toString())}
                    className="text-xs px-2.5 py-1 rounded bg-beige-light text-text-primary hover:bg-beige transition-colors"
                  >
                    Full Balance: ₦{(balance / 100).toLocaleString()}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(Math.round(balance / 200).toString())}
                    className="text-xs px-2.5 py-1 rounded bg-beige-light text-text-primary hover:bg-beige transition-colors"
                  >
                    50%: ₦{Math.round(balance / 200).toLocaleString()}
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                {["Transfer", "Cash", "Card / POS", "Mobile Money"].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`h-9 rounded-[var(--radius-button)] text-xs font-medium border transition-colors ${
                      paymentMethod === m
                        ? "bg-olive text-white-warm border-olive"
                        : "bg-white-warm text-text-primary border-border hover:bg-beige-light"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Reference / Note (Optional)</label>
              <input
                type="text"
                value={paymentRef}
                onChange={e => setPaymentRef(e.target.value)}
                placeholder="e.g. Bank transfer ref or receipt #"
                className="w-full h-10 px-3 rounded-[var(--radius-input)] border border-border bg-white-warm text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-olive"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={() => setPaymentOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRecordPayment} disabled={recordingPayment}>
              {recordingPayment ? "Saving..." : "Save Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- RECORD FITTING MODAL ---- */}
      <Dialog open={fittingOpen} onOpenChange={setFittingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ruler size={18} className="text-olive" />
              Log Fitting Session #{order.fittings.length + 1}
            </DialogTitle>
            <DialogDescription>
              Record the client's fitting trial and any per-field alterations required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">Fitting Outcome</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFittingOutcome("approved")}
                  className={`h-9 rounded-[var(--radius-button)] text-xs font-medium border transition-colors ${
                    fittingOutcome === "approved"
                      ? "bg-success text-white-warm border-success"
                      : "bg-white-warm text-text-primary border-border hover:bg-beige-light"
                  }`}
                >
                  ✓ Approved (Fits perfectly)
                </button>
                <button
                  type="button"
                  onClick={() => setFittingOutcome("adjustments_needed")}
                  className={`h-9 rounded-[var(--radius-button)] text-xs font-medium border transition-colors ${
                    fittingOutcome === "adjustments_needed"
                      ? "bg-warning text-white-warm border-warning"
                      : "bg-white-warm text-text-primary border-border hover:bg-beige-light"
                  }`}
                >
                  Adjustments Needed
                </button>
              </div>
            </div>

            {fittingOutcome === "adjustments_needed" && (
              <div className="p-3 bg-beige-light/30 rounded-[var(--radius-card)] border border-border space-y-3">
                <p className="text-xs font-semibold text-text-primary">Add Alteration / Adjustment</p>
                <div className="flex gap-2">
                  <select
                    value={selectedField}
                    onChange={e => setSelectedField(e.target.value)}
                    className="flex-1 h-9 px-2 text-xs rounded border border-border bg-white-warm"
                  >
                    {["Waist", "Trouser length", "Chest", "Sleeve length", "Shoulder", "Hips", "Neck", "Crotch rise"].map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <select
                    value={selectedDelta}
                    onChange={e => setSelectedDelta(e.target.value)}
                    className="w-24 h-9 px-2 text-xs rounded border border-border bg-white-warm"
                  >
                    {["-1 in", "-¾ in", "-½ in", "-¼ in", "+¼ in", "+½ in", "+¾ in", "+1 in"].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <Button variant="secondary" size="sm" type="button" onClick={handleAddAdjustment}>
                    Add
                  </Button>
                </div>

                {adjustments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {adjustments.map(a => (
                      <span
                        key={a.fieldKey}
                        onClick={() => handleRemoveAdjustment(a.fieldKey)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-white-warm border border-border text-text-primary cursor-pointer hover:bg-danger-bg hover:text-danger transition-colors"
                      >
                        {a.label}: <strong>{a.rawDelta}</strong> ×
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Tailor's Fitting Notes</label>
              <textarea
                value={fittingNotes}
                onChange={e => setFittingNotes(e.target.value)}
                placeholder="e.g. Sleeves need to be shortened by 1 inch. Taper trouser leg from knee down."
                rows={3}
                className="w-full p-2.5 rounded-[var(--radius-input)] border border-border bg-white-warm text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-olive"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={() => setFittingOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRecordFitting} disabled={recordingFitting}>
              {recordingFitting ? "Saving..." : "Log Fitting"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
