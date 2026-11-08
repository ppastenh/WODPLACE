import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G, Path } from 'react-native-svg';
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
/** Comilla de apertura de la editorial: glifo de la serif, dibujada con react-native-svg, o dobles (apertura y cierre dibujadas). */
export type QuoteMark = 'glifo' | 'dibujada' | 'doble';
/** Frase corta: centrada solo en vertical (texto a la izquierda) o en vertical y horizontal. */
export type QuoteCenter = 'vertical' | 'ambos';
export type QuoteLook = { variant: QuoteVariant; highlight: boolean; mark: QuoteMark; center: QuoteCenter };

/** UNA sola constante decide la variante que ve Inicio. 'editorialCream' = la elegida; 'actual' = la tarjeta de antes. */
export const QUOTE_VARIANT: QuoteVariant = 'editorialCream';
export const QUOTE_LOOK: QuoteLook = { variant: QUOTE_VARIANT, highlight: true, mark: 'dibujada', center: 'vertical' };

/**
 * Fuente editorial del prototipo: una serif del sistema (Android 'serif', iOS y web Georgia). La definitiva sería Cormorant Garamond
 * Italic, que requiere agregar una dependencia (se evalúa aparte, en el chat de seguridad). Cambiarla es cambiar esta constante.
 */
export const EDITORIAL_FONT: string = Platform.select({ android: 'serif', default: 'Georgia' });

const SHARE_AREA = 48;
const SHARE_ICON = 20;
const TEXT_SIZE = 19;
const TEXT_LINE = 27;
const PAD_V = SPACING.xl;
// Alto mínimo IGUAL para todas las frases: 3 líneas (la frase real más larga, "No necesitas hacerlo perfecto; necesitas volver a
// intentarlo.", ocupa 3 líneas a 320 dp con letra 1,0) más el relleno de arriba y abajo. Solo crece si el texto no cabe.
export const EDITORIAL_MIN_LINES = 3;
export const EDITORIAL_MIN_H = EDITORIAL_MIN_LINES * TEXT_LINE + 2 * PAD_V;
// Ancho de la columna de la comilla de apertura (el texto se sangra lo justo para no pisarla) y alto del dibujo, por tipo de comilla.
const MARK_COL: Record<QuoteMark, number> = { glifo: 26, dibujada: 28, doble: 42 };
const MARK_H: Record<QuoteMark, number> = { glifo: 40, dibujada: 40, doble: 36 };

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

/** Siluetas de montañas (react-native-svg), en un solo color con opacidad baja: decorativas. */
function Mountains({ color, opacity, width, height }: { color: string; opacity: number; width: number; height: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 160 60" preserveAspectRatio="none">
      <Path d="M0 60 L0 50 L26 26 L40 38 L70 6 L104 44 L122 30 L160 54 L160 60 Z" fill={color} fillOpacity={opacity} />
      <Path d="M60 60 L92 30 L108 42 L132 22 L160 46 L160 60 Z" fill={color} fillOpacity={opacity} />
    </Svg>
  );
}

// Comilla dibujada (estilo clásico): un punto redondo y una cola curva que sube hacia la derecha, como un "6". La de cierre es la misma
// girada 180° (como un "9"). Caja de 18 × 26; la doble repite la marca 12,5 dp más a la derecha (caja de 30,5 × 26).
const MARK_BALL = { cx: 7, cy: 21, r: 5.2 };
const MARK_TAIL = 'M1.9 20.2 C1.6 11.6 6.6 5.2 15.6 2 L16.4 4.2 C11 6.8 7.9 11.2 8.9 18.4 Z';
const MARK_STEP = 12.5;

function DrawnMark({ color, height, double, close }: { color: string; height: number; double: boolean; close?: boolean }) {
  const boxW = double ? 18 + MARK_STEP : 18;
  const one = (dx: number) => (
    <G key={dx} transform={`translate(${dx} 0)`}>
      <Circle cx={MARK_BALL.cx} cy={MARK_BALL.cy} r={MARK_BALL.r} fill={color} />
      <Path d={MARK_TAIL} fill={color} />
    </G>
  );
  return (
    <Svg width={(boxW / 26) * height} height={height} viewBox={`0 0 ${boxW} 26`}>
      <G transform={close ? `rotate(180 ${boxW / 2} 13)` : undefined}>{double ? [one(0), one(MARK_STEP)] : one(0)}</G>
    </Svg>
  );
}

function EditorialQuote({ quote, onShare, look }: { quote: string; onShare: () => void; look: QuoteLook }) {
  const colors = useColors();
  const copper = colors.charcoalAccent;
  const parts = splitHighlight(quote);
  const showMark = look.highlight && parts.mark !== '';
  const markCol = MARK_COL[look.mark];
  const hidden = { pointerEvents: 'none', importantForAccessibility: 'no-hide-descendants', accessibilityElementsHidden: true } as const;

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.quoteCream }]}>
      <View {...hidden} style={styles.layers}>
        <LinearGradient
          colors={[colors.quoteCream, colors.cream]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.mountains}>
          <Mountains color={colors.quoteInk} opacity={0.06} width={200} height={75} />
        </View>
      </View>

      {/* Comilla de apertura: decorativa, arriba a la izquierda; el texto se sangra lo justo para no pisarla. */}
      <View {...hidden} style={styles.markOpen}>
        {look.mark === 'glifo' ? (
          <Text style={[styles.glyph, { color: copper, fontFamily: EDITORIAL_FONT }]}>{'“'}</Text>
        ) : (
          <DrawnMark color={copper} height={MARK_H[look.mark]} double={look.mark === 'doble'} />
        )}
      </View>
      {look.mark === 'doble' ? (
        <View {...hidden} style={[styles.markClose, { opacity: 0.5 }]}>
          <DrawnMark color={copper} height={18} double close />
        </View>
      ) : null}

      <View style={[styles.textBox, { paddingLeft: SPACING.xl + markCol + SPACING.sm2 }]}>
        <Text
          style={[styles.text, { color: colors.quoteInk }, look.center === 'ambos' && styles.textCentered]}
          maxFontSizeMultiplier={1.3}
        >
          {showMark ? (
            <>
              {parts.lead}
              <Text style={{ color: colors.quoteCopperText }}>{parts.mark}</Text>
              {parts.tail}
            </>
          ) : (
            parts.lead + parts.mark + parts.tail
          )}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Compartir frase"
        onPress={onShare}
        style={({ pressed }) => [styles.share, pressed && { backgroundColor: colors.border }]}
      >
        <Feather name="share-2" size={SHARE_ICON} color={colors.quoteInk} />
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
  mountains: { position: 'absolute', right: 0, bottom: 0 },
  markOpen: { position: 'absolute', top: SPACING.lg, left: SPACING.xl },
  // El glifo se dibuja con una línea alta y se sube para que su parte visible quede arriba a la izquierda.
  glyph: { fontSize: 110, lineHeight: 110, marginTop: -30, fontStyle: 'italic' },
  markClose: { position: 'absolute', right: SPACING.lg, bottom: SPACING.sm2 },
  // Centrado vertical: la tarjeta es un flex de una columna centrada y el texto va en una caja con el relleno justo (sangría a la izquierda por la
  // comilla; a la derecha, el hueco del botón de compartir, que flota arriba a la derecha).
  textBox: { paddingVertical: PAD_V, paddingRight: SHARE_AREA - SPACING.xs2 },
  text: { fontFamily: EDITORIAL_FONT, fontSize: TEXT_SIZE, lineHeight: TEXT_LINE, fontStyle: 'italic', fontWeight: '500' },
  textCentered: { textAlign: 'center' },
  // Área táctil de 48 × 48 dp; el ícono (20 dp) se ve más chico.
  share: {
    position: 'absolute',
    top: SPACING.xs2,
    right: SPACING.xs2,
    width: SHARE_AREA,
    height: SHARE_AREA,
    borderRadius: SHARE_AREA / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
