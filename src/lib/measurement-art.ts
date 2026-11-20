// Picks the right Tayylo measurement illustration for a template field.
// Field keys come from templates (seeded or custom), so we resolve by key
// first, then by label, then by the illustration library's own names and
// synonyms. Unknown fields return undefined and callers show a ruler.

import { MEASUREMENT_ART, MEASUREMENT_ART_BASE, type BodySex, type BodyView, type MeasurementArt } from "./measurement-art-data";

export type { BodySex, BodyView, MeasurementArt };

/** "Under bust band", "under_bust" -> "under-bust-band", "under-bust" */
function slug(s: string) {
  return s.trim().toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Template field keys / common labels that differ from the library's ids.
const ALIASES: Record<string, string> = {
  hips: "hip",
  "bust-chest": "bust",
  shoulder: "shoulder-width",
  "shoulder-to-shoulder": "shoulder-width",
  "shoulder-span": "shoulder-width",
  "back-width": "cross-back",
  "across-back": "cross-back",
  "front-width": "cross-front",
  "across-front": "cross-front",
  sleeve: "sleeve-length",
  "sleeve-width": "round-sleeve",
  "sleeve-opening": "wrist",
  "trouser-waist": "waist",
  rise: "front-rise",
  "crotch-rise": "front-rise",
  "back-neck-depth": "neck-depth",
  "front-neck-depth": "neck-depth",
  "neck-opening": "neck-depth",
  "v-neck-depth": "neck-depth",
  "neck-width": "neck",
  "neckline-width": "neck",
  "collar-neck": "neck",
  collar: "neck",
  "under-bust-band": "under-bust",
  "bodice-length": "shoulder-to-waist",
  "blouse-length": "shoulder-to-hip",
  "top-length": "shoulder-to-hip",
  "jacket-length": "shoulder-to-hip",
  "dashiki-length": "shirt-length",
  "kurta-length": "senator-length",
  "boubou-length": "gown-length",
  "total-length": "full-body-length",
  "full-length": "full-body-length",
  "shoulder-to-crotch": "torso-length",
  "hip-slit": "waist-to-hip",
  "hip-slit-position": "waist-to-hip",
  "hem-width": "hem-circumference",
  hem: "hem-circumference",
  head: "head-circumference",
  cap: "hat-circumference",
  "cap-size": "hat-circumference",
  "upper-arm": "bicep",
  arm: "bicep",
  "arm-length": "sleeve-length",
  belly: "stomach",
  tummy: "stomach",
  "trouser-length": "trouser-length",
  outseam: "outseam",
  "leg-length": "outseam",
  inside: "inseam",
  "inside-leg": "inseam",
  length: "vertical-body-measurement",
};

// Plural / loose matches are tried against the library's names.
const BY_NAME: Record<string, string> = Object.fromEntries(
  Object.values(MEASUREMENT_ART).map(m => [slug(m.name), m.id])
);

function lookup(s: string | undefined): MeasurementArt | undefined {
  if (!s) return undefined;
  const k = slug(s);
  if (!k) return undefined;
  const id = MEASUREMENT_ART[k] ? k : ALIASES[k] ?? BY_NAME[k] ?? (k.endsWith("s") ? (MEASUREMENT_ART[k.slice(0, -1)] ? k.slice(0, -1) : undefined) : undefined);
  return id ? MEASUREMENT_ART[id] : undefined;
}

/**
 * Illustration for a field. The key wins when it's specific; a generic key
 * like "length" (used by boubou / dashiki templates) defers to the label or
 * the template name ("Boubou" + "Length" → gown length).
 */
export function resolveMeasurementArt(field: { key?: string; label?: string; templateName?: string }): MeasurementArt | undefined {
  const byKey = lookup(field.key);
  if (byKey && byKey.id !== "vertical-body-measurement") return byKey;
  const byLabel = lookup(field.label);
  if (byLabel && byLabel.id !== "vertical-body-measurement") return byLabel;
  if (field.templateName && field.label && /length/i.test(field.label)) {
    const byGarment = lookup(`${field.templateName} length`);
    if (byGarment) return byGarment;
  }
  return byKey ?? byLabel;
}

export function measurementIconSrc(art: MeasurementArt) {
  return `${MEASUREMENT_ART_BASE}/${art.icon}`;
}

/** Templates with bust / skirt / dress fields are drawn on the female figure. */
export function inferBodySex(fieldKeys: string[], templateName?: string): BodySex {
  const female = /bust|skirt|dress|gown|blouse|bodice|boubou|iro|buba|kaba|wrapper/i;
  if (templateName && female.test(templateName)) return "female";
  return fieldKeys.some(k => female.test(k)) ? "female" : "male";
}

/** Body map + overlay paths for the best view of a measurement. */
export function bodyMapFor(art: MeasurementArt, preferredSex: BodySex, preferredView?: BodyView) {
  const sex: BodySex = art.sexes.includes(preferredSex) ? preferredSex : art.sexes[0];
  const view: BodyView = preferredView && art.views.includes(preferredView) ? preferredView : art.views[0];
  return {
    sex,
    view,
    map: `${MEASUREMENT_ART_BASE}/body-maps/${sex}/${view}.svg`,
    overlay: `${MEASUREMENT_ART_BASE}/overlays/${sex}/${view}/${art.id}.svg`,
  };
}
