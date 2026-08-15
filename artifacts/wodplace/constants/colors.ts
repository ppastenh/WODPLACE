/**
 * Semantic design tokens for WODPLACE.
 *
 * Brand: bold, energetic CrossFit box. Warm stone/cream surfaces for the
 * in-app experience, deep indigo as the primary action color, and a
 * near-black "night box" tone for the auth flow.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#191A1E',
    tint: '#4B3CF5',

    // Core surfaces
    background: '#F6F1E8',
    foreground: '#18191A',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#191A1E',

    // Primary action color (buttons, links, active states)
    primary: '#4B3CF5',
    primaryForeground: '#FFFFFF',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#EAE6F9',
    secondaryForeground: '#4B3CF5',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#EAE2CF',
    mutedForeground: '#8C8574',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#F0D9A8',
    accentForeground: '#6B4A12',

    // Destructive / cancel actions
    destructive: '#E0524A',
    destructiveForeground: '#FFFFFF',

    // Borders and input outlines
    border: '#E3D9C2',
    input: '#EFE8D8',

    // Bottom navigation
    navActive: '#B98250',
    navInactive: '#706B63',
    navFloating: '#18191A',
    navFloatingForeground: '#F6F1E8',
    navBorder: '#D4CDBF',
    warning: '#F5A623',
    warningBackground: '#FFF0D5',
    successBackground: '#E7F8EC',
    eventBlue: '#4A7CFF',

    // Status
    success: '#2F9E56',
    successForeground: '#FFFFFF',
    inactive: '#A9A296',
    inactiveForeground: '#5B564C',

    // Auth / splash "night box" surfaces
    authBackground: '#111319',
    authCard: '#1B1D26',
    authBorder: '#2A2D38',
    authInput: '#20222C',
    authText: '#F5F4F2',
    authMuted: '#8C8E99',
  },

  // Border radius (in px) applied to cards, buttons, inputs, and modals.
  radius: 20,
};

export default colors;
