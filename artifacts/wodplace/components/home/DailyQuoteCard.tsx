import React, { useState } from 'react';
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
/** Frase corta: centrada solo en vertical (texto a la izquierda) o en vertical y horizontal. */
export type QuoteCenter = 'vertical' | 'ambos';
export type QuoteLook = { variant: QuoteVariant; highlight: boolean; center: QuoteCenter };

/** UNA sola constante decide la variante que ve Inicio. 'editorialCream' = la elegida; 'actual' = la tarjeta de antes. */
export const QUOTE_VARIANT: QuoteVariant = 'editorialCream';
export const QUOTE_LOOK: QuoteLook = { variant: QUOTE_VARIANT, highlight: true, center: 'vertical' };

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
// Alto IGUAL para todas las frases. La tarjeta mide siempre lo que mide la frase real MÁS LARGA en ese teléfono (su ancho, su fuente y su
// tamaño de letra): un texto invisible con esa frase (el "fantasma") se mide con onLayout y fija el alto de la caja del texto; la frase del día,
// más corta, se centra dentro. Solo crece si la frase del día no cabe en ese alto (letra muy grande o una frase más larga que las reales),
// nunca se corta ni lleva "…". Piso mientras se mide: 3 líneas + relleno + los 2 dp del borde (en la web medido: 115 dp).
// IMPORTANTE: debe ser la más larga de DAILY_QUOTES en app/home.tsx (lo comprueba una prueba); si cambia el banco de frases, se actualiza aquí.
export const LONGEST_REAL_QUOTE = 'No necesitas hacerlo perfecto; necesitas volver a intentarlo.';
export const EDITORIAL_MIN_LINES = 3;
export const EDITORIAL_MIN_H = EDITORIAL_MIN_LINES * TEXT_LINE + 2 * PAD_V + 2;
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

function EditorialQuote({ quote, onShare, look }: { quote: string; onShare: () => void; look: QuoteLook }) {
  const colors = useColors();
  const copper = colors.charcoalAccent;
  const parts = splitHighlight(quote);
  const showMark = look.highlight && parts.mark !== '';
  // Solo __DEV__: alto real de la tarjeta (onLayout) para comprobar que es igual con cualquier frase.
  const [measured, setMeasured] = useState(0);
  // Alto medido de la frase real más larga (el fantasma): fija el alto de la caja del texto, igual para todas las frases.
  const [ghostH, setGhostH] = useState(0);
  const textPadLeft = SPACING.xl + MARK_COL + SPACING.sm2;
  const textPadRight = SHARE_AREA - SPACING.xs2;
  const hidden = { pointerEvents: 'none', importantForAccessibility: 'no-hide-descendants', accessibilityElementsHidden: true } as const;

  return (
    <View
      style={[styles.card, { borderColor: colors.border, backgroundColor: colors.quoteCream }]}
      onLayout={__DEV__ ? (e) => setMeasured(Math.round(e.nativeEvent.layout.height)) : undefined}
    >
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
        <DrawnMark color={copper} height={MARK_OPEN_H} />
      </View>
      <View {...hidden} style={[styles.markClose, { opacity: 0.5 }]}>
        <DrawnMark color={copper} height={MARK_CLOSE_H} close />
      </View>

      <View style={[styles.textBox, { paddingLeft: textPadLeft, paddingRight: textPadRight }]}>
        <View style={[styles.textSlot, { minHeight: ghostH }]}>
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
        {/* Fantasma: la frase real más larga, invisible y con el MISMO ancho y estilo; solo sirve para medir su alto. */}
        <View
          {...hidden}
          style={[styles.ghost, { left: textPadLeft, right: textPadRight }]}
          onLayout={(e) => setGhostH(Math.ceil(e.nativeEvent.layout.height))}
        >
          <Text style={styles.text} maxFontSizeMultiplier={1.3}>
            {LONGEST_REAL_QUOTE}
          </Text>
        </View>
      </View>

      {__DEV__ ? (
        <View pointerEvents="none" style={styles.devBadge}>
          <Text style={styles.devBadgeText}>{`Alto: ${measured} dp`}</Text>
        </View>
      ) : null}

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
  markClose: { position: 'absolute', right: SPACING.lg, bottom: SPACING.sm2 },
  // Centrado vertical: la tarjeta es un flex de una columna centrada y el texto va en una caja con el relleno justo (sangría a la izquierda por la
  // comilla; a la derecha, el hueco del botón de compartir, que flota arriba a la derecha).
  textBox: { paddingVertical: PAD_V },
  textSlot: { justifyContent: 'center' },
  ghost: { position: 'absolute', top: PAD_V, opacity: 0 },
  text: { fontFamily: EDITORIAL_FONT, fontSize: TEXT_SIZE, lineHeight: TEXT_LINE, fontStyle: 'italic', fontWeight: '500' },
  textCentered: { textAlign: 'center' },
  // Solo __DEV__ (texto de depuración con el alto medido).
  devBadge: { position: 'absolute', left: SPACING.sm, bottom: 1 },
  devBadgeText: { fontSize: 9, color: '#B00020', fontFamily: 'Inter_600SemiBold' },
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
