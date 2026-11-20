"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeStatus, statusLabel } from "@/lib/orders";

const tagVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap select-none",
  {
    variants: {
      variant: {
        default: "bg-surface-sunken text-text-secondary",
        beige: "bg-beige-light text-text-secondary",
        olive: "bg-olive-soft text-olive-deep",
        solid: "bg-ink text-text-inverse",
        success: "bg-success-bg text-success",
        warning: "bg-warning-bg text-warning",
        danger: "bg-danger-bg text-danger",
        info: "bg-info-bg text-info",
        outline: "border border-border text-text-secondary bg-transparent",
      },
      size: {
        sm: "h-6 px-2.5 text-[11px]",
        md: "h-7 px-3 text-caption",
        lg: "h-8 px-3.5 text-label",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
);

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof tagVariants> {
  removable?: boolean;
  onRemove?: () => void;
}

const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ className, variant, size, removable, onRemove, children, ...props }, ref) => (
    <span ref={ref} className={cn(tagVariants({ variant, size }), className)} {...props}>
      {children}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="-mr-1 inline-flex size-4 items-center justify-center rounded-full hover:bg-black/10"
          aria-label="Remove"
        >
          <X size={11} strokeWidth={2.25} />
        </button>
      )}
    </span>
  )
);
Tag.displayName = "Tag";

// ---------------------------------------------------------------- Status

type Tone = "neutral" | "info" | "progress" | "olive" | "success" | "danger" | "muted";

const statusTone: Record<string, Tone> = {
  pending: "neutral",
  cutting: "info",
  sewing: "info",
  fitting: "olive",
  alterations: "progress",
  ready: "success",
  delivered: "muted",
  overdue: "danger",
  cancelled: "muted",
};

const toneClasses: Record<Tone, { dot: string; text: string; bg: string }> = {
  neutral: { dot: "bg-text-tertiary", text: "text-text-secondary", bg: "bg-surface-sunken" },
  info: { dot: "bg-info", text: "text-info", bg: "bg-info-bg" },
  progress: { dot: "bg-warning", text: "text-warning", bg: "bg-warning-bg" },
  olive: { dot: "bg-olive", text: "text-olive-deep", bg: "bg-olive-soft" },
  success: { dot: "bg-success", text: "text-success", bg: "bg-success-bg" },
  danger: { dot: "bg-danger", text: "text-danger", bg: "bg-danger-bg" },
  muted: { dot: "bg-border-strong", text: "text-text-tertiary", bg: "bg-surface-sunken" },
};

interface StatusTagProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
  label?: string;
  /** `pill` = tinted background; `dot` = text with a dot only (dense lists). */
  appearance?: "pill" | "dot";
}

const StatusTag = React.forwardRef<HTMLSpanElement, StatusTagProps>(
  ({ status, label, appearance = "pill", className, ...props }, ref) => {
    const key = status === "overdue" ? "overdue" : (normalizeStatus(status) ?? "");
    const t = toneClasses[statusTone[key] ?? "neutral"];
    const text = label ?? statusLabel(status);
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap text-caption font-semibold",
          appearance === "pill" && cn("h-6 rounded-full px-2.5", t.bg),
          t.text,
          className
        )}
        {...props}
      >
        <span aria-hidden className={cn("size-1.5 rounded-full", t.dot)} />
        {text}
      </span>
    );
  }
);
StatusTag.displayName = "StatusTag";

// ----------------------------------------------------------------- Delta

interface DeltaChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Pre-formatted text, e.g. "+½ in". */
  label: string;
  direction: "up" | "down";
}

const DeltaChip: React.FC<DeltaChipProps> = ({ label, direction, className, ...props }) => (
  <span
    className={cn(
      "tabular inline-flex h-5 items-center rounded-full px-1.5 text-[11px] font-semibold",
      direction === "up" ? "bg-olive-soft text-olive-deep" : "bg-warning-bg text-warning",
      className
    )}
    {...props}
  >
    {label}
  </span>
);
DeltaChip.displayName = "DeltaChip";

export { Tag, tagVariants, StatusTag, DeltaChip };
