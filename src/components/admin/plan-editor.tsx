"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminRequest } from "@/components/admin/request";
import { cn } from "@/lib/utils";

interface Price {
  interval: "monthly" | "yearly";
  currency: string;
  amountMinor: number;
}
export interface EditablePlan {
  key: string;
  name: string;
  tagline: string;
  features: string[];
  maxClients: number | null;
  customBranding: boolean;
  explorePosting: boolean;
  active: boolean;
  isDefault: boolean;
  sortOrder: number;
  revenuecatEntitlement: string | null;
  prices: Price[];
  subscribers: number;
}

const input =
  "w-full rounded-[var(--radius-input)] border border-border bg-surface-raised px-3.5 py-2.5 text-[15px] text-ink focus:border-olive focus:outline-none focus:ring-4 focus:ring-olive/12";

function Check({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className={cn("flex items-center gap-2.5 text-label font-medium text-ink", disabled && "opacity-50")}>
      <input type="checkbox" className="size-4 accent-[#454F2C]" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function PlanEditor({ plan }: { plan: EditablePlan }) {
  const router = useRouter();
  const [p, setP] = React.useState(plan);
  const [features, setFeatures] = React.useState(plan.features.join("\n"));
  const [busy, setBusy] = React.useState(false);
  const set = <K extends keyof EditablePlan>(k: K, v: EditablePlan[K]) => setP(prev => ({ ...prev, [k]: v }));
  const setPrice = (i: number, patch: Partial<Price>) => set("prices", p.prices.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const save = async () => {
    setBusy(true);
    try {
      await adminRequest(`/api/admin/plans/${plan.key}`, "PATCH", {
        name: p.name,
        tagline: p.tagline,
        features: features.split("\n").map(f => f.trim()).filter(Boolean),
        maxClients: p.maxClients,
        customBranding: p.customBranding,
        explorePosting: p.explorePosting,
        active: p.active,
        sortOrder: p.sortOrder,
        revenuecatEntitlement: p.revenuecatEntitlement?.trim() || null,
        prices: p.prices,
      });
      toast.success(`${p.name} saved`);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-[var(--radius-card)] border border-border/70 bg-surface p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-headline text-ink">
            {p.name} <span className="text-label font-medium text-text-tertiary">· {plan.key}</span>
          </h2>
          <p className="text-label text-text-tertiary">
            {plan.isDefault ? "Everyone without a paid subscription is on this plan." : `${plan.subscribers} current ${plan.subscribers === 1 ? "subscriber" : "subscribers"}`}
          </p>
        </div>
        <Check checked={p.active} onChange={v => set("active", v)} label="Offered to customers" disabled={plan.isDefault} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-label font-semibold text-ink">
          Name
          <input className={cn(input, "mt-2")} value={p.name} maxLength={40} onChange={e => set("name", e.target.value)} />
        </label>
        <label className="text-label font-semibold text-ink">
          Tagline
          <input className={cn(input, "mt-2")} value={p.tagline} maxLength={120} onChange={e => set("tagline", e.target.value)} />
        </label>
        <label className="text-label font-semibold text-ink sm:col-span-2">
          Selling points <span className="font-medium text-text-tertiary">(one per line, shown on the upgrade screen)</span>
          <textarea className={cn(input, "mt-2")} rows={3} value={features} onChange={e => setFeatures(e.target.value)} />
        </label>
      </div>

      <h3 className="mb-3 mt-6 text-label font-semibold uppercase tracking-wide text-text-tertiary">What&rsquo;s included</h3>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="flex items-center gap-2.5 text-label font-medium text-ink">
          Client limit
          <input
            className={cn(input, "w-28 py-1.5")}
            inputMode="numeric"
            placeholder="Unlimited"
            value={p.maxClients ?? ""}
            onChange={e => set("maxClients", e.target.value.trim() ? Math.max(1, parseInt(e.target.value.replace(/\D/g, "")) || 1) : null)}
          />
        </label>
        <Check checked={p.customBranding} onChange={v => set("customBranding", v)} label="Studio logo on documents" />
        <Check checked={p.explorePosting} onChange={v => set("explorePosting", v)} label="Post to Explore" />
      </div>

      {!plan.isDefault && (
        <>
          <h3 className="mb-3 mt-6 text-label font-semibold uppercase tracking-wide text-text-tertiary">Prices (web, via Paystack)</h3>
          <div className="space-y-2">
            {p.prices.map((price, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <select className={cn(input, "w-32 py-2")} value={price.interval} onChange={e => setPrice(i, { interval: e.target.value as Price["interval"] })} aria-label="Billing period">
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <input className={cn(input, "w-24 py-2 uppercase")} maxLength={3} value={price.currency} onChange={e => setPrice(i, { currency: e.target.value.toUpperCase() })} aria-label="Currency" />
                <input
                  className={cn(input, "w-36 py-2 tabular")}
                  inputMode="decimal"
                  value={price.amountMinor / 100}
                  onChange={e => setPrice(i, { amountMinor: Math.round((parseFloat(e.target.value) || 0) * 100) })}
                  aria-label="Amount"
                />
                <button type="button" onClick={() => set("prices", p.prices.filter((_, j) => j !== i))} className="rounded-full p-2 text-text-tertiary hover:bg-surface-sunken hover:text-danger" aria-label="Remove price">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => set("prices", [...p.prices, { interval: "monthly", currency: "NGN", amountMinor: 500000 }])}
              className="inline-flex items-center gap-1.5 text-label font-semibold text-olive"
            >
              <Plus size={16} /> Add a price
            </button>
          </div>
          <p className="mt-2 text-caption text-text-tertiary">
            Changing an amount only affects new subscribers. Existing ones keep their price until they change plan.
          </p>

          <h3 className="mb-3 mt-6 text-label font-semibold uppercase tracking-wide text-text-tertiary">Mobile app (App Store / Google Play)</h3>
          <label className="flex flex-wrap items-center gap-2.5 text-label font-medium text-ink">
            RevenueCat entitlement ID
            <input className={cn(input, "w-48 py-1.5")} value={p.revenuecatEntitlement ?? ""} placeholder="e.g. pro" onChange={e => set("revenuecatEntitlement", e.target.value)} />
          </label>
          <p className="mt-2 text-caption text-text-tertiary">
            In-app prices are set in App Store Connect and Google Play Console. Purchases granting this entitlement put people on this plan.
          </p>
        </>
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={save} loading={busy}>Save {p.name}</Button>
      </div>
    </section>
  );
}

export function NewPlanForm() {
  const router = useRouter();
  const [key, setKey] = React.useState("");
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={async e => {
        e.preventDefault();
        setBusy(true);
        try {
          await adminRequest("/api/admin/plans", "POST", { key, name });
          toast.success("Plan created. Set its prices and limits, then switch it on.");
          setKey("");
          setName("");
          router.refresh();
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <input className={cn(input, "sm:w-40")} placeholder="key, e.g. studio" value={key} onChange={e => setKey(e.target.value.toLowerCase())} required aria-label="Plan key" />
      <input className={cn(input, "flex-1")} placeholder="Name, e.g. Studio" value={name} onChange={e => setName(e.target.value)} required aria-label="Plan name" />
      <Button type="submit" variant="secondary" loading={busy}>Add plan</Button>
    </form>
  );
}
