"use client";

// Selection controls: SegmentedControl (2–4 mutually exclusive options),
// Chip (filter / pick from many), and SearchField.

import * as React from "react";
import { motion } from "motion/react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ------------------------------------------------------- SegmentedControl

interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
  /** Accessible label when `label` is not plain text. */
  ariaLabel?: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  size?: "sm" | "md";
  block?: boolean;
  className?: string;
  ariaLabel: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  block,
  className,
  ariaLabel,
}: SegmentedControlProps<T>) {
  const groupId = React.useId();
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "relative inline-flex items-center gap-1 rounded-full bg-surface-sunken p-1",
        block && "flex w-full",
        className
      )}
    >
      {options.map(opt => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={opt.ariaLabel}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative z-0 inline-flex items-center justify-center gap-1.5 rounded-full font-semibold whitespace-nowrap",
              "transition-colors duration-[var(--duration-fast)]",
              size === "sm" ? "h-8 px-3.5 text-caption" : "h-10 px-4 text-label",
              block && "flex-1",
              selected ? "text-ink" : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            {selected && (
              <motion.span
                layoutId={`seg-${groupId}`}
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
                className="absolute inset-0 -z-10 rounded-full bg-surface-raised shadow-[var(--shadow-xs)]"
              />
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------- Chip

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  count?: number;
  size?: "sm" | "md";
  leading?: React.ReactNode;
}

export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ selected, count, size = "md", leading, className, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1.5 shrink-0 rounded-full border font-semibold whitespace-nowrap",
        "transition-[background-color,border-color,color,transform] duration-[var(--duration-fast)] active:scale-[0.97]",
        size === "sm" ? "h-8 px-3 text-caption" : "h-10 px-4 text-label",
        selected
          ? "bg-ink border-ink text-text-inverse"
          : "bg-surface-raised border-border text-text-secondary hover:border-border-strong hover:text-ink",
        className
      )}
      {...props}
    >
      {leading}
      {children}
      {count !== undefined && (
        <span
          className={cn(
            "tabular min-w-5 rounded-full px-1.5 text-center text-[11px] leading-5",
            selected ? "bg-white/15 text-text-inverse" : "bg-surface-sunken text-text-tertiary"
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
);
Chip.displayName = "Chip";

// ------------------------------------------------------------ SearchField

interface SearchFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "size"> {
  value: string;
  onValueChange: (value: string) => void;
  size?: "md" | "lg";
}

export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ value, onValueChange, className, size = "md", placeholder = "Search", ...props }, ref) => (
    // `className` (often padding) goes on the outer box; the icon and clear
    // button centre on the inner one, so padding can't push them off the input.
    <div className={className}>
      <div className="relative">
        <Search
          size={18}
          strokeWidth={1.75}
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"
        />
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={e => onValueChange(e.target.value)}
          placeholder={placeholder}
          aria-label={props["aria-label"] ?? placeholder}
          className={cn(
            "w-full rounded-full border border-transparent bg-surface-sunken pl-11 pr-11 text-[15px] text-ink",
            "placeholder:text-text-tertiary",
            "transition-[background-color,border-color,box-shadow] duration-[var(--duration-fast)]",
            "focus:outline-none focus:bg-surface-raised focus:border-olive focus:ring-4 focus:ring-olive/12",
            "[&::-webkit-search-cancel-button]:hidden",
            size === "lg" ? "h-12" : "h-11"
          )}
          {...props}
        />
        {value && (
          <button
            type="button"
            onClick={() => onValueChange("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full text-text-tertiary hover:bg-surface-sunken hover:text-ink"
          >
            <X size={16} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  )
);
SearchField.displayName = "SearchField";
