import * as React from "react";
import { cn } from "@/lib/utils";
import {
  FALLBACK_GARMENT_ICON,
  GARMENT_ICONS,
  type GarmentIconId,
  type GarmentIconMeta,
  getGarmentIcon,
  hasGarmentIcon,
  toGarmentId,
} from "@/lib/garment-icons";

// Garment names Tayylo already stores (order garment types, onboarding
// choices, measurement template names) that don't match a pack id directly.
const TAYYLO_ALIASES: Record<string, GarmentIconId> = {
  suits: "two-piece-suit",
  shirts: "corporate-shirt",
  jackets: "jacket",
  "blazer-jacket": "blazer",
  "senator-suit": "senator-wear",
  dresses: "midi-dress",
  skirts: "skirt",
  boubou: "kaftan-dress",
  bubu: "kaftan-dress",
  kurta: "kaftan",
  bridal: "wedding-dress",
  "saree-blouse": "blouse",
  "waistcoat-vest": "waistcoat",
  "aso-oke": "aso-oke-outfit",
  "iro-buba": "iro-and-buba",
};

// Longest names first, so "Three-Piece Suit" wins over "Suit" when scanning.
const KEYWORDS = Object.values(GARMENT_ICONS)
  .flatMap(i => [
    { key: i.id, id: i.id },
    { key: toGarmentId(i.name), id: i.id },
  ])
  .concat(Object.entries(TAYYLO_ALIASES).map(([key, id]) => ({ key, id })))
  .sort((a, b) => b.key.length - a.key.length);

const cache = new Map<string, GarmentIconMeta>();

/**
 * Best icon for any garment label: exact id / name / alias, then Tayylo's
 * own names, then singular form, then a keyword inside a longer label
 * ("Navy three-piece suit" → three-piece-suit). Falls back to the T-shirt.
 */
export function resolveGarmentIcon(label: string | null | undefined): GarmentIconMeta {
  const raw = (label ?? "").trim();
  if (!raw) return GARMENT_ICONS[FALLBACK_GARMENT_ICON];
  const hit = cache.get(raw);
  if (hit) return hit;

  const key = toGarmentId(raw);
  let icon: GarmentIconMeta | undefined;
  if (hasGarmentIcon(raw)) icon = getGarmentIcon(raw);
  else if (TAYYLO_ALIASES[key]) icon = GARMENT_ICONS[TAYYLO_ALIASES[key]];
  else if (key.endsWith("s") && hasGarmentIcon(key.slice(0, -1))) icon = getGarmentIcon(key.slice(0, -1));
  else {
    const padded = `-${key}-`;
    const match = KEYWORDS.find(k => padded.includes(`-${k.key}-`) || padded.includes(`-${k.key}s-`));
    icon = match ? GARMENT_ICONS[match.id] : undefined;
  }
  const result = icon ?? GARMENT_ICONS[FALLBACK_GARMENT_ICON];
  cache.set(raw, result);
  return result;
}

interface GarmentIconProps {
  /** Pack id, display name or any stored garment label. */
  garment: string | null | undefined;
  size?: number;
  className?: string;
  /** Accessible label; defaults to the icon name. Pass "" to hide from screen readers. */
  label?: string;
}

/**
 * Tayylo garment icon. Colour comes from `currentColor`, so it follows the
 * surrounding text colour (e.g. `text-ink`, `text-olive`).
 * The SVG markup is the app's own bundled artwork, never user input.
 */
export const GarmentIcon = React.memo(function GarmentIcon({ garment, size = 24, className, label }: GarmentIconProps) {
  const icon = resolveGarmentIcon(garment);
  const name = label ?? icon.name;
  return (
    <span
      role={name ? "img" : undefined}
      aria-label={name || undefined}
      aria-hidden={name ? undefined : true}
      className={cn("inline-flex shrink-0 [&>svg]:size-full", className)}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: icon.svg }}
    />
  );
});
