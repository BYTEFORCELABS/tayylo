"use client";

import React from "react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { customerRepo } from "@/lib/data/store";
import type { Customer } from "@/types";

interface AddClientSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  onCreated: (customer: Customer) => void;
}

export function AddClientSheet({ open, onOpenChange, initialName = "", onCreated }: AddClientSheetProps) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="New client"
      description="Only the name is required. You can add measurements next."
    >
      {/* Re-keyed on every open/close so each opening starts with a fresh form,
          while the content stays rendered during the closing animation. */}
      <AddClientForm key={open ? "open" : "closed"} initialName={initialName} onOpenChange={onOpenChange} onCreated={onCreated} />

    </BottomSheet>
  );
}

function AddClientForm({ initialName, onOpenChange, onCreated }: Omit<AddClientSheetProps, "open">) {
  const [name, setName] = React.useState(initialName ?? "");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [dupWarning, setDupWarning] = React.useState(false);
  const [nameError, setNameError] = React.useState<string>();
  const [saving, setSaving] = React.useState(false);
  const phoneLongEnough = phone.replace(/\s/g, "").length > 5;

  // Debounced duplicate-phone check (existing behaviour, without a request per keystroke).
  React.useEffect(() => {
    if (!phoneLongEnough) return;
    const t = setTimeout(() => {
      customerRepo
        .checkDuplicatePhone(phone)
        .then(setDupWarning)
        .catch(() => setDupWarning(false));
    }, 350);
    return () => clearTimeout(t);
  }, [phone, phoneLongEnough]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) {
      setNameError("Enter the client's name");
      return;
    }
    setSaving(true);
    try {
      const customer = await customerRepo.create({
        fullName: name.trim(),
        phones: phone.trim() ? [phone.trim()] : [],
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: [],
      });
      onOpenChange(false);
      onCreated(customer);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add this client");
    } finally {
      setSaving(false);
    }
  };

  return (
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Input
          label="Full name"
          placeholder="e.g. Adaeze Okonkwo"
          value={name}
          onChange={e => {
            setName(e.target.value);
            setNameError(undefined);
          }}
          error={nameError}
          autoComplete="off"
          autoFocus
        />
        <Input
          label="Phone"
          hint="Optional"
          placeholder="+234 800 000 0000"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          warning={dupWarning && phoneLongEnough ? "Another client already uses this number" : undefined}
        />
        <Input
          label="Email"
          hint="Optional"
          placeholder="name@example.com"
          type="email"
          inputMode="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <Textarea
          label="Notes"
          hint="Optional"
          rows={3}
          placeholder="Fit preferences, posture, referrals"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
        <div className="sticky bottom-0 -mx-6 bg-surface-raised px-6 pt-2 pb-1">
          <Button type="submit" block size="lg" loading={saving}>
            Add client
          </Button>
        </div>
      </form>
  );
}
