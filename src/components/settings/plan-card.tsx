"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/choice";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Billing {
  billingEnabled: boolean;
  checkout: { web: boolean };
  currency: string;
  plan: { key: string; name: string; paid: boolean; limits: { maxClients: number | null } };
  subscription: { status: string; provider: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean } | null;
  usage: { clients: number };
  plans: { key: string; name: string; tagline: string; features: string[]; isDefault: boolean; prices: { interval: string; currency: string; amountMinor: number }[] }[];
}

async function post(url: string, body?: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Something went wrong");
  return json;
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Settings → Plan: current plan, usage, upgrade (Paystack) and manage billing. Hidden until billing is switched on. */
export function PlanCard() {
  const params = useSearchParams();
  const router = useRouter();
  const [b, setB] = React.useState<Billing | null>(null);
  const [interval, setInterval] = React.useState<"monthly" | "yearly">("monthly");
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(() => fetch("/api/billing").then(r => (r.ok ? r.json() : null)).then(setB).catch(() => {}), []);
  React.useEffect(() => {
    load();
  }, [load]);

  // Back from Paystack: the webhook may land a moment after the redirect.
  React.useEffect(() => {
    if (params.get("billing") !== "success") return;
    toast.success("Payment received. Your plan updates in a moment.");
    const t = setTimeout(load, 4000);
    router.replace("/settings");
    return () => clearTimeout(t);
  }, [params, load, router]);

  if (!b?.billingEnabled) return null;

  const upgrade = async (planKey: string) => {
    setBusy(planKey);
    try {
      const { url } = await post("/api/billing/checkout", { planKey, interval, currency: b.currency });
      window.location.assign(url);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(null);
    }
  };
  const manage = async () => {
    setBusy("manage");
    try {
      const { url } = await post("/api/billing/manage");
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const priceOf = (p: Billing["plans"][number]) =>
    p.prices.find(x => x.interval === interval && x.currency === b.currency) ?? p.prices.find(x => x.interval === interval);
  const offers = b.plans.filter(p => !p.isDefault && p.key !== b.plan.key && priceOf(p));
  const max = b.plan.limits.maxClients;
  const sub = b.subscription;

  return (
    <section className="rounded-[var(--radius-panel)] border border-border/70 bg-surface p-5" aria-label="Plan">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-overline uppercase text-text-tertiary">Your plan</p>
          <p className="mt-1 text-[22px] font-semibold text-ink">{b.plan.name}</p>
          {sub && (
            <p className="mt-0.5 text-label text-text-secondary">
              {sub.status === "past_due"
                ? "Your last payment didn't go through. Update your card to keep your plan."
                : sub.currentPeriodEnd
                  ? `${sub.cancelAtPeriodEnd ? "Ends" : "Renews"} ${shortDate(sub.currentPeriodEnd)}`
                  : "Active"}
            </p>
          )}
        </div>
        {b.plan.paid && sub && sub.provider !== "manual" && (
          <Button variant="secondary" size="sm" onClick={manage} loading={busy === "manage"}>
            Manage billing
          </Button>
        )}
      </div>

      {max !== null && (
        <div className="mt-4">
          <div className="flex justify-between text-label">
            <span className="text-text-secondary">Clients</span>
            <span className="font-semibold text-ink tabular">
              {b.usage.clients} of {max}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
            <div className={cn("h-full rounded-full", b.usage.clients >= max ? "bg-danger" : "bg-olive")} style={{ width: `${Math.min(100, (b.usage.clients / max) * 100)}%` }} />
          </div>
        </div>
      )}

      {offers.length > 0 && b.checkout.web && (
        <div className="mt-5 border-t border-divider pt-5">
          <SegmentedControl
            ariaLabel="Billing period"
            size="sm"
            value={interval}
            onChange={setInterval}
            options={[
              { value: "monthly", label: "Monthly" },
              { value: "yearly", label: "Yearly" },
            ]}
          />
          <div className="mt-4 space-y-3">
            {offers.map(p => {
              const price = priceOf(p)!;
              return (
                <div key={p.key} className="rounded-[var(--radius-card)] border border-olive/30 bg-olive-soft/40 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-headline text-ink">
                      <Sparkles size={16} className="text-olive" aria-hidden /> {p.name}
                    </p>
                    <p className="text-label text-text-secondary">
                      <span className="text-[18px] font-semibold text-ink tabular">{formatMoney(price.amountMinor, price.currency)}</span> / {interval === "yearly" ? "year" : "month"}
                    </p>
                  </div>
                  {p.tagline && <p className="mt-0.5 text-label text-text-secondary">{p.tagline}</p>}
                  {p.features.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {p.features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-label text-ink">
                          <Check size={15} className="mt-0.5 shrink-0 text-olive" aria-hidden /> {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button block className="mt-4" onClick={() => upgrade(p.key)} loading={busy === p.key}>
                    Upgrade to {p.name}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

/** Product updates and promotions: email and push switches. */
export function UpdatesPreferences() {
  const [prefs, setPrefs] = React.useState<{ marketingEmails: boolean; pushNotifications: boolean } | null>(null);
  React.useEffect(() => {
    fetch("/api/me/preferences").then(r => (r.ok ? r.json() : null)).then(setPrefs).catch(() => {});
  }, []);
  if (!prefs) return null;

  const update = async (patch: Partial<typeof prefs>) => {
    const before = prefs;
    setPrefs({ ...prefs, ...patch });
    const res = await fetch("/api/me/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).catch(() => null);
    if (!res?.ok) {
      setPrefs(before);
      toast.error("Couldn't save that. Try again.");
    }
  };

  return (
    <section className="rounded-[var(--radius-panel)] border border-border/70 bg-surface px-5 py-2" aria-label="Updates from Tayylo">
      <div className="divide-y divide-divider">
        <SwitchRow on={prefs.marketingEmails} onToggle={() => update({ marketingEmails: !prefs.marketingEmails })} title="News by email" subtitle="New templates, features and offers from Tayylo" />
        <SwitchRow on={prefs.pushNotifications} onToggle={() => update({ pushNotifications: !prefs.pushNotifications })} title="News on your phone" subtitle="The same updates as push notifications in the app" />
      </div>
    </section>
  );
}

function SwitchRow({ on, onToggle, title, subtitle }: { on: boolean; onToggle: () => void; title: string; subtitle: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-[15px] font-semibold text-ink">{title}</p>
        <p className="text-label text-text-tertiary">{subtitle}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={title}
        onClick={onToggle}
        className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", on ? "bg-olive" : "bg-border-strong")}
      >
        <span className={cn("absolute left-0 top-0.5 size-6 rounded-full bg-white shadow transition-transform", on ? "translate-x-[22px]" : "translate-x-0.5")} />
      </button>
    </div>
  );
}
