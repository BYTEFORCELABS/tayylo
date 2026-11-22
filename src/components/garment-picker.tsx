"use client";

import React from "react";
import { Check, PenLine } from "lucide-react";
import { Chip, SearchField } from "@/components/ui/choice";
import { GarmentIcon, resolveGarmentIcon } from "@/components/brand/garment-icon";
import { GARMENT_ICONS, type GarmentCategory, type GarmentIconMeta } from "@/lib/garment-icons";
import { cn } from "@/lib/utils";

const CATEGORIES: { key: GarmentCategory; label: string }[] = [
  { key: "traditional", label: "Traditional" },
  { key: "formal", label: "Formal" },
  { key: "womenswear", label: "Womenswear" },
  { key: "menswear", label: "Menswear" },
  { key: "outerwear", label: "Outerwear" },
  { key: "accessories", label: "Accessories" },
];

type Tab = "studio" | GarmentCategory;

interface GarmentPickerProps {
  /** Selected garment name ("Agbada", "Senator Wear"…) or "" for none. */
  value: string;
  onChange: (name: string) => void;
  /** Garments the studio said it makes during onboarding. */
  studioGarments?: string[];
  /** Called when the tailor wants to type a garment that isn't in the set. */
  onCustom: () => void;
  customActive?: boolean;
  error?: string;
}

/** Icon grid for choosing what is being made. */
export function GarmentPicker({ value, onChange, studioGarments = [], onCustom, customActive, error }: GarmentPickerProps) {
  const all = React.useMemo(() => Object.values(GARMENT_ICONS), []);
  const studio = React.useMemo(() => {
    const seen = new Set<string>();
    return studioGarments
      .map(g => resolveGarmentIcon(g))
      .filter(i => i.id !== "t-shirt" || studioGarments.some(g => /t-?shirt|tee/i.test(g)))
      .filter(i => (seen.has(i.id) ? false : (seen.add(i.id), true)));
  }, [studioGarments]);

  const [tab, setTab] = React.useState<Tab>(studio.length ? "studio" : "traditional");
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();

  const shown: GarmentIconMeta[] = q
    ? all.filter(i => i.name.toLowerCase().includes(q) || i.id.includes(q.replace(/\s+/g, "-")))
    : tab === "studio"
      ? studio
      : all.filter(i => i.category === tab);

  const selectedId = value && !customActive ? resolveGarmentIcon(value).id : null;

  return (
    <div>
      <SearchField value={query} onValueChange={setQuery} placeholder="Search garments" />

      {!q && (
        <div role="toolbar" aria-label="Garment categories" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0">
          {studio.length > 0 && (
            <Chip size="sm" selected={tab === "studio"} onClick={() => setTab("studio")}>
              Your garments
            </Chip>
          )}
          {CATEGORIES.map(c => (
            <Chip key={c.key} size="sm" selected={tab === c.key} onClick={() => setTab(c.key)}>
              {c.label}
            </Chip>
          ))}
        </div>
      )}

      <div role="listbox" aria-label="Garment" className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">
        {shown.map(icon => {
          const selected = icon.id === selectedId;
          return (
            <button
              key={icon.id}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onChange(icon.name)}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-[var(--radius-card)] border px-2 pt-4 pb-3 text-center",
                "transition-[background-color,border-color,transform] duration-[var(--duration-fast)] active:scale-[0.97]",
                selected
                  ? "border-ink bg-surface-raised text-ink shadow-[0_0_0_1px_var(--color-ink)]"
                  : "border-border/80 bg-surface text-text-secondary hover:border-border-strong hover:text-ink"
              )}
            >
              <GarmentIcon garment={icon.id} size={36} label="" />
              <span className="line-clamp-2 text-caption font-medium leading-tight">{icon.name}</span>
              {selected && (
                <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-ink text-text-inverse animate-scale-in">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onCustom}
          aria-pressed={customActive}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed px-2 pt-4 pb-3 text-center transition-colors",
            customActive ? "border-ink text-ink" : "border-border-strong text-text-tertiary hover:border-ink hover:text-ink"
          )}
        >
          <PenLine size={26} strokeWidth={1.5} />
          <span className="text-caption font-medium">Something else</span>
        </button>
      </div>

      {q && shown.length === 0 && (
        <p className="mt-3 text-label text-text-tertiary">No garment called “{query}”. Use “Something else” to type it.</p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-caption font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
