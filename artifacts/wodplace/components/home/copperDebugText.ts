/**
 * Solo desarrollo: texto de la línea de depuración de la variante 'cobre' (lógica pura). Se carga con require dentro de __DEV__, así que
 * el paquete de producción no lleva ni este archivo ni sus textos.
 */
import { COPPER_TRACK_ALPHA, MIN_LARGE_AND_GRAPHICS, MIN_SMALL_TEXT, copperPasses, type CopperChoice, type CopperMeasure, type CopperTone } from './copperLook';

const TONE_NAME: Record<CopperTone, string> = { medio: 'cobre medio', oscuro: 'cobre oscuro', claro: 'cobre claro' };
const fmt = (n: number) => n.toFixed(2).replace('.', ',');
const verdict = (n: number, min: number) => `${fmt(n)}:1 ${n >= min ? '· pasa' : `· NO pasa (mín. ${String(min).replace('.', ',')}:1)`}`;

/** Líneas de depuración (solo desarrollo) con los números reales de la combinación elegida. */
export function copperDebugLines(choice: CopperChoice, m: CopperMeasure): string[] {
  return [
    `Letra ${choice.ink} sobre ${TONE_NAME[choice.tone]}${copperPasses(m) ? ' (la combinación pasa)' : ' (la combinación NO pasa: no puede ir en Inicio real)'}`,
    `Texto grande (número): ${verdict(m.largeText, MIN_LARGE_AND_GRAPHICS)}`,
    `Texto chico (título y leyenda): ${verdict(m.smallText, MIN_SMALL_TEXT)}`,
    `Relleno de la barra vs fondo: ${verdict(m.bar, MIN_LARGE_AND_GRAPHICS)}`,
    `Relleno vs pista (${Math.round(COPPER_TRACK_ALPHA * 100)} %): ${verdict(m.fillVsTrack, MIN_LARGE_AND_GRAPHICS)}`,
    `Cápsula: texto ${verdict(m.capsuleText, MIN_SMALL_TEXT)} · contra el fondo ${verdict(m.capsuleVsCard, MIN_LARGE_AND_GRAPHICS)}`,
  ];
}
