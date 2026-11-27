import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleSlash, Database, ShieldAlert } from "lucide-react";
import { requireStaffPage } from "@/lib/admin/auth";
import { overview, subscriptionStats } from "@/lib/admin/stats";
import { getAppSettings } from "@/lib/app-settings";
import { formatMoney } from "@/lib/format";
import { PageHeader, Section, Stat, Pill } from "@/components/admin/ui";
import { DailyBars } from "@/components/admin/bar-chart";

export const metadata: Metadata = { title: "Overview" };

const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "—");

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  await requireStaffPage();
  const [o, settings, subs, { denied }] = await Promise.all([overview(), getAppSettings(), subscriptionStats(), searchParams]);
  const switchesOff = [
    settings.maintenanceMode && "Maintenance mode is ON",
    !settings.signupsEnabled && "Sign-ups are paused",
    !settings.explorePostingEnabled && "Explore posting is paused",
  ].filter(Boolean) as string[];

  return (
    <>
      <PageHeader title="Overview" description="How Tayylo is doing across the web and mobile apps." />

      {denied && (
        <p className="mb-6 rounded-[var(--radius-card)] bg-warning-bg px-4 py-3 text-label font-medium text-warning">
          Your access level can&rsquo;t open that page.
        </p>
      )}
      {switchesOff.length > 0 && (
        <Link href="/settings" className="mb-6 flex items-center gap-2 rounded-[var(--radius-card)] bg-danger-bg px-4 py-3 text-label font-semibold !text-danger">
          <ShieldAlert size={16} aria-hidden /> {switchesOff.join(" · ")}
        </Link>
      )}
      {o.explore.reportedPosts > 0 && (
        <Link href="/moderation" className="mb-6 flex items-center gap-2 rounded-[var(--radius-card)] bg-warning-bg px-4 py-3 text-label font-semibold !text-warning">
          <ShieldAlert size={16} aria-hidden /> {o.explore.reportedPosts} reported Explore {o.explore.reportedPosts === 1 ? "post needs" : "posts need"} review →
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total users" value={o.users.total} sub={`${o.users.tailors.toLocaleString()} tailors · ${o.users.customers.toLocaleString()} customers`} href="/users" />
        <Stat label="New this week" value={o.users.new7} delta={[o.users.new7, o.users.newPrev7]} />
        <Stat label="Active today" value={o.active.day} sub={`${o.active.week.toLocaleString()} this week`} />
        <Stat label="Active, 30 days" value={o.active.month} sub={`${pct(o.active.month, o.users.total)} of all users`} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="On the web" value={o.active.web} sub={`${pct(o.active.web, o.active.month)} of 30-day actives`} />
        <Stat label="On the mobile app" value={o.active.app} sub={`${pct(o.active.app, o.active.month)} of 30-day actives`} />
        <Stat label="Orders, 30 days" value={o.workspace.orders30} delta={[o.workspace.orders30, o.workspace.ordersPrev30]} />
        <Stat label="Measurements, 30 days" value={o.workspace.measurements30} sub={`${o.workspace.payments30.toLocaleString()} payments recorded`} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Paying subscribers" value={subs.paying} sub={`${subs.complimentary} on a free plan from Tayylo`} href="/subscriptions" />
        <Stat label={`Tailors on ${subs.freePlanName}`} value={subs.freeTailors} href="/users?plan=free" />
        <Stat label="Monthly recurring revenue" value={subs.mrr.length ? subs.mrr.map(m => formatMoney(m.minor, m.currency, { compact: true })).join(" · ") : "—"} href="/subscriptions" />
        <Stat label="Payment problems" value={subs.pastDue} sub={`${subs.cancelling} cancelling`} href="/subscriptions?view=past_due" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Sign-ups" description="New accounts per day, last 30 days (UTC)">
          <DailyBars data={o.series.signups} unit="sign-ups" title="Sign-ups per day" />
        </Section>
        <Section title="Orders created" description="New orders per day across all studios, last 30 days (UTC)">
          <DailyBars data={o.series.orders} unit="orders" title="Orders per day" />
        </Section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Section title="Workspace totals">
          <dl className="space-y-3 text-label">
            {[
              ["Studios", o.workspace.businesses],
              ["Clients saved", o.workspace.clients],
              ["Orders, all time", o.workspace.orders],
              ["Suspended accounts", o.users.suspended],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between">
                <dt className="text-text-secondary">{k}</dt>
                <dd className="font-semibold text-ink tabular">{(v as number).toLocaleString()}</dd>
              </div>
            ))}
          </dl>
        </Section>
        <Section title="Explore" action={<Link href="/moderation" className="text-label font-semibold !text-olive">Moderate →</Link>}>
          <dl className="space-y-3 text-label">
            {[
              ["Posts, all time", o.explore.posts],
              ["Posts, 30 days", o.explore.posts30],
              ["Posts with open reports", o.explore.reportedPosts],
              ["Hidden from everyone", o.explore.hiddenPosts],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between">
                <dt className="text-text-secondary">{k}</dt>
                <dd className="font-semibold text-ink tabular">{(v as number).toLocaleString()}</dd>
              </div>
            ))}
          </dl>
        </Section>
        <Section title="Platform health" description={[o.health.env, o.health.region, o.health.commit].filter(Boolean).join(" · ")}>
          <ul className="space-y-3 text-label">
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-text-secondary"><Database size={15} aria-hidden /> Database</span>
              {o.health.db.ok ? <Pill tone="success">Up · {o.health.db.ms} ms</Pill> : <Pill tone="danger">Down</Pill>}
            </li>
            {o.health.services.map(s => (
              <li key={s.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-text-secondary">
                  {s.ok ? <CheckCircle2 size={15} className="text-success" aria-hidden /> : <CircleSlash size={15} className="text-text-tertiary" aria-hidden />}
                  {s.name}
                </span>
                <span className="font-semibold text-ink">{s.ok ? "Configured" : "Not set up"}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
      <p className="mt-6 text-caption text-text-tertiary">
        &ldquo;Active&rdquo; means the account made a signed-in request in that window. Web vs app is read from the requesting client.
      </p>
    </>
  );
}
