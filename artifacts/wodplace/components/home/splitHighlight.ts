/**
 * Resaltado final de la frase del día (variante C, decisión (s)). Lógica PURA, sin palabras fijas: parte la frase en
 * `lead` (sin resaltar), `mark` (resaltada, en cobre oscuro) y `tail` (puntuación final), de modo que lead + mark + tail === frase.
 *
 * Reglas:
 *  (c) 1 a 3 palabras: sin resaltado. Nunca se resalta más de la mitad de las palabras.
 *  (a) si hay una pausa interna (coma, punto y coma, dos puntos, puntos suspensivos o raya) que deje una cláusula FINAL de 2 a 6
 *      palabras, se resalta esa cláusula (si hay varias pausas, la más cercana al final que cumpla);
 *  (b) si no, se resaltan las últimas 2 a 4 palabras (alrededor del 30 %), sin cortar palabras.
 * La puntuación final y los signos ¿ ¡ « » " no cuentan como palabras. Una "palabra" es un trozo entre espacios con al menos una letra o cifra.
 */
export type HighlightParts = { lead: string; mark: string; tail: string };

const TAIL_RE = /[\s.…!?¡¿"“”«»'‘’)\]]+$/u;
const WORD_RE = /[\p{L}\p{N}]/u;
const PAUSE_END_RE = /[,;:…]$|\.\.\.$/u;
const DASH_RE = /^(?:—|–|--|-)$/u;

type Token = { text: string; index: number; isWord: boolean };

export function splitHighlight(phrase: string): HighlightParts {
  const full = phrase.trim();
  const tailMatch = TAIL_RE.exec(full);
  const tailStart = tailMatch ? tailMatch.index : full.length;
  const body = full.slice(0, tailStart);
  const tail = full.slice(tailStart);
  const none: HighlightParts = { lead: body, mark: '', tail };

  const tokens: Token[] = [];
  for (const m of body.matchAll(/\S+/gu)) tokens.push({ text: m[0], index: m.index ?? 0, isWord: WORD_RE.test(m[0]) });
  const words = tokens.filter((tk) => tk.isWord);
  const n = words.length;
  if (n <= 3) return none;
  const maxMark = Math.floor(n / 2);

  // (a) Pausa interna: la cláusula final empieza en la palabra siguiente a una palabra que cierra con , ; : … o a una raya.
  let start = -1;
  for (let w = n - 2; w >= 0; w--) {
    const word = words[w]!;
    const next = tokens[tokens.indexOf(word) + 1];
    const pause = PAUSE_END_RE.test(word.text) || (next !== undefined && !next.isWord && DASH_RE.test(next.text));
    if (!pause) continue;
    const k = n - (w + 1);
    if (k >= 2 && k <= 6 && k <= maxMark) {
      start = w + 1;
      break;
    }
  }
  // (b) Sin pausa útil: las últimas 2 a 4 palabras (≈ 30 %), sin pasar de la mitad.
  if (start < 0) {
    const k = Math.min(maxMark, Math.max(2, Math.min(4, Math.round(n * 0.3))));
    start = n - k;
  }
  const at = words[start]!.index;
  return { lead: body.slice(0, at), mark: body.slice(at), tail };
}
