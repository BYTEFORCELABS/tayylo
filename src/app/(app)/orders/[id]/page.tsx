"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Check, CreditCard, Plus, Ruler, Scissors, ChevronRight, FileQuestion, FileText, ReceiptText, Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { List, ListItem, IconTile } from "@/components/ui/list";
import { PageBody, PageHeader, Section } from "@/components/ui/page";
import { EmptyState, ErrorState, LoadingRegion, Skeleton } from "@/components/ui/states";
import { StatusTag, Tag } from "@/components/ui/tag";
import { AnimatePresence, motion } from "motion/react";
import { AddMaterialSheet, MaterialHero, MaterialStrip, MaterialViewer, StyleGallery, useOrderMaterials } from "@/components/order/materials";
import { documentNumber, receiptAvailable } from "@/components/order/order-document";
import { MeasurementIcon } from "@/components/brand/measurement-icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MaterialKind } from "@/lib/fabrics";
import { ProductionTracker } from "@/components/order/production-tracker";
import { GarmentIcon } from "@/components/brand/garment-icon";
import { RecordPaymentDialog } from "@/components/payment-dialog";
import { RecordFittingDialog } from "@/components/order/fitting-dialog";
import { orderRepo } from "@/lib/data/store";
import { getQueryData, setQueryData } from "@/lib/query";
import { qk, useCustomer, useMeasurementSet, useOrder } from "@/lib/queries";
import { useBusiness } from "@/lib/use-business";
import { cn } from "@/lib/utils";
import { currencySymbol, dueLabel, formatDate, formatMoney } from "@/lib/format";
import { Input } from "@/components/ui/input";
import {
  MAX_PRICE_CHANGES,
  ORDER_STATUSES,
  balanceMinor,
  displayStatus,
  isActive,
  isOverdue,
  paidMinor,
  normalizeStatus,
  statusLabel,
} from "@/lib/orders";
import type { Fitting, Order, OrderStatusName } from "@/types";

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { unit } = useBusiness();

  const orderQ = useOrder(orderId);
  // Until the full order arrives, show the copy already in the orders list
  // (everything except photos) so the screen opens instantly.
  const listCopy = React.useMemo(
    () => getQueryData<Order[]>(qk.orders)?.find(o => o.id === orderId),
    [orderId]
  );
  const order: Order | null = orderQ.data !== undefined ? orderQ.data : (listCopy ?? null);
  const setOrder = orderQ.mutate as (updater: Order | ((old: Order | null | undefined) => Order | null)) => void;
  const status: "loading" | "ready" | "error" =
    order || orderQ.data === null ? "ready" : orderQ.status === "error" ? "error" : "loading";
  const customer = useCustomer(order?.customerId ?? null).data ?? null;
  const measurementSet = useMeasurementSet(order?.items[0]?.measurementSetId || null).data ?? null;
  const [statusSheet, setStatusSheet] = React.useState(false);
  const [updatingStatus, setUpdatingStatus] = React.useState<OrderStatusName | null>(null);
  const [payOpen, setPayOpen] = React.useState(false);
  const [fittingOpen, setFittingOpen] = React.useState(false);
  const [addPhotoOpen, setAddPhotoOpen] = React.useState(false);
  const [addKind, setAddKind] = React.useState<MaterialKind>("Fabric");
  const [deletingFitting, setDeletingFitting] = React.useState<Fitting | null>(null);
  const [deleteBusy, setDeleteBusy] = React.useState(false);
  const [priceOpen, setPriceOpen] = React.useState(false);
  const [deleteOrderOpen, setDeleteOrderOpen] = React.useState(false);
  const [deletingOrder, setDeletingOrder] = React.useState(false);
  const openAdd = (kind: MaterialKind) => {
    setAddKind(kind);
    setAddPhotoOpen(true);
  };
  const [viewerIndex, setViewerIndex] = React.useState<number | null>(null);

  const refreshOrder = async () => {
    await orderQ.refetch();
  };

  // Optimistic: the tracker animates immediately; rolls back if saving fails.
  const changeStatus = async (next: OrderStatusName) => {
    if (!order || next === order.statusName) {
      setStatusSheet(false);
      return;
    }
    const previous = order.statusName;
    const patchList = (statusName: OrderStatusName) => {
      if (getQueryData<Order[]>(qk.orders))
        setQueryData<Order[]>(qk.orders, list => (list ?? []).map(o => (o.id === order.id ? { ...o, statusName } : o)));
    };
    setOrder({ ...order, statusName: next });
    patchList(next);
    setStatusSheet(false);
    setUpdatingStatus(next);
    try {
      await orderRepo.updateStatus(order.id, next);
      toast.success(`Moved to ${statusLabel(next).toLowerCase()}`);
    } catch {
      setOrder(o => (o ? { ...o, statusName: previous } : o ?? null));
      patchList(previous);
      toast.error("Couldn't update the status — it's been put back");
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (status === "loading") {
    return (
      <>
        <PageHeader variant="compact" title="Order" back="/orders" backLabel="Back to orders" />
        <PageBody>
          <LoadingRegion label="Loading order">
            <Skeleton width="60%" height={28} className="mt-2" />
            <Skeleton width="40%" height={16} className="mt-3" />
            <Skeleton variant="rectangular" height={88} className="mt-6" />
            <Skeleton variant="rectangular" height={180} className="mt-6" />
          </LoadingRegion>
        </PageBody>
      </>
    );
  }

  if (status === "error") {
    return (
      <>
        <PageHeader variant="compact" title="Order" back="/orders" backLabel="Back to orders" />
        <ErrorState title="Couldn't load this order" onRetry={() => orderQ.refetch()} />
      </>
    );
  }

  if (!order) {
    return (
      <>
        <PageHeader variant="compact" title="Order" back="/orders" backLabel="Back to orders" />
        <EmptyState
          icon={<FileQuestion />}
          title="Order not found"
          description="It may have been removed, or the link is incorrect."
          action={<Button onClick={() => router.push("/orders")}>Back to orders</Button>}
        />
      </>
    );
  }

  const paid = paidMinor(order);
  const balance = balanceMinor(order);
  const paidPct = order.priceMinor > 0 ? Math.min(100, Math.round((paid / order.priceMinor) * 100)) : 0;
  const overdue = isOverdue(order);
  const priceChangesLeft = Math.max(0, MAX_PRICE_CHANGES - (order.priceChangeCount ?? 0));
  const priceLocked = order.priceMinor > 0 && priceChangesLeft === 0;

  const deleteOrder = async () => {
    setDeletingOrder(true);
    try {
      await orderRepo.delete(order.id);
      if (getQueryData<Order[]>(qk.orders)) setQueryData<Order[]>(qk.orders, list => (list ?? []).filter(o => o.id !== order.id));
      toast.success(`Order #${order.number} deleted`);
      router.replace("/orders");
    } catch {
      toast.error("Couldn't delete this order");
      setDeletingOrder(false);
    }
  };
  const fieldOptions = measurementSet?.values.map(v => ({ key: v.fieldKey, label: v.labelSnapshot }));

  return (
    <>
      <PageHeader
        variant="compact"
        eyebrow={order.customerName}
        title={`Order #${order.number}`}
        back="/orders"
        backLabel="Back to orders"
        actions={
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={displayStatus(order)}
              initial={{ y: -14, opacity: 0, scale: 0.85 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 14, opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className="inline-flex"
            >
              <StatusTag status={displayStatus(order)} />
            </motion.span>
          </AnimatePresence>
        }
      />

      <PageBody className="pb-10">
        {/* Fabric hero — recognise the job, material and client at a glance */}
        <div className="pt-2">
          <MaterialHero
            order={order}
            clientPhoto={customer?.photoUrl}
            subtitle={isActive(order) ? dueLabel(order.dueAt) : `Due ${formatDate(order.dueAt)}`}
            subtitleTone={overdue ? "danger" : "default"}
            onAdd={() => openAdd("Fabric")}
            onOpen={setViewerIndex}
          />
          <MaterialStrip order={order} onAdd={() => openAdd("Fabric")} onAddStyle={() => openAdd("Style")} onOpen={setViewerIndex} />
        </div>

        {/* Style references — the look the client asked for (added from the photo strip) */}
        {(order.media ?? []).some(m => m.caption?.startsWith("Style")) && (
          <Section
            title="Style"
            trailing={
              <Button variant="secondary" size="sm" onClick={() => openAdd("Style")}>
                <Plus />
                Add style
              </Button>
            }
          >
            <StyleGallery order={order} onAdd={() => openAdd("Style")} onOpen={setViewerIndex} />
          </Section>
        )}

        {/* Production */}
        <div className="mt-6">
          <ProductionTracker
            status={order.statusName}
            onChange={changeStatus}
            onOpenAll={() => setStatusSheet(true)}
            updating={!!updatingStatus}
          />
        </div>

        {/* Payments */}
        <Section
          title="Payments"
          trailing={
            <Button variant="secondary" size="sm" onClick={() => setPayOpen(true)}>
              <CreditCard />
              Record payment
            </Button>
          }
        >
          <Card padding="none">
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-caption text-text-tertiary">{balance > 0 ? "Balance due" : "Status"}</p>
                  <p className={cn("tabular mt-1 text-[28px] font-semibold leading-none tracking-tight", balance > 0 ? "text-ink" : "text-success")}>
                    {balance > 0 ? formatMoney(balance, order.currency) : order.priceMinor > 0 ? "Paid in full" : "No price set"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-caption text-text-tertiary">Agreed price</p>
                  <p className="tabular mt-1 text-[15px] font-semibold text-ink">{formatMoney(order.priceMinor, order.currency)}</p>
                  {priceLocked ? (
                    <p className="mt-1 inline-flex items-center gap-1 text-caption text-text-tertiary" title={`Changed ${MAX_PRICE_CHANGES} times`}>
                      <Lock size={12} strokeWidth={2} />
                      Locked
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPriceOpen(true)}
                      className="mt-0.5 -mr-1 rounded-full px-1 text-caption font-semibold text-olive hover:underline"
                    >
                      {order.priceMinor > 0 ? "Change" : "Set price"}
                    </button>
                  )}
                </div>
              </div>
              {order.priceMinor > 0 && (
                <div className="mt-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken" role="progressbar" aria-valuenow={paidPct} aria-valuemin={0} aria-valuemax={100} aria-label="Amount paid">
                    <div className="h-full rounded-full bg-olive transition-[width] duration-[var(--duration-slow)]" style={{ width: `${paidPct}%` }} />
                  </div>
                  <p className="tabular mt-2 text-caption text-text-tertiary">
                    {formatMoney(paid, order.currency)} paid · {paidPct}%
                  </p>
                </div>
              )}
            </div>
            {order.payments.length > 0 && (
              <ul className="divide-y divide-divider border-t border-divider">
                {[...order.payments]
                  .sort((a, b) => +new Date(b.paidAt) - +new Date(a.paidAt))
                  .map(p => (
                    <li key={p.id} className="flex items-center gap-3.5 px-5 py-3.5">
                      <IconTile tone="success" size="sm">
                        <Check />
                      </IconTile>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-medium text-ink">{p.method}</p>
                        <p className="truncate text-caption text-text-tertiary">
                          {formatDate(p.paidAt)}
                          {p.reference && ` · ${p.reference}`}
                        </p>
                      </div>
                      <span className="tabular text-[15px] font-semibold text-ink">{formatMoney(p.amountMinor, order.currency)}</span>
                    </li>
                  ))}
              </ul>
            )}
          </Card>
        </Section>

        {/* Invoice & receipt */}
        <Section title="Documents">
          <List>
            <ListItem
              href={`/orders/${order.id}/invoice`}
              leading={
                <IconTile tone="olive">
                  <FileText />
                </IconTile>
              }
              title={`Invoice ${documentNumber("invoice", order)}`}
              subtitle={
                order.priceMinor > 0
                  ? balance > 0
                    ? `${formatMoney(balance, order.currency)} due · ready to print or share`
                    : "Fully paid · ready to print or share"
                  : "Set a price to show amounts"
              }
              chevron
            />
            {receiptAvailable(order) ? (
              <ListItem
                href={`/orders/${order.id}/receipt`}
                leading={
                  <IconTile tone="success">
                    <ReceiptText />
                  </IconTile>
                }
                title={`Receipt ${documentNumber("receipt", order)}`}
                subtitle={`Paid in full · ${formatMoney(order.priceMinor, order.currency)}`}
                chevron
              />
            ) : (
              <ListItem
                leading={
                  <IconTile>
                    <Lock />
                  </IconTile>
                }
                title={<span className="text-text-secondary">Receipt</span>}
                subtitle={
                  order.priceMinor > 0
                    ? `Generated automatically once the remaining ${formatMoney(balance, order.currency)} is paid`
                    : "Generated once a price is set and paid"
                }
              />
            )}
          </List>
        </Section>

        {/* Garment details */}
        <Section title="Garment">
          <List>
            <ListItem
              href={`/clients/${order.customerId}`}
              leading={<Avatar name={order.customerName} src={customer?.photoUrl} />}
              title={order.customerName}
              subtitle={customer?.phones[0] ?? "View client"}
              chevron
            />
            {order.items.map(item => (
              <ListItem
                key={item.id}
                leading={
                  <IconTile className="text-ink">
                    <GarmentIcon garment={item.garmentType} size={26} label="" />
                  </IconTile>
                }
                title={item.garmentType}
                subtitle={item.styleNotes || "No style notes"}
              />
            ))}
            <ListItem
              href={`/clients/${order.customerId}`}
              leading={
                <IconTile tone="olive">
                  <Ruler />
                </IconTile>
              }
              title={measurementSet ? `${measurementSet.templateName} measurements` : "Measurements"}
              subtitle={
                measurementSet
                  ? `Taken ${formatDate(measurementSet.takenAt)} · ${measurementSet.values.length} values`
                  : "No measurement set linked — view the client's measurements"
              }
              chevron
            />
          </List>
          {order.note && (
            <div className="mt-3 rounded-[var(--radius-card)] bg-surface-sunken/60 px-4 py-3">
              <p className="text-caption font-semibold text-text-tertiary">Order note</p>
              <p className="mt-1 text-label text-text-secondary">{order.note}</p>
            </div>
          )}
        </Section>

        {/* Fittings */}
        <Section
          title="Fittings"
          trailing={
            order.fittings.length > 0 ? (
              <Button variant="secondary" size="sm" onClick={() => setFittingOpen(true)}>
                <Plus />
                Record fitting
              </Button>
            ) : undefined
          }
        >
          {order.fittings.length === 0 ? (
            <EmptyState
              variant="inset"
              icon={<Scissors />}
              title="No fittings yet"
              description="Log each fitting with its outcome and any adjustments."
              action={
                <Button variant="secondary" onClick={() => setFittingOpen(true)}>
                  <Plus />
                  Record fitting 1
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-divider overflow-hidden rounded-[var(--radius-card)] border border-border/70 bg-surface">
              {[...order.fittings]
                .sort((a, b) => b.number - a.number)
                .map(f => {
                  const approved = f.outcome === "approved";
                  return (
                    <li key={f.id} className="flex gap-3.5 px-4 py-4 sm:px-5">
                      <IconTile tone={approved ? "success" : "warning"} className="mt-0.5">
                        {approved ? <Check /> : <Scissors />}
                      </IconTile>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="text-[16px] font-semibold text-ink">Fitting {f.number}</span>
                              <Tag size="sm" variant={approved ? "success" : "warning"}>
                                {approved ? "Approved" : f.outcome === "skipped" ? "Skipped" : "Adjustments"}
                              </Tag>
                            </p>
                            <p className="mt-0.5 text-caption text-text-tertiary">{formatDate(f.fittedAt)}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="-mr-2 -mt-1 shrink-0 text-text-tertiary hover:text-danger"
                            aria-label={`Delete fitting ${f.number}`}
                            onClick={() => setDeletingFitting(f)}
                          >
                            <Trash2 />
                          </Button>
                        </div>

                        {f.adjustments.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {f.adjustments.map(a => (
                              <Tag key={a.fieldKey} size="sm" variant="beige" className="tabular gap-1">
                                <MeasurementIcon fieldKey={a.fieldKey} label={a.label} size={16} />
                                {a.label} {a.rawDelta}
                              </Tag>
                            ))}
                          </div>
                        )}
                        {f.notes && (
                          <p className="mt-3 rounded-[var(--radius-control)] bg-surface-sunken/60 px-3 py-2.5 text-label leading-relaxed text-text-secondary">
                            {f.notes}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </Section>

        <Section title="Manage">
          <List>
            <ListItem
              onClick={() => setDeleteOrderOpen(true)}
              leading={
                <IconTile tone="danger">
                  <Trash2 />
                </IconTile>
              }
              title="Delete order"
              subtitle="Removes this order, its payments, fittings and photos"
              tone="danger"
            />
          </List>
        </Section>

        <p className="mt-10 text-center text-caption text-text-tertiary">
          <Link href={`/clients/${order.customerId}`} className="inline-flex items-center gap-0.5 font-semibold text-olive">
            All orders for {order.customerName.split(" ")[0]} <ChevronRight size={14} />
          </Link>
        </p>
      </PageBody>

      {/* Status sheet */}
      <BottomSheet open={statusSheet} onOpenChange={setStatusSheet} title="Order status" description={`Currently ${statusLabel(order.statusName).toLowerCase()}`}>
        <div role="radiogroup" aria-label="Order status" className="-mx-2 space-y-1">
          {ORDER_STATUSES.map(s => {
            const selected = normalizeStatus(order.statusName) === s.key;
            return (
              <button
                key={s.key}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => changeStatus(s.key)}
                disabled={!!updatingStatus}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[var(--radius-card)] px-3 py-3 text-left transition-colors",
                  selected ? "bg-surface-sunken" : "hover:bg-beige-light/70"
                )}
              >
                <StatusTag status={s.key} appearance="dot" className="flex-1 text-[15px]" />
                {updatingStatus === s.key ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-ink border-r-transparent" />
                ) : selected ? (
                  <Check size={18} strokeWidth={2} className="text-ink" />
                ) : null}
              </button>
            );
          })}
        </div>
      </BottomSheet>

      <Dialog open={!!deletingFitting} onOpenChange={o => !o && !deleteBusy && setDeletingFitting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete fitting {deletingFitting?.number}?</DialogTitle>
            <DialogDescription>
              Its outcome, notes and adjustments will be removed. Later fittings are renumbered. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeletingFitting(null)} disabled={deleteBusy}>
              Keep
            </Button>
            <Button
              variant="destructive-filled"
              loading={deleteBusy}
              onClick={async () => {
                if (!deletingFitting) return;
                const target = deletingFitting;
                setDeleteBusy(true);
                try {
                  await orderRepo.deleteFitting(order.id, target.id);
                  setOrder(o =>
                    o
                      ? {
                          ...o,
                          fittings: o.fittings
                            .filter(x => x.id !== target.id)
                            .map(x => (x.number > target.number ? { ...x, number: x.number - 1 } : x)),
                        }
                      : (o ?? null)
                  );
                  toast.success(`Fitting ${target.number} deleted`);
                  setDeletingFitting(null);
                  refreshOrder();
                } catch {
                  toast.error("Couldn't delete this fitting");
                } finally {
                  setDeleteBusy(false);
                }
              }}
            >
              <Trash2 />
              Delete fitting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOrderOpen} onOpenChange={o => !deletingOrder && setDeleteOrderOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-danger-bg text-danger">
              <Trash2 size={22} strokeWidth={1.75} />
            </div>
            <DialogTitle>Delete order #{order.number}?</DialogTitle>
            <DialogDescription>
              {order.customerName}&apos;s {order.items[0]?.garmentType ?? "order"}
              {order.payments.length > 0 && `, its ${order.payments.length} recorded payment${order.payments.length > 1 ? "s" : ""}`}, fittings,
              photos, invoice and receipt will be permanently deleted. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteOrderOpen(false)} disabled={deletingOrder}>
              Keep order
            </Button>
            <Button variant="destructive-filled" loading={deletingOrder} onClick={deleteOrder}>
              <Trash2 />
              Delete order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={priceOpen} onOpenChange={setPriceOpen}>
        <DialogContent>
          {priceOpen && (
            <PriceForm
              order={order}
              paidMinor={paid}
              changesLeft={priceChangesLeft}
              onDone={updated => {
                if (updated) setOrder(updated);
                setPriceOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <OrderMaterials
        order={order}
        onOrder={setOrder}
        addKind={addKind}
        addOpen={addPhotoOpen}
        onAddOpenChange={setAddPhotoOpen}
        viewerIndex={viewerIndex}
        onViewerIndex={setViewerIndex}
      />
      <RecordPaymentDialog order={payOpen ? order : null} onOpenChange={setPayOpen} onRecorded={refreshOrder} />
      <RecordFittingDialog
        open={fittingOpen}
        onOpenChange={setFittingOpen}
        orderId={order.id}
        fittingNumber={order.fittings.length + 1}
        unit={unit}
        fieldOptions={fieldOptions}
        onRecorded={refreshOrder}
      />
    </>
  );
}

/** Add sheet + viewer, sharing one set of photo operations. */
function OrderMaterials({
  order,
  onOrder,
  addKind,
  addOpen,
  onAddOpenChange,
  viewerIndex,
  onViewerIndex,
}: {
  order: Order;
  onOrder: (o: Order) => void;
  addKind: MaterialKind;
  addOpen: boolean;
  onAddOpenChange: (o: boolean) => void;
  viewerIndex: number | null;
  onViewerIndex: (i: number | null) => void;
}) {
  const { busy, add, remove, makeCover } = useOrderMaterials(order, onOrder);
  return (
    <>
      <AddMaterialSheet open={addOpen} onOpenChange={onAddOpenChange} onPick={add} busy={busy} initialKind={addKind} />
      <MaterialViewer order={order} index={viewerIndex} onIndex={onViewerIndex} onRemove={remove} onCover={makeCover} busy={busy} />
    </>
  );
}

/** Set or change the agreed price. Changes after the first price are capped. */
function PriceForm({
  order,
  paidMinor: paid,
  changesLeft,
  onDone,
}: {
  order: Order;
  paidMinor: number;
  changesLeft: number;
  onDone: (updated: Order | null) => void;
}) {
  const firstPrice = order.priceMinor <= 0;
  const [value, setValue] = React.useState(firstPrice ? "" : String(order.priceMinor / 100));
  const [error, setError] = React.useState<string>();
  const [saving, setSaving] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const priceMinor = Math.round((parseFloat(value.replace(/,/g, "")) || 0) * 100);

  const save = async () => {
    if (priceMinor <= 0) return setError("Enter the agreed price");
    if (priceMinor < paid) return setError(`It can't be less than the ${formatMoney(paid, order.currency)} already paid`);
    if (priceMinor === order.priceMinor) return onDone(null);
    // A real change uses up one of the limited edits — ask once more.
    if (!firstPrice && !confirming) return setConfirming(true);
    setSaving(true);
    try {
      const updated = await orderRepo.updatePrice(order.id, priceMinor);
      toast.success(firstPrice ? "Price set" : "Agreed price updated");
      onDone(updated);
    } catch (e) {
      setError((e as Error).message || "Couldn't update the price");
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  };

  const leftAfter = changesLeft - 1;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{firstPrice ? "Set agreed price" : "Change agreed price"}</DialogTitle>
        <DialogDescription>
          {firstPrice
            ? `Once set, the price can be changed ${MAX_PRICE_CHANGES} times so your client's bill stays dependable.`
            : `You can change the agreed price ${changesLeft} more time${changesLeft === 1 ? "" : "s"}. After that it's locked.`}
        </DialogDescription>
      </DialogHeader>
      <Input
        label={`Agreed price (${currencySymbol(order.currency)})`}
        inputMode="decimal"
        autoFocus
        value={value}
        onChange={e => {
          setValue(e.target.value);
          setError(undefined);
          setConfirming(false);
        }}
        placeholder="0"
        error={error}
        hint={paid > 0 ? `${formatMoney(paid, order.currency)} paid so far` : undefined}
      />
      {confirming && (
        <p className="rounded-[var(--radius-control)] bg-warning-bg px-3 py-2.5 text-label text-warning">
          {formatMoney(order.priceMinor, order.currency)} → {formatMoney(priceMinor, order.currency)}.{" "}
          {leftAfter > 0 ? `You'll have ${leftAfter} change left after this.` : "This is the last change — the price will be locked."}
        </p>
      )}
      <DialogFooter>
        <Button variant="secondary" onClick={() => onDone(null)} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={save} loading={saving}>
          {confirming ? "Yes, change price" : firstPrice ? "Set price" : "Save"}
        </Button>
      </DialogFooter>
    </>
  );
}
