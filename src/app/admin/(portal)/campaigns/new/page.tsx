import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaffPage } from "@/lib/admin/auth";
import { campaignOptions } from "@/lib/admin/campaign-options";
import { PageHeader } from "@/components/admin/ui";
import { CampaignEditor, type CampaignDraft } from "@/components/admin/campaign-editor";
import { PRESETS } from "@/lib/marketing/presets";
import { Megaphone, Wrench, TrendingUp, Heart, FilePlus } from "lucide-react";

export const metadata: Metadata = { title: "New campaign" };

/** "a, b and c", or "a, b, c, d and more" for long lists. */
const listOf = (items: string[]) =>
  items.length > 4 ? `${items.slice(0, 4).join(", ")} and more` : items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : (items[0] ?? "");

const appUrl = () => process.env.AUTH_URL?.replace(/\/$/, "") ?? "https://tayylo.com";

const GROUP_ICON = { Product: Megaphone, Service: Wrench, Growth: TrendingUp, Community: Heart } as const;

export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ template?: string; preset?: string }> }) {
  await requireStaffPage("admin");
  const { template: templateId, preset: presetKey } = await searchParams;
  const back = (
    <Link href="/campaigns" className="mb-4 inline-flex items-center gap-1.5 text-label font-semibold !text-text-secondary hover:!text-ink">
      <ArrowLeft size={16} aria-hidden /> Campaigns
    </Link>
  );

  // No starting point chosen yet: show the gallery.
  if (!templateId && !presetKey) {
    return (
      <>
        {back}
        <PageHeader title="New campaign" description="Start from a ready-made message and fill in the [highlighted] bits, or start blank." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {PRESETS.map(p => {
            const Icon = GROUP_ICON[p.group];
            return (
              <Link key={p.key} href={`/campaigns/new?preset=${p.key}`} className="group flex flex-col rounded-[var(--radius-card)] border border-border/70 bg-surface p-5 transition-colors hover:border-olive/40 hover:bg-olive-soft/30">
                <span className="mb-3 flex items-center gap-2 text-caption font-semibold uppercase tracking-wide !text-text-tertiary">
                  <Icon size={15} aria-hidden /> {p.group}
                </span>
                <span className="text-headline !text-ink">{p.name}</span>
                <span className="mt-1 text-label !text-text-secondary">{p.description}</span>
                <span className="mt-3 line-clamp-2 text-caption italic !text-text-tertiary">&ldquo;{p.draft.subject}&rdquo;</span>
              </Link>
            );
          })}
          <Link href="/campaigns/new?preset=blank" className="flex flex-col items-start justify-center rounded-[var(--radius-card)] border-2 border-dashed border-border p-5 hover:border-olive/40">
            <FilePlus size={20} className="mb-2 text-text-tertiary" aria-hidden />
            <span className="text-headline !text-ink">Start blank</span>
            <span className="mt-1 text-label !text-text-secondary">Write your own from scratch.</span>
          </Link>
        </div>
      </>
    );
  }
  const preset = PRESETS.find(p => p.key === presetKey);
  const [options, template] = await Promise.all([
    campaignOptions(),
    templateId && /^[0-9a-f-]{36}$/i.test(templateId)
      ? prisma.measurementTemplate.findFirst({ where: { id: templateId, businessId: null }, include: { fields: { orderBy: { sortOrder: "asc" } } } })
      : null,
  ]);

  // "Announce" from the Templates page pre-fills a launch message for tailors.
  const initial: CampaignDraft = preset
    ? (({ ctaPath, ...d }) => ({ ...d, ctaUrl: ctaPath ? `${appUrl()}${ctaPath}` : null, audience: { ...d.audience } }))(preset.draft)
    : template
    ? {
        title: `${template.name} template launch`,
        subject: `New in Tayylo: ${template.name} measurements`,
        body: `Hi {name},\n\nThere's a new template in Tayylo: ${template.name}, with ${template.fields.length} ${template.fields.length === 1 ? "measurement" : "measurements"} ready to go (${listOf(
          template.fields.map(f => f.label.toLowerCase()),
        )}).\n\nOpen Record measurements and pick ${template.name} the next time you measure a client.`,
        ctaLabel: "Record measurements",
        ctaUrl: `${appUrl()}/measure`,
        sendEmail: true,
        sendPush: true,
        pushTitle: `New: ${template.name} template`,
        pushBody: `Measure for ${template.name} with ${template.fields.length} ready-made fields.`,
        audience: { roles: ["tailor"], plans: [], countries: [], activeWithinDays: null },
      }
    : {
        title: "",
        subject: "",
        body: "Hi {name},\n\n",
        ctaLabel: null,
        ctaUrl: null,
        sendEmail: true,
        sendPush: false,
        pushTitle: null,
        pushBody: null,
        audience: { roles: [], plans: [], countries: [], activeWithinDays: null },
      };

  return (
    <>
      {back}
      <PageHeader title={preset ? preset.name : "New campaign"} description={preset ? "Fill in anything in [brackets], check the audience, send yourself a test, then send." : undefined} />
      <CampaignEditor initial={initial} plans={options.plans} countries={options.countries} />
    </>
  );
}
