# Tayylo garment icons

74 original outline garment icons for Tayylo, drawn on one shared system:

- 64 × 64 viewBox, transparent background, no text, no raster data
- 2.5 stroke for main outlines; 2.0 stroke at 55% opacity for secondary details (seams, embroidery, prints)
- Round caps and joins, every icon centred and scaled to the same visual box
- All colour comes from `currentColor`, so one `color` value themes the whole set

## Folders

| Folder | Contents |
| --- | --- |
| `traditional/` | Agbada, Senator Wear, Kaftan, Iro and Buba, Isi Agu, Dashiki, Gele-adjacent outfits and more (15) |
| `formal/` | Suits, blazer, shirts, trousers, waistcoat, corporate dress, pencil skirt (10) |
| `womenswear/` | Gowns, dresses, tops, skirts, jumpsuit, corset, abaya, kimono (19) |
| `menswear/` | T-shirt, polo, hoodie, jackets, jeans, chinos, joggers, tracksuit (11) |
| `outerwear/` | Coats, cardigan, vest, raincoat, uniform, scrubs, coveralls, robe (10) |
| `accessories/` | Cap, hat, tie, bow tie, scarf, turban, gele, belt, socks (9) |
| `previews/` | `contact-sheet.html` (open in a browser), `contact-sheet.png`, `size-test-24-32-48.png` |
| `registry/` | `garmentIcons.ts` plus ready-made React Native and web components |
| `manifest.json` | id, display name, category and file path for every icon |

The brief lists Waistcoat twice (formal and accessories). It is drawn once in `formal/waistcoat.svg`; the accessories entry `tailored-waistcoat` is an alias pointing at it.

## Using it in Tayylo (Expo / React Native)

1. Copy the `registry/` folder into your app, for example to `src/icons/garments/`.
2. Install the SVG renderer: `npx expo install react-native-svg`
3. Use the component wherever the shirt icon is today:

```tsx
import { GarmentIcon } from "@/icons/garments/GarmentIcon.native";

<View style={styles.iconTile}>
  <GarmentIcon garment={order.garmentType} size={28} color="#3B3631" />
</View>
```

`garment` accepts an id (`"agbada"`), a label (`"Iro & Buba"`, `"Two Piece Suit"`) or a short alias (`"suit"`, `"senator"`). Unknown values fall back to the T-shirt icon, so old records never break.

No Metro or bundler changes are needed: the SVG markup is embedded in `garmentIcons.ts` and drawn with `SvgXml`.

## Using it on the web

```tsx
import { GarmentIcon } from "./registry/GarmentIcon.web";
<GarmentIcon garment="senator-wear" size={32} />
```

Or use the files directly: `<img src="/icons/traditional/agbada.svg">` works, but `currentColor` then renders black. Inline the SVG (or use the component) when you want to set the colour.

## Registry API

```ts
getGarmentIcon("agbada")            // { id, name, category, svg }
getGarmentIcon("Iro & Buba")        // resolves to "iro-and-buba"
hasGarmentIcon("kente")             // false, so you can flag missing types
getGarmentIconsByCategory("formal") // for pickers and filters
toGarmentId("Two Piece Suit")       // "two-piece-suit"
```

Storing the id (`garmentIconId: "agbada"`) on each order or garment record is the most reliable approach; the label matching is there for existing data.

## Adding a new icon

1. Draw it on the 64 × 64 grid with the same strokes (2.5 main, 2.0 at 55% opacity for detail).
2. Save it in the right category folder with a lowercase, hyphenated name.
3. Add it to `manifest.json` and to `GARMENT_ICON_IDS` and `GARMENT_ICONS` in `garmentIcons.ts`.

## Licence

Original artwork created for Tayylo. No third-party icon library was used.
