import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Inter_500Medium_Italic } from '@expo-google-fonts/inter/500Medium_Italic';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import { splitHighlight } from '@/components/home/splitHighlight';
import { useColors } from '@/hooks/useColors';
import { FONT_SIZE } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

/**
 * TARJETA DE FRASES DEL DÍA (decisión (s) de DECISIONES-DISENO.md). Solo dibuja: la frase (una de las 5 fijas que rotan por fecha) y el
 * evento de compartir llegan de HomeView, que los recibe de app/home.tsx; aquí no hay lógica de selección ni de compartir.
 *
 * Una propiedad `variant` elige el dibujo: 'actual' (la tarjeta de siempre: degradado dorado, ícono, mayúsculas y flecha; es la de por
 * defecto y NO cambia), 'minimalCream' (A), 'minimalDark' (B) y 'editorialCream' (C). Las tres nuevas no llevan flecha (la flecha de la
 * actual no hacía nada: ver el hallazgo en ESTADO.md) y su única interacción es el botón de compartir, de 48 × 48 dp. Los adornos van en
 * Views con pointerEvents="none" y ocultos a los lectores de pantalla (pointerEvents NUNCA en un <Text>: Android lo ignora).
 */
export type QuoteVariant = 'actual' | 'minimalCream' | 'minimalDark' | 'editorialCream';
export type QuoteItalic = 'real' | 'sintetica';
export type QuoteLook = { variant: QuoteVariant; highlight: boolean; italic: QuoteItalic };

/** UNA sola constante decide la variante que ve Inicio: sigue la 'actual' hasta que Pía elija. */
export const QUOTE_VARIANT: QuoteVariant = 'actual';
export const QUOTE_LOOK: QuoteLook = { variant: QUOTE_VARIANT, highlight: true, italic: 'real' };

/**
 * Fuente editorial del prototipo C: una serif del sistema (Android 'serif', iOS y web Georgia). La definitiva sería Cormorant Garamond
 * Italic, que requiere agregar una dependencia (se evalúa aparte, en el chat de seguridad). Cambiarla es cambiar esta constante.
 */
export const EDITORIAL_FONT: string = Platform.select({ android: 'serif', default: 'Georgia' });

const SHARE_AREA = 48;
const SHARE_ICON = 20;
const FONT_FALLBACK = 'Inter_500Medium';
const FONT_ITALIC = 'Inter_500Medium_Italic';

type Props = {
  quote: string;
  onShare: () => void;
  look?: QuoteLook;
};

export function DailyQuoteCard({ quote, onShare, look = QUOTE_LOOK }: Props) {
  if (look.variant === 'actual') return <ActualQuote quote={quote} onShare={onShare} />;
  return <NewQuote quote={quote} onShare={onShare} look={look} />;
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
          {quote.toUpperCase()}
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
      <Path
        d="M0 60 L0 50 L26 26 L40 38 L70 6 L104 44 L122 30 L160 54 L160 60 Z"
        fill={color}
        fillOpacity={opacity}
      />
      <Path d="M60 60 L92 30 L108 42 L132 22 L160 46 L160 60 Z" fill={color} fillOpacity={opacity} />
    </Svg>
  );
}

/** Líneas diagonales casi imperceptibles (variante B). */
function Diagonals({ color }: { color: string }) {
  return (
    <Svg width="100%" height="100%">
      <Defs>
        <Pattern id="quote-diag" width={14} height={14} patternUnits="userSpaceOnUse">
          <Path d="M-1 15 L15 -1" stroke={color} strokeWidth={1} strokeOpacity={0.05} />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill="url(#quote-diag)" />
    </Svg>
  );
}

function NewQuote({ quote, onShare, look }: { quote: string; onShare: () => void; look: QuoteLook }) {
  const colors = useColors();
  const { variant } = look;
  const dark = variant === 'minimalDark';
  const editorial = variant === 'editorialCream';

  // Itálica real de Inter (Medium Italic), cargada desde el propio componente: mientras carga (o si falla, o con "sintética") se usa Inter
  // Medium con itálica sintética del sistema, para que no haya parpadeo ni un salto de altura notable. La editorial usa la serif del sistema.
  const wantsInter = !editorial && look.italic === 'real';
  const [fontReady] = useFonts(wantsInter ? { [FONT_ITALIC]: Inter_500Medium_Italic } : {});
  const realItalic = wantsInter && fontReady;

  const ink = dark ? colors.quoteCream : colors.quoteInk;
  const bgStart = dark ? colors.quoteDark : colors.quoteCream;
  const bgEnd = dark ? colors.quoteDarkEnd : colors.cream;
  const pressedBg = dark ? colors.nextClassCardPressed : colors.border;
  const textFont = editorial
    ? { fontFamily: EDITORIAL_FONT, fontStyle: 'italic' as const, fontWeight: '500' as const, fontSize: 19, lineHeight: 27 }
    : realItalic
      ? { fontFamily: FONT_ITALIC, fontSize: FONT_SIZE.lg, lineHeight: 23 }
      : { fontFamily: FONT_FALLBACK, fontStyle: 'italic' as const, fontSize: FONT_SIZE.lg, lineHeight: 23 };

  const parts = editorial && look.highlight ? splitHighlight(quote) : null;

  return (
    <View
      style={[
        styles.card,
        { borderColor: dark ? colors.quoteDarkEnd : colors.border, backgroundColor: bgStart },
      ]}
    >
      <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={styles.layers}>
        <LinearGradient colors={[bgStart, bgEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        {dark ? (
          <View style={styles.diagonals}>
            <Diagonals color={colors.quoteCream} />
          </View>
        ) : (
          <View style={editorial ? styles.mountainsC : styles.mountainsA}>
            <Mountains
              color={colors.quoteInk}
              opacity={editorial ? 0.06 : 0.07}
              width={editorial ? 200 : 150}
              height={editorial ? 75 : 56}
            />
          </View>
        )}
      </View>

      <View style={styles.row}>
        <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={styles.marksWrap}>
          <Text style={[styles.mark, editorial ? styles.markSmall : styles.markBig, { color: colors.charcoalAccent }]}>{'“'}</Text>
        </View>
        {editorial ? null : (
          <View
            pointerEvents="none"
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            style={[styles.separator, { backgroundColor: colors.charcoalAccent, opacity: dark ? 0.5 : 1 }]}
          />
        )}
        <Text style={[styles.text, textFont, { color: ink }]} maxFontSizeMultiplier={1.3}>
          {parts && parts.mark ? (
            <>
              {parts.lead}
              <Text style={{ color: colors.quoteCopperText }}>{parts.mark}</Text>
              {parts.tail}
            </>
          ) : (
            quote
          )}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Compartir frase"
          onPress={onShare}
          style={({ pressed }) => [styles.share, pressed && { backgroundColor: pressedBg }]}
        >
          <Feather name="share-2" size={SHARE_ICON} color={ink} />
        </Pressable>
      </View>
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

  // ---- Variantes nuevas ----
  card: { borderRadius: RADIUS.xl, borderWidth: 1 },
  layers: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: RADIUS.xl, overflow: 'hidden' },
  mountainsA: { position: 'absolute', right: 0, bottom: 0 },
  mountainsC: { position: 'absolute', right: 0, bottom: 0 },
  diagonals: { position: 'absolute', top: 0, right: 0, bottom: 0, width: '34%' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: SPACING.xl,
    paddingRight: SPACING.xs2,
    paddingVertical: SPACING.xl,
    gap: SPACING.lg,
  },
  marksWrap: { alignSelf: 'flex-start' },
  mark: { fontFamily: 'Inter_700Bold' },
  markBig: { fontSize: 44, lineHeight: 44, marginTop: -2 },
  markSmall: { fontSize: 26, lineHeight: 26, marginTop: 2 },
  separator: { width: 1.5, alignSelf: 'stretch', borderRadius: 1 },
  text: { flex: 1, flexShrink: 1, paddingTop: 1 },
  // Área táctil de 48 × 48 dp; el ícono (20 dp) se ve más chico. Sube 8 dp para quedar en la esquina de arriba a la derecha sin agrandar la tarjeta.
  share: {
    width: SHARE_AREA,
    height: SHARE_AREA,
    borderRadius: SHARE_AREA / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -SPACING.sm2 - SPACING.xs2,
    marginBottom: -SPACING.sm2 - SPACING.xs2,
  },
});
