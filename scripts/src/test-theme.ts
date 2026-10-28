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
