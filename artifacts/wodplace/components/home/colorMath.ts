/**
 * Matemática de color PURA compartida por las tarjetas de Inicio: mezcla de dos colores (mixHex) y razón de contraste WCAG (contrastRatio, la misma fórmula que contrast() de
 * scripts/src/dark-contrast-pairs.ts). Antes vivía en progressColors.ts (que la sigue re-exportando).
 */
const parse = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const mixHex = (fg: string, bg: string, alpha: number): string => {
  const f = parse(fg);
  const b = parse(bg);
  return '#' + f.map((v, i) => Math.round(v * alpha + (b[i] as number) * (1 - alpha)).toString(16).padStart(2, '0')).join('');
};
const luminance = (hex: string): number => {
  const [r, g, b] = parse(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export function contrastRatio(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
