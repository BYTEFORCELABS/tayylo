"use client";

// Share a client's measurements as a branded image card (Tayylo mark,
// who took the measurements and when), with the plain text alongside for
// chats that can't take a file.

import React from "react";
import { Copy, Download } from "lucide-react";
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

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.23 8.23 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.13-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.29Z" />
    </svg>
  );
}

export function ShareMeasurementsDialog({ open, onOpenChange, clientName, phone, businessName, set, unit }: ShareDialogProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [busy, setBusy] = React.useState<"image" | "whatsapp" | null>(null);
  if (!set) return null;

  const dateLabel = formatDate(set.takenAt);
  const text = shareText({ businessName, clientName, set, unit, dateLabel });
  const u = unitLabel(unit);
  const takenBy = businessName?.trim() || "your tailor";
  const fileName = `${clientName.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "")}-measurements`;

  const makeImage = async () => {
    if (!cardRef.current) throw new Error("Card not ready");
    const { toBlob } = await import("html-to-image");
    const blob = await toBlob(cardRef.current, { pixelRatio: 2, backgroundColor: "#FBFAF7", cacheBust: true });
    if (!blob) throw new Error("Couldn't create the image");
    return new File([blob], `${fileName}.png`, { type: "image/png" });
  };

  const download = (file: File) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Measurements copied as text");
    } catch {
      toast.error("Couldn't copy — your browser blocked clipboard access");
    }
  };

  const saveImage = async () => {
    setBusy("image");
    try {
      download(await makeImage());
      toast.success("Measurement card saved");
    } catch {
      toast.error("Couldn't create the image");
    } finally {
      setBusy(null);
    }
  };

  /** Phones: share sheet with the image (pick WhatsApp). Desktop: save image + open the chat. */
  const sendWhatsApp = async () => {
    setBusy("whatsapp");
    try {
      const file = await makeImage().catch(() => null);
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${clientName}'s measurements — taken by ${takenBy}` });
        return;
      }
      if (file) download(file);
      window.open(phone ? whatsappLink(phone, text) : `https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
      if (file) toast.success("Image saved — attach it in the chat");
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") toast.error("Couldn't share the measurements");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share measurements</DialogTitle>
          <DialogDescription>Sent as a branded image card, with the text included.</DialogDescription>
        </DialogHeader>

        {/* The card below is exactly what the recipient receives as an image */}
        <div className="-mx-1 max-h-[52dvh] overflow-y-auto px-1">
          <div ref={cardRef} className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
            <div className="h-1.5 bg-olive" />
            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <Logo height={22} />
                <span className="text-overline uppercase text-text-tertiary">Measurement card</span>
              </div>

              <div className="mt-5">
                <p className="text-headline text-ink">{clientName}</p>
                <p className="mt-1 text-label text-text-secondary">
                  {set.templateName} measurements taken by <span className="font-semibold text-ink">{takenBy}</span> on {dateLabel}.
                </p>
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-x-6 border-t border-divider min-[400px]:grid-cols-2">
                {set.values.map(v => (
                  <div key={v.fieldKey} className="flex items-baseline justify-between gap-2 border-b border-divider py-2">
                    <dt className="truncate text-label text-text-secondary">{v.labelSnapshot}</dt>
                    <dd className="measurement-value shrink-0 text-label font-semibold text-ink">
                      {formatMeasurement(v.valueMm, unit)} <span className="font-medium text-text-tertiary">{u}</span>
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="mt-4 flex items-center gap-2 text-caption text-text-tertiary">
                <Logo variant="symbol" height={14} />
                Measured and recorded with Tayylo
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-wrap">
          <Button variant="ghost" onClick={copy} disabled={!!busy}>
            <Copy />
            Copy text
          </Button>
          <Button variant="secondary" onClick={saveImage} loading={busy === "image"} disabled={!!busy}>
            <Download />
            Save image
          </Button>
          <Button variant="secondary" onClick={sendWhatsApp} loading={busy === "whatsapp"} disabled={!!busy}>
            <WhatsAppGlyph className="size-5 text-[#25D366]" />
            Send on WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
