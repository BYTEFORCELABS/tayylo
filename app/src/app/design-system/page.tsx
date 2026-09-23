"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tag, StatusTag, DeltaChip } from "@/components/ui/tag";
import { Avatar } from "@/components/ui/avatar";
import { ListRow } from "@/components/ui/list-row";
import { Keypad } from "@/components/ui/keypad";
import { MeasurementDisplay, MeasurementCell } from "@/components/ui/measurement";
import {
  Skeleton,
  EmptyState,
  ErrorState,
  OfflineBanner,
  ClientListSkeleton,
  MeasurementGridSkeleton,
} from "@/components/ui/states";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Ruler, Plus, Search } from "lucide-react";

const colors = [
  { name: "Primary Olive", value: "#454F2C", var: "--color-olive", className: "bg-olive" },
  { name: "Deep Olive", value: "#30371F", var: "--color-olive-deep", className: "bg-olive-deep" },
  { name: "Olive Light", value: "#6B7A45", var: "--color-olive-light", className: "bg-olive-light" },
  { name: "Warm Beige", value: "#D8CBB5", var: "--color-beige", className: "bg-beige" },
  { name: "Light Beige", value: "#EDE6D9", var: "--color-beige-light", className: "bg-beige-light" },
  { name: "Soft Cream", value: "#F5F1E8", var: "--color-cream", className: "bg-cream" },
  { name: "Warm White", value: "#FFFDF8", var: "--color-white-warm", className: "bg-white-warm" },
];

const textColors = [
  { name: "Primary", value: "#24261F", className: "text-text-primary" },
  { name: "Secondary", value: "#6A6C61", className: "text-text-secondary" },
  { name: "Tertiary", value: "#73756A", className: "text-text-tertiary" },
];

const statusColors = [
  { name: "Success", value: "#3F7A52", className: "bg-success" },
  { name: "Warning", value: "#A8741F", className: "bg-warning" },
  { name: "Danger", value: "#A3412F", className: "bg-danger" },
  { name: "Info", value: "#476A80", className: "bg-info" },
];

const darkColors = [
  { name: "Surface 1", value: "#15170F", className: "bg-dark-surface-1" },
  { name: "Surface 2", value: "#1D2017", className: "bg-dark-surface-2" },
  { name: "Surface 3", value: "#272B1F", className: "bg-dark-surface-3" },
  { name: "Dark Olive", value: "#A9B386", className: "bg-dark-olive" },
];

export default function DesignSystemPage() {
  const [keypadValue, setKeypadValue] = React.useState("42");
  const [sheetOpen, setSheetOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-olive-deep text-white-warm px-6 py-10">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Image
              src="/symbol_cream.png"
              alt="Tayylo symbol"
              width={32}
              height={32}
            />
            <span className="text-xs uppercase tracking-[0.2em] text-beige opacity-80">
              Design System
            </span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-medium mb-2">
            Tayylo Design System
          </h1>
          <p className="text-sm text-beige opacity-80 max-w-md">
            Tokens, components and patterns for the modern tailor&apos;s notebook.
          </p>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 md:px-6 py-8 space-y-12">
        {/* ============================================================
            SECTION: Logo
            ============================================================ */}
        <section>
          <SectionTitle>Logo</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center justify-center p-6 bg-cream rounded-[var(--radius-card)] border border-border">
              <Image src="/lockup_olive.png" alt="Olive lockup on cream" width={160} height={40} />
            </div>
            <div className="flex items-center justify-center p-6 bg-olive-deep rounded-[var(--radius-card)]">
              <Image src="/lockup_cream.png" alt="Cream lockup on olive" width={160} height={40} />
            </div>
            <div className="flex items-center justify-center p-6 bg-cream rounded-[var(--radius-card)] border border-border">
              <Image src="/symbol_olive.png" alt="Olive symbol" width={40} height={40} />
            </div>
            <div className="flex items-center justify-center p-6 bg-olive-deep rounded-[var(--radius-card)]">
              <Image src="/symbol_cream.png" alt="Cream symbol" width={40} height={40} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="flex items-center justify-center p-4 bg-cream rounded-[var(--radius-card)] border border-border">
              <Image src="/icon_beige.png" alt="Beige app icon" width={48} height={48} className="rounded-xl" />
            </div>
            <div className="flex items-center justify-center p-4 bg-cream rounded-[var(--radius-card)] border border-border">
              <Image src="/icon_olive.png" alt="Olive app icon" width={48} height={48} className="rounded-xl" />
            </div>
            <div className="flex items-center justify-center p-4 bg-cream rounded-[var(--radius-card)] border border-border">
              <Image src="/icon_circle.png" alt="Circle app icon" width={48} height={48} className="rounded-full" />
            </div>
          </div>
        </section>

        {/* ============================================================
            SECTION: Colours
            ============================================================ */}
        <section>
          <SectionTitle>Colours — Brand</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {colors.map((c) => (
              <div key={c.name} className="flex flex-col gap-2">
                <div
                  className={`h-16 rounded-[var(--radius-card)] border border-border ${c.className}`}
                />
                <p className="text-xs font-medium text-text-primary">{c.name}</p>
                <p className="text-xs text-text-tertiary font-mono">{c.value}</p>
              </div>
            ))}
          </div>

          <SubTitle>Text</SubTitle>
          <div className="grid grid-cols-3 gap-3">
            {textColors.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border border-border" style={{ backgroundColor: c.value }} />
                <div>
                  <p className="text-xs font-medium">{c.name}</p>
                  <p className="text-xs text-text-tertiary font-mono">{c.value}</p>
                </div>
              </div>
            ))}
          </div>

          <SubTitle>Status</SubTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statusColors.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${c.className}`} />
                <div>
                  <p className="text-xs font-medium">{c.name}</p>
                  <p className="text-xs text-text-tertiary font-mono">{c.value}</p>
                </div>
              </div>
            ))}
          </div>

          <SubTitle>Dark Mode</SubTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {darkColors.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border border-border" style={{ backgroundColor: c.value }} />
                <div>
                  <p className="text-xs font-medium">{c.name}</p>
                  <p className="text-xs text-text-tertiary font-mono">{c.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================
            SECTION: Typography
            ============================================================ */}
        <section>
          <SectionTitle>Typography</SectionTitle>
          <div className="space-y-4">
            <div className="bg-white-warm border border-border rounded-[var(--radius-card)] p-6 space-y-4">
              <p className="text-xs text-text-tertiary uppercase tracking-wider">Urbanist — Interface</p>
              <p className="text-3xl font-bold">The quick brown fox jumps</p>
              <p className="text-xl font-semibold">Measurements saved for John Smith</p>
              <p className="text-base font-medium">A standard body text line in Urbanist</p>
              <p className="text-sm text-text-secondary">Secondary text, helper and metadata</p>
              <p className="text-xs text-text-tertiary">Tertiary text, timestamps, labels</p>
            </div>
            <div className="bg-white-warm border border-border rounded-[var(--radius-card)] p-6 space-y-4">
              <p className="text-xs text-text-tertiary uppercase tracking-wider">Urbanist — Titles & Names</p>
              <p className="font-serif text-4xl font-medium">Good morning, Adaeze</p>
              <p className="font-serif text-2xl">John Smith</p>
              <p className="font-serif text-lg italic">Your client list is empty</p>
            </div>
            <div className="bg-white-warm border border-border rounded-[var(--radius-card)] p-6 space-y-4">
              <p className="text-xs text-text-tertiary uppercase tracking-wider">Tabular Numerals</p>
              <div className="flex gap-6">
                <span className="text-[58px] font-semibold measurement-value">42½</span>
                <span className="text-[40px] font-semibold measurement-value">36¾</span>
                <span className="text-[32px] font-semibold measurement-value">18¼</span>
              </div>
              <p className="text-sm text-text-tertiary">Fractions display as ¼ ½ ¾, never as decimals in display mode</p>
            </div>
          </div>
        </section>

        {/* ============================================================
            SECTION: Spacing & Radius
            ============================================================ */}
        <section>
          <SectionTitle>Spacing (8px grid)</SectionTitle>
          <div className="flex flex-wrap gap-3 items-end">
            {[4, 8, 12, 16, 20, 24, 32, 40, 56, 72].map((s) => (
              <div key={s} className="flex flex-col items-center gap-1">
                <div
                  className="bg-olive rounded"
                  style={{ width: s, height: s }}
                />
                <span className="text-xs text-text-tertiary">{s}</span>
              </div>
            ))}
          </div>

          <SubTitle>Border Radius</SubTitle>
          <div className="flex flex-wrap gap-4 items-end">
            {[
              { label: "Button / Input", r: "8px", size: "48px" },
              { label: "Card", r: "12px", size: "64px" },
              { label: "Sheet", r: "20px", size: "80px" },
              { label: "Tag / Avatar", r: "9999px", size: "32px" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2">
                <div
                  className="bg-beige-light border border-border"
                  style={{
                    borderRadius: item.r,
                    width: item.size,
                    height: item.size,
                  }}
                />
                <span className="text-xs text-text-tertiary">{item.label}</span>
                <span className="text-xs text-text-tertiary font-mono">{item.r}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================================
            SECTION: Buttons
            ============================================================ */}
        <section>
          <SectionTitle>Buttons</SectionTitle>
          <div className="space-y-6">
            <div className="flex flex-wrap gap-3 items-center">
              <Button variant="primary" size="lg">
                <Plus size={18} />
                Add client
              </Button>
              <Button variant="secondary" size="lg">Create order</Button>
              <Button variant="tertiary" size="lg">View history</Button>
              <Button variant="destructive" size="lg">Delete</Button>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Button variant="primary" size="md">Primary</Button>
              <Button variant="secondary" size="md">Secondary</Button>
              <Button variant="tertiary" size="md">Tertiary</Button>
              <Button variant="ghost" size="md">Ghost</Button>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="secondary" size="sm">Small</Button>
              <Button variant="primary" size="icon">
                <Plus size={18} />
              </Button>
              <Button variant="secondary" size="icon">
                <Search size={18} />
              </Button>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Button variant="primary" disabled>Disabled</Button>
              <Button variant="secondary" disabled>Disabled</Button>
              <Button variant="destructive-filled" size="md">Confirm delete</Button>
            </div>
          </div>
        </section>

        {/* ============================================================
            SECTION: Inputs
            ============================================================ */}
        <section>
          <SectionTitle>Inputs</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
            <Input label="Full name" placeholder="Enter client name" />
            <Input label="Phone" placeholder="+234 800 000 0000" />
            <Input
              label="Chest"
              unit="in"
              placeholder="0"
              type="text"
              inputMode="numeric"
            />
            <Input
              label="Waist"
              unit="cm"
              placeholder="0"
              error="This field is required"
            />
            <Input
              label="Sleeve length"
              unit="in"
              defaultValue="41¾"
              warning="That's much larger than last time (36 in). Check the unit."
            />
            <Input
              label="Email"
              placeholder="client@example.com"
              helperText="Optional — for sending receipts"
            />
          </div>
        </section>

        {/* ============================================================
            SECTION: Measurement Display
            ============================================================ */}
        <section>
          <SectionTitle>Measurement Display</SectionTitle>
          <div className="space-y-8">
            <div className="bg-white-warm border border-border rounded-[var(--radius-card)] p-8 flex justify-center">
              <MeasurementDisplay
                fieldName="Chest"
                value="42½"
                unit="inches"
                previousValue="41"
                previousDate="March 2026"
                delta={1}
                size="lg"
              />
            </div>

            <SubTitle>Measurement Grid</SubTitle>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MeasurementCell label="Chest" value="42" unit="in" delta={1} />
              <MeasurementCell label="Waist" value="36" unit="in" delta={2} />
              <MeasurementCell label="Shoulder" value="18" unit="in" />
              <MeasurementCell label="Sleeve" value="25" unit="in" />
              <MeasurementCell label="Neck" value="16½" unit="in" />
              <MeasurementCell label="Bicep" value="14" unit="in" />
              <MeasurementCell label="Trouser length" value="41" unit="in" highlighted />
              <MeasurementCell label="Inseam" value="32" unit="in" />
            </div>
          </div>
        </section>

        {/* ============================================================
            SECTION: Keypad
            ============================================================ */}
        <section>
          <SectionTitle>Measurement Keypad</SectionTitle>
          <div className="max-w-xs mx-auto space-y-4">
            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-text-tertiary mb-1">
                Chest
              </p>
              <p className="text-[58px] font-semibold measurement-value text-text-primary leading-none">
                {keypadValue || "—"}
              </p>
              <p className="text-sm text-text-tertiary mt-1">inches</p>
            </div>
            <Keypad
              value={keypadValue}
              onChange={setKeypadValue}
              onNext={() => toast("Next field")}
              onPrevious={() => toast("Previous field")}
              onSkip={() => toast("Skipped")}
              nextLabel="Next: Waist"
            />
          </div>
        </section>

        {/* ============================================================
            SECTION: Tags & Status
            ============================================================ */}
        <section>
          <SectionTitle>Tags & Status</SectionTitle>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Tag>Default</Tag>
              <Tag variant="beige">Beige</Tag>
              <Tag variant="olive">Olive</Tag>
              <Tag variant="outline">Outline</Tag>
              <Tag variant="success">Success</Tag>
              <Tag variant="warning">Warning</Tag>
              <Tag variant="danger">Danger</Tag>
              <Tag variant="info">Info</Tag>
            </div>
            <div className="flex flex-wrap gap-2">
              <Tag removable onRemove={() => {}}>Removable</Tag>
              <Tag size="sm">Small</Tag>
              <Tag size="lg">Large</Tag>
            </div>

            <SubTitle>Status Tags</SubTitle>
            <div className="flex flex-wrap gap-2">
              <StatusTag status="cutting" />
              <StatusTag status="sewing" />
              <StatusTag status="fitting" />
              <StatusTag status="ready" />
              <StatusTag status="delivered" />
              <StatusTag status="overdue" />
              <StatusTag status="cancelled" />
            </div>

            <SubTitle>Delta Chips</SubTitle>
            <div className="flex flex-wrap gap-2 items-center">
              <DeltaChip value={1} />
              <DeltaChip value={2} />
              <DeltaChip value={-1} />
              <DeltaChip value={0} />
              <span className="text-xs text-text-tertiary">(zero renders nothing)</span>
            </div>
          </div>
        </section>

        {/* ============================================================
            SECTION: Avatars
            ============================================================ */}
        <section>
          <SectionTitle>Avatars</SectionTitle>
          <div className="flex flex-wrap gap-3 items-center">
            <Avatar name="John Smith" size="sm" />
            <Avatar name="Priya Nair" size="md" />
            <Avatar name="Kofi Mensah" size="lg" />
            <Avatar name="Adaeze Okafor" size="xl" />
            <Avatar name="Yuki Tanaka" size="md" />
            <Avatar name="Carlos Rodriguez" size="md" />
          </div>
        </section>

        {/* ============================================================
            SECTION: Cards
            ============================================================ */}
        <section>
          <SectionTitle>Cards</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Order #1024</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar name="John Smith" size="sm" />
                    <span className="text-sm">John Smith</span>
                  </div>
                  <StatusTag status="sewing" />
                </div>
                <div className="mt-3 flex justify-between text-sm">
                  <span className="text-text-secondary">Due</span>
                  <span className="font-medium">28 Sep 2026</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-text-secondary">Balance</span>
                  <span className="font-medium text-warning">$250.00</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Today&apos;s summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Fittings</span>
                    <span className="font-medium">3</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Pickups</span>
                    <span className="font-medium">2</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Due this week</span>
                    <span className="font-medium">4</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ============================================================
            SECTION: List Rows
            ============================================================ */}
        <section>
          <SectionTitle>List Rows</SectionTitle>
          <div className="bg-white-warm border border-border rounded-[var(--radius-card)] overflow-hidden">
            <ListRow
              title="John Smith"
              subtitle="+1 415 555 0142"
              meta="Last measured 6 mo ago"
              avatarName="John Smith"
            />
            <ListRow
              title="Priya Nair"
              subtitle="+91 98765 43210"
              meta="Last measured 2 wk ago"
              avatarName="Priya Nair"
            />
            <ListRow
              title="Kofi Mensah"
              subtitle="+233 20 123 4567"
              meta="Last measured 1 yr ago"
              avatarName="Kofi Mensah"
            />
            <ListRow
              title="Adaeze Okafor"
              subtitle="+234 803 456 7890"
              meta="New client"
              avatarName="Adaeze Okafor"
            />
          </div>
        </section>

        {/* ============================================================
            SECTION: Bottom Sheet & Dialog
            ============================================================ */}
        <section>
          <SectionTitle>Bottom Sheet & Dialog</SectionTitle>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>
              Open Bottom Sheet
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">Open Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add client</DialogTitle>
                  <DialogDescription>
                    Enter the client&apos;s details to add them to your workspace.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <Input label="Full name" placeholder="Enter client name" />
                  <Input label="Phone" placeholder="+234 800 000 0000" />
                </div>
                <DialogFooter>
                  <Button variant="secondary">Cancel</Button>
                  <Button variant="primary">Add client</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              variant="secondary"
              onClick={() =>
                toast("Measurements saved", {
                  action: {
                    label: "Share card",
                    onClick: () => {},
                  },
                })
              }
            >
              Show Toast
            </Button>
          </div>

          <BottomSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            title="Quick actions"
            description="What would you like to do?"
          >
            <div className="space-y-1 pb-6">
              {[
                { icon: <Users size={20} />, label: "Add client", desc: "Add a new client to your workspace" },
                { icon: <Ruler size={20} />, label: "Record measurements", desc: "Take measurements for a client" },
                { icon: <Plus size={20} />, label: "New order", desc: "Create a new order" },
              ].map((item) => (
                <button
                  key={item.label}
                  className="flex items-center gap-4 w-full px-3 py-3 rounded-[var(--radius-button)] hover:bg-beige-light transition-colors text-left"
                  onClick={() => setSheetOpen(false)}
                >
                  <div className="w-10 h-10 rounded-full bg-beige-light flex items-center justify-center text-olive">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{item.label}</p>
                    <p className="text-xs text-text-secondary">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </BottomSheet>
        </section>

        {/* ============================================================
            SECTION: States
            ============================================================ */}
        <section>
          <SectionTitle>States</SectionTitle>

          <SubTitle>Empty State</SubTitle>
          <div className="bg-white-warm border border-border rounded-[var(--radius-card)]">
            <EmptyState
              icon={<Users size={24} />}
              title="Your client list is empty"
              description="Add your first client and their measurements to start building your Tayylo workspace."
              action={
                <Button variant="primary">
                  <Plus size={16} />
                  Add client
                </Button>
              }
            />
          </div>

          <SubTitle>Error State</SubTitle>
          <div className="bg-white-warm border border-border rounded-[var(--radius-card)] mt-4">
            <ErrorState
              title="Something went wrong"
              description="We couldn't load this content. Check your connection and try again."
              onRetry={() => {}}
            />
          </div>

          <SubTitle>Offline Banner</SubTitle>
          <div className="mt-4 rounded-[var(--radius-card)] overflow-hidden border border-border">
            <OfflineBanner />
          </div>

          <SubTitle>Loading Skeletons</SubTitle>
          <div className="mt-4 space-y-4">
            <div className="bg-white-warm border border-border rounded-[var(--radius-card)] overflow-hidden">
              <p className="px-4 pt-3 text-xs text-text-tertiary uppercase tracking-wider">Client list skeleton</p>
              <ClientListSkeleton count={3} />
            </div>
            <div>
              <p className="text-xs text-text-tertiary uppercase tracking-wider mb-2">Measurement grid skeleton</p>
              <MeasurementGridSkeleton count={4} />
            </div>
            <div className="flex flex-wrap gap-3">
              <Skeleton width={120} height={16} />
              <Skeleton width={80} height={16} />
              <Skeleton variant="circular" width={40} height={40} />
              <Skeleton variant="rectangular" width={200} height={60} />
            </div>
          </div>
        </section>

        {/* ============================================================
            SECTION: Icons
            ============================================================ */}
        <section>
          <SectionTitle>Icons (Lucide, 20–24px, 1.5px stroke)</SectionTitle>
          <div className="flex flex-wrap gap-4">
            {[
              { Icon: Users, label: "Users" },
              { Icon: Ruler, label: "Ruler" },
              { Icon: Plus, label: "Plus" },
              { Icon: Search, label: "Search" },
            ].map(({ Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-[var(--radius-button)] bg-beige-light flex items-center justify-center text-olive">
                  <Icon size={20} strokeWidth={1.5} />
                </div>
                <span className="text-xs text-text-tertiary">{label}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 px-4 text-center">
        <p className="text-xs text-text-tertiary">
          Tayylo Design System · Built with Next.js, Tailwind CSS, Radix UI
        </p>
      </footer>
    </div>
  );
}

// Section title component
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-text-primary mb-4 pb-2 border-b border-border">
      {children}
    </h2>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-text-secondary mt-6 mb-3 uppercase tracking-wider">
      {children}
    </h3>
  );
}
