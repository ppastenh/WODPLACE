import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { readLayout, readLines } from '@/components/home/layoutEvents';
import { PHOTO_GRAYS, QUOTE_COPPER_DEFAULT, quoteContrast, quoteCopperHex, type QuoteCopperChoice } from '@/components/home/quoteCopper';
import { splitHighlight } from '@/components/home/splitHighlight';
import { useColors } from '@/hooks/useColors';
import { FONT_SIZE } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

/**
 * TARJETA DE FRASES DEL DÍA (decisión (s) de DECISIONES-DISENO.md). Solo dibuja: la frase (una de las 5 fijas que rotan por fecha) y el
 * evento de compartir llegan de HomeView, que los recibe de app/home.tsx; aquí no hay lógica de selección ni de compartir.
 *
 * Una propiedad `variant` elige el dibujo: 'editorialCream' (la elegida por Pía: serif cursiva, resaltado final, comillas grandes de cobre,
 * mismo alto en todas las frases, sin flecha) o 'actual' (la tarjeta de antes: degradado dorado, ícono, mayúsculas y chevron; el chevron nunca
 * navegó a nada). Para volver a la de antes basta cambiar QUOTE_VARIANT a 'actual'. Los adornos van en Views con pointerEvents="none" y
 * ocultos a los lectores de pantalla (pointerEvents NUNCA en un <Text>: Android lo ignora).
 */
export type QuoteVariant = 'actual' | 'editorialCream';
/** Frase corta: centrada solo en vertical (texto a la izquierda) o en vertical y horizontal. */
export type QuoteCenter = 'vertical' | 'ambos';
/** Resaltado: 'cobre' (por defecto) = la frase y las comillas en cobre y las palabras resaltadas en crema; 'marcador' = marcador de cobre con texto oscuro; 'subrayado' = crema subrayado. */
export type QuoteHighlight = 'marcador' | 'cobre' | 'subrayado';
export type QuoteLook = {
  variant: QuoteVariant;
  highlight: boolean;
  center: QuoteCenter;
  highlightStyle?: QuoteHighlight;
  /** Solo desarrollo (__DEV__): sombra de texto oscura suave detrás de las palabras resaltadas, para comparar la lectura. */
  highlightShadow?: boolean;
  /** Solo desarrollo: simula la letra del sistema (1; 1,1; 1,3). */
  fontScale?: number;
  /** Solo desarrollo: cobre de la letra de la frase y las comillas (medio #B98250 por defecto, claro #C79A6B o brillante #E8B781). Solo afecta a la letra, nunca al fondo. */
  copper?: QuoteCopperChoice;
};

/** UNA sola constante decide la variante que ve Inicio. 'editorialCream' = la elegida; 'actual' = la tarjeta de antes. */
export const QUOTE_VARIANT: QuoteVariant = 'editorialCream';
export const QUOTE_LOOK: QuoteLook = { variant: QUOTE_VARIANT, highlight: true, center: 'vertical' };

/**
 * Fuente editorial del prototipo: una serif del sistema (Android 'serif', iOS y web Georgia). La definitiva sería Cormorant Garamond
 * Italic, que requiere agregar una dependencia (se evalúa aparte, en el chat de seguridad). Cambiarla es cambiar esta constante.
 */
export const EDITORIAL_FONT: string = Platform.select({ android: 'serif', default: 'Georgia' });

// Fondo de la tarjeta: foto en grises (home-fondo-frase.jpg; créditos en CREDITOS-IMAGENES.md) y un velo oscuro #0D0F10 UNIFORME del 62 % (una sola
// constante; sin degradado). Con el punto más claro de la foto (gris 255) el texto crema da 4,81:1 (a 60 % daba 4,48:1, bajo el mínimo de 4,5:1).
const QUOTE_PHOTO = require('@/assets/images/home/home-fondo-frase.jpg');
export const QUOTE_VEIL = 0.62;
// Las dos comillas llevan el MISMO color que la letra de la frase (cobre medio charcoalAccent #B98250 por defecto) y la MISMA opacidad (50 %); son decorativas.
const QUOTE_MARK_OPACITY = 0.5;
// Marcador: esquinas de 4 dp, 4 dp de aire a los lados y 2 dp arriba y abajo (alrededor de la altura del tipo).
const MARKER_PAD_H = 4;
const MARKER_PAD_V = 2;
const MARKER_R = 4;
const SHARE_AREA = 48;
const SHARE_ICON = 20;
const TEXT_SIZE = 19;
const TEXT_LINE = 27;
// Relleno de arriba y abajo: 15 dp (no 16) para que, con el borde de 1 dp, 3 líneas den EXACTAMENTE 113 dp en total (3 × 27 + 2 × 15 + 2 = 113).
const PAD_V = 15;
// TAMAÑO: la tarjeta mide 113 dp como mínimo (3 líneas), igual para todas las frases cortas y medianas, que se centran en vertical. Solo CRECE
// cuando una frase necesita más líneas, sin "…" ni cortes. LÍMITE de diseño: 214 dp (ninguna frase del banco debe pasarlo con letra 1,0 a 320, 360 y
// 412 dp; el largo máximo en caracteres está en ESTADO.md). QUOTE_MAX_FONT_MULT limita cuánto crece la letra del sistema para respetar ese límite.
export const EDITORIAL_MIN_LINES = 3;
export const EDITORIAL_MIN_H = EDITORIAL_MIN_LINES * TEXT_LINE + 2 * PAD_V + 2;
export const EDITORIAL_MAX_H = 214;
export const QUOTE_MAX_FONT_MULT = 1.3;
// Comillas dobles dibujadas: la de apertura mide 30 dp de alto (antes 36) y la de cierre 18 dp. MARK_COL es el ancho de la columna de la comilla
// de apertura (30,5 / 26 × 30 = 35,2 dp, redondeado a 36): el texto se sangra esa columna más 8 dp para no pisarla.
const MARK_OPEN_H = 30;
const MARK_CLOSE_H = 18;
const MARK_COL = 36;

type Props = {
  quote: string;
  onShare: () => void;
  look?: QuoteLook;
};

export function DailyQuoteCard({ quote, onShare, look = QUOTE_LOOK }: Props) {
  if (look.variant === 'actual') return <ActualQuote quote={quote} onShare={onShare} />;
  return <EditorialQuote quote={quote} onShare={onShare} look={look} />;
}

/** El texto que se muestra: sin las marcas manuales (*así*, ~) de la frase. */
function displayText(quote: string): string {
  const p = splitHighlight(quote);
  return p.lead + p.mark + p.tail;
}

/** Tarjeta de siempre, sin cambios (degradado dorado, ícono, mayúsculas, botón de compartir y flecha decorativa). */
function ActualQuote({ quote, onShare }: { quote: string; onShare: () => void }) {
  const colors = useColors();
  return (
    <LinearGradient
      colors={[colors.accent, colors.accentGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.quoteRow}
    >
      <MaterialCommunityIcons name="image-filter-hdr" size={30} color={colors.accentForeground} style={styles.quoteIconLeft} />
      <View style={styles.quoteRowTextWrap}>
        <Text style={[styles.quoteRowText, { color: colors.accentForeground }]} numberOfLines={3}>
          {displayText(quote).toUpperCase()}
        </Text>
      </View>
      <View style={styles.quoteRowActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Compartir frase motivacional"
          onPress={onShare}
          hitSlop={10}
          style={({ pressed }) => [styles.shareButton, pressed && { backgroundColor: colors.accentPressed }]}
        >
          <Feather name="share-2" size={16} color={colors.accentForeground} />
        </Pressable>
        <Feather name="chevron-right" size={20} color={colors.accentForeground} />
      </View>
    </LinearGradient>
  );
}

// Comilla dibujada (estilo clásico): un punto redondo y una cola curva que sube hacia la derecha, como un "6". La de cierre es la misma
// girada 180° (como un "9"). Caja de 18 × 26; la doble repite la marca 12,5 dp más a la derecha (caja de 30,5 × 26).
const MARK_BALL = { cx: 7, cy: 21, r: 5.2 };
const MARK_TAIL = 'M1.9 20.2 C1.6 11.6 6.6 5.2 15.6 2 L16.4 4.2 C11 6.8 7.9 11.2 8.9 18.4 Z';
const MARK_STEP = 12.5;

function DrawnMark({ color, height, close }: { color: string; height: number; close?: boolean }) {
  const boxW = 18 + MARK_STEP;
  const one = (dx: number) => (
    <G key={dx} transform={`translate(${dx} 0)`}>
      <Circle cx={MARK_BALL.cx} cy={MARK_BALL.cy} r={MARK_BALL.r} fill={color} />
      <Path d={MARK_TAIL} fill={color} />
    </G>
  );
  return (
    <Svg width={(boxW / 26) * height} height={height} viewBox={`0 0 ${boxW} 26`}>
      <G transform={close ? `rotate(180 ${boxW / 2} 13)` : undefined}>{[one(0), one(MARK_STEP)]}</G>
    </Svg>
  );
}

type Rect = { x: number; y: number; w: number; h: number };

/** Espacios normales a espacios duros: así Text los cuenta en el ancho al medir. */
const nb = (t: string) => t.replace(/ /g, ' ');

function EditorialQuote({ quote, onShare, look }: { quote: string; onShare: () => void; look: QuoteLook }) {
  const colors = useColors();
  const parts = splitHighlight(quote);
  const showMark = look.highlight && parts.mark !== '';
  const style = look.highlightStyle ?? 'cobre';
  const marker = showMark && style === 'marcador';
  // Solo desarrollo: simula la letra del sistema (el tope QUOTE_MAX_FONT_MULT también se aplica, como lo hace el sistema).
  const fs = Math.min(look.fontScale ?? 1, QUOTE_MAX_FONT_MULT);
  const textStyle = { fontSize: TEXT_SIZE * fs, lineHeight: TEXT_LINE * fs };
  const glyphH = TEXT_SIZE * fs;
  const plain = parts.lead + parts.mark + parts.tail;
  const markStart = parts.lead.length;
  const markEnd = markStart + parts.mark.length;

  // Alto real de la tarjeta (onLayout); en __DEV__ también se muestra.
  const [cardH, setCardH] = useState(0);
  const [cardW, setCardW] = useState(0);
  // MARCADOR de cobre: se dibuja por línea, DEBAJO del texto (no backgroundColor del Text anidado: en Android se pega a las letras). Nativo: cada línea
  // llega con onTextLayout (x, y, ancho, alto, texto) y el ancho del tramo resaltado se mide con dos Text ocultos (lo anterior y lo resaltado).
  // Web: react-native-web no trae onTextLayout; los rectángulos del tramo resaltado se leen del DOM con un Range.
  const [lines, setLines] = useState<(Rect & { text: string })[] | null>(null);
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [webRects, setWebRects] = useState<Rect[] | null>(null);
  const markRef = useRef<unknown>(null);
  const textRef = useRef<unknown>(null);
  const resetKey = `${quote}|${look.fontScale}|${style}|${look.highlight}`;
  useEffect(() => {
    setLines(null);
    setWidths({});
    setWebRects(null);
  }, [resetKey]);

  // Tramos de cada línea: lo que va antes del resaltado y lo resaltado. Si los textos de las líneas no reconstruyen la frase, no se mide (queda el subrayado).
  const pieces: { li: number; pre: string; seg: string }[] = [];
  let consistent = false;
  if (marker && lines) {
    let at = 0;
    lines.forEach((l, li) => {
      const s = at;
      const e = at + l.text.length;
      at = e;
      const a = Math.max(s, markStart);
      const b = Math.min(e, markEnd);
      if (b > a) pieces.push({ li, pre: plain.slice(s, a), seg: plain.slice(a, b).replace(/\s+$/, '') });
    });
    consistent = at >= plain.length - 1 && at <= plain.length + 1;
  }
  const measured = pieces.length > 0 && pieces.every((pc) => (pc.pre === '' || widths[`${pc.li}p`] !== undefined) && widths[`${pc.li}s`] !== undefined);
  const nativeRects: Rect[] | null =
    Platform.OS !== 'web' && consistent && measured && lines
      ? pieces.map((pc) => {
          const l = lines[pc.li]!;
          return { x: l.x + (widths[`${pc.li}p`] ?? 0), y: l.y, w: widths[`${pc.li}s`] ?? 0, h: l.h };
        })
      : null;
  const rects = Platform.OS === 'web' ? webRects : nativeRects;

  useEffect(() => {
    if (!marker || Platform.OS !== 'web') return;
    type Dom = { getBoundingClientRect: () => { top: number; left: number } };
    const base = (textRef.current as Dom | null)?.getBoundingClientRect?.();
    const el = markRef.current as Dom | null;
    const doc = (globalThis as { document?: { createRange: () => { selectNodeContents: (n: unknown) => void; getClientRects: () => ArrayLike<{ top: number; left: number; right: number; height: number }> } } }).document;
    if (!base || !el || !doc) return;
    const range = doc.createRange();
    range.selectNodeContents(el);
    const lineH = TEXT_LINE * fs;
    setWebRects(
      Array.from(range.getClientRects())
        .filter((rc) => rc.right - rc.left > 1)
        .map((rc) => ({ x: rc.left - base.left, y: rc.top - base.top + rc.height / 2 - lineH / 2, w: rc.right - rc.left, h: lineH })),
    );
  }, [marker, resetKey, fs, cardW]);

  // Letra por defecto: la frase y las dos comillas en cobre medio #B98250 (charcoalAccent) y las palabras resaltadas en crema, sin subrayado ni marcador. El cobre da 1,64:1 sobre
  // el punto más claro de la foto con el velo del 62 % (3,46:1 con una foto media, 6,05:1 con la más oscura): EXCEPCIÓN consciente al mínimo de 4,5:1, aceptada por Pía y registrada en
  // las pruebas de contraste, ESTADO.md y DECISIONES-DISENO.md. El fondo (foto y velo) no cambia. Las otras dos opciones de resaltado (marcador y subrayado) quedan para comparar en desarrollo.
  const cream = colors.nextClassCardForeground;
  const copperHex = quoteCopperHex(colors, look.copper ?? QUOTE_COPPER_DEFAULT);
  const markerReady = marker && rects !== null && rects.length > 0;
  const bodyColor = style === 'cobre' ? copperHex : cream;
  const highlightStyle =
    style === 'cobre'
      ? {
          color: cream,
          // Solo desarrollo: sombra suave #0D0F10, radio 3 dp, sin desplazamiento.
          ...(__DEV__ && look.highlightShadow
            ? { textShadowColor: colors.charcoal, textShadowRadius: 3, textShadowOffset: { width: 0, height: 0 } }
            : null),
        }
      : style === 'marcador' && markerReady
        ? { color: colors.charcoal }
        : { color: cream, textDecorationLine: 'underline' as const };
  // Las dos comillas: MISMO color que la letra (en el resaltado 'cobre') y MISMA opacidad (50 %).
  const markColor = style === 'cobre' ? copperHex : colors.charcoalAccentLight;
  const hidden = { pointerEvents: 'none', importantForAccessibility: 'no-hide-descendants', accessibilityElementsHidden: true } as const;
  const textPadLeft = SPACING.xl + MARK_COL + SPACING.sm2;
  const textPadRight = SHARE_AREA - SPACING.xs2;

  return (
    <View
      style={[styles.card, { borderColor: colors.border, backgroundColor: colors.charcoal }]}
      onLayout={(e) => {
        const m = readLayout(e);
        if (!m) return;
        setCardH(Math.round(m.height));
        setCardW(Math.round(m.width));
      }}
    >
      {/* Fondo: la foto en grises y un velo oscuro UNIFORME (misma opacidad en toda la tarjeta, nunca un degradado). */}
      <View {...hidden} style={styles.layers}>
        <Image source={QUOTE_PHOTO} style={StyleSheet.absoluteFill} contentFit="cover" />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.charcoal, opacity: QUOTE_VEIL }]} />
      </View>

      <View {...hidden} style={[styles.markOpen, { opacity: QUOTE_MARK_OPACITY }]}>
        <DrawnMark color={markColor} height={MARK_OPEN_H} />
      </View>
      <View {...hidden} style={[styles.markClose, { opacity: QUOTE_MARK_OPACITY }]}>
        <DrawnMark color={markColor} height={MARK_CLOSE_H} close />
      </View>

      <View style={[styles.textBox, { paddingLeft: textPadLeft, paddingRight: textPadRight }]}>
        <View style={styles.textSlot}>
          <View>
            {markerReady ? (
              <View {...hidden} style={StyleSheet.absoluteFill}>
                {rects!.map((r, i) => (
                  <View
                    key={i}
                    style={[
                      styles.marker,
                      {
                        left: r.x - MARKER_PAD_H,
                        top: r.y + (r.h - glyphH) / 2 - MARKER_PAD_V,
                        width: r.w + MARKER_PAD_H * 2,
                        height: glyphH + MARKER_PAD_V * 2,
                        backgroundColor: colors.charcoalAccentLight,
                      },
                    ]}
                  />
                ))}
              </View>
            ) : null}
            {/* Medidores (solo nativo): Text ocultos que dan el ancho de lo que va antes del resaltado y del resaltado en cada línea. */}
            {marker && Platform.OS !== 'web' && lines && consistent ? (
              <View {...hidden} style={styles.measure}>
                {pieces.map((pc) => (
                  <View key={pc.li} style={styles.measureRow}>
                    {pc.pre !== '' ? (
                      <Text
                        style={[styles.text, textStyle]}
                        onLayout={(e) => {
                          const m = readLayout(e);
                          if (!m) return;
                          const width = m.width;
                          setWidths((w) => ({ ...w, [`${pc.li}p`]: width }));
                        }}
                      >
                        {nb(pc.pre)}
                      </Text>
                    ) : null}
                    <Text
                      style={[styles.text, textStyle]}
                      onLayout={(e) => {
                        const m = readLayout(e);
                        if (!m) return;
                        const width = m.width;
                        setWidths((w) => ({ ...w, [`${pc.li}s`]: width }));
                      }}
                    >
                      {nb(pc.seg)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            <Text
              ref={textRef as never}
              style={[styles.text, textStyle, { color: bodyColor }, look.center === 'ambos' && styles.textCentered]}
              maxFontSizeMultiplier={QUOTE_MAX_FONT_MULT}
              onTextLayout={
                marker && Platform.OS !== 'web'
                  ? (e) => {
                      const next = readLines(e);
                      if (next && JSON.stringify(next) !== JSON.stringify(lines)) {
                        setLines(next);
                        setWidths({});
                      }
                    }
                  : undefined
              }
            >
              {showMark ? (
                <>
                  {parts.lead}
                  <Text ref={markRef as never} style={highlightStyle}>
                    {parts.mark}
                  </Text>
                  {parts.tail}
                </>
              ) : (
                plain
              )}
            </Text>
          </View>
        </View>
      </View>

      {__DEV__ ? (
        <View pointerEvents="none" style={styles.devBadge}>
          <Text style={styles.devBadgeText}>{`Alto: ${cardH} dp`}</Text>
        </View>
      ) : null}
      {__DEV__ ? (
        <View pointerEvents="none" style={styles.devCopper}>
          <Text style={styles.devCopperText}>{`Cobre ${copperHex}: ${quoteContrast(copperHex, colors.charcoal, QUOTE_VEIL, PHOTO_GRAYS.claro).toFixed(2).replace('.', ',')}:1 en el peor punto`}</Text>
        </View>
      ) : null}

      {/* Compartir: ícono crema SIN círculo visible; el área táctil de 48 × 48 dp es invisible y, mientras el dedo está apretado, aparece un círculo de color
          SÓLIDO (nextClassCardPressed, sin opacidad). */}
      <Pressable accessibilityRole="button" accessibilityLabel="Compartir frase" onPress={onShare} style={styles.share}>
        {({ pressed }) => (
          <View style={[styles.shareDisc, pressed && { backgroundColor: colors.nextClassCardPressed }]}>
            <Feather name="share-2" size={SHARE_ICON} color={cream} />
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // ---- Tarjeta actual (copiada tal cual de HomeView) ----
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 104,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    gap: SPACING.lg,
  },
  quoteIconLeft: { opacity: 0.8 },
  quoteRowTextWrap: { flex: 1, justifyContent: 'center' },
  quoteRowText: { fontSize: FONT_SIZE.base, lineHeight: 18, fontFamily: 'Inter_700Bold', fontStyle: 'italic' },
  quoteRowActions: { alignItems: 'center', gap: SPACING.sm2 },
  shareButton: { padding: SPACING.xs, borderRadius: RADIUS.full },

  // ---- Editorial ----
  card: { borderRadius: RADIUS.xl, borderWidth: 1, minHeight: EDITORIAL_MIN_H, justifyContent: 'center' },
  layers: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: RADIUS.xl, overflow: 'hidden' },
  marker: { position: 'absolute', borderRadius: MARKER_R },
  measure: { position: 'absolute', left: 0, top: 0, opacity: 0 },
  measureRow: { flexDirection: 'row' },
  markOpen: { position: 'absolute', top: SPACING.lg, left: SPACING.xl },
  markClose: { position: 'absolute', right: SPACING.lg, bottom: SPACING.sm2 },
  // Centrado vertical: la tarjeta es un flex de una columna centrada y el texto va en una caja con el relleno justo (sangría a la izquierda por la
  // comilla; a la derecha, el hueco del botón de compartir, que flota arriba a la derecha).
  textBox: { paddingVertical: PAD_V },
  textSlot: { justifyContent: 'center' },
  text: { fontFamily: EDITORIAL_FONT, fontSize: TEXT_SIZE, lineHeight: TEXT_LINE, fontStyle: 'italic', fontWeight: '500' },
  textCentered: { textAlign: 'center' },
  // Solo __DEV__ (texto de depuración con el alto medido).
  devBadge: { position: 'absolute', left: SPACING.sm, bottom: 1 },
  devBadgeText: { fontSize: 9, color: '#B00020', fontFamily: 'Inter_600SemiBold' },
  // Solo __DEV__: el contraste del peor punto de la foto con el cobre elegido (no cambia ningún alto: va flotando abajo a la derecha).
  devCopper: { position: 'absolute', right: SPACING.sm, bottom: 1 },
  devCopperText: { fontSize: 9, color: '#B00020', fontFamily: 'Inter_600SemiBold' },
  // Área táctil de 48 × 48 dp; el ícono (20 dp) se ve más chico.
  share: {
    position: 'absolute',
    top: SPACING.xs2,
    right: SPACING.xs2,
    width: SHARE_AREA,
    height: SHARE_AREA,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Círculo de 48 dp (todo el área táctil), transparente; solo se pinta al presionar.
  shareDisc: { width: SHARE_AREA, height: SHARE_AREA, borderRadius: SHARE_AREA / 2, alignItems: 'center', justifyContent: 'center' },
});
