// Builds the PNG artwork used in Tayylo emails (email apps don't show SVG).
// Run from the repo root:  node design/email/build-email-assets.mjs
// Output: public/email/*.png (served by the app, referenced from emails).
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const OUT = "public/email";
const SCALE = 2; // retina
const CREAM = "#E8E2D4";
const SAGE = "#A9B386";
const OLIVE = "#454F2C";
const OLIVE_SOFT = "#E6E8DA";

/** The inner markup of a garment icon, coloured. */
function garment(path, color) {
  const svg = readFileSync(`design/tayylo-garment-icons/${path}.svg`, "utf8");
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  return { inner, color };
}

async function png(svg, file) {
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(`${OUT}/${file}`);
  console.log("wrote", file);
}

// ---------------------------------------------------------------- hero
// A row of garments standing on a tailor's tape, for the dark header band.
{
  const W = 560, H = 140;
  const items = ["traditional/agbada", "formal/three-piece-suit", "womenswear/evening-dress", "traditional/senator-wear", "traditional/ankara-dress", "traditional/kaftan"];
  const size = 82, gap = (W - 40 - items.length * size) / (items.length - 1);
  const garments = items
    .map((p, i) => {
      const g = garment(p, CREAM);
      const x = 20 + i * (size + gap);
      const lift = i % 2 ? 6 : 0; // a gentle rhythm, like a rail of garments
      return `<g transform="translate(${x} ${14 - lift}) scale(${size / 64})" color="${g.color}" stroke="${g.color}">${g.inner}</g>`;
    })
    .join("");
  // Tape measure: a rail with fine ticks, longer every 5th, longest every 10th.
  let ticks = "";
  for (let x = 20, i = 0; x <= W - 20; x += 6, i++) {
    const h = i % 10 === 0 ? 14 : i % 5 === 0 ? 9 : 5;
    ticks += `<line x1="${x}" y1="${108}" x2="${x}" y2="${108 + h}" stroke="${SAGE}" stroke-opacity="${i % 10 === 0 ? 0.9 : 0.55}" stroke-width="1.2"/>`;
  }
  const rail = `<line x1="20" y1="108" x2="${W - 20}" y2="108" stroke="${SAGE}" stroke-width="1.6"/>`;
  const stitch = `<line x1="20" y1="${H - 10}" x2="${W - 20}" y2="${H - 10}" stroke="${CREAM}" stroke-opacity=".35" stroke-width="1.4" stroke-dasharray="6 6" stroke-linecap="round"/>`;
  await png(`<svg xmlns="http://www.w3.org/2000/svg" width="${W * SCALE}" height="${H * SCALE}" viewBox="0 0 ${W} ${H}" fill="none" stroke-linecap="round" stroke-linejoin="round">${garments}${rail}${ticks}${stitch}</svg>`, "hero-garments.png");
}

// ---------------------------------------------------------------- badges
// A round seal with a line icon, for transactional emails.
const ICONS = {
  lock: `<rect x="21" y="29" width="22" height="18" rx="4"/><path d="M25.5 29v-4.5a6.5 6.5 0 0 1 13 0V29"/><path d="M32 36v4"/>`,
  key: `<circle cx="24" cy="32" r="7"/><path d="M31 32h15M42 32v5M37 32v4"/>`,
  sparkle: `<path d="M32 17l3.6 10.4L46 31l-10.4 3.6L32 45l-3.6-10.4L18 31l10.4-3.6z"/><path d="M45 18v5M42.5 20.5h5"/>`,
  card: `<rect x="17" y="22" width="30" height="21" rx="3.5"/><path d="M17 28.5h30M22 37h8"/>`,
  flag: `<path d="M23 46V18M23 19h19l-4 6.5 4 6.5H23"/>`,
  hanger: `<path d="M28.5 22.5a3.5 3.5 0 1 1 3.5 3.5c-.9 0-1.5.6-1.5 1.5V30"/><path d="M30.5 30L16.5 41.5c-.9.8-.4 2 .8 2h29.4c1.2 0 1.7-1.2.8-2L33.5 30"/>`,
};
for (const [name, body] of Object.entries(ICONS)) {
  const S = 64;
  await png(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${S * SCALE}" height="${S * SCALE}" viewBox="0 0 ${S} ${S}" fill="none" stroke="${OLIVE}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="32" r="31" fill="${OLIVE_SOFT}" stroke="none"/><circle cx="32" cy="32" r="27" stroke="${OLIVE}" stroke-opacity=".22" stroke-width="1.2" stroke-dasharray="3 3.5" fill="none"/>${body}</svg>`,
    `icon-${name}.png`,
  );
}

// ---------------------------------------------------------------- small garment row for footers
{
  const items = ["formal/suit-jacket", "traditional/agbada", "womenswear/gown"];
  const s = 22, W = items.length * s + (items.length - 1) * 10, H = s;
  const inner = items.map((p, i) => `<g transform="translate(${i * (s + 10)} 0) scale(${s / 64})" stroke="#9A9C8C" color="#9A9C8C">${garment(p).inner}</g>`).join("");
  await png(`<svg xmlns="http://www.w3.org/2000/svg" width="${W * SCALE}" height="${H * SCALE}" viewBox="0 0 ${W} ${H}" fill="none" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`, "footer-garments.png");
}

// ---------------------------------------------------------------- list bullet
await png(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${18 * SCALE}" height="${18 * SCALE}" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="9" fill="${OLIVE_SOFT}"/><path d="M5.2 9.3l2.4 2.4 5-5.2" stroke="${OLIVE}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  "check.png",
);

// ---------------------------------------------------------------- logo label
// The logo on a stitched, sewn-in garment label. A solid cream label reads
// on a light inbox and on a dark one: Gmail's dark mode recolours the page
// but never images, so a transparent olive logo would vanish there.
{
  const W = 152, H = 50, R = 10;
  const logoW = 112;
  const logo = await sharp("public/lockup_olive.png").resize({ width: logoW * SCALE }).png().toBuffer();
  const { height: lh } = await sharp(logo).metadata();
  const label = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * SCALE}" height="${H * SCALE}" viewBox="0 0 ${W} ${H}">
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="${R}" fill="#FBFAF7" stroke="#D9D3C2"/>
<rect x="4.5" y="4.5" width="${W - 9}" height="${H - 9}" rx="${R - 4}" fill="none" stroke="#B9B29C" stroke-width="1.1" stroke-dasharray="3.2 2.6" stroke-linecap="round"/>
</svg>`;
  await sharp(Buffer.from(label))
    .composite([{ input: logo, left: Math.round(((W - logoW) / 2) * SCALE), top: Math.round((H * SCALE - lh) / 2) }])
    .png({ compressionLevel: 9 })
    .toFile(`${OUT}/logo-label.png`);
  console.log("wrote logo-label.png");
}
