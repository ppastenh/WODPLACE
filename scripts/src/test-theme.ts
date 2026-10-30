/**
 * Pruebas del tema (lógica pura de artifacts/wodplace/lib/theme.ts, corredor integrado de Node):
 *  - el modo CLARO devuelve exactamente lo que useColors() devolvía antes del tema (cero cambio visible);
 *  - el modo OSCURO trae todos los tokens del claro (ninguno `undefined`) y usa darkColors.ts donde existe;
 *  - la preferencia guardada: solo 'light'/'dark' valen, el resto cae al valor por defecto (claro).
 *
 * Corre con: pnpm --filter @workspace/scripts test:theme
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import colorsModule from '../../artifacts/wodplace/constants/colors';
import darkModule from '../../artifacts/wodplace/constants/darkColors';
import { DEFAULT_THEME_MODE, paletteFor, parseThemeMode } from '../../artifacts/wodplace/lib/theme';

// tsx entrega el export por defecto de un módulo sin "type" a veces envuelto en otro `default`.
const colors = ((colorsModule as { default?: typeof colorsModule }).default ?? colorsModule) as typeof colorsModule;
const dark = ((darkModule as { default?: typeof darkModule }).default ?? darkModule) as typeof darkModule;

describe('tema: modo claro idéntico al de antes', () => {
  it('paletteFor("light") es exactamente { ...colors.light, radius }', () => {
    assert.deepEqual(paletteFor('light'), { ...colors.light, radius: colors.radius });
  });
  it('el valor por defecto es claro', () => {
    assert.equal(DEFAULT_THEME_MODE, 'light');
    assert.equal(parseThemeMode(null), 'light');
    assert.equal(parseThemeMode(undefined), 'light');
  });
});

describe('tema: modo oscuro', () => {
  const p = paletteFor('dark');
  it('trae todos los tokens del claro, ninguno undefined', () => {
    for (const key of Object.keys(colors.light)) {
      assert.ok((p as Record<string, unknown>)[key] !== undefined, `falta ${key}`);
    }
    assert.equal(p.radius, colors.radius);
  });
  it('usa darkColors.ts en todo token que exista ahí', () => {
    for (const [key, value] of Object.entries(dark)) {
      assert.equal((p as Record<string, unknown>)[key], value, key);
    }
  });
  it('fondo, tarjeta y texto principal son los oscuros', () => {
    assert.equal(p.background, '#0E0F11');
    assert.equal(p.card, '#24262A');
    assert.equal(p.foreground, '#F2EDE2');
  });
});

describe('tema: tokens del diseño nuevo de Inicio (decisión (k))', () => {
  const dark = paletteFor('dark') as unknown as Record<string, string>;
  const light = paletteFor('light') as unknown as Record<string, string>;
  const fijos = ['charcoal', 'charcoalPressed', 'cream', 'creamMuted', 'glassBackground', 'glassBorder'];
  for (const key of fijos) {
    it(`${key} vale lo mismo en el claro y en el oscuro (diseño de claro fijo)`, () => assert.equal(dark[key], light[key]));
  }
  it('los presionados de relleno existen en las dos paletas', () => {
    for (const key of ['accentPressed', 'successBackgroundPressed', 'warningBackgroundPressed']) {
      assert.ok(typeof dark[key] === 'string' && typeof light[key] === 'string', key);
    }
  });
  it('el borde (cobre) y el vidrio son translúcidos y el resto son hex de 6 cifras', () => {
    assert.match(light.glassBackground!, /^rgba\(0,0,0,0\.6\)$/);
    assert.match(light.glassBorder!, /^rgba\(185,130,80,0\.\d+\)$/);
    for (const key of ['charcoal', 'charcoalPressed', 'cream', 'creamMuted']) assert.match(light[key]!, /^#[0-9A-F]{6}$/);
  });
});

describe('tema: preferencia guardada', () => {
  it('solo "light" y "dark" valen', () => {
    assert.equal(parseThemeMode('dark'), 'dark');
    assert.equal(parseThemeMode('light'), 'light');
  });
  it('cualquier otro valor cae al por defecto', () => {
    assert.equal(parseThemeMode(''), 'light');
    assert.equal(parseThemeMode('DARK'), 'light');
    assert.equal(parseThemeMode('auto'), 'light');
  });
});

// Los valores del claro tal como estaban ANTES de empezar el modo oscuro (2026-10-28). Ninguno puede cambiar; los tokens
// agregados después (solo con el MISMO valor de otro existente) se listan aparte.
const LIGHT_ANTES: Record<string, string> = {
  text: '#191A1E',
  tint: '#4B3CF5',
  background: '#F6F1E8',
  foreground: '#18191A',
  card: '#FFFFFF',
  cardForeground: '#191A1E',
  cardPressed: '#EBEBEB',
  primary: '#4B3CF5',
  primaryForeground: '#FFFFFF',
  primaryPressed: '#4033D0',
  secondary: '#EAE6F9',
  secondaryForeground: '#4B3CF5',
  secondaryPressed: '#DEDBED',
  muted: '#EAE2CF',
  mutedForeground: '#8C8574',
  accent: '#F0D9A8',
  accentForeground: '#6B4A12',
  destructive: '#E0524A',
  destructiveForeground: '#FFFFFF',
  destructivePressed: '#BE463F',
  destructiveTextSmall: '#B13A33',
  adminAction: '#18191A',
  adminActionPressed: '#2E2F35',
  adminActionForeground: '#F6F1E8',
  border: '#E3D9C2',
  input: '#EFE8D8',
  navActive: '#B98250',
  navActiveTextSmall: '#8B5E34',
  navActivePressed: '#8B623C',
  navInactive: '#706B63',
  navFloating: '#18191A',
  navFloatingPressed: '#2E2F35',
  navFloatingForeground: '#F6F1E8',
  navBorder: '#D4CDBF',
  warning: '#F5A623',
  warningBackground: '#FFF0D5',
  successBackground: '#E7F8EC',
  eventBlue: '#4A7CFF',
  success: '#2F9E56',
  successForeground: '#FFFFFF',
  inactive: '#A9A296',
  inactiveForeground: '#5B564C',
  authBackground: '#111319',
  authCard: '#1B1D26',
  authBorder: '#2A2D38',
  authInput: '#20222C',
  authText: '#F5F4F2',
  authMuted: '#8C8E99',
};
const LIGHT_AGREGADOS_IGUAL_A: Record<string, string> = {
  inputBorder: 'border',
  nextClassCard: 'navFloating',
  nextClassCardPressed: 'navFloatingPressed',
  nextClassCardForeground: 'navFloatingForeground',
  warningForeground: 'foreground',
  accentGradientEnd: 'card',
  destructiveAccent: 'destructive',
  inputBorderNav: 'navBorder',
  scrim: 'foreground',
};

// Tokens agregados que reemplazan un color escrito a mano: su valor claro es EXACTAMENTE el de antes.
const LIGHT_AGREGADOS_VALOR: Record<string, string> = {
  imagePlaceholder: '#E0E0E0',
  likeAccent: '#E0245E',
  inverseDivider: 'rgba(255,255,255,0.15)',
  // Diseño nuevo de Inicio (decisión (k))
  charcoal: '#0D0F10',
  charcoalPressed: '#25292D',
  cream: '#F2E9DB',
  creamMuted: '#665F55',
  glassBackground: 'rgba(0,0,0,0.6)',
  glassBorder: 'rgba(185,130,80,0.5)',
  accentPressed: '#E4CB93',
  successBackgroundPressed: '#D3EDDB',
  warningBackgroundPressed: '#FFE2B0',
};

describe('tema: el claro NO cambió (valores de antes del modo oscuro)', () => {
  const light = colors.light as Record<string, string>;
  it('los 48 tokens que existían conservan su valor exacto', () => {
    assert.equal(Object.keys(LIGHT_ANTES).length, 48);
    for (const [key, value] of Object.entries(LIGHT_ANTES)) assert.equal(light[key], value, key);
    assert.equal(colors.radius, 20);
  });
  it('los tokens agregados valen lo mismo que el token existente del que parten', () => {
    for (const [key, from] of Object.entries(LIGHT_AGREGADOS_IGUAL_A)) assert.equal(light[key], LIGHT_ANTES[from], key);
    for (const [key, value] of Object.entries(LIGHT_AGREGADOS_VALOR)) assert.equal(light[key], value, key);
  });
  it('no hay otros tokens claros nuevos', () => {
    const extra = Object.keys(light).filter((k) => !(k in LIGHT_ANTES) && !(k in LIGHT_AGREGADOS_IGUAL_A) && !(k in LIGHT_AGREGADOS_VALOR));
    assert.deepEqual(extra, []);
  });
});
