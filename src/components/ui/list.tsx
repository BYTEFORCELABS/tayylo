"use client";

// Grouped list: one rounded surface with hairline dividers between rows.
// Used for clients, orders, settings rows, balances — anything scannable.

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function List({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="list"
      className={cn(
        "overflow-hidden rounded-[var(--radius-card)] border border-border/70 bg-surface",
        "divide-y divide-divider",
        className
      )}
      {...props}
    />
  );
}

interface ListItemProps {
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-aligned value (money, date, status). */
  trailing?: React.ReactNode;
  /** Small text under trailing. */
  trailingSub?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  chevron?: boolean;
  className?: string;
  /** Extra content under the title row. */
  children?: React.ReactNode;
  tone?: "default" | "danger";
  /** Called on hover / touch / focus, to start loading the destination early. */
  onPrefetch?: () => void;
}

export function ListItem({
  leading,
  title,
  subtitle,
  trailing,
  trailingSub,
  href,
  onClick,
  chevron,
  className,
  children,
  tone = "default",
  onPrefetch,
}: ListItemProps) {
  const interactive = !!(href || onClick);
  // Spans (not divs) so the row is valid HTML inside <a> and <button>.
  const content = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="block min-w-0 flex-1">
        <span className={cn("block truncate text-[15px] font-semibold", tone === "danger" ? "text-danger" : "text-ink")}>
          {title}
        </span>
        {subtitle && <span className="mt-0.5 block truncate text-label text-text-tertiary">{subtitle}</span>}
        {children}
      </span>
      {(trailing || trailingSub) && (
        <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
          {trailing}
          {trailingSub && <span className="block text-caption text-text-tertiary">{trailingSub}</span>}
        </span>
      )}
      {chevron && <ChevronRight size={18} strokeWidth={1.75} className="shrink-0 text-text-tertiary" aria-hidden />}
    </>
  );

  const base = cn(
    "flex w-full items-center gap-3.5 px-4 py-3.5 text-left min-h-[64px]",
    interactive &&
      "transition-colors duration-[var(--duration-fast)] hover:bg-beige-light/60 active:bg-beige-light focus-visible:outline-offset-[-2px]",
    className
  );

  if (href) {
    return (
      <Link
        role="listitem"
        href={href}
        className={base}
        onPointerEnter={onPrefetch}
        onTouchStart={onPrefetch}
        onFocus={onPrefetch}
      >
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <div role="listitem">
        <button type="button" onClick={onClick} className={base}>
          {content}
        </button>
      </div>
    );
  }
  return (
    <div role="listitem" className={base}>
      {content}
    </div>
  );
}

/** Rounded square icon tile used as a list leading element. */
export function IconTile({
  children,
  tone = "neutral",
  size = "md",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "olive" | "danger" | "warning" | "success";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full [&_svg]:shrink-0",
        size === "sm" && "size-8 [&_svg]:size-4",
        size === "md" && "size-10 [&_svg]:size-[18px]",
        size === "lg" && "size-12 [&_svg]:size-5",
        tone === "neutral" && "bg-surface-sunken text-text-secondary",
        tone === "olive" && "bg-olive-soft text-olive-deep",
        tone === "danger" && "bg-danger-bg text-danger",
        tone === "warning" && "bg-warning-bg text-warning",
        tone === "success" && "bg-success-bg text-success",
        className
      )}
    >
      {children}
    </span>
  );
}
