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
import { MeasurementIcon } from "@/components/brand/measurement-icon";
import { TapeRule } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
  const takenBy = businessName?.trim() || "your tailor";
  const fileName = `${clientName.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "")}-measurements`;

  const makeImage = async () => {
    if (!cardRef.current) throw new Error("Card not ready");
    const node = cardRef.current;
    // Every image (logo, icons) must be decoded before capture, or it comes out blank or distorted.
    await Promise.all(
      Array.from(node.querySelectorAll("img")).map(img => img.decode().catch(() => {})),
    );
    const { toBlob } = await import("html-to-image");
    const opts = { pixelRatio: 2, backgroundColor: "#F3F1EA", width: 640 };
    // Safari often drops images on the first pass; a warm-up pass fixes it.
    await toBlob(node, opts).catch(() => null);
    const blob = await toBlob(node, opts);
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

        {/* Preview — the image is rendered from the fixed-width copy below */}
        <div className="-mx-1 max-h-[52dvh] overflow-y-auto px-1">
          <MeasurementCardArt clientName={clientName} takenBy={takenBy} dateLabel={dateLabel} set={set} unit={unit} />
        </div>
        {/* Off-screen, fixed-width card used for the image so it looks the same from any device */}
        <div aria-hidden className="pointer-events-none fixed top-0 -left-[10000px]">
          <div ref={cardRef} style={{ width: 640 }}>
            <MeasurementCardArt clientName={clientName} takenBy={takenBy} dateLabel={dateLabel} set={set} unit={unit} wide />
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

// ------------------------------------------------------------ card art

/** The branded measurement card: shown as a preview and rendered to the shared image. */
function MeasurementCardArt({
  clientName,
  takenBy,
  dateLabel,
  set,
  unit,
  wide,
}: {
  clientName: string;
  takenBy: string;
  dateLabel: string;
  set: MeasurementSet;
  unit: UnitSystem;
  /** Fixed two-column layout for the exported image. */
  wide?: boolean;
}) {
  const u = unitLabel(unit);
  return (
    <div className="overflow-hidden rounded-[22px] border border-border bg-surface text-ink">
      {/* Brand band with the tape-measure edge */}
      <div className="relative overflow-hidden bg-panel px-6 pt-9 pb-5 text-text-inverse">
        <TapeRule className="h-6 opacity-30" />
        <div className="flex items-center justify-between gap-4">
          <Logo tone="cream" height={wide ? 26 : 22} plain />
          <span className="whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-[0.18em] text-text-on-panel-muted">
            Measurement card
          </span>
        </div>
      </div>

      <div className={cn("px-6 pt-5 pb-6", wide && "px-7")}>
        <p className={cn("font-semibold leading-tight tracking-tight", wide ? "text-[28px]" : "text-[22px]")}>{clientName}</p>
        <p className="mt-1.5 text-label leading-relaxed text-text-secondary">
          {set.templateName} measurements taken by <span className="font-semibold text-ink">{takenBy}</span> on {dateLabel}.
        </p>

        <ul className={cn("mt-5 grid gap-2", wide ? "grid-cols-2" : "grid-cols-1 min-[420px]:grid-cols-2")}>
          {set.values.map(v => (
            <li
              key={v.fieldKey}
              className="flex items-center gap-3 rounded-[14px] border border-border/70 bg-surface-raised px-3 py-2.5"
            >
              <MeasurementIcon fieldKey={v.fieldKey} label={v.labelSnapshot} templateName={set.templateName} size={30} eager={wide} />
              <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-text-secondary">{v.labelSnapshot}</span>
              <span className="shrink-0 whitespace-nowrap text-right">
                <span className="measurement-value text-[19px] font-semibold text-ink">{formatMeasurement(v.valueMm, unit)}</span>
                <span className="ml-1 text-[12px] font-medium text-text-tertiary">{u}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-divider pt-4">
          <p className="flex items-center gap-2 text-caption text-text-tertiary">
            <Logo variant="symbol" height={14} plain />
            Measured and recorded with Tayylo
          </p>
          <p className="tabular whitespace-nowrap text-caption text-text-tertiary">
            {set.values.length} measurements
          </p>
        </div>
      </div>
    </div>
  );
}
