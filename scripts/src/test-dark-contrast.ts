/**
 * Contraste de la paleta oscura (artifacts/wodplace/constants/darkColors.ts), con la fórmula WCAG, sobre TODOS los pares
 * texto/fondo reales (incluidos los *Pressed): FALLA bajo 4,5:1 (3:1 para íconos y bordes de campos). Si cambias un valor de
 * darkColors.ts y un par baja del mínimo, esta prueba lo dice con el par exacto.
 *
 * Corre con: pnpm --filter @workspace/scripts test:dark-contrast
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import darkModule from '../../artifacts/wodplace/constants/darkColors';
import colorsModule from '../../artifacts/wodplace/constants/colors';
import { PAIRS, PAIRS_LIGHT, measure } from './dark-contrast-pairs';

// tsx entrega el export por defecto de un módulo sin "type" a veces envuelto en otro `default`.
const dark = ((darkModule as { default?: typeof darkModule }).default ?? darkModule) as Record<string, string>;

const colorsLight = (((colorsModule as { default?: typeof colorsModule }).default ?? colorsModule) as typeof colorsModule).light as Record<string, string>;

describe('diseño nuevo de Inicio (claro fijo): contraste WCAG de los pares nuevos', () => {
  const light = measure(colorsLight, PAIRS_LIGHT);
  for (const { pair, ratio } of light) {
    it(`${pair.text} sobre ${pair.bg}${pair.bgLiteral ? ` (vidrio sobre ${pair.bgLiteral.over})` : ''} (mín ${pair.min}:1)${pair.note ? ` — ${pair.note}` : ''}`, () => {
      assert.ok(ratio !== null, `falta un token: ${pair.text} / ${pair.bg}`);
      assert.ok(ratio >= pair.min, `${pair.text} sobre ${pair.bg} da ${ratio.toFixed(2)}:1, bajo el mínimo de ${pair.min}:1`);
    });
  }
  it('hay pares medidos', () => assert.ok(PAIRS_LIGHT.length >= 20));
});

describe('paleta oscura: contraste WCAG de todos los pares reales', () => {
  const results = measure(dark);
  for (const { pair, ratio } of results) {
    it(`${pair.text} sobre ${pair.bg} (mín ${pair.min}:1)${pair.note ? ` — ${pair.note}` : ''}`, () => {
      assert.ok(ratio !== null, `falta el token ${dark[pair.text] ? pair.bg : pair.text} en darkColors.ts`);
      assert.ok(
        ratio >= pair.min,
        `${pair.text} ${dark[pair.text]} sobre ${pair.bg} ${dark[pair.bg]} da ${ratio.toFixed(2)}:1, bajo el mínimo de ${pair.min}:1`,
      );
    });
  }
  it('hay pares medidos (la lista no quedó vacía por error)', () => {
    assert.ok(PAIRS.length >= 60);
  });
});
