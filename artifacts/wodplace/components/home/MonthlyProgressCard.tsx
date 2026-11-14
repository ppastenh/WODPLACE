import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CopperBackdrop } from '@/components/home/CopperBackdrop';
import { COPPER_BORDER_WIDTH, copperSurfaceStyles } from '@/components/home/copperSurface';
import { useColors } from '@/hooks/useColors';
import { readLayout } from '@/components/home/layoutEvents';
import { monthlyProgressA11yLabel, monthlyProgressBarValue } from '@/components/home/monthlyProgressText';
import { progressColors } from '@/components/home/progressColors';
import { monthlyCardParts, type PlanProgressView } from '@/lib/planProgress';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

/**
 * TARJETA "PROGRESO MENSUAL" de Inicio (decisión (v) de DECISIONES-DISENO.md, ajustada el 2026-11-15): barra refinada sobre el MISMO fondo de cobre oscuro que "Medallas" (copperSurface.ts y
 * CopperBackdrop.tsx: degradado, brillo satinado, borde y sombra) con todo el texto en crema (colores en progressColors.ts). Solo dibuja: qué mostrar lo decide lib/planProgress.ts (planProgressView + monthlyCardParts), que NO cambió; los datos llegan de HomeView.
 * La tarjeta no tiene toque. Es una sola versión: las anteriores (blanca, grafito, clara y las otras combinaciones de cobre) quedaron descartadas.
 */
const NUMBER_CLASSES = 32;
const NUMBER_UNLIMITED = 36;
const TOTAL_SIZE = 15;
const SMALL = 12; // título, "N reservada(s)" y leyenda: 12 sp (el pedido pedía 11 a 12; FONT_SIZE.xs es 11, FONT_SIZE.sm es 12)
const BAR_H = 8;
const CAPSULE_MIN_H = 28;
const PAD = 16;
/** El borde fino de la tarjeta (1 dp) ocupa lugar: el relleno baja 1 dp para que la tarjeta mida lo mismo que antes y el contenido quede donde estaba. */
const INNER = COPPER_BORDER_WIDTH;
/** Estado sin plan: mensaje de 16 sp (peso medio) en un espacio de 24 dp bajo el título; con el relleno de 12 dp arriba y abajo la tarjeta mide ~64 dp (antes 70). */
const NONE_SIZE = 16;
const NONE_MESSAGE_MIN_H = 24;
/** Tope de la letra del sistema, igual que el resto de Inicio. */
const MAX_MULT = 1.3;

export function MonthlyProgressCard({
  view,
  fontScale,
}: {
  view: PlanProgressView;
  /** Solo la pantalla de desarrollo: simula la letra del sistema (el tope de 1,3 también se aplica). */
  fontScale?: number;
}) {
  const colors = useColors();
  const look = progressColors(colors);
  const monthly = monthlyCardParts(view);
  // Alto medido de la tarjeta (solo desarrollo). El evento se lee de forma SINCRÓNICA (readLayout) y solo después se usa setState.
  const [cardH, setCardH] = useState(0);
  const fs = Math.min(fontScale ?? 1, MAX_MULT);
  const size = (n: number) => ({ fontSize: n * fs, lineHeight: Math.round(n * 1.2 * fs) });
  const onCardLayout = __DEV__
    ? (e: Parameter0) => {
        const m = readLayout(e);
        if (!m) return;
        const height = Math.round(m.height);
        setCardH(height);
      }
    : undefined;
  const devBadge = __DEV__ ? (
    <View pointerEvents="none" style={styles.devBadge}>
      <Text style={styles.devBadgeText}>{`Alto: ${cardH} dp`}</Text>
    </View>
  ) : null;

  if (view.kind === 'loading') {
    // Esqueleto con la misma forma y alto que la tarjeta con plan por cantidad (título, número, barra y leyenda). Sobre el cobre oscuro: barras del color del esqueleto de Medallas (look.bone).
    return (
      <Surface look={look} shadowColor={colors.charcoal} onLayout={onCardLayout} accessible accessibilityRole="progressbar" accessibilityLabel="Cargando tu progreso mensual">
        <View style={[styles.bone, { width: '45%', height: SMALL, backgroundColor: look.bone }]} />
        <View style={styles.skeletonBody} importantForAccessibility="no-hide-descendants">
          <View style={[styles.bone, { width: '30%', height: NUMBER_CLASSES, backgroundColor: look.bone }]} />
          <View style={[styles.bone, { width: '100%', height: BAR_H, borderRadius: BAR_H / 2, backgroundColor: look.bone }]} />
          <View style={[styles.bone, { width: '55%', height: SMALL, backgroundColor: look.bone }]} />
        </View>
        {devBadge}
      </Surface>
    );
  }

  if (view.kind === 'none' || !monthly) {
    // Sin plan (decisión (v)): el título arriba a la izquierda y "Sin plan activo" centrado, sin barra, pista, guion, reservadas ni cápsula. El mensaje se centra en el espacio
    // que queda bajo el título (no en toda la tarjeta: así el título no choca con el mensaje en 320 dp ni con letra grande). Alto: ver NONE_MESSAGE_MIN_H.
    return (
      <Surface look={look} shadowColor={colors.charcoal} style={{ paddingVertical: SPACING.lg - INNER }} onLayout={onCardLayout} accessible accessibilityLabel="Progreso mensual: sin plan activo">
        <View importantForAccessibility="no-hide-descendants">
          <Text style={[styles.small, size(SMALL), { color: look.muted }]} maxFontSizeMultiplier={MAX_MULT}>
            Progreso mensual
          </Text>
          <View style={[styles.noneMessage, { minHeight: NONE_MESSAGE_MIN_H * fs }]}>
            <Text style={[styles.noneText, size(NONE_SIZE), { color: look.ink }]} maxFontSizeMultiplier={MAX_MULT}>
              Sin plan activo
            </Text>
          </View>
        </View>
        {devBadge}
      </Surface>
    );
  }

  const label = monthlyProgressA11yLabel(view) ?? 'Progreso mensual';
  const reserved = monthly.topRightReserved ?? monthly.chipReserved;
  const unlimited = monthly.chip !== null;
  const bar = monthlyProgressBarValue(view);

  return (
    <Surface look={look} shadowColor={colors.charcoal} onLayout={onCardLayout} accessible accessibilityLabel={label}>
      {/* Todo lo de dentro se lee como UNA frase (la del grupo); los textos sueltos se ocultan para no repetirlos. */}
      <View importantForAccessibility="no-hide-descendants" style={styles.header}>
        <Text style={[styles.small, size(SMALL), styles.titleFlex, { color: look.muted }]} maxFontSizeMultiplier={MAX_MULT}>
          Progreso mensual
        </Text>
        {unlimited ? (
          <View style={[styles.capsule, { backgroundColor: look.capsuleBg, borderColor: look.capsuleBorder, minHeight: CAPSULE_MIN_H * fs }]}>
            <Text style={[styles.capsuleText, size(SMALL), { color: look.capsuleText }]} maxFontSizeMultiplier={MAX_MULT}>
              {monthly.chip}
            </Text>
          </View>
        ) : reserved ? (
          <Text style={[styles.small, size(SMALL), styles.reservedTop, { color: look.muted }]} maxFontSizeMultiplier={MAX_MULT}>
            {reserved}
          </Text>
        ) : null}
      </View>

      <Text
        style={[styles.number, size(unlimited ? NUMBER_UNLIMITED : NUMBER_CLASSES), { color: look.ink }]}
        maxFontSizeMultiplier={MAX_MULT}
        importantForAccessibility="no-hide-descendants"
      >
        {monthly.value}
        {monthly.totalSuffix ? (
          <Text style={[styles.total, size(TOTAL_SIZE), { color: look.muted }]}>{monthly.totalSuffix}</Text>
        ) : null}
      </Text>

      {monthly.showBar && bar ? (
        <View
          accessibilityRole="progressbar"
          accessibilityValue={bar}
          style={[styles.track, { backgroundColor: look.track }]}
        >
          <View
            importantForAccessibility="no-hide-descendants"
            style={[styles.fill, { backgroundColor: look.fill, width: `${Math.min(Math.max(monthly.ratio, 0), 1) * 100}%` }]}
          />
        </View>
      ) : null}

      <View importantForAccessibility="no-hide-descendants" style={unlimited ? styles.footerRow : undefined}>
        <Text
          style={[styles.small, size(SMALL), unlimited ? styles.legendFlex : styles.legend, { color: look.muted }]}
          maxFontSizeMultiplier={MAX_MULT}
        >
          {monthly.legend}
        </Text>
        {unlimited && reserved ? (
          <Text style={[styles.small, size(SMALL), styles.reservedBottom, { color: look.muted }]} maxFontSizeMultiplier={MAX_MULT}>
            {reserved}
          </Text>
        ) : null}
      </View>
      {devBadge}
    </Surface>
  );
}

type Parameter0 = Parameters<typeof readLayout>[0];

/** Fondo compartido con Medallas: el contenedor con sombra y la tarjeta con borde; el degradado y el brillo van como primer hijo (CopperBackdrop). */
function Surface({
  look,
  shadowColor,
  children,
  style,
  ...rest
}: { look: ReturnType<typeof progressColors>; shadowColor: string; children: React.ReactNode; style?: object } & React.ComponentProps<typeof View>) {
  const surface = copperSurfaceStyles(shadowColor, look);
  return (
    <View style={surface.outer}>
      <View {...rest} style={[surface.card, styles.card, style]}>
        <CopperBackdrop c={look} />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Mismo radio (20), borde, sombra y fondo que Medallas (copperSurfaceStyles); el relleno descuenta el borde.
  card: { padding: PAD - INNER },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.md },
  small: { fontFamily: 'Inter_500Medium' },
  titleFlex: { flexShrink: 1 },
  reservedTop: { flexShrink: 1, textAlign: 'right' },
  capsule: {
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    paddingHorizontal: SPACING.xl - SPACING.xs2,
    paddingVertical: SPACING.xs2,
    justifyContent: 'center',
    flexShrink: 1,
  },
  capsuleText: { fontFamily: 'Inter_700Bold' },
  number: { fontFamily: 'Inter_500Medium', marginTop: SPACING.xs2 },
  total: { fontFamily: 'Inter_500Medium' },
  track: { height: BAR_H, borderRadius: BAR_H / 2, overflow: 'hidden', marginTop: SPACING.md },
  fill: { height: '100%', borderRadius: BAR_H / 2 },
  legend: { marginTop: SPACING.sm },
  legendFlex: { flexShrink: 1, flexGrow: 1, marginTop: SPACING.xs2 },
  footerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: SPACING.md },
  reservedBottom: { flexShrink: 1, textAlign: 'right' },
  noneMessage: { marginTop: SPACING.xs, alignItems: 'center', justifyContent: 'center' },
  noneText: { fontFamily: 'Inter_500Medium', textAlign: 'center' },
  bone: { borderRadius: 6 },
  skeletonBody: { gap: SPACING.md, marginTop: SPACING.md },
  devBadge: { position: 'absolute', right: 6, bottom: 4, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  devBadgeText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'Inter_600SemiBold' },
});
