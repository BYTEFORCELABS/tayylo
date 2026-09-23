// Design tokens for Tayylo
// All values match globals.css custom properties

export const colors = {
  // Brand
  primaryOlive: "#454F2C",
  deepOlive: "#30371F",
  warmBeige: "#F0EEE9",
  lightBeige: "#F7F6F3",
  softCream: "#FFFFFF",
  warmWhite: "#FFFFFF",

  // Text
  text: "#24261F",
  textSecondarySmall: "#6A6C61",
  textSecondaryLarge: "#73756A",

  // Border
  border: "#EBEAE5",

  // Status
  success: "#3F7A52",
  warning: "#A8741F",
  danger: "#A3412F",
  info: "#476A80",

  // Dark mode
  dark: {
    surface1: "#15170F",
    surface2: "#1D2017",
    text: "#EDE7DA",
    olive: "#A9B386",
  },
} as const;

export const spacing = {
  0: "0px",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  14: "56px",
  18: "72px",
} as const;

export const radii = {
  button: "8px",
  input: "8px",
  card: "12px",
  sheet: "20px",
  full: "9999px",
} as const;

export const motion = {
  duration: {
    fast: "150ms",
    normal: "200ms",
    slow: "220ms",
  },
  easing: "cubic-bezier(0.25, 0.1, 0.25, 1)", // ease-out
  pressScale: 0.98,
} as const;

export const breakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
} as const;

export const typography = {
  measurementValue: {
    fontSize: "58px",
    lineHeight: "1",
    fontVariantNumeric: "tabular-nums",
  },
  measurementValueMedium: {
    fontSize: "32px",
    lineHeight: "1.2",
    fontVariantNumeric: "tabular-nums",
  },
} as const;
