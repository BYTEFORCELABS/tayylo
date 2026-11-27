import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaffPage } from "@/lib/admin/auth";
import { campaignOptions } from "@/lib/admin/campaign-options";
import { PageHeader } from "@/components/admin/ui";
import { CampaignEditor, type CampaignDraft } from "@/components/admin/campaign-editor";

export const metadata: Metadata = { title: "New campaign" };

/** "a, b and c", or "a, b, c, d and more" for long lists. */
const listOf = (items: string[]) =>
  items.length > 4 ? `${items.slice(0, 4).join(", ")} and more` : items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : (items[0] ?? "");

const appUrl = () => process.env.AUTH_URL?.replace(/\/$/, "") ?? "https://tayylo.com";

export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  await requireStaffPage("admin");
  const { template: templateId } = await searchParams;
  const [options, template] = await Promise.all([
    campaignOptions(),
    templateId && /^[0-9a-f-]{36}$/i.test(templateId)
      ? prisma.measurementTemplate.findFirst({ where: { id: templateId, businessId: null }, include: { fields: { orderBy: { sortOrder: "asc" } } } })
      : null,
  ]);

  // "Announce" from the Templates page pre-fills a launch message for tailors.
  const initial: CampaignDraft = template
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
      <Link href="/campaigns" className="mb-4 inline-flex items-center gap-1.5 text-label font-semibold !text-text-secondary hover:!text-ink">
        <ArrowLeft size={16} aria-hidden /> Campaigns
      </Link>
      <PageHeader title="New campaign" />
      <CampaignEditor initial={initial} plans={options.plans} countries={options.countries} />
    </>
  );
}
