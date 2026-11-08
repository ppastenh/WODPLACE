import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Path, Pattern, Rect } from 'react-native-svg';
import type { HomeViewData } from '@/components/home/HomeView';
import { Skeleton } from '@/components/ui/Skeleton';
import { useColors } from '@/hooks/useColors';
import { formatClassDateShort, formatHM } from '@/lib/dateUtils';
import { coachLine, nextClassA11yLabel } from '@/lib/nextClassCard';
import { FONT_SIZE } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

/**
 * TARJETA "TU PRÓXIMA CLASE" (decisión (r) de DECISIONES-DISENO.md). Solo dibuja: el estado y los datos llegan de HomeView (que los recibe
 * de app/home.tsx). Cuatro estados con el MISMO marco (grafito, textura a la derecha con velo negro, esquinas, sombra): con reserva,
 * invitación (sin reserva), cargando (esqueleto) y, si no hay clases, la invitación. La tarjeta entera es el único botón y lleva al
 * Calendario; las capas decorativas, los íconos y la flecha van en Views con pointerEvents="none" y ocultos a los lectores de pantalla.
 * (pointerEvents NUNCA en un <Text>: Android lo ignora, como pasó con el logo de la barra superior.)
 */
export type NextClassCapsule = 'A' | 'B' | 'C';
export type NextClassCopper = 'base' | 'claro';
export type NextClassPattern = 'rombos' | 'lineas' | 'puntos';
/** Textura: una foto recortada, un patrón dibujado en código (sin imágenes ni licencias) o ninguna. */
export type NextClassTexture =
  | { kind: 'image'; source: number; position: { left: string; top: string } }
  | { kind: 'pattern'; pattern: NextClassPattern }
  | null;
export type NextClassLook = {
  capsule: NextClassCapsule;
  copper: NextClassCopper;
  texture: NextClassTexture;
  /** Barras diagonales // a la izquierda del título sin reserva (por defecto sí; el chip de desarrollo las quita). */
  bars?: boolean;
};

/**
 * UNA sola constante decide la textura de la tarjeta (como BANNER_PHOTO): independiente del resto. Elegida por Pía: home-card-pizarra.jpg,
 * una pizarra oscura con borrones de tiza (Noita Digital, Unsplash; créditos en CREDITOS-IMAGENES.md), espejada y aclarada (gamma 0,70) para
 * que el remolino quede a la derecha. Para cambiarla solo cambian el require y la posición. Los patrones dibujados en código (rombos, líneas
 * y puntos) y la foto del aro (NEXT_CLASS_TEXTURE_ARO) quedan como opciones de la pantalla de desarrollo.
 */
export const NEXT_CLASS_TEXTURE: NextClassTexture = {
  kind: 'image',
  source: require('@/assets/images/home/home-card-pizarra.jpg'),
  position: { left: '100%', top: '50%' },
};
export const NEXT_CLASS_TEXTURE_ARO: NextClassTexture = {
  kind: 'image',
  source: require('@/assets/images/home/home-banner-anillo.jpg'),
  position: { left: '30%', top: '40%' },
};

/**
 * Por defecto: cápsula C (vidrio oscuro con borde cobre y texto crema) y cobre #B98250 (charcoalAccent); el cobre claro #C79A6B
 * (charcoalAccentLight) y las otras cápsulas se eligen con los chips de la pantalla de desarrollo. El crema sobre cobre #B98250 da 2,93:1
 * y NO pasa, por eso la cápsula A lleva texto carbón.
 */
export const NEXT_CLASS_LOOK: NextClassLook = { capsule: 'C', copper: 'base', texture: NEXT_CLASS_TEXTURE };

// Textura: ocupa la mitad derecha de la tarjeta (52 %) a toda la altura; la foto va al 80 % de opacidad. El velo negro es 100 % hasta el 66 %
// del ancho de la tarjeta (ahí va el texto gris, que mide como máximo el 66 % del ancho útil) y baja a 20 % (0x33) en el borde derecho. El peor
// caso de contraste (el punto más claro de la foto, L 0,99 por unas motas blancas) está en scripts/src/dark-contrast-pairs.ts; los patrones son más oscuros.
const TEXTURE_WIDTH = '52%';
const TEXTURE_OPACITY = 0.8;
const VEIL_PLATEAU = 0.66;
const VEIL_END = '33';
const PATTERN_OPACITY = 0.55;

const CIRCLE = 32;
const CAPSULE_H = 28;
const ARROW = 32;
const CARD_MIN_H = 124;
// Estado sin reserva: el título baja de FONT_SIZE.hero (26 sp) a 21 sp (-19 %), con la misma fuente (Anton).
const INVITE_NAME_SIZE = 21;
const INVITE_NAME_LINE = 24;
// Barras //: dos trazos paralelos de 2,5 dp con extremos rectos (butt), 18 dp de alto a 60° respecto de la horizontal (desplazamiento
// horizontal 18 / tan 60° = 10,4 dp) y 5,5 dp de separación horizontal entre sí (4,8 dp medidos en perpendicular). El dibujo mide 20 × 20 dp
// (1 dp de margen arriba y abajo para los cantos de los extremos) y va a 10 dp del título.
const BARS_W = 20;
const BARS_H = 20;
const BARS_STROKE = 2.5;
const BARS_LEN = 18;
const BARS_DX = BARS_LEN / Math.tan((60 * Math.PI) / 180);
const BARS_GAP_X = 5.5;

type Booked = NonNullable<HomeViewData['nextBooked']>;

function Frame({
  pressed,
  texture,
  children,
}: {
  pressed: boolean;
  texture: NextClassTexture;
  children: React.ReactNode;
}) {
  const colors = useColors();
  // Presionado SÓLIDO: el velo negro pasa al color presionado de la tarjeta (nextClassCardPressed), nunca a opacidad.
  const veil = pressed ? colors.nextClassCardPressed : colors.charcoal;
  return (
    <View style={[styles.frame, { backgroundColor: colors.nextClassCard, shadowColor: colors.charcoal }]}>
      <View pointerEvents="none" style={styles.layers}>
        {texture?.kind === 'image' ? (
          <Image source={texture.source} style={styles.texture} contentFit="cover" contentPosition={texture.position} />
        ) : null}
        {texture?.kind === 'pattern' ? (
          <View style={styles.textureBox}>
            <PatternLayer kind={texture.pattern} color={colors.charcoalMuted} />
          </View>
        ) : null}
        <LinearGradient
          colors={[veil, veil, `${veil}${VEIL_END}`]}
          locations={[0, VEIL_PLATEAU, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      {children}
    </View>
  );
}

/** Patrones dibujados en código con el gris cálido (charcoalMuted) a baja opacidad: sin imágenes. */
function PatternLayer({ kind, color }: { kind: NextClassPattern; color: string }) {
  const id = `textura-${kind}`;
  return (
    <Svg width="100%" height="100%">
      <Defs>
        {kind === 'rombos' ? (
          // Entramado de rombos (moleteado): dos diagonales cada 12 dp.
          <Pattern id={id} width={12} height={12} patternUnits="userSpaceOnUse">
            <Path d="M0 12 L12 0 M0 0 L12 12" stroke={color} strokeWidth={1} strokeOpacity={PATTERN_OPACITY} />
          </Pattern>
        ) : kind === 'lineas' ? (
          // Rayas diagonales.
          <Pattern id={id} width={9} height={9} patternUnits="userSpaceOnUse">
            <Path d="M-1 10 L10 -1" stroke={color} strokeWidth={1.5} strokeOpacity={PATTERN_OPACITY} />
          </Pattern>
        ) : (
          // Trama de puntos.
          <Pattern id={id} width={10} height={10} patternUnits="userSpaceOnUse">
            <Circle cx={5} cy={5} r={1.3} fill={color} fillOpacity={PATTERN_OPACITY} />
          </Pattern>
        )}
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/** Dos barras diagonales // decorativas (react-native-svg), en un View sin toque y ocultas a los lectores de pantalla. */
function Bars({ color }: { color: string }) {
  const x0 = 2.5;
  const yTop = (BARS_H - BARS_LEN) / 2;
  const yBottom = yTop + BARS_LEN;
  return (
    <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={styles.bars}>
      <Svg width={BARS_W} height={BARS_H}>
        {[0, BARS_GAP_X].map((dx) => (
          <Path
            key={dx}
            d={`M${x0 + dx} ${yBottom} L${x0 + dx + BARS_DX} ${yTop}`}
            stroke={color}
            strokeWidth={BARS_STROKE}
            strokeLinecap="butt"
            fill="none"
          />
        ))}
      </Svg>
    </View>
  );
}

/** Flecha DECORATIVA en un círculo translúcido con borde cobre, a la derecha y centrada en la altura. */
function Arrow({ copper }: { copper: string }) {
  const colors = useColors();
  return (
    <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={styles.arrowWrap}>
      <View style={[styles.arrow, { backgroundColor: colors.glassBackground, borderColor: copper }]}>
        <Feather name="arrow-right" size={16} color={colors.nextClassCardForeground} />
      </View>
    </View>
  );
}

function useCopper(look: NextClassLook): string {
  const colors = useColors();
  return look.copper === 'claro' ? colors.charcoalAccentLight : colors.charcoalAccent;
}

export function NextClassCard({
  state,
  nextBooked,
  levelLabel,
  onPress,
  look = NEXT_CLASS_LOOK,
}: {
  state: 'loading' | 'invite' | 'booked';
  nextBooked: Booked | null;
  levelLabel: string | null;
  onPress: () => void;
  /** Solo la pantalla de desarrollo pasa algo distinto de NEXT_CLASS_LOOK (chips de cápsula, cobre y textura). */
  look?: NextClassLook;
}) {
  const colors = useColors();
  const copper = useCopper(look);

  if (state === 'loading') {
    // Cargando: ni invitación ni datos; esqueleto con el mismo marco, forma y alto de la tarjeta.
    return (
      <View accessibilityRole="progressbar" accessibilityLabel="Cargando tu próxima clase">
        <Frame pressed={false} texture={look.texture}>
          <View pointerEvents="none" style={styles.content}>
            <View style={styles.dateRow}>
              <Skeleton width={CIRCLE} height={CIRCLE} borderRadius={CIRCLE / 2} />
              <Skeleton width={140} height={CAPSULE_H} borderRadius={CAPSULE_H / 2} />
            </View>
            <View style={styles.skeletonBottom}>
              <Skeleton width="60%" height={FONT_SIZE.hero} />
              <Skeleton width="40%" height={FONT_SIZE.xs} />
            </View>
          </View>
        </Frame>
      </View>
    );
  }

  if (state === 'invite' || !nextBooked) {
    // Sin reserva (haya o no clases, o haya fallado la carga): solo el título y la flecha, como siempre.
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ir al Calendario para reservar una clase"
        onPress={onPress}
        style={styles.pressable}
      >
        {({ pressed }) => (
          <Frame pressed={pressed} texture={look.texture}>
            <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={[styles.content, styles.inviteContent]}>
              <View style={styles.inviteRow}>
                {look.bars !== false ? <Bars color={copper} /> : null}
                <Text
                  style={[styles.name, styles.inviteName, styles.inviteText, { color: colors.nextClassCardForeground }]}
                  numberOfLines={2}
                  maxFontSizeMultiplier={1.3}
                >
                  Reserva tu próxima clase
                </Text>
              </View>
            </View>
            <Arrow copper={copper} />
          </Frame>
        )}
      </Pressable>
    );
  }

  const when = `${formatClassDateShort(nextBooked.startDate)} · ${formatHM(nextBooked.startMinutes)}`;
  const spoken = `${formatClassDateShort(nextBooked.startDate)}, ${formatHM(nextBooked.startMinutes)}`;
  const coach = coachLine(nextBooked.coach);
  const hasDuration = !!nextBooked.durationLabel;
  const hasLevel = !!levelLabel;

  // Colores de la cápsula y del círculo de la fecha según la variante (todos tokens existentes).
  const cap =
    look.capsule === 'A'
      ? { bg: copper, border: 'transparent', text: colors.charcoal, icon: colors.charcoal }
      : look.capsule === 'B'
        ? {
            bg: colors.navActiveTextSmall,
            border: 'transparent',
            text: colors.nextClassCardForeground,
            icon: colors.nextClassCardForeground,
          }
        : { bg: colors.glassBackground, border: copper, text: colors.nextClassCardForeground, icon: copper };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={nextClassA11yLabel(nextBooked.type, spoken)}
      onPress={onPress}
      style={styles.pressable}
    >
      {({ pressed }) => (
        <Frame pressed={pressed} texture={look.texture}>
          <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={styles.content}>
            <View style={styles.dateRow}>
              <View style={[styles.circle, { backgroundColor: cap.bg, borderColor: cap.border }]}>
                <Feather name="calendar" size={16} color={cap.icon} />
              </View>
              <View style={[styles.capsule, { backgroundColor: cap.bg, borderColor: cap.border }]}>
                <Text style={[styles.capsuleText, { color: cap.text }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                  {when}
                </Text>
              </View>
            </View>
            <View style={styles.textCol}>
              <Text style={[styles.label, { color: colors.charcoalMuted }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                Tu próxima clase
              </Text>
              <Text style={[styles.name, { color: colors.nextClassCardForeground }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                {nextBooked.type}
              </Text>
              {coach ? (
                <Text style={[styles.coach, { color: colors.charcoalMuted }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                  {coach}
                </Text>
              ) : null}
            </View>
            {hasDuration || hasLevel ? (
              <View style={styles.metaRow}>
                {hasDuration ? (
                  <View style={styles.metaItem}>
                    <Feather name="clock" size={12} color={colors.charcoalMuted} />
                    <Text style={[styles.metaText, { color: colors.charcoalMuted }]} maxFontSizeMultiplier={1.3}>
                      {nextBooked.durationLabel}
                    </Text>
                  </View>
                ) : null}
                {hasLevel ? (
                  <View style={styles.metaItem}>
                    <Feather name="bar-chart-2" size={12} color={colors.charcoalMuted} />
                    <Text style={[styles.metaText, { color: colors.charcoalMuted }]} maxFontSizeMultiplier={1.3}>
                      {levelLabel}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
          <Arrow copper={copper} />
        </Frame>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { borderRadius: RADIUS.xl },
  // Marco: esquinas de 20, sombra exterior muy suave (iOS) y elevación baja (Android). La sombra va en este View y el recorte (overflow) en
  // `layers`, para que iOS no la corte.
  frame: {
    borderRadius: RADIUS.xl,
    minHeight: CARD_MIN_H,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  layers: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: RADIUS.xl, overflow: 'hidden' },
  texture: { position: 'absolute', top: 0, right: 0, bottom: 0, width: TEXTURE_WIDTH, opacity: TEXTURE_OPACITY },
  textureBox: { position: 'absolute', top: 0, right: 0, bottom: 0, width: TEXTURE_WIDTH },
  content: { padding: SPACING.lg, gap: SPACING.sm, justifyContent: 'center', flexGrow: 1 },
  inviteContent: { paddingRight: SPACING.lg + ARROW + SPACING.sm },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsule: {
    height: CAPSULE_H,
    flexShrink: 1,
    borderRadius: CAPSULE_H / 2,
    borderWidth: 1.5,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
  },
  capsuleText: { fontSize: FONT_SIZE.sm, fontFamily: 'Inter_700Bold' },
  // El texto no pasa por debajo de la flecha: se corta con "…" antes de ella.
  textCol: { paddingRight: ARROW + SPACING.sm, gap: 0 },
  label: { fontSize: FONT_SIZE.sm, lineHeight: 14, fontFamily: 'Inter_500Medium' },
  name: { fontSize: FONT_SIZE.hero, lineHeight: 30, fontFamily: 'Anton_400Regular' },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  inviteText: { flexShrink: 1 },
  bars: { width: BARS_W, height: BARS_H },
  inviteName: { fontSize: INVITE_NAME_SIZE, lineHeight: INVITE_NAME_LINE },
  coach: { fontSize: FONT_SIZE.xs, lineHeight: 14, fontFamily: 'Inter_500Medium' },
  // Última línea: la duración y, al lado, el nivel. Como máximo el 66 % del ancho útil (todo el texto gris queda sobre el tramo 100 % negro
  // del velo); solo si no cabe (320 dp con "Todos los niveles" y letra grande) el nivel pasa a un segundo renglón.
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: SPACING.lg, rowGap: SPACING.xs, maxWidth: '66%' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: FONT_SIZE.xs, lineHeight: 14, fontFamily: 'Inter_600SemiBold' },
  arrowWrap: { position: 'absolute', top: 0, bottom: 0, right: SPACING.lg, justifyContent: 'center' },
  arrow: {
    width: ARROW,
    height: ARROW,
    borderRadius: ARROW / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonBottom: { gap: SPACING.md },
});
