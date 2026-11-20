"use client";

import { Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Logo } from "@/components/brand/logo";
import { formatDate, formatMeasurement, unitLabel } from "@/lib/format";
import { shareText } from "@/lib/measurements";
import type { MeasurementSet, UnitSystem } from "@/types";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  phone?: string;
  businessName?: string;
  set?: MeasurementSet;
  unit: UnitSystem;
}

export function whatsappLink(phone: string, text: string) {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function ShareMeasurementsDialog({ open, onOpenChange, clientName, phone, businessName, set, unit }: ShareDialogProps) {
  if (!set) return null;
  const text = shareText({ businessName, clientName, set, unit, dateLabel: formatDate(set.takenAt) });
  const u = unitLabel(unit);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Measurement card copied");
    } catch {
      toast.error("Couldn't copy — your browser blocked clipboard access");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share measurements</DialogTitle>
          <DialogDescription>Send {clientName.split(" ")[0]}&apos;s current set as a message.</DialogDescription>
        </DialogHeader>

        {/* Card preview — what the recipient gets */}
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-3 border-b border-divider pb-4">
            <div className="min-w-0">
              <p className="truncate text-headline text-ink">{clientName}</p>
              <p className="text-label text-text-tertiary">
                {set.templateName} · {formatDate(set.takenAt)}
              </p>
            </div>
            <Logo variant="symbol" height={22} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-6">
            {set.values.slice(0, 12).map(v => (
              <div key={v.fieldKey} className="flex items-baseline justify-between gap-2 border-b border-divider py-2 last:border-0 [&:nth-last-child(2)]:border-0">
                <dt className="truncate text-label text-text-secondary">{v.labelSnapshot}</dt>
                <dd className="measurement-value text-label font-semibold text-ink">
                  {formatMeasurement(v.valueMm, unit)} <span className="font-medium text-text-tertiary">{u}</span>
                </dd>
              </div>
            ))}
          </dl>
          {set.values.length > 12 && (
            <p className="mt-3 text-center text-caption text-text-tertiary">+ {set.values.length - 12} more in the message</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={copy}>
            <Copy />
            Copy text
          </Button>
          {phone && (
            <Button asChild>
              <a href={whatsappLink(phone, text)} target="_blank" rel="noopener noreferrer">
                <MessageCircle />
                Send on WhatsApp
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
