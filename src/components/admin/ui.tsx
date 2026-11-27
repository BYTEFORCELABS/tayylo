import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-title text-ink">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-body text-text-secondary">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Section({ title, description, children, className, action }: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-[var(--radius-card)] border border-border/70 bg-surface p-5 sm:p-6", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-headline text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-label text-text-tertiary">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const fmt = (n: number) => n.toLocaleString("en-US");

/** A headline number with an optional comparison to the previous period. */
export function Stat({ label, value, sub, delta, href }: {
  label: string;
  value: number | string;
  sub?: React.ReactNode;
  /** [current, previous] for the same-length earlier period. */
  delta?: [number, number];
  href?: string;
}) {
  let change: React.ReactNode = null;
  if (delta) {
    const [cur, prev] = delta;
    const diff = cur - prev;
    const pct = prev ? Math.round((diff / prev) * 100) : null;
    const up = diff >= 0;
    change = (
      <span className={cn("inline-flex items-center gap-0.5 text-caption font-semibold", diff === 0 ? "text-text-tertiary" : up ? "text-success" : "text-danger")}>
        {diff !== 0 && (up ? <ArrowUpRight size={14} aria-hidden /> : <ArrowDownRight size={14} aria-hidden />)}
        {diff === 0 ? "No change" : `${up ? "+" : ""}${fmt(diff)}${pct !== null ? ` (${up ? "+" : ""}${pct}%)` : ""}`}
        <span className="sr-only"> versus the previous period</span>
      </span>
    );
  }
  const body = (
    <>
      <p className="text-label font-medium text-text-tertiary">{label}</p>
      <p className="mt-2 text-[28px] font-semibold leading-none tracking-tight text-ink tabular">
        {typeof value === "number" ? fmt(value) : value}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-text-tertiary">
        {change}
        {sub}
      </div>
    </>
  );
  const cls = "block rounded-[var(--radius-card)] border border-border/70 bg-surface p-5";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:border-border-strong")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Horizontal bars for a top-10 list. Single series, so one brand colour and no legend. */
export function RankedList({ items, unit, empty = "Nothing yet in this period." }: {
  items: { label: string; count: number; sub?: string; href?: string }[];
  unit: string;
  empty?: string;
}) {
  if (!items.length) return <p className="py-6 text-center text-label text-text-tertiary">{empty}</p>;
  const max = Math.max(...items.map(i => i.count), 1);
  return (
    <ol className="space-y-3">
      {items.map((item, i) => {
        const label = (
          <span className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-label font-semibold text-ink">
              <span className="mr-2 inline-block w-4 text-text-tertiary tabular">{i + 1}</span>
              {item.label}
            </span>
            <span className="shrink-0 text-label text-text-secondary tabular">
              {fmt(item.count)} <span className="text-text-tertiary">{item.count === 1 ? unit.replace(/s$/, "") : unit}</span>
            </span>
          </span>
        );
        return (
          <li key={item.label + i}>
            {item.href ? <Link href={item.href} className="hover:underline">{label}</Link> : label}
            <div className="mt-1.5 h-1.5 rounded-full bg-surface-sunken" aria-hidden>
              <div className="h-full rounded-full bg-olive" style={{ width: `${Math.max(2, (item.count / max) * 100)}%` }} />
            </div>
            {item.sub && <p className="mt-1 pl-6 text-caption text-text-tertiary">{item.sub}</p>}
          </li>
        );
      })}
    </ol>
  );
}

export function Pill({ tone = "neutral", children }: { tone?: "neutral" | "olive" | "success" | "warning" | "danger" | "info"; children: React.ReactNode }) {
  const tones = {
    neutral: "bg-surface-sunken text-text-secondary",
    olive: "bg-olive-soft text-olive-deep",
    success: "bg-success-bg text-success",
    warning: "bg-warning-bg text-warning",
    danger: "bg-danger-bg text-danger",
    info: "bg-info-bg text-info",
  };
  return <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold whitespace-nowrap", tones[tone])}>{children}</span>;
}

/** Segmented links for a query-string filter (no JavaScript needed). */
export function FilterTabs({ options, value, hrefFor }: { options: { key: string; label: string }[]; value: string; hrefFor: (key: string) => string }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full bg-surface-sunken p-1">
      {options.map(o => (
        <Link
          key={o.key}
          href={hrefFor(o.key)}
          aria-current={o.key === value ? "true" : undefined}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-label font-semibold transition-colors",
            o.key === value ? "bg-surface-raised !text-ink shadow-[var(--shadow-xs)]" : "!text-text-secondary hover:!text-ink"
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

export function dateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
}

export function shortDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function relative(d: Date | string | null | undefined) {
  if (!d) return "Never";
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  if (days < 60) return `${days} d ago`;
  return shortDate(d);
}

/** "owner" → "Owner". */
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
