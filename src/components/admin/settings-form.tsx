"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminRequest } from "@/components/admin/request";
import type { AppSettings } from "@/lib/app-settings";
import { cn } from "@/lib/utils";

function Toggle({ checked, onChange, label, description, danger }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
  danger?: boolean;
}) {
  const id = React.useId();
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div>
        <label htmlFor={id} className="text-[15px] font-semibold text-ink">{label}</label>
        <p className="mt-0.5 text-label text-text-tertiary">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? (danger ? "bg-danger" : "bg-olive") : "bg-border-strong"
        )}
      >
        <span className={cn("absolute left-0 top-0.5 size-6 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
      </button>
    </div>
  );
}

const inputCls =
  "w-full rounded-[var(--radius-input)] border border-border bg-surface-raised px-3.5 py-2.5 text-[15px] text-ink focus:border-olive focus:outline-none focus:ring-4 focus:ring-olive/12 disabled:opacity-50";

export function SettingsForm({ initial, canEdit }: { initial: AppSettings; canEdit: boolean }) {
  const router = useRouter();
  const [s, setS] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => setS(prev => ({ ...prev, [k]: v }));
  const dirty = JSON.stringify(s) !== JSON.stringify(initial);

  const save = async () => {
    if (s.maintenanceMode && !initial.maintenanceMode && !window.confirm("Turn on maintenance mode? Everyone except Tayylo staff will be locked out of the web and mobile apps.")) return;
    setBusy(true);
    try {
      const saved = await adminRequest("/api/admin/settings", "PATCH", s);
      setS(saved);
      toast.success("Saved. Apps pick this up within a minute.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <fieldset disabled={!canEdit} className="space-y-6">
      <section className="rounded-[var(--radius-card)] border border-border/70 bg-surface px-5 sm:px-6">
        <h2 className="pt-5 text-headline text-ink">Availability</h2>
        <div className="divide-y divide-divider">
          <Toggle
            danger
            checked={s.maintenanceMode}
            onChange={v => set("maintenanceMode", v)}
            label="Maintenance mode"
            description="Locks the web and mobile apps for everyone except staff. Use during migrations or incidents."
          />
          {s.maintenanceMode && (
            <div className="pb-4">
              <label className="text-label font-semibold text-ink">
                Message people see
                <input className={cn(inputCls, "mt-2")} value={s.maintenanceMessage} maxLength={280} onChange={e => set("maintenanceMessage", e.target.value)} />
              </label>
            </div>
          )}
          <Toggle
            checked={s.signupsEnabled}
            onChange={v => set("signupsEnabled", v)}
            label="New sign-ups"
            description="When off, nobody can create an account (email, Apple or Google). Existing users can still sign in."
          />
          <Toggle
            checked={s.explorePostingEnabled}
            onChange={v => set("explorePostingEnabled", v)}
            label="Posting to Explore"
            description="When off, tailors can still browse Explore but can't publish new styles."
          />
        </div>
      </section>

      <section className="space-y-4 rounded-[var(--radius-card)] border border-border/70 bg-surface p-5 sm:p-6">
        <div>
          <h2 className="text-headline text-ink">Announcement banner</h2>
          <p className="mt-0.5 text-label text-text-tertiary">Shown at the top of the web app (and the mobile app once it reads /api/app-config). Leave empty for none.</p>
        </div>
        <textarea className={inputCls} rows={2} maxLength={280} value={s.announcement} onChange={e => set("announcement", e.target.value)} placeholder="e.g. Invoices now support multiple bank accounts." />
        <div className="flex gap-2">
          {(["info", "warning"] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => set("announcementTone", t)}
              aria-pressed={s.announcementTone === t}
              className={cn(
                "rounded-full border px-4 py-1.5 text-label font-semibold capitalize",
                s.announcementTone === t ? "border-olive bg-olive-soft text-olive-deep" : "border-border text-text-secondary"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-[var(--radius-card)] border border-border/70 bg-surface p-5 sm:p-6">
        <div>
          <h2 className="text-headline text-ink">Minimum mobile app version</h2>
          <p className="mt-0.5 text-label text-text-tertiary">Builds older than this should ask people to update. Leave empty for no minimum.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-label font-semibold text-ink">
            iOS
            <input className={cn(inputCls, "mt-2")} value={s.minIosVersion} placeholder="e.g. 1.2.0" onChange={e => set("minIosVersion", e.target.value)} />
          </label>
          <label className="text-label font-semibold text-ink">
            Android
            <input className={cn(inputCls, "mt-2")} value={s.minAndroidVersion} placeholder="e.g. 1.2.0" onChange={e => set("minAndroidVersion", e.target.value)} />
          </label>
        </div>
      </section>

      {canEdit && (
        <div className="sticky bottom-4 flex justify-end gap-2">
          {dirty && <Button variant="secondary" onClick={() => setS(initial)}>Discard</Button>}
          <Button onClick={save} loading={busy} disabled={!dirty}>Save changes</Button>
        </div>
      )}
    </fieldset>
  );
}
