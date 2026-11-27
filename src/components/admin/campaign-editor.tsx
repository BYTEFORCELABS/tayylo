"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mail, Smartphone, Send, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adminRequest } from "@/components/admin/request";
import { cn } from "@/lib/utils";

export interface CampaignDraft {
  id?: string;
  title: string;
  subject: string;
  body: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  sendEmail: boolean;
  sendPush: boolean;
  pushTitle: string | null;
  pushBody: string | null;
  audience: { roles: string[]; plans: string[]; countries: string[]; activeWithinDays: number | null };
}

const input =
  "w-full rounded-[var(--radius-input)] border border-border bg-surface-raised px-3.5 py-2.5 text-[15px] text-ink focus:border-olive focus:outline-none focus:ring-4 focus:ring-olive/12 disabled:opacity-60";

function Chips({ options, value, onChange, label }: { options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void; label: string }) {
  return (
    <div>
      <p className="mb-2 text-label font-semibold text-ink">
        {label} <span className="font-medium text-text-tertiary">{value.length ? "" : "· everyone"}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map(o => {
          const on = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter(v => v !== o.value) : [...value, o.value])}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-label font-semibold transition-colors",
                on ? "border-olive bg-olive-soft text-olive-deep" : "border-border text-text-secondary hover:border-border-strong"
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CampaignEditor({
  initial,
  plans,
  countries,
}: {
  initial: CampaignDraft;
  plans: { key: string; name: string }[];
  countries: string[];
}) {
  const router = useRouter();
  const [c, setC] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const [estimate, setEstimate] = React.useState<{ total: number; email: number; push: number } | null>(null);
  const [confirm, setConfirm] = React.useState(false);
  const [progress, setProgress] = React.useState<{ recipients: number; emailsSent: number; pushSent: number } | null>(null);
  const set = <K extends keyof CampaignDraft>(k: K, v: CampaignDraft[K]) => setC(prev => ({ ...prev, [k]: v }));
  const setAudience = (patch: Partial<CampaignDraft["audience"]>) => setC(prev => ({ ...prev, audience: { ...prev.audience, ...patch } }));
  const audienceKey = JSON.stringify(c.audience);

  React.useEffect(() => {
    const t = setTimeout(() => {
      adminRequest("/api/admin/campaigns/estimate", "POST", JSON.parse(audienceKey)).then(setEstimate).catch(() => setEstimate(null));
    }, 300);
    return () => clearTimeout(t);
  }, [audienceKey]);

  const payload = () => ({
    ...c,
    ctaLabel: c.ctaLabel?.trim() || null,
    ctaUrl: c.ctaUrl?.trim() || null,
    pushTitle: c.pushTitle?.trim() || null,
    pushBody: c.pushBody?.trim() || null,
  });

  /** Saves and returns the id. */
  const save = async (quiet = false) => {
    setSaving(true);
    try {
      const { id: _id, ...body } = payload();
      void _id;
      const saved = c.id
        ? await adminRequest(`/api/admin/campaigns/${c.id}`, "PATCH", body)
        : await adminRequest("/api/admin/campaigns", "POST", body);
      if (!c.id) {
        set("id", saved.id);
        window.history.replaceState(null, "", `/campaigns/${saved.id}`);
      }
      if (!quiet) toast.success("Draft saved");
      return saved.id as string;
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    const id = await save(true);
    if (!id) return;
    try {
      const { test } = await adminRequest(`/api/admin/campaigns/${id}/send`, "POST", { test: true });
      toast.success(
        [c.sendEmail && (test.email ? "Test email sent to you" : "Email isn't set up, so no test email"), c.sendPush && `${test.push} push to your devices`].filter(Boolean).join(" · ")
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const sendAll = async () => {
    const id = await save(true);
    if (!id) return;
    setConfirm(false);
    setProgress({ recipients: 0, emailsSent: 0, pushSent: 0 });
    try {
      for (let i = 0; i < 1000; i++) {
        const r = await adminRequest(`/api/admin/campaigns/${id}/send`, "POST", {});
        setProgress({ recipients: r.campaign.recipients, emailsSent: r.campaign.emailsSent, pushSent: r.campaign.pushSent });
        if (r.done) break;
        if (r.busy) await new Promise(res => setTimeout(res, 3000));
      }
      toast.success("Campaign sent");
      router.push(`/campaigns/${id}`);
      router.refresh();
    } catch (e) {
      toast.error(`${(e as Error).message}. Open the campaign again to resume sending.`);
    }
  };

  const reach = estimate ? (c.sendEmail ? estimate.email : 0) + (c.sendPush ? estimate.push : 0) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <section className="space-y-4 rounded-[var(--radius-card)] border border-border/70 bg-surface p-5 sm:p-6">
          <label className="block text-label font-semibold text-ink">
            Campaign name <span className="font-medium text-text-tertiary">(only staff see this)</span>
            <input className={cn(input, "mt-2")} value={c.title} maxLength={120} onChange={e => set("title", e.target.value)} placeholder="e.g. Agbada template launch" />
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { k: "sendEmail" as const, icon: Mail, label: "Email" },
              { k: "sendPush" as const, icon: Smartphone, label: "Mobile push" },
            ].map(({ k, icon: Icon, label }) => (
              <button
                key={k}
                type="button"
                aria-pressed={c[k]}
                onClick={() => set(k, !c[k])}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-label font-semibold",
                  c[k] ? "border-olive bg-olive-soft text-olive-deep" : "border-border text-text-secondary"
                )}
              >
                <Icon size={16} aria-hidden /> {label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-[var(--radius-card)] border border-border/70 bg-surface p-5 sm:p-6">
          <h2 className="text-headline text-ink">Message</h2>
          <label className="block text-label font-semibold text-ink">
            {c.sendEmail ? "Email subject" : "Headline"}
            <input className={cn(input, "mt-2")} value={c.subject} maxLength={150} onChange={e => set("subject", e.target.value)} placeholder="New: Agbada measurements are here" />
          </label>
          <label className="block text-label font-semibold text-ink">
            Message
            <textarea
              className={cn(input, "mt-2 min-h-48")}
              value={c.body}
              onChange={e => set("body", e.target.value)}
              placeholder={"Hi {name},\n\nWe've added an Agbada template with 14 measurements…"}
            />
            <span className="mt-1.5 block text-caption font-medium text-text-tertiary">Leave a blank line between paragraphs. {"{name}"} becomes each person&rsquo;s first name.</span>
          </label>
          <div className="grid gap-4 sm:grid-cols-[240px_1fr]">
            <label className="text-label font-semibold text-ink">
              Button text
              <input className={cn(input, "mt-2")} value={c.ctaLabel ?? ""} maxLength={40} onChange={e => set("ctaLabel", e.target.value)} placeholder="Try it now" />
            </label>
            <label className="text-label font-semibold text-ink">
              Button link
              <input className={cn(input, "mt-2")} value={c.ctaUrl ?? ""} onChange={e => set("ctaUrl", e.target.value)} placeholder="https://tayylo.com/measure" />
            </label>
          </div>
          {c.sendPush && (
            <div className="grid gap-4 border-t border-divider pt-4 sm:grid-cols-2">
              <label className="text-label font-semibold text-ink">
                Push title <span className="font-medium text-text-tertiary">(optional)</span>
                <input className={cn(input, "mt-2")} value={c.pushTitle ?? ""} maxLength={65} onChange={e => set("pushTitle", e.target.value)} placeholder={c.subject.slice(0, 65)} />
              </label>
              <label className="text-label font-semibold text-ink">
                Push text <span className="font-medium text-text-tertiary">(optional)</span>
                <input className={cn(input, "mt-2")} value={c.pushBody ?? ""} maxLength={178} onChange={e => set("pushBody", e.target.value)} placeholder="Defaults to the first line of the message" />
              </label>
            </div>
          )}
        </section>

        <section className="space-y-5 rounded-[var(--radius-card)] border border-border/70 bg-surface p-5 sm:p-6">
          <h2 className="text-headline text-ink">Audience</h2>
          <Chips label="Account type" value={c.audience.roles} onChange={roles => setAudience({ roles })} options={[{ value: "tailor", label: "Tailors" }, { value: "customer", label: "Customers" }]} />
          <Chips label="Plan" value={c.audience.plans} onChange={plans => setAudience({ plans })} options={plans.map(p => ({ value: p.key, label: p.name }))} />
          {countries.length > 0 && (
            <Chips label="Studio country" value={c.audience.countries} onChange={countries => setAudience({ countries })} options={countries.map(x => ({ value: x, label: x }))} />
          )}
          <label className="flex flex-wrap items-center gap-2 text-label font-semibold text-ink">
            Only people active in the last
            <select
              className={cn(input, "w-auto py-1.5")}
              value={c.audience.activeWithinDays ?? ""}
              onChange={e => setAudience({ activeWithinDays: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">any time</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
          </label>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <section className="rounded-[var(--radius-card)] border border-border/70 bg-surface p-5">
          <p className="text-label font-medium text-text-tertiary">Will reach</p>
          <p className="mt-1 text-[32px] font-semibold leading-none text-ink tabular">{reach ?? "…"}</p>
          {estimate && (
            <ul className="mt-3 space-y-1 text-label text-text-secondary">
              <li>{estimate.total} people match</li>
              {c.sendEmail && <li>{estimate.email} by email (not unsubscribed)</li>}
              {c.sendPush && <li>{estimate.push} by push (have the app, notifications on)</li>}
            </ul>
          )}
        </section>

        {progress ? (
          <section className="rounded-[var(--radius-card)] border border-border/70 bg-surface p-5">
            <p className="text-label font-semibold text-ink">Sending… keep this tab open</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-sunken">
              <div className="h-full rounded-full bg-olive transition-[width]" style={{ width: `${Math.max(5, Math.min(100, (progress.recipients / Math.max(1, Math.max(c.sendEmail ? estimate?.email ?? 0 : 0, c.sendPush ? estimate?.push ?? 0 : 0))) * 100))}%` }} />
            </div>
            <p className="mt-2 text-caption text-text-tertiary tabular">
              {progress.recipients} people · {progress.emailsSent} emails · {progress.pushSent} pushes
            </p>
          </section>
        ) : (
          <div className="flex flex-col gap-2">
            <Button variant="secondary" onClick={() => save()} loading={saving}>Save draft</Button>
            <Button variant="secondary" onClick={test} disabled={saving}>
              <FlaskConical aria-hidden /> Send a test to me
            </Button>
            <Button onClick={() => setConfirm(true)} disabled={saving || !reach}>
              <Send aria-hidden /> Send to {reach ?? 0} people
            </Button>
          </div>
        )}
      </aside>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send &ldquo;{c.subject}&rdquo;?</DialogTitle>
            <DialogDescription>
              It goes to {reach} {reach === 1 ? "person" : "people"} straight away and can&rsquo;t be unsent. Sent a test to yourself first?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirm(false)}>Not yet</Button>
            <Button onClick={sendAll}>Send now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
