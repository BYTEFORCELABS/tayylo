"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Ruler, Layers, FileUp, FileDown, LogOut, Trash2, Palette, Coins, RotateCcw, Mail, ChevronRight, Landmark, PenLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/choice";
import { Input, Select } from "@/components/ui/input";
import { List, ListItem, IconTile } from "@/components/ui/list";
import { PageBody, PageHeader, Overline } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/states";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TemplatesDialog } from "@/components/settings/templates-dialog";
import { ImportDialog } from "@/components/settings/import-dialog";
import { ExportDialog } from "@/components/settings/export-dialog";
import { BankAccountsDialog, BrandMark, LogoPicker, bankAccountsOf } from "@/components/settings/branding";
import { accountRepo, businessRepo, resetStore } from "@/lib/data/store";
import { clearBusinessCache, setCachedBusiness, useBusiness } from "@/lib/use-business";
import { CURRENCIES, currencySymbol, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Business, UnitSystem } from "@/types";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { business, loading } = useBusiness();

  const [profileOpen, setProfileOpen] = React.useState(false);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [banksOpen, setBanksOpen] = React.useState(false);
  const accounts = bankAccountsOf(business);
  const defaultAccount = accounts.find(a => a.isDefault) ?? accounts[0];

  const updateUnit = async (unitSystem: UnitSystem) => {
    try {
      const updated = await businessRepo.update({ unitSystem });
      setCachedBusiness(updated);
      toast.success(unitSystem === "metric" ? "Measurements now in centimetres" : "Measurements now in inches");
    } catch {
      toast.error("Couldn't change the unit");
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    clearBusinessCache();
    router.push("/welcome");
  };

  return (
    <>
      <PageHeader
        title={
          <>
            <span className="lg:hidden">Profile</span>
            <span className="max-lg:hidden">Settings</span>
          </>
        }
        width="sm"
        actions={
          <Button variant="ghost" size="icon" aria-label="Edit studio profile" onClick={() => setProfileOpen(true)} disabled={!business}>
            <PenLine />
          </Button>
        }
      />
      <PageBody width="sm" className="space-y-6">
        {/* Studio */}
        {loading || !business ? (
          <div className="flex flex-col items-center gap-3 pt-2">
            <Skeleton variant="rectangular" width={104} height={104} className="rounded-[28px]" />
            <Skeleton width={140} height={22} />
          </div>
        ) : (
          <section className="flex flex-col items-center pt-2 text-center" aria-label="Studio">
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              aria-label="Edit studio profile"
              className={cn(
                "flex size-[104px] items-center justify-center overflow-hidden rounded-[28px] transition-transform active:scale-[0.97]",
                business.logoUrl
                  ? "border border-border/60 bg-surface-raised p-3 shadow-[var(--shadow-xs)]"
                  : "btn-raised bg-olive text-text-inverse"
              )}
            >
              {business.logoUrl ? (
                <BrandMark business={business} height={44} className="max-h-full max-w-full" />
              ) : (
                <span aria-hidden className="text-[34px] font-semibold tracking-tight">
                  {initials(business.name)}
                </span>
              )}
            </button>
            <p className="mt-4 text-[22px] font-medium leading-tight text-ink">{business.name}</p>
            <p className="mt-1 text-label text-text-tertiary">
              {[business.ownerName || "Tailor", business.currency].filter(Boolean).join("  ·  ")}
            </p>
          </section>
        )}

        <div className="settings-card overflow-hidden rounded-[var(--radius-panel)] border border-border/70 bg-surface px-1 pb-2">

        {/* Invoices & receipts */}
        <section>
          <SectionLabel>Invoices &amp; receipts</SectionLabel>
          <List className="rounded-none border-0 bg-transparent divide-divider/60">
            <LogoPicker />
            <ListItem
              onClick={() => setBanksOpen(true)}
              leading={
                <IconTile>
                  <Landmark />
                </IconTile>
              }
              title="Bank accounts"
              subtitle={
                defaultAccount
                  ? `${defaultAccount.bankName} · ${defaultAccount.accountNumber}${accounts.length > 1 ? ` · +${accounts.length - 1} more` : ""}`
                  : "Add where clients should pay you"
              }
              chevron
            />
          </List>
        </section>

        {/* Preferences */}
        <section>
          <SectionLabel>Preferences</SectionLabel>
          <List className="rounded-none border-0 bg-transparent divide-divider/60">
            <ListItem
              leading={
                <IconTile>
                  <Ruler />
                </IconTile>
              }
              title="Measurement unit"
              subtitle="Used for capture, display and sharing"
            >
              <SegmentedControl
                ariaLabel="Measurement unit"
                size="sm"
                className="mt-3"
                value={business?.unitSystem ?? "imperial"}
                onChange={updateUnit}
                options={[
                  { value: "imperial", label: "Inches · ¼ ½ ¾" },
                  { value: "metric", label: "Centimetres" },
                ]}
              />
            </ListItem>
            <ListItem
              onClick={() => setProfileOpen(true)}
              leading={
                <IconTile>
                  <Coins />
                </IconTile>
              }
              title="Currency"
              subtitle="For prices, deposits and balances"
              trailing={
                <span className="text-label font-semibold text-text-secondary">
                  {business ? `${business.currency} ${currencySymbol(business.currency)}` : "—"}
                </span>
              }
              chevron
            />
            <ListItem
              onClick={() => setTemplatesOpen(true)}
              leading={
                <IconTile>
                  <Layers />
                </IconTile>
              }
              title="Measurement templates"
              subtitle="Fields used for each garment"
              chevron
            />
          </List>
        </section>

        {/* Data */}
        <section>
          <SectionLabel>Your data</SectionLabel>
          <List className="rounded-none border-0 bg-transparent divide-divider/60">
            <ListItem
              onClick={() => setImportOpen(true)}
              leading={
                <IconTile>
                  <FileUp />
                </IconTile>
              }
              title="Import clients"
              subtitle="From a CSV file or spreadsheet"
              chevron
            />
            <ListItem
              onClick={() => setExportOpen(true)}
              leading={
                <IconTile>
                  <FileDown />
                </IconTile>
              }
              title="Export data"
              subtitle="Clients CSV or a full backup"
              chevron
            />
          </List>
        </section>

        {/* Account */}
        <section>
          <SectionLabel>Account</SectionLabel>
          <List className="rounded-none border-0 bg-transparent divide-divider/60">
            {session?.user?.email && (
              <ListItem
                leading={
                  <IconTile>
                    <Mail />
                  </IconTile>
                }
                title="Signed in as"
                subtitle={session.user.email}
              />
            )}
            <ListItem
              onClick={handleSignOut}
              leading={
                <IconTile>
                  <LogOut />
                </IconTile>
              }
              title="Sign out"
            />
          </List>
        </section>

        </div>

        {/* Danger zone */}
        <section>
          <Overline className="mb-3 px-1">Danger zone</Overline>
          <List>
            <ListItem
              onClick={() => setResetOpen(true)}
              leading={
                <IconTile tone="danger">
                  <RotateCcw />
                </IconTile>
              }
              title="Reset workspace data"
              subtitle="Deletes all clients, orders and measurements"
              tone="danger"
            />
            <ListItem
              onClick={() => setDeleteOpen(true)}
              leading={
                <IconTile tone="danger">
                  <Trash2 />
                </IconTile>
              }
              title="Delete account"
              subtitle="Removes your login and everything in it"
              tone="danger"
            />
          </List>
        </section>

        <div className="flex flex-col items-center gap-2 pb-4 pt-2">
          <button
            onClick={() => router.push("/design-system")}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-caption font-semibold text-text-tertiary hover:bg-surface-sunken hover:text-ink"
          >
            <Palette size={14} strokeWidth={1.75} />
            Design system
            <ChevronRight size={14} />
          </button>
          <p className="text-caption text-text-tertiary">Tayylo · Version 1.0.0</p>
        </div>
      </PageBody>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      <TemplatesDialog open={templatesOpen} onOpenChange={setTemplatesOpen} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      <BankAccountsDialog open={banksOpen} onOpenChange={setBanksOpen} />

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset workspace data?"
        description="Every client, order, payment and measurement in this workspace will be permanently deleted. Your sign-in and studio profile stay."
        confirmWord="RESET"
        confirmLabel="Reset workspace"
        onConfirm={async () => {
          await resetStore();
          toast.success("Workspace data cleared");
          window.location.reload();
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete your account?"
        description="Your login, studio, clients, orders and measurements will be permanently deleted. Export your data first if you may need it."
        confirmWord="DELETE"
        confirmLabel="Delete account"
        onConfirm={async () => {
          await accountRepo.delete();
          await signOut({ redirect: false });
          clearBusinessCache();
          router.push("/welcome");
        }}
      />
    </>
  );
}

// ------------------------------------------------------------- Profile

function ProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { business } = useBusiness();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>{open && business && <ProfileForm business={business} onOpenChange={onOpenChange} />}</DialogContent>
    </Dialog>
  );
}

function ProfileForm({ business, onOpenChange }: { business: Business; onOpenChange: (o: boolean) => void }) {
  const [name, setName] = React.useState(business.name);
  const [owner, setOwner] = React.useState(business.ownerName);
  const [country, setCountry] = React.useState(business.country);
  const [currency, setCurrency] = React.useState(business.currency);
  const [error, setError] = React.useState<string>();
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    if (!name.trim()) {
      setError("Your studio needs a name");
      return;
    }
    setSaving(true);
    try {
      const updated = await businessRepo.update({
        name: name.trim(),
        ownerName: owner.trim(),
        country: country.trim(),
        currency,
      });
      setCachedBusiness(updated);
      toast.success("Studio profile saved");
      onOpenChange(false);
    } catch {
      toast.error("Couldn't save your profile");
    } finally {
      setSaving(false);
    }
  };

  const knownCurrency = CURRENCIES.some(c => c.code === currency);

  return (
    <>
        <DialogHeader>
          <DialogTitle>Studio profile</DialogTitle>
          <DialogDescription>Shown on shared measurement cards and across your workspace.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <Input
            label="Studio name"
            value={name}
            onChange={e => {
              setName(e.target.value);
              setError(undefined);
            }}
            error={error}
          />
          <Input label="Your name" hint="Optional" value={owner} onChange={e => setOwner(e.target.value)} placeholder="Used in your greeting" />
          <Input label="Country" hint="Optional" value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. Nigeria" />
          <Select label="Currency" value={currency} onChange={e => setCurrency(e.target.value)}>
            {!knownCurrency && <option value={currency}>{currency}</option>}
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>
                {c.code} · {currencySymbol(c.code)} · {c.name}
              </option>
            ))}
          </Select>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            Save
          </Button>
        </DialogFooter>
    </>
  );
}

// ------------------------------------------------------------- Confirm

interface ConfirmProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  confirmWord: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}

function ConfirmDialog(props: ConfirmProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>{props.open && <ConfirmBody {...props} />}</DialogContent>
    </Dialog>
  );
}

function ConfirmBody({ onOpenChange, title, description, confirmWord, confirmLabel, onConfirm }: ConfirmProps) {
  const [typed, setTyped] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong. Nothing was deleted.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
        <DialogHeader>
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-danger-bg text-danger">
            <Trash2 size={22} strokeWidth={1.75} />
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Input
          label={
            <span>
              Type <span className="font-mono text-danger">{confirmWord}</span> to confirm
            </span>
          }
          value={typed}
          onChange={e => setTyped(e.target.value)}
          autoCapitalize="characters"
          autoComplete="off"
        />
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive-filled" onClick={run} loading={busy} disabled={typed.trim().toUpperCase() !== confirmWord}>
            {confirmLabel}
          </Button>
        </DialogFooter>
    </>
  );
}

/** Section heading inside the grouped Profile card. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="px-3 pt-4 pb-1 text-[14px] font-medium text-text-secondary">{children}</h2>;
}
