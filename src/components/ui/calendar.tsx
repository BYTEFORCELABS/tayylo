"use client";

// Month calendar for picking a due date. Dates are local "YYYY-MM-DD"
// strings so a day never shifts across time zones. `markers` puts a dot
// under days that already have work due, so busy days are easy to avoid.

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function toLocalISO(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Midday local time, so the date survives conversion to UTC either way. */
export function fromLocalISO(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12);
}

export function addDaysISO(days: number, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days, 12);
  return toLocalISO(d);
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

interface CalendarProps {
  value: string;
  onChange: (iso: string) => void;
  /** Earliest selectable day (inclusive). */
  min?: string;
  /** Number of things already due per day, e.g. { "2026-12-04": 2 }. */
  markers?: Record<string, number>;
  className?: string;
}

export function Calendar({ value, onChange, min, markers, className }: CalendarProps) {
  const selected = value ? fromLocalISO(value) : null;
  const today = toLocalISO(new Date());
  const [month, setMonth] = React.useState(() => {
    const base = selected ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [dir, setDir] = React.useState(0);

  // Follow the value when it moves to another month (e.g. a preset chip).
  const [shownFor, setShownFor] = React.useState(value);
  if (value !== shownFor) {
    setShownFor(value);
    if (selected && (selected.getMonth() !== month.getMonth() || selected.getFullYear() !== month.getFullYear())) {
      setDir(selected > month ? 1 : -1);
      setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
    }
  }

  const minMonth = min ? new Date(fromLocalISO(min).getFullYear(), fromLocalISO(min).getMonth(), 1) : null;
  const canGoBack = !minMonth || month > minMonth;

  const shift = (d: number) => {
    setDir(d);
    setMonth(m => new Date(m.getFullYear(), m.getMonth() + d, 1));
  };

  // Monday-first grid, padded to whole weeks.
  const lead = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toLocalISO(new Date(month.getFullYear(), month.getMonth(), i + 1, 12))),
  ];
  while (cells.length % 7) cells.push(null);

  const monthLabel = month.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const onKeyDown = (e: React.KeyboardEvent, iso: string) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = addDaysISO(step, fromLocalISO(iso));
    if (min && next < min) return;
    onChange(next);
    requestAnimationFrame(() => {
      (document.querySelector(`[data-day="${next}"]`) as HTMLButtonElement | null)?.focus();
    });
  };

  return (
    <div className={cn("rounded-[var(--radius-card)] border border-border/70 bg-surface p-4", className)}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[15px] font-semibold text-ink" aria-live="polite">
          {monthLabel}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            disabled={!canGoBack}
            aria-label="Previous month"
            className="flex size-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-sunken disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Next month"
            className="flex size-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-sunken"
          >
            <ChevronRight size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center" aria-hidden>
        {WEEKDAYS.map(d => (
          <span key={d} className="pb-2 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
            {d}
          </span>
        ))}
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={monthLabel}
            custom={dir}
            initial={{ x: dir * 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dir * -40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            role="grid"
            aria-label={monthLabel}
            className="grid grid-cols-7 gap-y-1"
          >
            {cells.map((iso, i) => {
              if (!iso) return <span key={`pad-${i}`} />;
              const disabled = !!min && iso < min;
              const isSelected = iso === value;
              const isToday = iso === today;
              const count = markers?.[iso] ?? 0;
              const day = Number(iso.slice(8));
              const weekend = i % 7 >= 5;
              return (
                <div key={iso} className="flex justify-center">
                  <button
                    type="button"
                    data-day={iso}
                    disabled={disabled}
                    tabIndex={isSelected || (!value && isToday) ? 0 : -1}
                    onClick={() => onChange(iso)}
                    onKeyDown={e => onKeyDown(e, iso)}
                    aria-pressed={isSelected}
                    aria-label={`${fromLocalISO(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}${
                      count ? `, ${count} order${count > 1 ? "s" : ""} already due` : ""
                    }`}
                    className={cn(
                      "relative flex size-10 flex-col items-center justify-center rounded-full text-[15px] tabular transition-colors duration-[var(--duration-fast)]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                      isSelected
                        ? "bg-olive font-semibold text-text-inverse shadow-[var(--shadow-xs)]"
                        : disabled
                          ? "text-border-strong"
                          : cn("font-medium hover:bg-surface-sunken", weekend ? "text-text-secondary" : "text-ink"),
                      isToday && !isSelected && "ring-1 ring-inset ring-border-strong"
                    )}
                  >
                    {day}
                    {count > 0 && !disabled && (
                      <span className="absolute bottom-1 flex gap-0.5" aria-hidden>
                        {Array.from({ length: Math.min(count, 3) }, (_, k) => (
                          <span key={k} className={cn("size-1 rounded-full", isSelected ? "bg-text-inverse/80" : "bg-warning")} />
                        ))}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
