import type { Metadata } from "next";
import Link from "next/link";
import { requireStaffPage } from "@/lib/admin/auth";
import { asRange, insights, RANGES } from "@/lib/admin/stats";
import { FilterTabs, PageHeader, RankedList, Section } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Top performing" };

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireStaffPage();
  const range = asRange((await searchParams).range);
  const d = await insights(range);

  return (
    <>
      <PageHeader
        title="Top performing"
        description="What tailors measure, make and share most."
        actions={<FilterTabs options={RANGES} value={range} hrefFor={k => (k === "30d" ? "/insights" : `/insights?range=${k}`)} />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Top studios" description="By orders created, with new clients added">
          <RankedList items={d.studios} unit="orders" />
        </Section>
        <Section title="Measurement templates" description="Measurement sets recorded per template">
          <RankedList items={d.templates} unit="sets" />
        </Section>
        <Section title="Most-taken measurements" description="Body measurements recorded most often">
          <RankedList items={d.fields} unit="taken" />
        </Section>
        <Section title="Garments ordered" description="Order items by garment type">
          <RankedList items={d.garments} unit="items" />
        </Section>
        <Section title="Explore categories" description="New posts per category">
          <RankedList items={d.categories} unit="posts" />
        </Section>
        <Section title="Where styles come from" description="New Explore posts by country">
          <RankedList items={d.postCountries} unit="posts" />
        </Section>
        <Section title="Where studios are" description="New studios by country">
          <RankedList items={d.studioCountries} unit="studios" />
        </Section>
        <Section title="Most-saved styles" description="Explore posts saved most, posted in this period">
          {d.savedPosts.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {d.savedPosts.map(p => (
                <Link key={p.id} href={`/moderation?view=all&post=${p.id}`} className="group block">
                  <div className="aspect-square overflow-hidden rounded-[var(--radius-sm)] bg-surface-sunken">
                    {/* eslint-disable-next-line @next/next/no-img-element -- user uploads on Blob, not optimised */}
                    <img src={p.imageUrl} alt={p.category} className="size-full object-cover transition-transform group-hover:scale-[1.03]" loading="lazy" />
                  </div>
                  <p className="mt-1.5 truncate text-caption font-semibold text-ink">{p.authorName}</p>
                  <p className="text-caption text-text-tertiary tabular">{p.saves} {p.saves === 1 ? "save" : "saves"}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-label text-text-tertiary">Nothing saved yet in this period.</p>
          )}
        </Section>
      </div>
    </>
  );
}
