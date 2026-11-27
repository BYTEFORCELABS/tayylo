import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStaffPage } from "@/lib/admin/auth";
import { subscriptionStats } from "@/lib/admin/stats";
import { getAppSettings } from "@/lib/app-settings";
import { liveSubscriptionWhere } from "@/lib/billing/plans";
import { formatMoney } from "@/lib/format";
import { FilterTabs, PageHeader, Pill, RankedList, Section, Stat, shortDate } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Subscriptions" };

const PROVIDER = { paystack: "Paystack", apple: "App Store", google: "Google Play", manual: "Free (by Tayylo)" } as Record<string, string>;
const STATUS_TONE = { active: "success", trialing: "info", past_due: "warning", cancelled: "neutral", expired: "danger" } as const;
const STATUS_LABEL: Record<string, string> = { active: "Active", trialing: "Trial", past_due: "Payment failed", cancelled: "Cancelling", expired: "Ended" };
const VIEWS = [
  { key: "live", label: "Current" },
  { key: "past_due", label: "Payment failed" },
  { key: "cancelling", label: "Cancelling" },
  { key: "ended", label: "Ended" },
];

type Params = { view?: string; plan?: string; provider?: string };

const money = (list: { currency: string; minor: number }[]) =>
  list.length ? list.map(m => formatMoney(m.minor, m.currency, { compact: true })).join(" · ") : "—";

export default async function SubscriptionsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const staff = await requireStaffPage();
  const sp = await searchParams;
  const view = VIEWS.some(v => v.key === sp.view) ? sp.view! : "live";
  const live = liveSubscriptionWhere();

  const where: Prisma.SubscriptionWhereInput = {
    ...(view === "live" ? live : {}),
    ...(view === "past_due" ? { ...live, status: "past_due" } : {}),
    ...(view === "cancelling" ? { ...live, cancelAtPeriodEnd: true } : {}),
    ...(view === "ended" ? { NOT: live } : {}),
    ...(sp.plan ? { planKey: sp.plan } : {}),
    ...(sp.provider ? { provider: sp.provider } : {}),
  };

  const [stats, subs, settings] = await Promise.all([
    subscriptionStats(),
    prisma.subscription.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 200,
      include: { plan: { select: { name: true } }, user: { select: { id: true, email: true, name: true, business: { select: { name: true } } } } },
    }),
    getAppSettings(),
  ]);
  const link = (patch: Partial<Params>) => {
    const p = new URLSearchParams();
    Object.entries({ view, plan: sp.plan, provider: sp.provider, ...patch }).forEach(([k, v]) => v && !(k === "view" && v === "live") && p.set(k, v));
    const s = p.toString();
    return `/subscriptions${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Subscriptions"
        description="Who pays, who's on the free plan, and what it's worth."
        actions={
          staff.staffRole === "owner" ? (
            <Link href="/plans" className="rounded-full bg-olive px-5 py-2.5 text-sm font-semibold !text-text-inverse hover:bg-olive-deep">
              Edit plans &amp; prices
            </Link>
          ) : undefined
        }
      />

      {!settings.billingEnabled && (
        <Link href="/settings" className="mb-6 block rounded-[var(--radius-card)] bg-info-bg px-4 py-3 text-label font-medium !text-info">
          Subscriptions are off: everyone gets the {stats.freePlanName} plan with no limits, and nobody can upgrade yet. Switch them on in App controls once Paystack is set up →
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Paying subscribers" value={stats.paying} sub={`${stats.newPaid30} new in 30 days`} />
        <Stat label={`On ${stats.freePlanName}`} value={stats.freeTailors} sub="tailors" href="/users?plan=free" />
        <Stat label="Monthly recurring revenue" value={money(stats.mrr)} sub="yearly plans counted per month" />
        <Stat label="Collected, 30 days" value={money(stats.revenue30)} sub="web and app store payments" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Payment failed" value={stats.pastDue} sub="provider is retrying" href="/subscriptions?view=past_due" />
        <Stat label="Cancelling" value={stats.cancelling} sub="paid until period ends" href="/subscriptions?view=cancelling" />
        <Stat label="Ended, 30 days" value={stats.churn30} href="/subscriptions?view=ended" />
        <Stat label="Given free" value={stats.complimentary} sub="complimentary plans" href="/subscriptions?provider=manual" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Section title="Paid users by plan">
          <RankedList items={stats.byPlan} unit="users" empty="No paid plans yet." />
        </Section>
        <Section title="Where they pay">
          <RankedList items={stats.byProvider.filter(p => p.count)} unit="users" empty="Nobody has subscribed yet." />
        </Section>
      </div>

      <div className="mb-4 mt-8 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs options={VIEWS} value={view} hrefFor={k => link({ view: k })} />
        {(sp.plan || sp.provider) && (
          <Link href={link({ plan: undefined, provider: undefined })} className="text-label font-semibold !text-olive">
            Clear filters ({[sp.plan, sp.provider && PROVIDER[sp.provider]].filter(Boolean).join(", ")}) ×
          </Link>
        )}
      </div>
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border/70 bg-surface">
        <table className="w-full min-w-[760px] text-left text-label">
          <thead className="border-b border-divider text-caption uppercase tracking-wide text-text-tertiary">
            <tr>
              <th className="px-5 py-3 font-semibold">Subscriber</th>
              <th className="px-3 py-3 font-semibold">Plan</th>
              <th className="px-3 py-3 font-semibold">Pays via</th>
              <th className="px-3 py-3 font-semibold">Price</th>
              <th className="px-3 py-3 font-semibold">Renews / ends</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider">
            {subs.map(s => (
              <tr key={s.id} className="hover:bg-beige-light/50">
                <td className="max-w-[260px] px-5 py-3">
                  <Link href={`/users/${s.user.id}`} className="block">
                    <span className="block truncate font-semibold text-ink hover:underline">{s.user.business?.name || s.user.name || s.user.email}</span>
                    <span className="block truncate text-caption text-text-tertiary">{s.user.email}</span>
                  </Link>
                </td>
                <td className="px-3 py-3 text-text-secondary">{s.plan.name}</td>
                <td className="px-3 py-3 text-text-secondary">{PROVIDER[s.provider] ?? s.provider}</td>
                <td className="px-3 py-3 text-text-secondary tabular">
                  {s.provider === "manual" ? "Free" : s.amountMinor && s.currency ? `${formatMoney(s.amountMinor, s.currency)}/${s.interval === "yearly" ? "yr" : "mo"}` : "—"}
                </td>
                <td className="px-3 py-3 text-text-secondary tabular">{s.currentPeriodEnd ? shortDate(s.currentPeriodEnd) : "No end date"}</td>
                <td className="px-5 py-3">
                  <Pill tone={STATUS_TONE[s.status as keyof typeof STATUS_TONE] ?? "neutral"}>{STATUS_LABEL[s.status] ?? s.status}</Pill>
                </td>
              </tr>
            ))}
            {!subs.length && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-text-tertiary">No subscriptions here.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
