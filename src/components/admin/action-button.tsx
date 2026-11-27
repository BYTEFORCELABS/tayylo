"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { adminRequest } from "@/components/admin/request";

interface Props {
  url: string;
  method: "POST" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  children: React.ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  success: string;
  /** Ask before acting. */
  confirm?: { title: string; description: React.ReactNode; action: string; destructive?: boolean };
  /** Ask for a written reason, sent as `body.reason`. Implies confirm. */
  reason?: { label: string; placeholder?: string };
  /** Where to go afterwards (default: refresh this page). */
  redirectTo?: string;
}

export function ActionButton({ url, method, body, children, variant = "secondary", size = "sm", success, confirm, reason, redirectTo }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [text, setText] = React.useState("");

  const run = async () => {
    setBusy(true);
    try {
      await adminRequest(url, method, reason ? { ...body, reason: text } : body);
      toast.success(success);
      setOpen(false);
      setText("");
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!confirm && !reason) {
    return (
      <Button variant={variant} size={size} loading={busy} onClick={run}>
        {children}
      </Button>
    );
  }

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm?.title ?? "Are you sure?"}</DialogTitle>
            {confirm?.description && <DialogDescription>{confirm.description}</DialogDescription>}
          </DialogHeader>
          {reason && (
            <label className="flex flex-col gap-2">
              <span className="text-label font-semibold text-ink">{reason.label}</span>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={reason.placeholder}
                rows={3}
                maxLength={500}
                className="w-full rounded-[var(--radius-input)] border border-border bg-surface-raised p-3 text-[15px] text-ink focus:border-olive focus:outline-none focus:ring-4 focus:ring-olive/12"
              />
            </label>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={confirm?.destructive ? "destructive-filled" : "primary"}
              loading={busy}
              disabled={!!reason && text.trim().length < 3}
              onClick={run}
            >
              {confirm?.action ?? "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** A select that PATCHes on change (role pickers). */
export function SelectAction({ url, field, value, options, action, label, disabled }: {
  url: string;
  field: string;
  value: string;
  options: { value: string; label: string }[];
  action: string;
  label: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  return (
    <select
      aria-label={label}
      value={value}
      disabled={busy || disabled}
      onChange={async e => {
        const next = e.target.value;
        setBusy(true);
        try {
          await adminRequest(url, "PATCH", { action, [field]: next === "none" ? null : next });
          toast.success("Saved");
          router.refresh();
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
      className="h-9 rounded-full border border-border bg-surface-raised px-3 text-[13px] font-semibold text-ink disabled:opacity-50"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
