// Design tokens for Tayylo — TS mirror of the @theme block in
// src/app/globals.css. CSS is the source of truth; keep these in sync.
// Use these only where a raw value is unavoidable (canvas drawing,
// meta theme-color, motion props). Components should use Tailwind classes.

export const colors = {
  olive: "#454F2C",
  oliveDeep: "#2E3420",
  oliveLight: "#6B7A45",
  oliveSoft: "#E6E8DA",
  beige: "#E8E2D4",
  beigeLight: "#F0EDE5",

  canvas: "#F4F2EC",
  surface: "#FBFAF7",
  surfaceRaised: "#FFFFFF",
  surfaceSunken: "#ECE9E1",
  panel: "#2E3420",

  ink: "#1E2019",
  textSecondary: "#55574C",
  textTertiary: "#6B6D62",

  border: "#E3E0D6",
  borderStrong: "#CFCBBE",

  success: "#3D6B48",
  warning: "#8F6220",
  danger: "#9C3D2C",
  info: "#3F6175",
} as const;

export const radii = {
  xs: 6,
  sm: 10,
  control: 12,
  input: 14,
  card: 20,
  panel: 28,
  dialog: 28,
  sheet: 28,
  pill: 9999,
} as const;

export const motion = {
  duration: { fast: 0.12, normal: 0.2, slow: 0.32 },
  easeOut: [0.2, 0.8, 0.2, 1] as const,
  easeEmphasized: [0.16, 1, 0.3, 1] as const,
  pressScale: 0.97,
} as const;

/** One stroke weight for every lucide icon in the product. */
export const ICON_STROKE = 1.75;

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;
