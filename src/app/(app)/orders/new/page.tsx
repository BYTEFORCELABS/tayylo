"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/choice";
import { Input, Textarea } from "@/components/ui/input";
import { PageBody, PageHeader, Overline } from "@/components/ui/page";
import { ClientPicker } from "@/components/client-picker";
import { customerRepo, measurementRepo, orderRepo } from "@/lib/data/store";
import { getQueryData } from "@/lib/query";
import { qk, useCustomers } from "@/lib/queries";
import { useBusiness } from "@/lib/use-business";
import { currencySymbol, formatDate, formatMoney } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/orders";
import { AddMaterialSheet } from "@/components/order/materials";
import { makeThumbnail } from "@/lib/images";
import { parseCaption } from "@/lib/fabrics";
import type { Customer } from "@/types";

const GARMENT_TYPES = [
  "Shirt", "Trousers", "Suit", "Jacket", "Dress", "Skirt",
  "Agbada", "Kaftan", "Boubou", "Kurta", "Saree blouse", "Abaya",
];

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
    dueAt: dueDate ? new Date(dueDate).toISOString() : new Date(now + 14 * 86400000).toISOString(),
    itemId: `oi-${now}`,
    paymentId: `pay-${now}`,
    paidAt: new Date(now).toISOString(),
  };
}

function isoDate(daysFromNow: number) {
  const d = new Date(Date.now() + daysFromNow * 86400000);
  return d.toISOString().slice(0, 10);
}

function NewOrderPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clientId");
  const { currency } = useBusiness();
  const symbol = currencySymbol(currency);

  const [step, setStep] = React.useState<"client" | "details">(preselectedClientId ? "details" : "client");
  const clientsQ = useCustomers();
  const clients = clientsQ.data ?? [];
  const clientsLoading = !clientsQ.data;
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
      toast.success(`Order #${order.number} created`);
      router.push(`/orders/${order.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create the order");
      setSaving(false);
    }
  };

  if (step === "client") {
    return (
      <>
        <PageHeader variant="compact" eyebrow="New order · Step 1 of 2" title="Who is it for?" back={true} width="sm" />
        <PageBody width="sm" className="pb-10">
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
        width="sm"
        back={preselectedClientId ? true : undefined}
        onBack={preselectedClientId ? undefined : () => setStep("client")}
      />
      <PageBody width="sm" className="pb-40">
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
        <fieldset aria-describedby={errors.garment ? "garment-error" : undefined}>
          <legend className="sr-only">Garment type</legend>
          <div className="flex flex-wrap gap-2">
            {[...GARMENT_TYPES, "Other"].map(g => (
              <Chip
                key={g}
                selected={garment === g}
                onClick={() => {
                  setGarment(g);
                  setErrors(e => ({ ...e, garment: undefined }));
                }}
              >
                {g}
              </Chip>
            ))}
          </div>
          {errors.garment && (
            <p id="garment-error" role="alert" className="mt-2 text-caption font-medium text-danger">
              {errors.garment}
            </p>
          )}
        </fieldset>
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

        <Overline className="mb-3 mt-8">Fabric</Overline>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {photos.map((p, i) => (
            <div key={i} className="relative size-20 shrink-0 animate-scale-in">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
              <img src={p.url} alt={p.caption} className="size-full rounded-[var(--radius-control)] object-cover" />
              <button
                type="button"
                onClick={() => setPhotos(ps => ps.filter((_, j) => j !== i))}
                aria-label="Remove photo"
                className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-ink text-text-inverse shadow-[var(--shadow-xs)]"
              >
                <X size={13} strokeWidth={2.5} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setPhotoSheet(true)}
            className={
              photos.length
                ? "flex size-20 shrink-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] border border-dashed border-border-strong text-text-tertiary hover:border-ink hover:text-ink"
                : "flex h-20 w-full items-center justify-center gap-2.5 rounded-[var(--radius-card)] border border-dashed border-border-strong text-label font-semibold text-text-secondary hover:border-ink hover:text-ink"
            }
          >
            <Camera size={20} strokeWidth={1.75} />
            {photos.length ? <span className="text-[10px] font-semibold">Add</span> : "Photograph the client's fabric or pick a swatch"}
          </button>
        </div>
        <AddMaterialSheet
          open={photoSheet}
          onOpenChange={setPhotoSheet}
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
        <div className="mb-3 flex flex-wrap gap-2">
          {DUE_PRESETS.map(p => (
            <Chip key={p.label} size="sm" selected={dueDate === isoDate(p.days)} onClick={() => setDueDate(isoDate(p.days))}>
              {p.label}
            </Chip>
          ))}
        </div>
        <Input
          label="Due date"
          type="date"
          value={dueDate}
          min={isoDate(0)}
          onChange={e => setDueDate(e.target.value)}
          helperText={dueDate ? `Ready by ${formatDate(dueDate)}` : "Defaults to two weeks from today"}
        />
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

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-canvas/90 backdrop-blur-xl lg:pl-64">
        <div className="mx-auto flex max-w-xl items-center gap-4 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="truncate text-caption text-text-tertiary">{garmentName || "No garment chosen"}</p>
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
