/**
 * Resaltado final de la frase del día (decisión (s)). Lógica PURA, sin palabras fijas por frase: parte la frase en `lead` (sin resaltar), `mark`
 * (resaltada, en cobre oscuro) y `tail` (lo que sigue, normalmente la puntuación final), de modo que lead + mark + tail es el texto que se
 * MUESTRA (sin las marcas manuales). \`reason\` explica en palabras qué pasó (para las pruebas y la tabla de ESTADO.md).
 *
 * MARCADO MANUAL (tiene prioridad sobre las reglas automáticas):
 *  - un fragmento entre asteriscos, *así*: se resalta exactamente ese fragmento y se quitan los asteriscos;
 *  - si la frase empieza con "~": no se resalta nada y se quita la marca;
 *  - asteriscos mal cerrados (uno solo, o vacíos): nunca se muestran; se quitan y se aplican las reglas automáticas.
 *
 * REGLAS AUTOMÁTICAS:
 *  (d) 1 a 3 palabras: sin resaltado. Nunca se resalta más de la mitad de las palabras.
 *  (a) si hay una pausa interna (coma, punto y coma, dos puntos, puntos suspensivos o raya) que deje una cláusula FINAL de 2 a 6 palabras,
 *      se resalta esa cláusula (si hay varias pausas, la más cercana al final que cumpla); si no, las últimas 2 a 4 palabras (≈ 30 %).
 *  El resaltado NO puede empezar con una palabra de relleno (artículos, preposiciones, conjunciones, pronombres cortos): se corre a la primera
 *  palabra con contenido. NO puede terminar en una palabra de relleno. Largo mínimo: al menos 8 letras y 2 palabras de contenido, o 1 palabra
 *  de al menos 6 letras si viene de la cláusula tras una pausa. Si el resultado no cumple, NO se resalta nada.
 * La puntuación final y los signos ¿ ¡ « » " no cuentan como palabras. Una "palabra" es un trozo entre espacios con al menos una letra o cifra.
 */
export type HighlightParts = { lead: string; mark: string; tail: string; reason: string };

const TAIL_RE = /[\s.…!?¡¿"“”«»'‘’)\]]+$/u;
const WORD_RE = /[\p{L}\p{N}]/u;
const PAUSE_END_RE = /[,;:…]$|\.\.\.$/u;
const DASH_RE = /^(?:—|–|--|-)$/u;

/** Palabras de relleno: artículos, preposiciones, conjunciones y pronombres cortos (sin tilde, en minúscula). */
export const FILLER_WORDS: ReadonlySet<string> = new Set([
  'el', 'la', 'los', 'las', 'lo', 'un', 'una', 'unos', 'unas', 'al', 'del',
  'a', 'ante', 'con', 'contra', 'de', 'desde', 'en', 'entre', 'hacia', 'hasta', 'para', 'por', 'según', 'sin', 'sobre', 'tras',
  'y', 'e', 'o', 'u', 'ni', 'que', 'como', 'pero', 'aunque', 'si', 'pues',
  'me', 'te', 'se', 'le', 'les', 'nos', 'mi', 'mis', 'tu', 'tus', 'su', 'sus', 'este', 'esta', 'esto', 'ese', 'esa', 'eso',
]);

type Token = { text: string; index: number; isWord: boolean };

const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const isFiller = (w: string) => FILLER_WORDS.has(norm(w));
const letters = (w: string) => (w.match(/[\p{L}\p{N}]/gu) ?? []).length;

export function splitHighlight(phrase: string): HighlightParts {
  let text = phrase.trim();

  // Marcado manual: "~" al comienzo = sin resaltado.
  if (text.startsWith('~')) {
    return { lead: text.slice(1).trimStart().replace(/\*/g, ''), mark: '', tail: '', reason: 'marcado ~: sin resaltado' };
  }
  // Marcado manual: *fragmento*.
  const open = text.indexOf('*');
  if (open >= 0) {
    const close = text.indexOf('*', open + 1);
    if (close > open + 1 && text.slice(open + 1, close).trim() !== '') {
      return {
        lead: text.slice(0, open),
        mark: text.slice(open + 1, close),
        tail: text.slice(close + 1).replace(/\*/g, ''),
        reason: 'marcado manual *…*',
      };
    }
    text = text.replace(/\*/g, '').replace(/ {2,}/g, ' ');
  }

  const tailMatch = TAIL_RE.exec(text);
  const tailStart = tailMatch ? tailMatch.index : text.length;
  const body = text.slice(0, tailStart);
  const tail = text.slice(tailStart);
  const none = (reason: string): HighlightParts => ({ lead: body, mark: '', tail, reason });

  const tokens: Token[] = [];
  for (const m of body.matchAll(/\S+/gu)) tokens.push({ text: m[0], index: m.index ?? 0, isWord: WORD_RE.test(m[0]) });
  const words = tokens.filter((tk) => tk.isWord);
  const n = words.length;
  if (n <= 3) return none('1 a 3 palabras: sin resaltado');
  const maxMark = Math.floor(n / 2);

  // Pausa interna: la cláusula final empieza en la palabra siguiente a una que cierra con , ; : … o a una raya.
  let start = -1;
  let fromPause = false;
  for (let w = n - 2; w >= 0; w--) {
    const word = words[w]!;
    const next = tokens[tokens.indexOf(word) + 1];
    const pause = PAUSE_END_RE.test(word.text) || (next !== undefined && !next.isWord && DASH_RE.test(next.text));
    if (!pause) continue;
    const k = n - (w + 1);
    if (k >= 2 && k <= 6 && k <= maxMark) {
      start = w + 1;
      fromPause = true;
      break;
    }
  }
  // Sin pausa útil: las últimas 2 a 4 palabras (≈ 30 %), sin pasar de la mitad.
  if (start < 0) {
    const k = Math.min(maxMark, Math.max(2, Math.min(4, Math.round(n * 0.3))));
    start = n - k;
    // Una pausa dentro del fragmento lo parte: se empieza después de la última (si queda muy corto, no pasa la validación).
    for (let w = start; w < n - 1; w++) {
      const word = words[w]!;
      const next = tokens[tokens.indexOf(word) + 1];
      if (PAUSE_END_RE.test(word.text) || (next !== undefined && !next.isWord && DASH_RE.test(next.text))) start = w + 1;
    }
  }
  const how = fromPause ? 'cláusula tras la pausa' : `últimas ${n - start} palabras`;

  // Seguridad: no empezar con relleno (se corre a la primera palabra con contenido).
  const first = words[start]!.text;
  let shifted = false;
  while (start < n && isFiller(words[start]!.text)) {
    start++;
    shifted = true;
  }
  if (start >= n) return none(`descartado: solo relleno (${how})`);
  const mine = words.slice(start);
  const content = mine.filter((w) => !isFiller(w.text));
  const total = mine.reduce((acc, w) => acc + letters(w.text), 0);
  if (mine.length > maxMark) return none('descartado: más de la mitad de la frase');
  if (isFiller(mine[mine.length - 1]!.text)) return none(`descartado: termina en «${norm(mine[mine.length - 1]!.text)}»`);
  const longEnough = (content.length >= 2 && total >= 8) || (fromPause && content.length === 1 && letters(content[0]!.text) >= 6);
  if (!longEnough) return none('descartado: menos de 8 letras o de 2 palabras de contenido');

  const at = words[start]!.index;
  const reason = shifted ? `${how}, corrida: empezaba con «${norm(first)}»` : how;
  return { lead: body.slice(0, at), mark: body.slice(at), tail, reason };
}
