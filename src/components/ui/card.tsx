"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  /** Adds hover/press feedback for clickable cards. */
  interactive?: boolean;
}

/**
 * The default container. Flat surface on the canvas, no shadow — depth
 * comes from the surface/canvas contrast, not from elevation.
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = "md", interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-surface rounded-[var(--radius-card)] border border-border/70",
        {
          "p-0": padding === "none",
          "p-4": padding === "sm",
          "p-5": padding === "md",
          "p-6": padding === "lg",
        },
        interactive &&
          "cursor-pointer transition-[border-color,background-color,transform] duration-[var(--duration-fast)] hover:border-border-strong active:scale-[0.99]",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center justify-between gap-3 pb-4", className)} {...props} />
);

const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-headline text-ink", className)} {...props} />
);

const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={className} {...props} />
);

/**
 * Prominent summary panel — the one dark, high-contrast surface on a
 * screen. Use at most once per view, for the figure that matters most.
 */
const Panel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-panel)] bg-panel text-text-inverse p-6 pt-11",
        className
      )}
      {...props}
    >
      <TapeRule />
      {children}
    </div>
  )
);
Panel.displayName = "Panel";

// One "unit" on the tape. Minor ticks every UNIT/10, a half mark at UNIT/2
// and a numbered major mark every UNIT — like the edge of a tailor's tape.
const UNIT = 64;
const ORIGIN = 24; // aligns 0 with the panel's content edge (p-6)
const tick = (w: number, h: number) =>
  `linear-gradient(to right, currentColor ${w}px, transparent ${w}px) ${ORIGIN}px 0 / ${UNIT / (h === 6 ? 10 : h === 10 ? 2 : 1)}px ${h}px repeat-x`;

/** Tailor's tape-measure edge along the top of a panel. Purely decorative. */
function TapeRule() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-7 select-none overflow-hidden opacity-35">
      <div className="absolute inset-0" style={{ background: [tick(1, 14), tick(1, 10), tick(1, 6)].join(", ") }} />
      <div className="tabular absolute top-[16px] flex text-[9.5px] font-semibold leading-none" style={{ left: ORIGIN + 3 }}>
        {Array.from({ length: 40 }, (_, i) => (
          <span key={i} className="shrink-0" style={{ width: UNIT }}>
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}

export { Card, CardHeader, CardTitle, CardContent, Panel };
