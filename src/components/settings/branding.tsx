"use client";

// Studio branding and payment details used on invoices and receipts:
// the studio's own logo (falls back to the Tayylo mark) and the bank
// accounts clients pay into, one of which is the default.

import React from "react";
import { Landmark, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/brand/logo";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { businessRepo } from "@/lib/data/store";
import { setCachedBusiness, useBusiness } from "@/lib/use-business";
import { prepareLogo } from "@/lib/images";
import { cn } from "@/lib/utils";
import type { BankAccount, Business } from "@/types";

/** The studio's logo if it has one, otherwise the Tayylo lockup. */
export function BrandMark({ business, height = 30, className }: { business: Business | null; height?: number; className?: string }) {
  if (business?.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- inline data URL
      <img
        src={business.logoUrl}
        alt={business.name}
        style={{ height: Math.round(height * 1.5), width: "auto", maxWidth: height * 6 }}
        className={cn("shrink-0 select-none object-contain", className)}
        draggable={false}
      />
    );
  }
  return <Logo height={height} className={className} />;
}

export function bankAccountsOf(business: Business | null): BankAccount[] {
  return Array.isArray(business?.bankAccounts) ? business.bankAccounts : [];
}

/** Account shown on an invoice: the order's choice if it still exists, else the default. */
export function invoiceAccount(business: Business | null, chosenId?: string | null) {
  const accounts = bankAccountsOf(business);
  return accounts.find(a => a.id === chosenId) ?? accounts.find(a => a.isDefault) ?? accounts[0] ?? null;
}

// ------------------------------------------------------------------ logo

export function LogoPicker() {
  const { business } = useBusiness();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);

  const save = async (logoUrl: string | null) => {
    setBusy(true);
    try {
      setCachedBusiness(await businessRepo.update({ logoUrl }));
      toast.success(logoUrl ? "Logo updated" : "Logo removed — documents use the Tayylo mark");
    } catch {
      toast.error("Couldn't save the logo");
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    try {
      await save(await prepareLogo(file));
    } catch (e) {
      toast.error((e as Error).message || "Couldn't read that image");
    }
  };

  return (
    <div role="listitem" className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center">
      <div className="flex h-20 w-full shrink-0 items-center justify-center rounded-[var(--radius-card)] border border-border/70 bg-white px-4 sm:w-44">
        <BrandMark business={business} height={24} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-ink">Brand logo</p>
        <p className="text-label text-text-secondary">
          {business?.logoUrl ? "Shown on your invoices and receipts." : "Using the Tayylo logo. Add yours to brand invoices and receipts."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" loading={busy} onClick={() => inputRef.current?.click()}>
            {business?.logoUrl ? "Replace" : "Upload logo"}
          </Button>
          {business?.logoUrl && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => save(null)}>
              Remove
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={e => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

// --------------------------------------------------------- bank accounts

export function BankAccountsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{open && <BankAccountsBody onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}

function BankAccountsBody({ onDone }: { onDone: () => void }) {
  const { business } = useBusiness();
  const accounts = bankAccountsOf(business);
  const [adding, setAdding] = React.useState(accounts.length === 0);
  const [busy, setBusy] = React.useState<string | null>(null);

  const persist = async (next: BankAccount[], key: string, message: string) => {
    setBusy(key);
    try {
      setCachedBusiness(await businessRepo.update({ bankAccounts: next }));
      toast.success(message);
      return true;
    } catch {
      toast.error("Couldn't save bank accounts");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const makeDefault = (id: string) =>
    persist(
      accounts.map(a => ({ ...a, isDefault: a.id === id })),
      `default:${id}`,
      "Default account updated"
    );

  const remove = (id: string) => {
    const rest = accounts.filter(a => a.id !== id);
    // The server promotes the first remaining account if the default was removed.
    return persist(rest, `delete:${id}`, "Account removed");
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Bank accounts</DialogTitle>
        <DialogDescription>Clients see the default account on invoices. You can pick a different one on any invoice.</DialogDescription>
      </DialogHeader>

      {accounts.length > 0 && (
        <ul className="mb-3 space-y-2.5">
          {accounts.map(a => (
            <li
              key={a.id}
              className={cn(
                "flex items-start gap-3 rounded-[var(--radius-card)] border px-4 py-3.5",
                a.isDefault ? "border-olive/50 bg-olive-soft/40" : "border-border/70 bg-surface"
              )}
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink">
                <Landmark size={18} strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 text-[15px] font-semibold text-ink">
                  {a.bankName}
                  {a.isDefault && (
                    <span className="rounded-full bg-olive px-2 py-0.5 text-[11px] font-semibold text-text-inverse">Default</span>
                  )}
                </p>
                <p className="tabular text-label text-ink">{a.accountNumber}</p>
                <p className="truncate text-label text-text-secondary">{a.accountName}</p>
                {!a.isDefault && (
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => makeDefault(a.id)}
                    className="mt-1.5 text-label font-semibold text-olive hover:underline disabled:opacity-50"
                  >
                    Make default
                  </button>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${a.bankName} account`}
                loading={busy === `delete:${a.id}`}
                disabled={!!busy}
                onClick={() => remove(a.id)}
                className="-mr-2 shrink-0 text-danger"
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <AddAccountForm
          saving={busy === "add"}
          onCancel={accounts.length ? () => setAdding(false) : undefined}
          onSave={async acc => {
            const next = [...accounts, { ...acc, id: crypto.randomUUID(), isDefault: accounts.length === 0 }];
            if (await persist(next, "add", "Bank account added")) setAdding(false);
          }}
        />
      ) : (
        <Button variant="secondary" block onClick={() => setAdding(true)} disabled={accounts.length >= 10}>
          <Plus />
          Add bank account
        </Button>
      )}

      <DialogFooter>
        <Button onClick={onDone}>Done</Button>
      </DialogFooter>
    </>
  );
}

function AddAccountForm({
  saving,
  onSave,
  onCancel,
}: {
  saving: boolean;
  onSave: (a: Pick<BankAccount, "bankName" | "accountName" | "accountNumber">) => void;
  onCancel?: () => void;
}) {
  const [bankName, setBankName] = React.useState("");
  const [accountNumber, setAccountNumber] = React.useState("");
  const [accountName, setAccountName] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const submit = () => {
    const e: Record<string, string> = {};
    if (!bankName.trim()) e.bankName = "Enter the bank name";
    if (!accountNumber.trim()) e.accountNumber = "Enter the account number";
    if (!accountName.trim()) e.accountName = "Enter the account name";
    setErrors(e);
    if (Object.keys(e).length) return;
    onSave({ bankName: bankName.trim(), accountNumber: accountNumber.trim(), accountName: accountName.trim() });
  };

  return (
    <div className="space-y-4 rounded-[var(--radius-card)] border border-border/70 bg-surface px-4 py-4">
      <Input label="Bank" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. GTBank" error={errors.bankName} />
      <Input
        label="Account number"
        value={accountNumber}
        onChange={e => setAccountNumber(e.target.value)}
        inputMode="numeric"
        placeholder="0123456789"
        error={errors.accountNumber}
      />
      <Input
        label="Account name"
        value={accountName}
        onChange={e => setAccountName(e.target.value)}
        placeholder="Name on the account"
        error={errors.accountName}
      />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button variant="tonal" onClick={submit} loading={saving}>
          Save account
        </Button>
      </div>
    </div>
  );
}
