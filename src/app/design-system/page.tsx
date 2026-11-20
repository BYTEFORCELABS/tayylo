"use client";

import React from "react";
import { Ruler, Plus, Users, Search, Scissors, Check } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Card, Panel } from "@/components/ui/card";
import { Chip, SearchField, SegmentedControl } from "@/components/ui/choice";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Keypad } from "@/components/ui/keypad";
import { List, ListItem, IconTile } from "@/components/ui/list";
import { MeasurementCell, MeasurementDisplay, MeasurementGrid, MeasurementSheet } from "@/components/ui/measurement";
import { PageBody, PageHeader, Section, Overline } from "@/components/ui/page";
import { EmptyState, ErrorState, ListSkeleton, OfflineBanner } from "@/components/ui/states";
import { Tabs } from "@/components/ui/tabs";
import { DeltaChip, StatusTag, Tag } from "@/components/ui/tag";
import { ORDER_STATUSES } from "@/lib/orders";

// Reference page for designers and engineers. Every sample below is the
// real component; values shown are illustrative placeholders, not data.

const SURFACES = [
  { name: "canvas", cls: "bg-canvas", note: "App background" },
  { name: "surface", cls: "bg-surface", note: "Cards, lists" },
  { name: "surface-raised", cls: "bg-surface-raised", note: "Dialogs, sheets, nav" },
  { name: "surface-sunken", cls: "bg-surface-sunken", note: "Tracks, inputs" },
  { name: "panel", cls: "bg-panel", note: "Summary panel" },
];
const BRAND = [
  { name: "olive", cls: "bg-olive", note: "#454F2C · primary" },
  { name: "olive-deep", cls: "bg-olive-deep", note: "Pressed / panel" },
  { name: "olive-soft", cls: "bg-olive-soft", note: "Tonal fills" },
  { name: "beige", cls: "bg-beige", note: "Brand beige" },
  { name: "ink", cls: "bg-ink", note: "Text, selected" },
];
const STATUS = [
  { name: "success", cls: "bg-success", bg: "bg-success-bg" },
  { name: "warning", cls: "bg-warning", bg: "bg-warning-bg" },
  { name: "danger", cls: "bg-danger", bg: "bg-danger-bg" },
  { name: "info", cls: "bg-info", bg: "bg-info-bg" },
];
const TYPE = [
  { cls: "text-display", label: "Display · 36/600", sample: "₦1,240,000" },
  { cls: "text-title", label: "Title · 26/600", sample: "Order details" },
  { cls: "text-headline", label: "Headline · 17/600", sample: "Needs attention" },
  { cls: "text-body", label: "Body · 15/400", sample: "Every measurement is kept as a dated version." },
  { cls: "text-label", label: "Label · 13/500", sample: "Due in 3 days" },
  { cls: "text-caption", label: "Caption · 12", sample: "Client since 4 Mar 2026" },
  { cls: "text-overline uppercase", label: "Overline · 11/600", sample: "Torso" },
];
const RADII = [
  ["xs", "6"],
  ["sm", "10"],
  ["control", "12"],
  ["input", "14"],
  ["card", "20"],
  ["panel", "28"],
  ["pill", "∞"],
];

export default function DesignSystemPage() {
  const [seg, setSeg] = React.useState("current");
  const [tab, setTab] = React.useState("measurements");
  const [chip, setChip] = React.useState("Active");
  const [search, setSearch] = React.useState("");
  const [keypad, setKeypad] = React.useState("38½");
  const [sheet, setSheet] = React.useState(false);
  const [offline, setOffline] = React.useState(false);

  return (
    <div className="min-h-[100dvh] bg-canvas pb-24">
      <PageHeader variant="compact" title="Design system" eyebrow="Tayylo" back="/settings" backLabel="Back to settings" width="lg" />
      <PageBody width="lg" className="space-y-14">
        <Section title="Brand">
          <Card className="flex flex-wrap items-center gap-10">
            <Logo height={32} />
            <Logo variant="symbol" height={32} />
            <div className="rounded-[var(--radius-card)] bg-panel px-6 py-5">
              <Logo tone="cream" height={28} />
            </div>
          </Card>
          <p className="mt-2 px-1 text-caption text-text-tertiary">
            Use <code>&lt;Logo /&gt;</code> only. Olive on light surfaces, cream on dark. Never stretched.
          </p>
        </Section>

        <Section title="Colour">
          <Overline className="mb-2">Surfaces</Overline>
          <Swatches items={SURFACES} />
          <Overline className="mb-2 mt-6">Brand &amp; text</Overline>
          <Swatches items={BRAND} />
          <Overline className="mb-2 mt-6">Status — muted, paired with tinted backgrounds</Overline>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STATUS.map(s => (
              <div key={s.name} className={`rounded-[var(--radius-card)] p-4 ${s.bg}`}>
                <span className={`block size-6 rounded-full ${s.cls}`} />
                <p className="mt-3 text-label font-semibold text-ink">{s.name}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Typography" description="Urbanist, one family. Numbers use tabular figures.">
          <List>
            {TYPE.map(t => (
              <div key={t.label} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:gap-6">
                <span className="w-40 shrink-0 text-caption text-text-tertiary">{t.label}</span>
                <span className={`${t.cls} text-ink ${t.cls.includes("display") ? "tabular" : ""}`}>{t.sample}</span>
              </div>
            ))}
          </List>
        </Section>

        <Section title="Radius & elevation">
          <div className="flex flex-wrap gap-4">
            {RADII.map(([n, v]) => (
              <div key={n} className="text-center">
                <div
                  className="size-16 border border-border-strong bg-surface-raised"
                  style={{ borderRadius: n === "pill" ? 9999 : `var(--radius-${n})` }}
                />
                <p className="mt-2 text-caption text-text-tertiary">
                  {n} · {v}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[var(--radius-card)] bg-surface p-5 text-label text-text-secondary border border-border/70">Flat — cards</div>
            <div className="rounded-[var(--radius-card)] bg-surface-raised p-5 text-label text-text-secondary shadow-[var(--shadow-float)]">Float — nav, toasts</div>
            <div className="rounded-[var(--radius-card)] bg-surface-raised p-5 text-label text-text-secondary shadow-[var(--shadow-dialog)]">Dialog — modals</div>
          </div>
        </Section>

        <Section title="Buttons" description="Every button is a pill. One primary per view.">
          <Card className="space-y-5">
            <div className="flex flex-wrap gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="tonal">Tonal</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="tertiary">Tertiary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="destructive-filled">Delete</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="icon-sm" variant="secondary" aria-label="Add">
                <Plus />
              </Button>
              <Button size="icon" variant="secondary" aria-label="Search">
                <Search />
              </Button>
              <Button size="icon-lg" aria-label="Measure">
                <Ruler />
              </Button>
              <Button loading>Saving</Button>
              <Button disabled>Disabled</Button>
            </div>
          </Card>
        </Section>

        <Section title="Summary panel">
          <Panel className="max-w-md">
            <p className="text-label text-text-on-panel-muted">Collected this month</p>
            <p className="tabular mt-2 text-display">₦0</p>
            <div className="mt-6 flex gap-2.5">
              <Button variant="inverse" className="flex-1">
                <Ruler />
                Measure
              </Button>
              <Button variant="inverse-ghost" className="flex-1">
                New order
              </Button>
            </div>
          </Panel>
        </Section>

        <Section title="Inputs & selection">
          <Card className="grid gap-5 sm:grid-cols-2">
            <Input label="Full name" placeholder="Client name" />
            <Input label="Price" prefix="₦" placeholder="0" helperText="Helper text sits under the field" />
            <Input label="Chest" unit="in" defaultValue="40½" warning="Far from last time. Double-check." />
            <Input label="Email" defaultValue="not-an-email" error="Enter a valid email address" />
            <Select label="Currency" defaultValue="NGN">
              <option value="NGN">NGN · ₦</option>
              <option value="USD">USD · $</option>
            </Select>
            <Input label="Disabled" disabled defaultValue="Read only" />
            <Textarea label="Notes" hint="Optional" rows={3} containerClassName="sm:col-span-2" placeholder="Fit preferences" />
            <SearchField value={search} onValueChange={setSearch} placeholder="Search" className="sm:col-span-2" />
          </Card>
          <Card className="mt-4 space-y-5">
            <SegmentedControl
              ariaLabel="Example"
              value={seg}
              onChange={setSeg}
              options={[
                { value: "current", label: "Current" },
                { value: "history", label: "History" },
              ]}
            />
            <div className="flex flex-wrap gap-2">
              {["Active", "Overdue", "Ready"].map(c => (
                <Chip key={c} selected={chip === c} onClick={() => setChip(c)} count={c === "Active" ? 12 : 2}>
                  {c}
                </Chip>
              ))}
            </div>
            <Tabs
              ariaLabel="Example tabs"
              value={tab}
              onChange={setTab}
              items={[
                { value: "measurements", label: "Measurements", count: 3 },
                { value: "orders", label: "Orders" },
                { value: "notes", label: "Notes" },
              ]}
            />
          </Card>
        </Section>

        <Section title="Status & tags">
          <Card className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {ORDER_STATUSES.map(s => (
                <StatusTag key={s.key} status={s.key} />
              ))}
              <StatusTag status="overdue" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Tag>Default</Tag>
              <Tag variant="olive">VIP</Tag>
              <Tag variant="success">Approved</Tag>
              <Tag variant="warning">Adjustments</Tag>
              <Tag variant="outline">Outline</Tag>
              <DeltaChip label="+½ in" direction="up" />
              <DeltaChip label="−¼ in" direction="down" />
            </div>
          </Card>
        </Section>

        <Section title="Lists">
          <List className="max-w-xl">
            <ListItem leading={<Avatar name="Sample Client" />} title="Sample Client" subtitle="+000 000 0000" trailingSub="Measured 2 wk ago" chevron onClick={() => {}} />
            <ListItem
              leading={
                <IconTile tone="olive">
                  <Scissors />
                </IconTile>
              }
              title="Suit"
              subtitle="#0000 · Due in 3 days"
              trailing={<StatusTag status="sewing" />}
              trailingSub="₦0 due"
            />
            <ListItem
              leading={
                <IconTile tone="success">
                  <Check />
                </IconTile>
              }
              title="Transfer"
              subtitle="Static row"
              trailing={<span className="tabular font-semibold">₦0</span>}
            />
          </List>
        </Section>

        <Section title="Measurements">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <MeasurementDisplay fieldName="Chest" value="40½" unit="in" previousValue="40" />
            </Card>
            <MeasurementGrid>
              <MeasurementCell label="Chest" value="40½" unit="in" delta={{ label: "+½ in", direction: "up" }} />
              <MeasurementCell label="Waist" value="34" unit="in" active />
              <MeasurementCell label="Neck" value="" unit="in" empty />
            </MeasurementGrid>
          </div>
          <MeasurementSheet
            className="mt-6"
            rows={[
              { key: "c", label: "Chest", group: "Torso", value: "40½", unit: "in", delta: { label: "+½ in", direction: "up" } },
              { key: "w", label: "Waist", group: "Torso", value: "34", unit: "in" },
              { key: "s", label: "Sleeve length", group: "Arms", value: "25¼", unit: "in" },
              { key: "b", label: "Bicep", group: "Arms", value: "13", unit: "in", delta: { label: "−¼ in", direction: "down" } },
            ]}
          />
          <Card className="mt-6 max-w-sm">
            <Keypad value={keypad} onChange={setKeypad} onNext={() => toast("Next")} onPrevious={() => toast("Previous")} onSkip={() => toast("Skipped")} />
          </Card>
        </Section>

        <Section title="Overlays & feedback">
          <div className="flex flex-wrap gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">Open dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dialog title</DialogTitle>
                  <DialogDescription>Docks to the bottom on phones, centred from tablet up.</DialogDescription>
                </DialogHeader>
                <Input label="Field" />
                <DialogFooter>
                  <Button variant="secondary">Cancel</Button>
                  <Button>Confirm</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="secondary" onClick={() => setSheet(true)}>
              Open sheet
            </Button>
            <Button variant="secondary" onClick={() => toast.success("Saved")}>
              Success toast
            </Button>
            <Button variant="secondary" onClick={() => toast.error("Couldn't save")}>
              Error toast
            </Button>
            <Button variant="secondary" onClick={() => setOffline(o => !o)}>
              Toggle offline banner
            </Button>
          </div>
          <BottomSheet open={sheet} onOpenChange={setSheet} title="Bottom sheet" description="Drag down or tap outside to close.">
            <p className="text-body text-text-secondary">Used for quick actions, notifications and short forms.</p>
          </BottomSheet>
          {offline && <OfflineBanner force />}
        </Section>

        <Section title="States">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card padding="none">
              <EmptyState icon={<Users />} title="No clients yet" description="Explains what to do next." action={<Button size="sm">Add client</Button>} />
            </Card>
            <Card padding="none">
              <ErrorState onRetry={() => toast("Retrying")} />
            </Card>
            <ListSkeleton count={3} />
          </div>
        </Section>
      </PageBody>
    </div>
  );
}

function Swatches({ items }: { items: { name: string; cls: string; note: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {items.map(s => (
        <div key={s.name}>
          <div className={`h-20 rounded-[var(--radius-card)] border border-border ${s.cls}`} />
          <p className="mt-2 text-label font-semibold text-ink">{s.name}</p>
          <p className="text-caption text-text-tertiary">{s.note}</p>
        </div>
      ))}
    </div>
  );
}
