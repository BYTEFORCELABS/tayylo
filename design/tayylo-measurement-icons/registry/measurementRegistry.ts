import type { BodySex, BodyView } from "./measurementTypes";
import {
  BODY_MAPS,
  BODY_MAP_VIEWBOX,
  MEASUREMENTS,
  MEASUREMENT_ACCENT,
  MEASUREMENT_ALIASES,
  OVERLAYS,
  type MeasurementId,
  type MeasurementRecord,
} from "./measurementData";

export * from "./measurementTypes";
export { MEASUREMENTS, MEASUREMENT_ACCENT, type MeasurementId, type MeasurementRecord };

/** "Under Bust", "under_bust", "underbust" -> "under-bust" */
export function toMeasurementId(label: string): string {
  return label.trim().toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function resolveMeasurementId(idOrLabel: string): MeasurementId | undefined {
  const key = toMeasurementId(idOrLabel);
  if (key in MEASUREMENTS) return key as MeasurementId;
  return MEASUREMENT_ALIASES[key];
}

const withAccent = (svg: string, accent?: string) =>
  accent && accent !== MEASUREMENT_ACCENT ? svg.split(MEASUREMENT_ACCENT).join(accent) : svg;

/** Icon record with ready-to-render SVG. Returns undefined for unknown ids. */
export function getMeasurementIcon(
  idOrLabel: string,
  options: { accent?: string } = {}
): (MeasurementRecord & { svg: string }) | undefined {
  const id = resolveMeasurementId(idOrLabel);
  if (!id) return undefined;
  const m = MEASUREMENTS[id];
  return { ...m, svg: withAccent(m.iconSvg, options.accent) };
}

/** Views that have an overlay for this measurement and sex, in the recommended order. */
export function getMeasurementViews(id: MeasurementId, sex: BodySex): BodyView[] {
  const m = MEASUREMENTS[id];
  if (!m.sexes.includes(sex)) return [];
  return m.views.filter((v) => OVERLAYS[`${sex}/${v}`]?.[id]);
}

/** Best view to show a measurement: the requested one if available, otherwise its primary view. */
export function pickView(id: MeasurementId, sex: BodySex, preferred?: BodyView): BodyView | undefined {
  const views = getMeasurementViews(id, sex);
  if (preferred && views.includes(preferred)) return preferred;
  return views[0];
}

export interface BodyMapOptions {
  sex: BodySex;
  view: BodyView;
  /** Measurement(s) to highlight. */
  highlight?: MeasurementId | MeasurementId[];
  /** Also draw every other measurement on this view, faded. */
  showOthers?: boolean;
  showLandmarks?: boolean;
  accent?: string;
}

/** Full SVG markup for a body map with selected measurement overlays. Body strokes use currentColor. */
export function getBodyMapSvg(o: BodyMapOptions): string {
  const key = `${o.sex}/${o.view}` as const;
  const map = BODY_MAPS[key];
  const overlays = OVERLAYS[key] ?? {};
  const selected = new Set(o.highlight ? ([] as MeasurementId[]).concat(o.highlight) : []);
  let layers = "";
  if (o.showOthers) {
    for (const [id, g] of Object.entries(overlays)) {
      if (!selected.has(id as MeasurementId) && g) layers += g.replace("<g ", '<g opacity="0.18" ');
    }
  }
  selected.forEach((id) => {
    const g = overlays[id];
    if (g) layers += g;
  });
  const landmarks =
    o.showLandmarks === false
      ? ""
      : `<g id="landmarks" fill="none" stroke="currentColor" stroke-width="1.5" stroke-opacity=".5">${map.landmarks}</g>`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BODY_MAP_VIEWBOX}" fill="none">` +
    `<g id="body" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${map.body}</g>` +
    landmarks +
    layers +
    `</svg>`;
  return withAccent(svg, o.accent);
}

export function getMeasurementsByCategory(category: MeasurementRecord["category"]): MeasurementRecord[] {
  return Object.values(MEASUREMENTS).filter((m) => m.category === category);
}
