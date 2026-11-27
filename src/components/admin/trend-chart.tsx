"use client";

import React from "react";
import { DailyBars } from "@/components/admin/bar-chart";
import { cn } from "@/lib/utils";

interface Series {
  key: string;
  label: string;
  unit: string;
  data: { day: string; count: number }[];
}

/** One chart, several daily series: switch between them instead of stacking cards. */
export function TrendChart({ series }: { series: Series[] }) {
  const [key, setKey] = React.useState(series[0]?.key);
  const s = series.find(x => x.key === key) ?? series[0];
  return (
    <section className="rounded-[var(--radius-card)] border border-border/70 bg-surface p-5 sm:p-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-headline text-ink">Last 30 days</h2>
          <p className="text-label text-text-tertiary">Per day, UTC</p>
        </div>
        <div role="tablist" aria-label="Chart" className="inline-flex gap-1 rounded-full bg-surface-sunken p-1">
          {series.map(x => (
            <button
              key={x.key}
              role="tab"
              type="button"
              aria-selected={x.key === s.key}
              onClick={() => setKey(x.key)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-label font-semibold transition-colors",
                x.key === s.key ? "bg-surface-raised text-ink shadow-[var(--shadow-xs)]" : "text-text-secondary hover:text-ink"
              )}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>
      <DailyBars key={s.key} data={s.data} unit={s.unit} title={`${s.label} per day`} />
    </section>
  );
}
