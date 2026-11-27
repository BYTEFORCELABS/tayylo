"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminRequest } from "@/components/admin/request";

const input =
  "w-full rounded-[var(--radius-input)] border border-border bg-surface-raised px-3 py-2 text-[14px] text-ink focus:border-olive focus:outline-none focus:ring-4 focus:ring-olive/12";

/** Give someone a paid plan for free: a promotion, a partner, or to make up for a problem. */
export function GrantPlanForm({ userId, plans }: { userId: string; plans: { key: string; name: string }[] }) {
  const router = useRouter();
  const [planKey, setPlanKey] = React.useState(plans[0]?.key ?? "");
  const [months, setMonths] = React.useState("1");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  if (!plans.length) return <p className="text-label text-text-tertiary">Add a paid plan first.</p>;

  return (
    <form
      className="space-y-3"
      onSubmit={async e => {
        e.preventDefault();
        setBusy(true);
        try {
          const until = months === "forever" ? null : new Date(Date.now() + Number(months) * 30 * 864e5).toISOString();
          await adminRequest(`/api/admin/users/${userId}/subscription`, "PUT", { planKey, until, note });
          toast.success("Plan given");
          setNote("");
          router.refresh();
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <select className={input} value={planKey} onChange={e => setPlanKey(e.target.value)} aria-label="Plan">
          {plans.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
        </select>
        <select className={input} value={months} onChange={e => setMonths(e.target.value)} aria-label="For how long">
          <option value="1">1 month</option>
          <option value="3">3 months</option>
          <option value="6">6 months</option>
          <option value="12">12 months</option>
          <option value="forever">Until removed</option>
        </select>
      </div>
      <input className={input} value={note} onChange={e => setNote(e.target.value)} placeholder="Why? e.g. Launch partner" required minLength={3} maxLength={300} aria-label="Reason" />
      <Button type="submit" size="sm" variant="secondary" loading={busy}>Give for free</Button>
    </form>
  );
}
