import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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
export type NextClassTexture = { source: number; position: { left: string; top: string } } | null;
export type NextClassLook = { capsule: NextClassCapsule; copper: NextClassCopper; texture: NextClassTexture };

/**
 * UNA sola constante decide la textura de la tarjeta (como BANNER_PHOTO): independiente del resto. PROVISIONAL (decisión (r)): un
 * recorte de la foto ya activa del banner (home-banner-anillo.jpg, créditos en CREDITOS-IMAGENES.md) hasta que Pía elija otra con
 * licencia. Para cambiarla solo cambian el require y la posición del recorte.
 */
export const NEXT_CLASS_TEXTURE: NonNullable<NextClassTexture> = {
  source: require('@/assets/images/home/home-banner-anillo.jpg'),
  position: { left: '30%', top: '40%' },
};

/**
 * Cápsula de la fecha por defecto: A = cobre con texto e ícono carbón (5,83:1; el crema sobre cobre da 2,93:1 y NO pasa). Cobre #B98250
 * (charcoalAccent); el cobre claro #C79A6B (charcoalAccentLight) se elige con el chip de la pantalla de desarrollo.
 */
export const NEXT_CLASS_LOOK: NextClassLook = { capsule: 'A', copper: 'base', texture: NEXT_CLASS_TEXTURE };

// Textura: ocupa la mitad derecha de la tarjeta (52 %) a toda la altura, con la foto al 50 % de opacidad; el velo negro es 100 % hasta el 60 %
// del ancho de la tarjeta (ahí van el texto gris y casi todo el nombre) y baja a 35 % (0x59) en el borde derecho. Contrastes en
// scripts/src/dark-contrast-pairs.ts.
const TEXTURE_WIDTH = '52%';
const TEXTURE_OPACITY = 0.5;
const VEIL_PLATEAU = 0.6;
const VEIL_END = '59';

const CIRCLE = 36;
const CAPSULE_H = 32;
const ARROW = 36;
const CARD_MIN_H = 154;

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
        {texture ? (
          <Image source={texture.source} style={styles.texture} contentFit="cover" contentPosition={texture.position} />
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

/** Flecha DECORATIVA en un círculo translúcido con borde cobre, a la derecha y centrada en la altura. */
function Arrow({ copper }: { copper: string }) {
  const colors = useColors();
  return (
    <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={styles.arrowWrap}>
      <View style={[styles.arrow, { backgroundColor: colors.glassBackground, borderColor: copper }]}>
        <Feather name="arrow-right" size={18} color={colors.nextClassCardForeground} />
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
              <Skeleton width={150} height={CAPSULE_H} borderRadius={CAPSULE_H / 2} />
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
              <Text
                style={[styles.name, { color: colors.nextClassCardForeground }]}
                numberOfLines={2}
                maxFontSizeMultiplier={1.3}
              >
                Reserva tu próxima clase
              </Text>
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
                <Feather name="calendar" size={18} color={cap.icon} />
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
  content: { padding: SPACING.xl, gap: SPACING.md, justifyContent: 'center', flexGrow: 1 },
  inviteContent: { paddingRight: SPACING.xl + ARROW + SPACING.sm },
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
  textCol: { paddingRight: ARROW + SPACING.sm, gap: 1 },
  label: { fontSize: FONT_SIZE.sm, lineHeight: 16, fontFamily: 'Inter_500Medium' },
  name: { fontSize: 28, lineHeight: 34, fontFamily: 'Anton_400Regular' },
  coach: { fontSize: FONT_SIZE.xs, lineHeight: 15, fontFamily: 'Inter_500Medium' },
  // Duración y nivel: como máximo el 58 % del ancho de la tarjeta (todo el texto gris queda sobre el tramo 100 % negro del velo; si no
  // cabe, pasa a un segundo renglón).
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: SPACING.md, rowGap: SPACING.xs, maxWidth: '58%' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: FONT_SIZE.xs, lineHeight: 15, fontFamily: 'Inter_600SemiBold' },
  arrowWrap: { position: 'absolute', top: 0, bottom: 0, right: SPACING.xl, justifyContent: 'center' },
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
