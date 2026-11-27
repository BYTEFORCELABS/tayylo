"use client";

import React from "react";

interface Point {
  day: string;
  count: number;
}

const label = (day: string) => new Date(day + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Daily counts as thin columns in the brand olive. Single series: the
 * section title names it, so there's no legend. Hover or focus a day for its
 * value; the total and peak sit above as text, and a table is available
 * for screen readers.
 */
export function DailyBars({ data, unit, title }: { data: Point[]; unit: string; title: string }) {
  const [active, setActive] = React.useState<number | null>(null);
  const max = Math.max(...data.map(d => d.count), 1);
  // A rounded, readable top for the single gridline.
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / step) * step;
  const total = data.reduce((s, d) => s + d.count, 0);
  const shown = active !== null ? data[active] : null;

  return (
    <div>
      <div className="mb-3 flex h-10 items-end justify-between gap-3">
        <p className="text-[24px] font-semibold leading-none tracking-tight text-ink tabular">
          {(shown ? shown.count : total).toLocaleString("en-US")}
          <span className="ml-1.5 text-label font-medium text-text-tertiary">
            {shown ? `${unit} on ${label(shown.day)}` : `${unit} in ${data.length} days`}
          </span>
        </p>
      </div>
      <div className="relative h-40" onMouseLeave={() => setActive(null)}>
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-border" aria-hidden />
        <span className="absolute right-0 top-1 text-[11px] text-text-tertiary tabular" aria-hidden>{top}</span>
        <div className="absolute inset-x-0 bottom-0 border-t border-border-strong" aria-hidden />
        <div className="absolute inset-0 flex items-end gap-[2px]" role="img" aria-label={`${title}: ${total} ${unit} over ${data.length} days`}>
          {data.map((d, i) => (
            <button
              key={d.day}
              type="button"
              tabIndex={-1}
              className="group relative flex h-full flex-1 items-end focus:outline-none"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              aria-label={`${label(d.day)}: ${d.count} ${unit}`}
            >
              <span
                className={`block w-full rounded-t-[4px] transition-colors ${active === i ? "bg-olive-deep" : "bg-olive"} ${d.count === 0 ? "opacity-0" : ""}`}
                style={{ height: `${(d.count / top) * 100}%`, minHeight: d.count ? 3 : 0 }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-text-tertiary tabular" aria-hidden>
        <span>{label(data[0]?.day ?? "")}</span>
        <span>{label(data[data.length - 1]?.day ?? "")}</span>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead><tr><th>Day</th><th>{unit}</th></tr></thead>
        <tbody>{data.map(d => <tr key={d.day}><td>{d.day}</td><td>{d.count}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
