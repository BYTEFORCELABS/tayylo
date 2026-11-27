import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronRight, CircleSlash, ShieldAlert, CreditCard, Power } from "lucide-react";
import { requireStaffPage } from "@/lib/admin/auth";
import { overview, subscriptionStats } from "@/lib/admin/stats";
import { getAppSettings } from "@/lib/app-settings";
import { formatMoney } from "@/lib/format";
import { PageHeader, Stat } from "@/components/admin/ui";
import { TrendChart } from "@/components/admin/trend-chart";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const staff = await requireStaffPage();
  const [o, settings, subs, { denied }] = await Promise.all([overview(), getAppSettings(), subscriptionStats(), searchParams]);

  // Only things someone should act on. Empty = nothing shown.
  const attention = [
    settings.maintenanceMode && { icon: Power, tone: "danger", text: "Maintenance mode is on. Nobody can use the apps.", href: "/settings" },
    !settings.signupsEnabled && { icon: Power, tone: "warning", text: "New sign-ups are paused", href: "/settings" },
    !settings.explorePostingEnabled && { icon: Power, tone: "warning", text: "Explore posting is paused", href: "/settings" },
    o.explore.reportedPosts > 0 && { icon: ShieldAlert, tone: "warning", text: `${o.explore.reportedPosts} reported Explore ${o.explore.reportedPosts === 1 ? "post needs" : "posts need"} review`, href: "/moderation" },
    subs.pastDue > 0 && { icon: CreditCard, tone: "warning", text: `${subs.pastDue} ${subs.pastDue === 1 ? "subscriber's payment" : "subscribers' payments"} failed`, href: "/subscriptions?view=past_due" },
  ].filter(Boolean) as { icon: typeof Power; tone: "danger" | "warning"; text: string; href: string }[];

  const mrr = subs.mrr.length ? subs.mrr.map(m => formatMoney(m.minor, m.currency, { compact: true })).join(" · ") : null;
  const servicesUp = o.health.services.filter(s => s.ok).length;
  const firstName = (staff.name || "").split(" ")[0];

  return (
    <>
      <PageHeader title={firstName ? `Hello, ${firstName}` : "Overview"} description="How Tayylo is doing across the web and mobile apps." />

      {denied && (
        <p className="mb-5 rounded-[var(--radius-card)] bg-warning-bg px-4 py-3 text-label font-medium text-warning">Your access level can&rsquo;t open that page.</p>
      )}

      {attention.length > 0 && (
        <section aria-label="Needs attention" className="mb-6 overflow-hidden rounded-[var(--radius-card)] border border-border/70 bg-surface">
          {attention.map(a => (
            <Link key={a.text} href={a.href} className="flex items-center gap-3 border-b border-divider px-4 py-3 last:border-0 hover:bg-beige-light/50">
              <span className={a.tone === "danger" ? "flex size-8 items-center justify-center rounded-full bg-danger-bg text-danger" : "flex size-8 items-center justify-center rounded-full bg-warning-bg text-warning"}>
                <a.icon size={16} aria-hidden />
              </span>
              <span className="flex-1 text-label font-semibold !text-ink">{a.text}</span>
              <ChevronRight size={16} className="text-text-tertiary" aria-hidden />
            </Link>
          ))}
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Users" value={o.users.total} delta={[o.users.new7, o.users.newPrev7]} period="new vs last week" href="/users" />
        <Stat
          label="Active, last 30 days"
          value={o.active.month}
          sub={o.active.month ? `${o.active.web} web · ${o.active.app} app` : "No activity recorded yet"}
          href="/users?sort=active"
        />
        <Stat label="Paying subscribers" value={subs.paying} sub={mrr ? `${mrr} a month` : `${subs.freeTailors} tailors on ${subs.freePlanName}`} href="/subscriptions" />
        <Stat label="Orders, last 30 days" value={o.workspace.orders30} delta={[o.workspace.orders30, o.workspace.ordersPrev30]} period="vs previous 30" href="/insights" />
      </div>

      <div className="mt-6">
        <TrendChart
          series={[
            { key: "signups", label: "Sign-ups", unit: "sign-ups", data: o.series.signups },
            { key: "orders", label: "Orders", unit: "orders", data: o.series.orders },
          ]}
        />
      </div>

      <details className="group mt-6 rounded-[var(--radius-card)] border border-border/70 bg-surface">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
          {o.health.db.ok ? <CheckCircle2 size={18} className="text-success" aria-hidden /> : <AlertTriangle size={18} className="text-danger" aria-hidden />}
          <span className="flex-1 text-label">
            <span className="font-semibold text-ink">{o.health.db.ok ? "All systems running" : "Database unreachable"}</span>
            <span className="text-text-tertiary">
              {o.health.db.ok ? ` · database ${o.health.db.ms} ms` : ""} · {servicesUp} of {o.health.services.length} services set up
            </span>
          </span>
          <ChevronRight size={16} className="text-text-tertiary transition-transform group-open:rotate-90" aria-hidden />
        </summary>
        <ul className="grid gap-x-8 gap-y-2.5 border-t border-divider px-5 py-4 text-label sm:grid-cols-2">
          {o.health.services.map(s => (
            <li key={s.name} className="flex items-center gap-2">
              {s.ok ? <CheckCircle2 size={15} className="text-success" aria-hidden /> : <CircleSlash size={15} className="text-text-tertiary" aria-hidden />}
              <span className="flex-1 text-text-secondary">{s.name}</span>
              <span className={s.ok ? "font-medium text-ink" : "text-text-tertiary"}>{s.ok ? "Set up" : "Not set up"}</span>
            </li>
          ))}
          <li className="text-caption text-text-tertiary sm:col-span-2">{[o.health.env, o.health.region, o.health.commit && `build ${o.health.commit}`].filter(Boolean).join(" · ")}</li>
        </ul>
      </details>
    </>
  );
}
