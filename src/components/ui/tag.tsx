"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const tagVariants = cva(
  "inline-flex items-center gap-1.5 font-medium rounded-full select-none whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-beige-light text-text-primary",
        beige: "bg-beige text-olive-deep",
        olive: "bg-olive text-white-warm",
        success: "bg-success-bg text-success",
        warning: "bg-warning-bg text-warning",
        danger: "bg-danger-bg text-danger",
        info: "bg-info-bg text-info",
        outline: "border border-border text-text-secondary bg-transparent",
      },
      size: {
        sm: "h-6 px-2 text-xs",
        md: "h-7 px-3 text-xs",
        lg: "h-8 px-3 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface TagProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof tagVariants> {
  removable?: boolean;
  onRemove?: () => void;
}

const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ className, variant, size, removable, onRemove, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(tagVariants({ variant, size, className }))}
        {...props}
      >
        {children}
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-black/10 transition-colors"
            aria-label="Remove"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M7.5 2.5L2.5 7.5M2.5 2.5L7.5 7.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </span>
    );
  }
);
Tag.displayName = "Tag";

// Status tag with colored dot
interface StatusTagProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
  label?: string;
}

const statusConfig: Record<
  string,
  { dotColor: string; bgColor: string; textColor: string; defaultLabel: string }
> = {
  pending: { dotColor: "bg-text-tertiary", bgColor: "bg-beige-light", textColor: "text-text-secondary", defaultLabel: "Pending" },
  cutting: { dotColor: "bg-info", bgColor: "bg-info-bg", textColor: "text-info", defaultLabel: "Cutting" },
  sewing: { dotColor: "bg-warning", bgColor: "bg-warning-bg", textColor: "text-warning", defaultLabel: "Sewing" },
  fitting: { dotColor: "bg-olive", bgColor: "bg-beige-light", textColor: "text-olive", defaultLabel: "Fitting" },
  alterations: { dotColor: "bg-warning", bgColor: "bg-warning-bg", textColor: "text-warning", defaultLabel: "Alterations" },
  ready: { dotColor: "bg-success", bgColor: "bg-success-bg", textColor: "text-success", defaultLabel: "Ready" },
  delivered: { dotColor: "bg-text-tertiary", bgColor: "bg-beige-light", textColor: "text-text-secondary", defaultLabel: "Delivered" },
  overdue: { dotColor: "bg-danger", bgColor: "bg-danger-bg", textColor: "text-danger", defaultLabel: "Overdue" },
  cancelled: { dotColor: "bg-text-tertiary", bgColor: "bg-beige-light", textColor: "text-text-tertiary", defaultLabel: "Cancelled" },
};

const defaultStatusConfig = { dotColor: "bg-text-tertiary", bgColor: "bg-beige-light", textColor: "text-text-secondary", defaultLabel: "Unknown" };

const StatusTag = React.forwardRef<HTMLSpanElement, StatusTagProps>(
  ({ status, label, className, ...props }, ref) => {
    const config = statusConfig[status] || defaultStatusConfig;
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium",
          config.bgColor,
          config.textColor,
          className
        )}
        {...props}
      >
        <span className={cn("w-2 h-2 rounded-full", config.dotColor)} />
        {label || config.defaultLabel}
      </span>
    );
  }
);
StatusTag.displayName = "StatusTag";

// Delta chip for measurement changes
interface DeltaChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  unit?: string;
}

const DeltaChip: React.FC<DeltaChipProps> = ({
  value,
  unit = "",
  className,
  ...props
}) => {
  if (value === 0) return null;
  const isPositive = value > 0;

  return (
    <span
      className={cn(
        "inline-flex items-center h-5 px-1.5 rounded text-xs font-medium bg-beige-light text-text-secondary",
        className
      )}
      {...props}
    >
      {isPositive ? "+" : ""}
      {value}
      {unit && ` ${unit}`}
    </span>
  );
};
DeltaChip.displayName = "DeltaChip";

export { Tag, tagVariants, StatusTag, DeltaChip };
