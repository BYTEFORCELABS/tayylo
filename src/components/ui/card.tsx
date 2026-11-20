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
        "relative overflow-hidden rounded-[var(--radius-panel)] bg-panel text-text-inverse p-6",
        className
      )}
      {...props}
    >
      {/* Faint stitched rule — a quiet tailoring cue, not decoration */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-3 h-px opacity-25"
        style={{
          backgroundImage: "linear-gradient(90deg, currentColor 50%, transparent 50%)",
          backgroundSize: "8px 1px",
        }}
      />
      {children}
    </div>
  )
);
Panel.displayName = "Panel";

export { Card, CardHeader, CardTitle, CardContent, Panel };
