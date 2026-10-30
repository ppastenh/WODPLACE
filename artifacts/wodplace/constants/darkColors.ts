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
  // Estado presionado sólido de `card` (botones/chips con fondo de tarjeta) -- 11,31:1 contra foreground, verificado.
  cardPressed: "#2E3035",

  // Primary action color = copper accent
  primary: "#C79A6B",
  primaryForeground: "#0E0F11",
  // Estado presionado de `primary` como fondo SÓLIDO -- nunca opacidad,
  // que diluye el color contra lo que haya detrás (ver admin-login.tsx).
  primaryPressed: "#B3885E",

  // Secondary / less-emphasis interactive surfaces
  secondary: "#181A1D",
  secondaryForeground: "#C79A6B",
  // Estado presionado sólido de `secondary` -- 6.03:1 contra
  // secondaryForeground, verificado.
  secondaryPressed: "#242528",

  // Muted / subdued
  muted: "#181A1D",
  mutedForeground: "#9A968C",
  // Estado presionado sólido de `muted` -- 5.19:1 contra mutedForeground,
  // verificado. Mismo valor que secondaryPressed (ambos parten del mismo
  // tono base en esta paleta).
  mutedPressed: "#242528",

  // Accent highlights
  accent: "#C79A6B",
  accentForeground: "#0E0F11",
  // Extremo final del degradado de la tarjeta de frase: cobre más profundo (mismo valor que navActivePressed) -- el texto
  // accentForeground da 6,19:1 sobre él (sobre el #24262A que usa el claro como extremo daría 1,27:1).
  accentGradientEnd: "#B38B60",

  // Destructive
  // Relleno de botón/insignia destructiva. Era #E0524A con texto #F2EDE2 (3,29:1, bajo el mínimo). Ahora #C23E37 con texto
  // #FFFFFF: 5,20:1 en reposo y 6,53:1 presionado (#A8352F), verificado. Como relleno/punto sobre background da 3,69:1
  // (≥ 3:1, no es texto). El TEXTO rojo sobre fondo oscuro usa destructiveTextSmall, no este token.
  destructive: "#C23E37",
  destructiveForeground: "#FFFFFF",
  destructivePressed: "#A8352F",
  // Rojo para texto CHICO sobre fondo oscuro o tarjeta (el `destructive` de relleno da 3,95:1 sobre card) -- 5,58:1
  // sobre card y 7,06:1 sobre background, verificado. Mismo patrón que destructiveTextSmall de colors.ts.
  destructiveTextSmall: "#F07A72",
  // Rojo para texto/punto sobre el tinte rojo translúcido de "Cuenta no activa" -- 6,09:1 sobre ese tinte (el `destructive`
  // de relleno daría 3,18:1). Mismo valor que destructiveTextSmall.
  destructiveAccent: "#F07A72",

  // Botón de acceso a un panel (Administrador/Coach/Super admin) del menú lateral: en la paleta oscura es el cobre
  // (mismo par que primary), texto oscuro encima -- 7,55:1 en reposo y 6,03:1 presionado, verificado.
  adminAction: "#C79A6B",
  adminActionPressed: "#B3885E",
  adminActionForeground: "#0E0F11",

  // Borders and inputs
  border: "#2C2F34",
  // Borde de CAMPOS de formulario (el decorativo sigue siendo `border`, 1,13:1 sobre card: no sirve para delimitar un
  // campo). #70747C: 4,09:1 sobre background, 3,23:1 sobre card y 3,72:1 sobre input (≥ 3:1), verificado.
  inputBorder: "#70747C",
  // Línea divisoria sobre la tarjeta del plan suscrito (en el oscuro, relleno crema): el fondo oscuro al 15 %.
  inverseDivider: "rgba(14,15,17,0.15)",
  // Borde de campos y botones de las hojas de Comunidad: el mismo borde fuerte de campos (3,23:1 sobre card, 4,09:1 sobre fondo).
  inputBorderNav: "#70747C",
  // Velo translúcido detrás de las hojas: negro (la opacidad se agrega en el uso).
  scrim: "#000000",
  // Corazón de "me gusta" activo: el #E0245E del claro da 3,31:1 sobre card; este da 5,25:1 sobre card y 6,64:1 sobre fondo.
  likeAccent: "#F26B8E",
  // Relleno de la miniatura de una publicación mientras carga su imagen: gris oscuro (antes, en claro, #e0e0e0 brillante).
  imagePlaceholder: "#2C2F34",
  input: "#181A1D",

  // Bottom navigation
  navActive: "#C79A6B",
  // Texto chico en cobre: en la paleta oscura `navActive` ya cumple 4,5:1 sobre background (7,55:1) y card (5,96:1), así
  // que es el mismo valor (en la clara hace falta uno más oscuro).
  navActiveTextSmall: "#C79A6B",
  // Estado presionado sólido de `navActive` como fondo de botón -- 4.89:1
  // contra `card` (#24262A), verificado.
  navActivePressed: "#B38B60",
  // Texto/íconos inactivos y leyendas. Era #7C7A73 (4,46:1 sobre background, 3,53:1 sobre card, 3,09:1 sobre el fondo de aviso):
  // bajo el mínimo de 4,5:1. #A29E94: 7,17:1 sobre background, 5,67:1 sobre card, 5,71:1 sobre successBackground, 4,97:1 sobre
  // warningBackground y 4,94:1 sobre cardPressed.
  navInactive: "#A29E94",
  navFloating: "#C79A6B",
  // Estado presionado sólido de `navFloating` (cobre) -- 6,03:1 contra navFloatingForeground, verificado. Mismo valor que
  // primaryPressed/adminActionPressed.
  navFloatingPressed: "#B3885E",
  navFloatingForeground: "#0E0F11",
  // Tarjeta de próxima clase de Inicio: base neutra (color de tarjeta), presionado sólido y texto claro -- 12,98:1 en
  // reposo y 11,31:1 presionado, verificado.
  nextClassCard: "#24262A",
  nextClassCardPressed: "#2E3035",
  nextClassCardForeground: "#F2EDE2",
  navBorder: "#2C2F34",

  warning: "#F5A623",
  // Ícono sobre el relleno `warning`: oscuro -- 9,46:1 (el `foreground` crema daría 1,74:1).
  warningForeground: "#0E0F11",
  warningBackground: "#3A2E14",
  successBackground: "#132A1B",
  eventBlue: "#4A7CFF",

  // Status
  success: "#3FBE72",
  successForeground: "#0E0F11",
  // `inactive` se usa como texto gris (meta de la tarjeta de próxima clase) y como relleno de chip con `inactiveForeground`
  // encima (igual que la clara: relleno claro, texto oscuro). Era #5B584F con #9A968C (2,41:1 el chip; 2,13:1 como texto
  // sobre card). Ahora #A29E94 (5,67:1 como texto sobre card) con #0E0F11 encima (7,17:1 como chip).
  inactive: "#A29E94",
  inactiveForeground: "#0E0F11",

  // Auth / splash surfaces (already dark-ish; align to this palette)
  authBackground: "#0E0F11",
  authCard: "#24262A",
  authBorder: "#2C2F34",
  authInput: "#181A1D",
  authText: "#F2EDE2",
  authMuted: "#9A968C",

  // ── Diseño nuevo de Inicio (decisión (k)) ──
  // Los colores propios del diseño (carbón, crema, vidrio) valen LO MISMO en las dos paletas: ese diseño es de claro fijo.
  charcoal: "#0D0F10",
  charcoalPressed: "#25292D",
  cream: "#F2E9DB",
  creamMuted: "#665F55",
  glassBackground: "rgba(0,0,0,0.6)",
  glassBorder: "rgba(185,130,80,0.5)",
  // Presionados de relleno de color en la paleta oscura: cobre presionado y verde oscuro presionado.
  accentPressed: "#B38B60",
  successBackgroundPressed: "#1C3B28",
  warningBackgroundPressed: "#4A3B1A",
};

export default darkColors;
