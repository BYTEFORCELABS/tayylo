import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Plus, Smartphone } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaffPage } from "@/lib/admin/auth";
import { emailableWhere, pushableWhere } from "@/lib/marketing/audience";
import { PageHeader, Pill, Stat, shortDate } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Campaigns" };

export default async function CampaignsPage() {
  await requireStaffPage();
  const [campaigns, emailable, pushable, unsubscribed] = await Promise.all([
    prisma.campaign.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.user.count({ where: { ...emailableWhere, suspendedAt: null } }),
    prisma.user.count({ where: { ...pushableWhere, suspendedAt: null } }),
    prisma.user.count({ where: { marketingEmails: false } }),
  ]);

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Product updates and promotions by email and mobile push."
        actions={
          <Link href="/campaigns/new" className="inline-flex items-center gap-2 rounded-full bg-olive px-5 py-2.5 text-sm font-semibold !text-text-inverse hover:bg-olive-deep">
            <Plus size={18} aria-hidden /> New campaign
          </Link>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Reachable by email" value={emailable} sub={`${unsubscribed} unsubscribed`} />
        <Stat label="Reachable by push" value={pushable} sub="have the app with notifications on" />
      </div>
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-border/70 bg-surface">
        <ul className="divide-y divide-divider">
          {campaigns.map(c => (
            <li key={c.id}>
              <Link href={`/campaigns/${c.id}`} className="flex flex-col gap-2 px-5 py-4 hover:bg-beige-light/50 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-ink">{c.title}</p>
                  <p className="truncate text-caption text-text-tertiary">
                    {c.subject} · by {c.createdByEmail} · {shortDate(c.sentAt ?? c.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-caption text-text-secondary">
                  {c.sendEmail && <span className="inline-flex items-center gap-1"><Mail size={14} aria-hidden />{c.status === "draft" ? "" : c.emailsSent}</span>}
                  {c.sendPush && <span className="inline-flex items-center gap-1"><Smartphone size={14} aria-hidden />{c.status === "draft" ? "" : c.pushSent}</span>}
                  <Pill tone={c.status === "sent" ? "success" : c.status === "sending" ? "warning" : "neutral"}>
                    {c.status === "sent" ? "Sent" : c.status === "sending" ? "Sending" : "Draft"}
                  </Pill>
                </div>
              </Link>
            </li>
          ))}
          {!campaigns.length && (
            <li className="px-5 py-14 text-center">
              <p className="text-headline text-ink">No campaigns yet</p>
              <p className="mt-1 text-label text-text-tertiary">Announce a new template, a feature, or an offer.</p>
            </li>
          )}
        </ul>
      </div>
    </>
  );
}
