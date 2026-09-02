/**
 * Fixed dark palette for the "panel" surfaces — the RM module and the mobile
 * admin screens (admin-login, more) — while the rest of the app stays on the
 * light palette until a global light/dark switch lands.
 *
 * Same token names as `constants/colors.ts` `light`, so a screen only has to
 * swap `useColors()` -> `useDarkColors()`.
 *
 *   Fondo      #0E0F11   ·  Superficie #181A1D  ·  Tarjetas #24262A
 *   Texto      #F2EDE2   ·  Acento (cobre) #C79A6B
 */
const darkColors = {
  // Legacy aliases
  text: "#F2EDE2",
  tint: "#C79A6B",

  // Core surfaces
  background: "#0E0F11",
  foreground: "#F2EDE2",

  // Cards / elevated surfaces
  card: "#24262A",
  cardForeground: "#F2EDE2",

  // Primary action color = copper accent
  primary: "#C79A6B",
  primaryForeground: "#0E0F11",

  // Secondary / less-emphasis interactive surfaces
  secondary: "#181A1D",
  secondaryForeground: "#C79A6B",

  // Muted / subdued
  muted: "#181A1D",
  mutedForeground: "#9A968C",

  // Accent highlights
  accent: "#C79A6B",
  accentForeground: "#0E0F11",

  // Destructive
  destructive: "#E0524A",
  destructiveForeground: "#F2EDE2",

  // Borders and inputs
  border: "#2C2F34",
  input: "#181A1D",

  // Bottom navigation
  navActive: "#C79A6B",
  navInactive: "#7C7A73",
  navFloating: "#C79A6B",
  navFloatingForeground: "#0E0F11",
  navBorder: "#2C2F34",

  warning: "#F5A623",
  warningBackground: "#3A2E14",
  successBackground: "#132A1B",
  eventBlue: "#4A7CFF",

  // Status
  success: "#3FBE72",
  successForeground: "#0E0F11",
  inactive: "#5B584F",
  inactiveForeground: "#9A968C",

  // Auth / splash surfaces (already dark-ish; align to this palette)
  authBackground: "#0E0F11",
  authCard: "#24262A",
  authBorder: "#2C2F34",
  authInput: "#181A1D",
  authText: "#F2EDE2",
  authMuted: "#9A968C",
};

export default darkColors;
