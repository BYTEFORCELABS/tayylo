"use client";

// Tayylo measurement artwork: the close-up icon for a body part, and the
// full body figure with that measurement highlighted. Both are static SVGs
// from public/pictures/tayylo-measurement-icons (body in ink, tape in copper).

import React from "react";
import { Ruler } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  bodyMapFor,
  measurementIconSrc,
  resolveMeasurementArt,
  type BodySex,
  type BodyView,
} from "@/lib/measurement-art";

interface MeasurementIconProps {
  /** Template field key, e.g. "trouser_waist". */
  fieldKey?: string;
  /** Field label, used when the key isn't recognised. */
  label?: string;
  templateName?: string;
  size?: number;
  /** Draw on a soft rounded tile. */
  tile?: boolean;
  /** Load immediately (for off-screen copies rendered to an image). */
  eager?: boolean;
  className?: string;
}

export function MeasurementIcon({ fieldKey, label, templateName, size = 32, tile = false, eager = false, className }: MeasurementIconProps) {
  const art = resolveMeasurementArt({ key: fieldKey, label, templateName });
  const icon = art ? (
    // eslint-disable-next-line @next/next/no-img-element -- tiny static SVG, no optimisation needed
    <img
      src={measurementIconSrc(art)}
      alt=""
      width={size}
      height={size}
      loading={eager ? "eager" : "lazy"}
      draggable={false}
      className="shrink-0 select-none"
      style={{ width: size, height: size }}
    />
  ) : (
    <Ruler size={Math.round(size * 0.6)} strokeWidth={1.75} className="shrink-0 text-text-tertiary" />
  );

  if (!tile) {
    return (
      <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }}>
        {icon}
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-surface-sunken", className)}
      style={{ width: size + 12, height: size + 12 }}
    >
      {icon}
    </span>
  );
}

interface MeasurementFigureProps {
  fieldKey?: string;
  label?: string;
  templateName?: string;
  sex: BodySex;
  /** Rendered height in px; the figure is 240 × 520. */
  height?: number;
  /** Show front / back / side chips when the measurement has several views. */
  showViews?: boolean;
  className?: string;
}

/** Full figure with the measurement drawn on it, with view switching. */
export function MeasurementFigure({ fieldKey, label, templateName, sex, height = 220, showViews = true, className }: MeasurementFigureProps) {
  const art = resolveMeasurementArt({ key: fieldKey, label, templateName });
  const [view, setView] = React.useState<BodyView | undefined>(undefined);
  // A new measurement starts on its primary view.
  const [forId, setForId] = React.useState(art?.id);
  if (forId !== art?.id) {
    setForId(art?.id);
    setView(undefined);
  }

  if (!art) {
    return (
      <div className={cn("flex items-center justify-center text-text-tertiary", className)} style={{ height }}>
        <Ruler size={40} strokeWidth={1.5} />
      </div>
    );
  }

  const b = bodyMapFor(art, sex, view);
  const width = Math.round((height * 240) / 520);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative" style={{ width, height }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG layers */}
        <img src={b.map} alt="" draggable={false} className="absolute inset-0 size-full select-none opacity-90" />
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG layers */}
        <img
          key={b.overlay}
          src={b.overlay}
          alt={`Where to measure ${art.name.toLowerCase()}`}
          draggable={false}
          className="absolute inset-0 size-full select-none animate-fade-in"
        />
      </div>
      {showViews && art.views.length > 1 && (
        <div role="radiogroup" aria-label="Figure view" className="mt-2 flex gap-1 rounded-full bg-surface-sunken p-0.5">
          {art.views.map(v => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={b.view === v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors",
                b.view === v ? "bg-surface-raised text-ink shadow-[var(--shadow-xs)]" : "text-text-tertiary hover:text-ink"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** How-to-measure text for a field, when the library has one. */
export function measurementMethod(field: { key?: string; label?: string; templateName?: string }) {
  return resolveMeasurementArt(field)?.method;
}
