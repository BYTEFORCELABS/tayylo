"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface TabsProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  items: TabItem<T>[];
  ariaLabel: string;
  className?: string;
}

/** Underlined, horizontally scrollable section tabs for detail screens. */
export function Tabs<T extends string>({ value, onChange, items, ariaLabel, className }: TabsProps<T>) {
  const id = React.useId();
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = items[(index + (e.key === "ArrowRight" ? 1 : items.length - 1)) % items.length];
    onChange(next.value);
    refs.current[next.value]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("-mx-4 flex gap-1 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0 border-b border-border", className)}
    >
      {items.map((t, i) => {
        const selected = t.value === value;
        return (
          <button
            key={t.value}
            ref={el => {
              refs.current[t.value] = el;
            }}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.value)}
            onKeyDown={e => onKeyDown(e, i)}
            className={cn(
              "relative flex h-12 shrink-0 items-center gap-1.5 px-3 text-label whitespace-nowrap transition-colors",
              selected ? "font-semibold text-ink" : "font-medium text-text-tertiary hover:text-text-secondary"
            )}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span
                className={cn(
                  "tabular rounded-full px-1.5 text-[11px] leading-5",
                  selected ? "bg-ink text-text-inverse" : "bg-surface-sunken text-text-tertiary"
                )}
              >
                {t.count}
              </span>
            )}
            {selected && (
              <motion.span
                layoutId={`tab-${id}`}
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-ink"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
