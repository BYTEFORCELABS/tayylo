# Tayylo measurement illustration library

Original tailoring measurement artwork for Tayylo: 72 measurement icons, 6 body maps and 262 separate measurement overlays, all plain SVG.

## What's inside

| Path | Contents |
| --- | --- |
| `individual/<category>/<id>.svg` | 72 icons, 64 × 64, one per measurement |
| `body-maps/{male,female}/{front,back,side}.svg` | Six reference figures, viewBox `0 0 240 520`, with a `body` layer and a `landmarks` layer |
| `overlays/{male,female}/{front,back,side}/<id>.svg` | One indicator per measurement per view, same viewBox as the maps, transparent, ready to stack |
| `registry/` | TypeScript registry, Expo components and an example screen |
| `previews/` | `individual-icons.png`, `body-maps.png`, `measurement-collection.png`, `size-test-24-32-48-64.png` |
| `manifest.json` | id, name, category, type, views, file paths, method, variation notes and synonyms for every measurement |

**Why overlays are grouped by sex and view.** The brief sketched a flat `overlays/bust.svg`. A bust line sits in a different place on a front, back and side figure, and on male and female figures, so one file can't line up with all six maps. Each overlay therefore lives beside the map it fits: `overlays/female/front/bust.svg` stacks exactly on `body-maps/female/front.svg`.

## Visual language

- **Body:** `currentColor`, 2.5 stroke, round caps and joins. Secondary anatomy (spine, collarbones, base-garment lines) uses a lighter, semi-transparent stroke.
- **Indicators:** a single accent, `#B8693A` (warm copper). The registry can swap it for any colour at runtime.
- **Full-figure icons:** icons that show the whole body (height, gown length and so on) use a 1.6 body stroke. At 2.5 the tiny figure fills in at 32 px.

| Indicator | Meaning |
| --- | --- |
| Solid front arc + dashed back arc | Circumference: the tape goes around the body. A dot marks where the tape starts and an arrow shows the direction it travels. |
| Dot → line → arrowhead | Length or width: the tape starts at the dot and ends at the arrow. Lines follow the body when the tape does (front length, crotch length). |
| Dot ↔ dot | Point-to-point: a straight distance between two landmarks (bust separation, head width). |
| Bar → arrow between dashed levels | Depth: the vertical distance between two levels (shoulder slope, crotch depth, hip depth). |
| Dashed garment outline | Finished-garment lengths (dress, gown, agbada, senator, kaftan, skirt, shirt) and hem circumference. |
| Small open rings | Reference landmarks on the body maps: neck point, shoulder point, nape, bust apex, waist, hip, crotch, knee, ankle, elbow, wrist. |

## Expo / React Native

1. Copy `registry/` into your app, for example to `src/measurements/`.
2. Install the SVG renderer: `npx expo install react-native-svg`
3. Use the components:

```tsx
import { MeasurementIcon } from "@/measurements/MeasurementIcon";
import { MeasurementBodyMap } from "@/measurements/MeasurementBodyMap";

<MeasurementIcon measurement="bust" size={44} />

<MeasurementBodyMap sex="female" view="front" selected="bust" height={420} />
```

`MeasurementBodyMap` highlights only the selected measurement. If you pass `view="front"` with `selected="seat"`, it switches to the best view that shows the seat (back or side) and reports it through `onViewResolved`. `ExampleMeasurementScreen.tsx` shows the full flow: tap a field, the figure highlights it, and the view chips and how-to-measure text update.

No bundler setup is needed. All SVG markup is embedded in `measurementData.ts` and drawn with `SvgXml`. The data file is about 430 KB of strings. If bundle size matters, load the files from `individual/` and `overlays/` on demand instead.

## Registry API

```ts
getMeasurementIcon("bust")                // record + svg (accent can be overridden)
getMeasurementIcon("Under Bust")          // labels and aliases resolve: "armscye" -> "armhole"
getMeasurementViews("seat", "male")       // ["back", "side"]
pickView("inseam", "male", "side")        // "front" (inseam is only drawn on the front)
getBodyMapSvg({ sex: "male", view: "side", highlight: ["front-rise", "back-rise"], accent: "#2F6F62" })
getMeasurementsByCategory("arms")
```

Each record includes `type` (circumference, length, width, depth or point-to-point), `views`, `sexes`, `iconPath`, `overlayPaths`, `method` (how to take it), `notes` (where systems differ) and `synonyms`.

## Where tailoring systems differ

The library doesn't present any single convention as universal. Where methods vary, the variation is recorded in each measurement's `notes` in `manifest.json`. The main cases:

- **Same measurement, different names.** Back Length = Nape to Waist. Hip ≈ Seat. Upper Arm ≈ Bicep. High Bust ≈ Upper Chest. Head ≈ Hat Circumference. These are kept as separate entries because your forms may list both, and they're linked through `synonyms`.
- **Curved vs straight.** Front Length follows the body over the bust; Shoulder to Waist is drawn straight. Bust Point follows the body; Bust Height is the vertical drop. Waist to Hip follows the hip curve; Hip Depth is straight.
- **Start and end points.**
  - Sleeve length may start at the shoulder point or at the centre-back neck.
  - Inseam and outseam may end at the ankle, the floor or the desired hem.
  - Crotch depth is most often taken seated.
  - Armhole depth may be taken from the nape, the neck point or the shoulder.
- **Style measurements.** Neck depth, short sleeve length, round sleeve, trouser length and all garment lengths depend on the design. The drawings show a sensible default (a knee-length dress, an above-knee senator, an ankle-length agbada and kaftan).
- **Waist to Floor** appears twice in the brief. It is stored once under lengths, with an alias entry in the manifest.

## Checks run

- All 340 SVG files parse as valid XML.
- Every path in the manifest exists.
- No raster images, base64, text or fonts.
- Backgrounds are transparent.
- The TypeScript registry passes `tsc --strict` and was run to generate a highlighted body map.
- Every icon was reviewed on contact sheets at 24, 32, 48 and 64 px.

The Expo components were written against the `react-native-svg` API but not compiled inside an Expo project here.

## Licence

Original artwork created for Tayylo. No third-party icon or illustration library was used.
