"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Camera, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/choice";
import { Input, Textarea } from "@/components/ui/input";
import { PageBody, PageHeader, Overline } from "@/components/ui/page";
import { ClientPicker } from "@/components/client-picker";
import { customerRepo, measurementRepo, orderRepo } from "@/lib/data/store";
import { getQueryData } from "@/lib/query";
import { qk, useCustomers, useOrders } from "@/lib/queries";
import { Calendar, addDaysISO, fromLocalISO, toLocalISO } from "@/components/ui/calendar";
import { isActive } from "@/lib/orders";
import { useBusiness } from "@/lib/use-business";
import { currencySymbol, daysUntil, formatMoney } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/orders";
import { AddMaterialSheet } from "@/components/order/materials";
import { makeThumbnail } from "@/lib/images";
import { parseCaption, type MaterialKind } from "@/lib/fabrics";
import { GarmentPicker } from "@/components/garment-picker";
import { GarmentIcon } from "@/components/brand/garment-icon";
import type { Customer } from "@/types";

const DUE_PRESETS = [
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "3 weeks", days: 21 },
  { label: "1 month", days: 30 },
];

/** Client-side ids / number for a new order (same scheme as before; the API stores them). */
function newOrderMeta(dueDate: string) {
  const now = Date.now();
  return {
    number: String(1010 + Math.floor(Math.random() * 90)),
    dueAt: (dueDate ? fromLocalISO(dueDate) : fromLocalISO(addDaysISO(14))).toISOString(),
    itemId: `oi-${now}`,
    paymentId: `pay-${now}`,
    paidAt: new Date(now).toISOString(),
  };
}

const isoDate = (daysFromNow: number) => addDaysISO(daysFromNow);

function NewOrderPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clientId");
  const { currency, business } = useBusiness();
  const symbol = currencySymbol(currency);

  const [step, setStep] = React.useState<"client" | "details">(preselectedClientId ? "details" : "client");
  const clientsQ = useCustomers();
  const clients = clientsQ.data ?? [];
  const clientsLoading = !clientsQ.data;
  const ordersQ = useOrders();
  // Orders already due on each day, so the calendar can show busy days.
  const dueMarkers = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of ordersQ.data ?? []) {
      if (!isActive(o)) continue;
      const k = toLocalISO(new Date(o.dueAt));
      map[k] = (map[k] ?? 0) + 1;
    }
    return map;
  }, [ordersQ.data]);
  const [client, setClient] = React.useState<Customer | null>(null);
  const [garment, setGarment] = React.useState("");
  const [customGarment, setCustomGarment] = React.useState("");
  const [styleNotes, setStyleNotes] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [deposit, setDeposit] = React.useState("");
  const [depositMethod, setDepositMethod] = React.useState<string>("Cash");
  const [dueDate, setDueDate] = React.useState(isoDate(14));
  const [orderNote, setOrderNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<{ garment?: string; deposit?: string }>({});
  // Fabric / style photos picked before the order exists; uploaded after creation.
  const [photos, setPhotos] = React.useState<{ url: string; caption: string }[]>([]);
  const [photoSheet, setPhotoSheet] = React.useState(false);
  const [photoKind, setPhotoKind] = React.useState<MaterialKind>("Fabric");
  const openPhotos = (kind: MaterialKind) => {
    setPhotoKind(kind);
    setPhotoSheet(true);
  };

  React.useEffect(() => {
    if (preselectedClientId) {
      const cached = getQueryData<Customer[]>(qk.customers)?.find(c => c.id === preselectedClientId);
      (cached ? Promise.resolve(cached) : customerRepo.getById(preselectedClientId)).then(c => {
        if (c) setClient(c);
        else setStep("client");
      });
    }
  }, [preselectedClientId]);

  const garmentName = garment === "Other" ? customGarment.trim() : garment;
  const priceMinor = Math.round((parseFloat(price) || 0) * 100);
  const depositMinor = Math.round((parseFloat(deposit) || 0) * 100);

  const create = async () => {
    const nextErrors: typeof errors = {};
    if (!garmentName) nextErrors.garment = "Choose what you're making";
    if (depositMinor > priceMinor && priceMinor > 0) nextErrors.deposit = "Deposit is more than the price";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !client) return;

    setSaving(true);
    try {
      const latest = await measurementRepo.getLatest(client.id).catch(() => null);
      const meta = newOrderMeta(dueDate);
      const order = await orderRepo.create({
        customerId: client.id,
        customerName: client.fullName,
        number: meta.number,
        statusName: "pending",
        dueAt: meta.dueAt,
        items: [
          {
            id: meta.itemId,
            orderId: "",
            garmentType: garmentName,
            measurementSetId: latest?.id || "",
            styleNotes: styleNotes.trim() || undefined,
            photos: [],
          },
        ],
        priceMinor,
        currency,
        note: orderNote.trim() || undefined,
        payments:
          depositMinor > 0
            ? [{ id: meta.paymentId, orderId: "", amountMinor: depositMinor, paidAt: meta.paidAt, method: depositMethod }]
            : [],
        fittings: [],
      });
      if (photos.length) {
        try {
          const uploaded = [];
          for (const p of photos) {
            const m = await orderRepo.addMedia(order.id, p);
            if (m) uploaded.push(m);
          }
          const cover = uploaded.find(m => parseCaption(m.caption).kind === "Fabric") ?? uploaded[0];
          if (cover) await orderRepo.setCover(order.id, { mediaId: cover.id, thumbUrl: await makeThumbnail(cover.url).catch(() => cover.url) });
        } catch {
          toast.error("Order created, but some photos didn't upload. Add them from the order.");
        }
      }
      toast.success(`Order #${order.number} created — invoice ready`, {
        action: { label: "View invoice", onClick: () => router.push(`/orders/${order.id}/invoice`) },
        duration: 8000,
      });
      router.push(`/orders/${order.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create the order");
      setSaving(false);
    }
  };

  if (step === "client") {
    return (
      <>
        <PageHeader variant="compact" eyebrow="New order · Step 1 of 2" title="Who is it for?" back={true} width="md" />
        <PageBody width="md" className="pt-4 pb-10">
          <ClientPicker
            clients={clients}
            loading={clientsLoading}
            onSelect={c => {
              setClient(c);
              setStep("details");
            }}
            onAddNew={() => router.push("/clients?add=true")}
          />
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        variant="compact"
        eyebrow={preselectedClientId ? "New order" : "New order · Step 2 of 2"}
        title="Order details"
        width="md"
        back={preselectedClientId ? true : undefined}
        onBack={preselectedClientId ? undefined : () => setStep("client")}
      />
      <PageBody width="md" className="pt-4 pb-40">
        {client && (
          <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-border/70 bg-surface px-4 py-3">
            <Avatar name={client.fullName} src={client.photoUrl} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-ink">{client.fullName}</p>
              <p className="truncate text-label text-text-tertiary">{client.phones[0] || "No phone"}</p>
            </div>
            {!preselectedClientId && (
              <Button variant="ghost" size="sm" onClick={() => setStep("client")}>
                Change
              </Button>
            )}
          </div>
        )}

        <Overline className="mb-3 mt-8">Garment</Overline>
        <GarmentPicker
          value={garment}
          customActive={garment === "Other"}
          studioGarments={business?.garmentTypes}
          onChange={g => {
            setGarment(g);
            setErrors(e => ({ ...e, garment: undefined }));
          }}
          onCustom={() => {
            setGarment("Other");
            setErrors(e => ({ ...e, garment: undefined }));
          }}
          error={errors.garment}
        />
        {garment === "Other" && (
          <Input
            containerClassName="mt-4"
            label="What are you making?"
            value={customGarment}
            onChange={e => setCustomGarment(e.target.value)}
            placeholder="e.g. Bridal gown"
            autoFocus
          />
        )}
        <Textarea
          containerClassName="mt-5"
          label="Style notes"
          hint="Optional"
          rows={3}
          value={styleNotes}
          onChange={e => setStyleNotes(e.target.value)}
          placeholder="Fabric, colour, lapel, buttons, lining…"
        />

        <Overline className="mb-3 mt-8">Fabric and style</Overline>
        {photos.length > 0 && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1 pt-1.5 scrollbar-none">
            {photos.map((p, i) => {
              const kind = parseCaption(p.caption).kind;
              return (
                <div key={i} className="relative size-20 shrink-0 animate-scale-in">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
                  <img src={p.url} alt={p.caption} className="size-full rounded-[var(--radius-control)] object-cover" />
                  <span className="absolute inset-x-0 bottom-0 rounded-b-[var(--radius-control)] bg-black/55 py-0.5 text-center text-[9px] font-semibold uppercase tracking-wide text-white">
                    {kind}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPhotos(ps => ps.filter((_, j) => j !== i))}
                    aria-label="Remove photo"
                    className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-ink text-text-inverse shadow-[var(--shadow-xs)]"
                  >
                    <X size={13} strokeWidth={2.5} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => openPhotos("Fabric")}
            className="flex flex-col items-start gap-2 rounded-[var(--radius-card)] border border-dashed border-border-strong px-4 py-3.5 text-left transition-colors hover:border-ink"
          >
            <Camera size={20} strokeWidth={1.75} className="text-ink" />
            <span>
              <span className="block text-label font-semibold text-ink">Add fabric</span>
              <span className="block text-caption text-text-tertiary">Photo or swatch</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => openPhotos("Style")}
            className="flex flex-col items-start gap-2 rounded-[var(--radius-card)] border border-dashed border-border-strong px-4 py-3.5 text-left transition-colors hover:border-ink"
          >
            <Sparkles size={20} strokeWidth={1.75} className="text-ink" />
            <span>
              <span className="block text-label font-semibold text-ink">Add style</span>
              <span className="block text-caption text-text-tertiary">The look they want</span>
            </span>
          </button>
        </div>
        <AddMaterialSheet
          open={photoSheet}
          onOpenChange={setPhotoSheet}
          initialKind={photoKind}
          onPick={(url, caption) => setPhotos(ps => [...ps, { url, caption }])}
        />

        <Overline className="mb-3 mt-8">Price and payment</Overline>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Price"
            type="number"
            inputMode="decimal"
            min={0}
            prefix={symbol}
            placeholder="0"
            value={price}
            onChange={e => setPrice(e.target.value)}
            className="tabular"
          />
          <Input
            label="Deposit"
            hint="Optional"
            type="number"
            inputMode="decimal"
            min={0}
            prefix={symbol}
            placeholder="0"
            value={deposit}
            onChange={e => {
              setDeposit(e.target.value);
              setErrors(er => ({ ...er, deposit: undefined }));
            }}
            error={errors.deposit}
            className="tabular"
          />
        </div>
        {depositMinor > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-label font-semibold text-ink">Deposit paid by</p>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map(m => (
                <Chip key={m} size="sm" selected={depositMethod === m} onClick={() => setDepositMethod(m)}>
                  {m}
                </Chip>
              ))}
            </div>
          </div>
        )}
        {priceMinor > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-[var(--radius-card)] bg-surface-sunken/70 px-4 py-3">
            <span className="text-label text-text-secondary">Balance after deposit</span>
            <span className="tabular text-[15px] font-semibold text-ink">
              {formatMoney(Math.max(0, priceMinor - depositMinor), currency)}
            </span>
          </div>
        )}

        <Overline className="mb-3 mt-8">Delivery</Overline>
        <div className="mb-3 flex items-end justify-between gap-3 px-1">
          <div>
            <p className="text-caption text-text-tertiary">Ready by</p>
            <p className="text-[20px] font-semibold leading-tight tracking-tight text-ink">
              {dueDate ? fromLocalISO(dueDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" }) : "Pick a date"}
            </p>
          </div>
          {dueDate && (
            <span className="tabular rounded-full bg-olive-soft px-2.5 py-1 text-caption font-semibold text-olive">
              {(() => {
                const d = daysUntil(fromLocalISO(dueDate));
                return d <= 0 ? "Today" : d === 1 ? "Tomorrow" : `In ${d} days`;
              })()}
            </span>
          )}
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {DUE_PRESETS.map(p => (
            <Chip key={p.label} size="sm" selected={dueDate === isoDate(p.days)} onClick={() => setDueDate(isoDate(p.days))}>
              {p.label}
            </Chip>
          ))}
        </div>
        <Calendar value={dueDate} onChange={setDueDate} min={isoDate(0)} markers={dueMarkers} />
        {dueMarkers[dueDate] ? (
          <p className="mt-2 px-1 text-caption text-warning">
            {dueMarkers[dueDate]} other order{dueMarkers[dueDate] > 1 ? "s are" : " is"} already due this day.
          </p>
        ) : (
          <p className="mt-2 px-1 text-caption text-text-tertiary">Dots mark days that already have orders due.</p>
        )}
        <Textarea
          containerClassName="mt-5"
          label="Order note"
          hint="Optional"
          rows={2}
          value={orderNote}
          onChange={e => setOrderNote(e.target.value)}
          placeholder="Anything the workshop should know"
        />
      </PageBody>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-canvas/[0.97] backdrop-blur-xl lg:pl-64">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-6 lg:px-10">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-caption text-text-tertiary">
              {garmentName && <GarmentIcon garment={garmentName} size={16} label="" />}
              {garmentName || "No garment chosen"}
            </p>
            <p className="tabular truncate text-[15px] font-semibold text-ink">{formatMoney(priceMinor, currency)}</p>
          </div>
          <Button size="lg" onClick={create} loading={saving} disabled={!client}>
            <Check />
            Create order
          </Button>
        </div>
      </div>
    </>
  );
}

export default function NewOrderPage() {
  return (
    <Suspense>
      <NewOrderPageInner />
    </Suspense>
  );
}
