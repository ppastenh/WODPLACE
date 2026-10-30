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
    // Estado presionado sólido de `card` (botones/chips con fondo blanco) --
    // 14.58:1 contra foreground, verificado.
    cardPressed: '#EBEBEB',

    // Primary action color (buttons, links, active states)
    primary: '#4B3CF5',
    primaryForeground: '#FFFFFF',
    // Estado presionado SÓLIDO de `primary` (nunca opacidad) -- 8.07:1
    // contra primaryForeground, verificado (WCAG AA ≥ 4.5:1).
    primaryPressed: '#4033D0',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#EAE6F9',
    secondaryForeground: '#4B3CF5',
    // Estado presionado sólido de `secondary` -- 4.74:1 contra
    // secondaryForeground, verificado.
    secondaryPressed: '#DEDBED',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#EAE2CF',
    mutedForeground: '#8C8574',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#F0D9A8',
    accentForeground: '#6B4A12',
    // Extremo final del degradado de la tarjeta de frase (accent -> accentGradientEnd). Mismo valor que `card`: nada cambia
    // en el claro; en el oscuro es un cobre más profundo para que el texto oscuro no quede sobre un extremo oscuro.
    accentGradientEnd: '#FFFFFF',

    // Destructive / cancel actions
    destructive: '#E0524A',
    destructiveForeground: '#FFFFFF',
    // Estado presionado sólido de `destructive` -- 5.08:1 contra
    // destructiveForeground, verificado.
    destructivePressed: '#BE463F',
    // Darker red for SMALL destructive text on a light background (ej.
    // "Cerrar sesión") -- destructive por sí solo da ~3.8:1 sobre blanco,
    // bajo el mínimo de 4.5:1 para texto chico; este da ~6:1. Mismo patrón
    // que navActiveTextSmall más abajo.
    destructiveTextSmall: '#B13A33',
    // Rojo para texto/punto sobre el TINTE rojo translúcido de "Cuenta no activa" (Perfil). En el claro es el mismo
    // valor que `destructive` (como estaba escrito antes); en el oscuro es un rojo claro que se lee sobre el tinte.
    destructiveAccent: '#E0524A',

    // Botón de acceso a un panel (Administrador/Coach/Super admin) en el
    // menú lateral -- fondo oscuro sólido en los dos estados (nunca
    // opacidad, que diluye el contraste contra lo que haya detrás) con
    // texto claro, ~15:1 en ambos.
    adminAction: '#18191A',
    adminActionPressed: '#2E2F35',
    adminActionForeground: '#F6F1E8',

    // Borders and input outlines
    border: '#E3D9C2',
    // Borde de CAMPOS de formulario (el borde decorativo sigue siendo `border`). En el claro es el mismo valor que
    // `border`, así que nada cambia; en la paleta oscura es más fuerte para cumplir los 3:1 de bordes de campos.
    inputBorder: '#E3D9C2',
    // Línea divisoria sobre la tarjeta del plan suscrito (que es de color INVERTIDO: relleno foreground, texto background).
    // Antes escrita a mano como rgba(255,255,255,0.15); en el oscuro la tarjeta es clara y la línea es oscura.
    inverseDivider: 'rgba(255,255,255,0.15)',
    // Borde de campos y botones de las hojas de Comunidad. En el claro es el mismo valor que `navBorder` (como estaba
    // escrito antes); en el oscuro es el borde fuerte de campos.
    inputBorderNav: '#D4CDBF',
    // Color base del velo translúcido detrás de las hojas (se le agrega la opacidad: scrim + '55'). En el claro es el mismo
    // valor que `foreground` (como estaba escrito antes); en el oscuro es negro: con el crema de `foreground` el velo
    // dibujaba una neblina clara sobre una app oscura.
    scrim: '#18191A',
    // Color del corazón de "me gusta" activo (antes escrito a mano como #E0245E).
    likeAccent: '#E0245E',
    // Relleno de la miniatura de una publicación mientras carga su imagen (antes escrito a mano como #e0e0e0).
    imagePlaceholder: '#E0E0E0',
    input: '#EFE8D8',

    // Bottom navigation
    navActive: '#B98250',
    // Darker copper for SMALL text on the beige background only (box name,
    // small labels) — navActive itself is ~2.9:1 against `background`, under
    // the 4.5:1 small-text minimum; this one is ~5:1. Icons/borders/buttons
    // keep using navActive.
    navActiveTextSmall: '#8B5E34',
    // Estado presionado sólido de `navActive` como fondo de botón -- 5.37:1
    // contra `card` (blanco), verificado. Distinto de navActiveTextSmall,
    // que está calibrado para texto chico sobre `background`, no como fondo.
    navActivePressed: '#8B623C',
    navInactive: '#706B63',
    navFloating: '#18191A',
    // Estado presionado sólido de `navFloating` (la tarjeta de próxima clase de Inicio). MISMO valor que
    // `adminActionPressed` (el botón de panel tiene el mismo fondo #18191A): no es un color nuevo, solo el nombre
    // que corresponde a esta tarjeta. Texto principal (`navFloatingForeground`) sobre él: 11,86:1, verificado.
    navFloatingPressed: '#2E2F35',
    navFloatingForeground: '#F6F1E8',
    // Tarjeta de próxima clase de Inicio: tokens propios (antes usaba navFloating*). En el claro son los MISMOS valores
    // que navFloating*, así que nada cambia; en la paleta oscura la base es el neutro de tarjeta y navFloating queda para
    // el cobre del botón Agendar y los acentos.
    nextClassCard: '#18191A',
    nextClassCardPressed: '#2E2F35',
    nextClassCardForeground: '#F6F1E8',
    navBorder: '#D4CDBF',
    warning: '#F5A623',
    // Ícono sobre el relleno `warning` (aviso de plan por vencer). Mismo valor que `foreground`: nada cambia en el claro.
    warningForeground: '#18191A',
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

    // ── Diseño nuevo de Inicio (decisión (k), solo la pantalla de desarrollo por ahora) ──
    // Barra superior y fondo oscuro del banner (carbón) y su estado presionado SÓLIDO.
    charcoal: '#0D0F10',
    charcoalPressed: '#25292D',
    // Menú inferior nuevo (decisión (p)), fijo sobre carbón: gris claro de íconos y rótulos inactivos (7,19:1 sobre carbón, 5,48:1 sobre
    // charcoalPressed) y cobre de la opción seleccionada y del borde de Agenda (5,83:1 sobre carbón, 4,44:1 sobre charcoalPressed).
    charcoalMuted: '#A29E94',
    charcoalAccent: '#B98250',
    // Enmienda de (p): la opción seleccionada y el borde de Agenda usan el cobre más claro (el #B98250 se veía naranjo): 7,56:1 sobre carbón,
    // 5,76:1 sobre charcoalPressed. charcoalAccent queda sin uso por ahora (no se borra).
    charcoalAccentLight: '#C79A6B',
    // Crema: superficie de contenido y texto/íconos sobre carbón o sobre el vidrio.
    cream: '#F2E9DB',
    // Gris de texto sobre crema, tarjetas blancas y rellenos de tarjeta (#706B63 da 4,39:1 sobre crema y #8C8574 3,05:1).
    creamMuted: '#665F55',
    // Tarjeta de "vidrio" sobre la foto: negro al 60 % (sin desenfoque real) y borde blanco muy sutil.
    glassBackground: 'rgba(0,0,0,0.6)',
    glassBorder: 'rgba(185,130,80,0.5)',
    // Estados presionados SÓLIDOS de las tarjetas de relleno de color (WOD de hoy y PR destacado).
    accentPressed: '#E4CB93',
    successBackgroundPressed: '#D3EDDB',
    // Presionado SÓLIDO del aviso importante (relleno warningBackground).
    warningBackgroundPressed: '#FFE2B0',
  },

  // Border radius (in px) applied to cards, buttons, inputs, and modals.
  radius: 20,
};

export default colors;
