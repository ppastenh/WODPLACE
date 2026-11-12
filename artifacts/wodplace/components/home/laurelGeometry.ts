/**
 * Geometría PURA de la corona de laurel de la tarjeta "Medallas" (decisión (y)). Sin React: la dibuja LaurelWreath.tsx.
 *
 * CONSTRUCCIÓN (medalla de radio r = 21 dp; todo escala por k = r / 21): DOS ramas independientes y simétricas (la derecha es el espejo exacto de la izquierda, scale(-1, 1)),
 * como dos paréntesis curvos alrededor de la medalla. Cada rama = un TALLO en arco circular de radio 26 k centrado en la medalla, de 105° a 245° (ángulos desde el eje x positivo con
 * y hacia abajo: 90° es abajo, 180° la izquierda; la rama derecha usa 75° a -65°), con SEIS hojas puntiagudas (dos curvas cuadráticas, largo 9 k, semiancho 2,2 k) en los ángulos
 * 105°, 133°, 161°, 189°, 217° y 245° del tallo, cada una orientada a lo largo de la rama (hacia arriba) e inclinada 35° hacia afuera, nacida en el tallo y apuntando afuera de la medalla.
 * Origen de coordenadas: el centro de la medalla.
 */

export const BASE_RADIUS = 21;
export const STEM_RADIUS = 26;
export const STEM_START_DEG = 105;
export const STEM_END_DEG = 245;
export const LEAF_ANGLES = [105, 133, 161, 189, 217, 245] as const;
export const LEAF_LENGTH = 9;
export const LEAF_HALF_WIDTH = 2.2;
export const LEAF_TILT_DEG = 35;
export const STEM_STROKE = 1.2;
/** Separación mínima entre cualquier punto de una hoja o del tallo y el borde de la medalla (dp con r = 21; escala con r). */
export const MIN_GAP = 3;

export type Point = { x: number; y: number };
export type Leaf = {
  angleDeg: number;
  base: Point;
  tip: Point;
  /** Punto de control de cada curva cuadrática (lado A y lado B). */
  controlA: Point;
  controlB: Point;
  /** Trazo SVG cerrado de la hoja. */
  path: string;
};
export type Branch = {
  /** Trazo SVG del tallo (arco circular). */
  stemPath: string;
  stemStart: Point;
  stemEnd: Point;
  leaves: Leaf[];
};

const rad = (deg: number) => (deg * Math.PI) / 180;
const round = (n: number) => Math.round(n * 1000) / 1000;
const fmt = (p: Point) => `${round(p.x)} ${round(p.y)}`;
const leafPath = (base: Point, a: Point, tip: Point, b: Point) => `M ${fmt(base)} Q ${fmt(a)} ${fmt(tip)} Q ${fmt(b)} ${fmt(base)} Z`;
const stemArc = (start: Point, end: Point, R: number, sweep: 0 | 1) => `M ${fmt(start)} A ${round(R)} ${round(R)} 0 0 ${sweep} ${fmt(end)}`;

/** Factor de escala de la corona para una medalla de radio r. */
export const scaleFor = (r: number) => r / BASE_RADIUS;

/** Punto del arco del tallo (radio 26 k) en el ángulo dado, con y hacia abajo. */
export function stemPoint(r: number, deg: number): Point {
  const R = STEM_RADIUS * scaleFor(r);
  return { x: R * Math.cos(rad(deg)), y: R * Math.sin(rad(deg)) };
}

/** Rama IZQUIERDA (la derecha es su espejo exacto: x → -x). */
export function leftBranch(r: number): Branch {
  const k = scaleFor(r);
  const R = STEM_RADIUS * k;
  const start = stemPoint(r, STEM_START_DEG);
  const end = stemPoint(r, STEM_END_DEG);
  // Arco de 140° en el sentido de los ángulos crecientes (en pantalla, con y hacia abajo, es el sentido horario): large-arc = 0, sweep = 1.
  const stemPath = stemArc(start, end, R, 1);
  const leaves: Leaf[] = LEAF_ANGLES.map((angleDeg) => {
    const base = stemPoint(r, angleDeg);
    const a = rad(angleDeg);
    // Tangente (hacia arriba en la rama izquierda) y normal hacia afuera de la medalla.
    const tangent = { x: -Math.sin(a), y: Math.cos(a) };
    const outward = { x: Math.cos(a), y: Math.sin(a) };
    const t = rad(LEAF_TILT_DEG);
    const axis = { x: tangent.x * Math.cos(t) + outward.x * Math.sin(t), y: tangent.y * Math.cos(t) + outward.y * Math.sin(t) };
    const length = LEAF_LENGTH * k;
    const half = LEAF_HALF_WIDTH * k;
    const tip = { x: base.x + axis.x * length, y: base.y + axis.y * length };
    const mid = { x: base.x + (axis.x * length) / 2, y: base.y + (axis.y * length) / 2 };
    const perp = { x: -axis.y, y: axis.x };
    // En una curva cuadrática el desvío máximo es la mitad del desvío del punto de control: el control va al doble del semiancho.
    const controlA = { x: mid.x + perp.x * half * 2, y: mid.y + perp.y * half * 2 };
    const controlB = { x: mid.x - perp.x * half * 2, y: mid.y - perp.y * half * 2 };
    const path = leafPath(base, controlA, tip, controlB);
    return { angleDeg, base, tip, controlA, controlB, path };
  });
  return { stemPath, stemStart: start, stemEnd: end, leaves };
}

/** Espejo exacto de un punto respecto del eje vertical de la medalla (scale(-1, 1)). */
export const mirror = (p: Point): Point => ({ x: -p.x, y: p.y });

/** Rama DERECHA: el espejo exacto de la izquierda (los ángulos equivalentes son 75° a -65°). */
export function rightBranch(r: number): Branch {
  const left = leftBranch(r);
  const R = STEM_RADIUS * scaleFor(r);
  return {
    // El arco espejado recorre el sentido contrario: sweep 0.
    stemPath: stemArc(mirror(left.stemStart), mirror(left.stemEnd), R, 0),
    stemStart: mirror(left.stemStart),
    stemEnd: mirror(left.stemEnd),
    leaves: left.leaves.map((l) => ({
      angleDeg: 180 - l.angleDeg,
      base: mirror(l.base),
      tip: mirror(l.tip),
      controlA: mirror(l.controlA),
      controlB: mirror(l.controlB),
      path: leafPath(mirror(l.base), mirror(l.controlA), mirror(l.tip), mirror(l.controlB)),
    })),
  };
}

/** Punto de la curva cuadrática (p0, c, p1) en t. */
const quad = (p0: Point, c: Point, p1: Point, t: number): Point => ({
  x: (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * c.x + t * t * p1.x,
  y: (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * c.y + t * t * p1.y,
});

/** Puntos muestreados del contorno de una hoja (las dos curvas). */
export function leafPoints(l: Leaf, samples = 24): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    pts.push(quad(l.base, l.controlA, l.tip, t));
    pts.push(quad(l.tip, l.controlB, l.base, t));
  }
  return pts;
}

/** Puntos muestreados del tallo. */
export function stemPoints(r: number, samples = 60): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= samples; i++) pts.push(stemPoint(r, STEM_START_DEG + ((STEM_END_DEG - STEM_START_DEG) * i) / samples));
  return pts;
}

/** Todos los puntos de la corona (las dos ramas: tallos y hojas). */
export function wreathPoints(r: number): Point[] {
  const out: Point[] = [];
  for (const b of [leftBranch(r), rightBranch(r)]) {
    for (const l of b.leaves) out.push(...leafPoints(l));
  }
  out.push(...stemPoints(r), ...stemPoints(r).map(mirror));
  return out;
}

/** Ancho total de la corona (de la hoja o tallo más a la izquierda a los más a la derecha), con el grosor del trazo del tallo. */
export function wreathWidth(r: number): number {
  const xs = wreathPoints(r).map((p) => p.x);
  return Math.max(...xs) - Math.min(...xs) + STEM_STROKE * scaleFor(r);
}

/** Alto total de la corona. */
export function wreathHeight(r: number): number {
  const ys = wreathPoints(r).map((p) => p.y);
  return Math.max(...ys) - Math.min(...ys) + STEM_STROKE * scaleFor(r);
}

/** Distancia mínima entre cualquier punto de la corona y el borde de la medalla (círculo de radio r en el origen). */
export function minGapToMedal(r: number): number {
  return Math.min(...wreathPoints(r).map((p) => Math.hypot(p.x, p.y) - r));
}

/** Medio lado del lienzo cuadrado que necesita el SVG para dibujar la corona completa (con un margen de 2 dp escalado). */
export function canvasHalf(r: number): number {
  const pts = wreathPoints(r);
  const m = Math.max(...pts.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))));
  return Math.ceil(m + 2 * scaleFor(r));
}
