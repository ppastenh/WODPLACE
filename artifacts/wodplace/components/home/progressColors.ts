import { contrastRatio, mixHex } from './colorMath';
import { copperBackgrounds, copperSurfaceColors, type CopperPalette, type CopperSurfaceColors } from './copperSurface';

/**
 * Colores de la tarjeta "Progreso mensual" (decisión (v), ajuste del 2026-11-15): el MISMO fondo de cobre oscuro que "Medallas" (copperSurface.ts: degradado de #754522 a #8B5E34, brillo satinado,
 * borde y sombra) con TODO el texto en crema; barra con la pista y el relleno de Medallas (relleno medalProgress #FFE2B7 sobre la pista café); cápsula "Plan ilimitado" de carbón con texto crema y
 * un borde fino de cobre claro (#E8B781) para que se distinga del fondo. Reemplaza al cobre claro con letra oscura. Lógica pura (sin React Native): solo tokens existentes y mezclas de dos tokens.
 * mixHex y contrastRatio viven en colorMath.ts y se siguen exportando desde aquí.
 */
export { contrastRatio, mixHex };
export const MIN_SMALL_TEXT = 4.5;
export const MIN_LARGE_AND_GRAPHICS = 3;

export type ProgressPalette = CopperPalette & { charcoal: string };

export type ProgressColors = CopperSurfaceColors & {
  /** Número y "Sin plan activo" (crema). */
  ink: string;
  /** Título, "/ M clases", leyenda y reservadas (también crema: sobre este fondo un tono atenuado no llega a 4,5:1). */
  muted: string;
  track: string;
  fill: string;
  capsuleBg: string;
  capsuleText: string;
  capsuleBorder: string;
};

export function progressColors(p: ProgressPalette): ProgressColors {
  const surface = copperSurfaceColors(p);
  return {
    ...surface,
    ink: p.nextClassCardForeground,
    muted: p.nextClassCardForeground,
    track: surface.barTrack,
    fill: surface.barFill,
    capsuleBg: p.charcoal,
    capsuleText: p.nextClassCardForeground,
    capsuleBorder: p.medalCopperLight,
  };
}

export type ProgressMeasure = {
  largeText: number; // número y "Sin plan activo" sobre el peor punto del fondo (mínimo 4,5)
  smallText: number; // título, total, leyenda y reservadas sobre el peor punto del fondo (mínimo 4,5)
  fillVsTrack: number; // relleno de la barra contra su pista (mínimo 3)
  fillVsCard: number; // relleno de la barra contra el peor punto del fondo (mínimo 3)
  capsuleText: number; // texto crema de la cápsula sobre su carbón (mínimo 4,5)
  capsuleBorder: number; // borde de cobre claro de la cápsula contra el peor punto del fondo (mínimo 3)
};

/** Peor punto de cada contraste: el fondo más desfavorable de los tres tramos (brillo del extremo izquierdo, punto medio y extremo derecho del degradado). */
export function progressMeasure(c: ProgressColors): ProgressMeasure {
  const bgs = Object.values(copperBackgrounds(c));
  const worst = (fg: string) => Math.min(...bgs.map((bg) => contrastRatio(fg, bg)));
  return {
    largeText: worst(c.ink),
    smallText: worst(c.muted),
    fillVsTrack: contrastRatio(c.fill, c.track),
    fillVsCard: worst(c.fill),
    capsuleText: contrastRatio(c.capsuleText, c.capsuleBg),
    capsuleBorder: worst(c.capsuleBorder),
  };
}

export function progressPasses(m: ProgressMeasure): boolean {
  return (
    m.largeText >= MIN_SMALL_TEXT &&
    m.smallText >= MIN_SMALL_TEXT &&
    m.fillVsTrack >= MIN_LARGE_AND_GRAPHICS &&
    m.fillVsCard >= MIN_LARGE_AND_GRAPHICS &&
    m.capsuleText >= MIN_SMALL_TEXT &&
    m.capsuleBorder >= MIN_LARGE_AND_GRAPHICS
  );
}
