import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { atLeast, requireStaffPage } from "@/lib/admin/auth";
import { campaignOptions } from "@/lib/admin/campaign-options";
import { parseAudience } from "@/lib/marketing/audience";
import { PageHeader, Pill, Section, Stat, dateTime } from "@/components/admin/ui";
import { CampaignEditor } from "@/components/admin/campaign-editor";
import { ActionButton } from "@/components/admin/action-button";

export const metadata: Metadata = { title: "Campaign" };

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaffPage();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const c = await prisma.campaign.findUnique({ where: { id } });
  if (!c) notFound();
  const audience = parseAudience(c.audience);
  const back = (
    <Link href="/campaigns" className="mb-4 inline-flex items-center gap-1.5 text-label font-semibold !text-text-secondary hover:!text-ink">
      <ArrowLeft size={16} aria-hidden /> Campaigns
    </Link>
  );

  if (c.status === "draft" && atLeast(staff.staffRole, "admin")) {
    const options = await campaignOptions();
    return (
      <>
        {back}
        <PageHeader
          title={c.title}
          description="Draft"
          actions={
            <ActionButton url={`/api/admin/campaigns/${c.id}`} method="DELETE" success="Draft deleted" variant="destructive" redirectTo="/campaigns"
              confirm={{ title: "Delete this draft?", description: "It hasn't been sent, so nobody will notice.", action: "Delete", destructive: true }}>
              Delete draft
            </ActionButton>
          }
        />
        <CampaignEditor
          initial={{
            id: c.id,
            title: c.title,
            subject: c.subject,
            body: c.body,
            ctaLabel: c.ctaLabel,
            ctaUrl: c.ctaUrl,
            sendEmail: c.sendEmail,
            sendPush: c.sendPush,
            pushTitle: c.pushTitle,
            pushBody: c.pushBody,
            audience,
          }}
          plans={options.plans}
          countries={options.countries}
        />
      </>
    );
  }

  return (
    <>
      {back}
      <PageHeader
        title={c.title}
        description={c.sentAt ? `Sent ${dateTime(c.sentAt)} by ${c.createdByEmail}` : c.status === "sending" ? "Sending was interrupted" : "Draft"}
        actions={<Pill tone={c.status === "sent" ? "success" : "warning"}>{c.status === "sent" ? "Sent" : c.status === "sending" ? "Partly sent" : "Draft"}</Pill>}
      />
      {c.status === "sending" && atLeast(staff.staffRole, "admin") && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] bg-warning-bg px-5 py-4 text-label text-warning">
          <p>Sending stopped part-way (the tab was closed or the connection dropped). Resume to reach the rest. Nobody gets it twice.</p>
          <ActionButton url={`/api/admin/campaigns/${c.id}/send`} method="POST" body={{}} success="Sent the next batch. Press again until it says sent." variant="primary">
            Resume sending
          </ActionButton>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="People reached" value={c.recipients} />
        <Stat label="Emails sent" value={c.sendEmail ? c.emailsSent : "—"} />
        <Stat label="Pushes sent" value={c.sendPush ? c.pushSent : "—"} />
        <Stat label="Failed" value={c.failures} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <Section title={c.subject}>
          <div className="space-y-3 text-body text-text-secondary">
            {c.body.split(/\n\s*\n/).map((p, i) => (
              <p key={i} className="whitespace-pre-line">{p}</p>
            ))}
          </div>
          {c.ctaLabel && c.ctaUrl && (
            <p className="mt-4 text-label">
              Button: <span className="font-semibold text-ink">{c.ctaLabel}</span> → <span className="break-all text-text-tertiary">{c.ctaUrl}</span>
            </p>
          )}
        </Section>
        <Section title="Audience">
          <dl className="space-y-2 text-label">
            {[
              ["Account type", audience.roles.join(", ") || "Everyone"],
              ["Plan", audience.plans.join(", ") || "Every plan"],
              ["Country", audience.countries.join(", ") || "Everywhere"],
              ["Activity", audience.activeWithinDays ? `Active in the last ${audience.activeWithinDays} days` : audience.inactiveForDays ? `Away for ${audience.inactiveForDays}+ days` : "Anyone"],
              ["Channels", [c.sendEmail && "Email", c.sendPush && "Push"].filter(Boolean).join(" + ")],
            ].map(([k, v]) => (
              <div key={k as string}>
                <dt className="text-caption text-text-tertiary">{k}</dt>
                <dd className="font-medium capitalize text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>
    </>
  );
}
