import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { useColors } from '@/hooks/useColors';
import { readLayout } from '@/components/home/layoutEvents';
import { monthlyProgressA11yLabel, monthlyProgressBarValue } from '@/components/home/monthlyProgressText';
import { monthlyCardParts, type PlanProgressView } from '@/lib/planProgress';
import { FONT_SIZE } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

/**
 * TARJETA "PROGRESO MENSUAL" de Inicio (decisión (v) de DECISIONES-DISENO.md). Solo dibuja: qué mostrar lo decide lib/planProgress.ts
 * (planProgressView + monthlyCardParts), que NO cambió; los datos llegan de HomeView. La tarjeta no tiene toque.
 *
 * Tres variantes de la misma tarjeta (una sola lógica):
 *  - 'oscura' (por defecto): tarjeta grafito como las de próxima clase y frases, número crema, barra de cobre claro sobre pista oscura.
 *  - 'actual': la tarjeta blanca de antes (para volver atrás: PROGRESS_VARIANT = 'actual').
 *  - 'clara': versión para comparar, solo se elige en la pantalla de desarrollo.
 */
export type ProgressVariant = 'actual' | 'oscura' | 'clara';

/** UNA constante decide la variante que se ve en Inicio. Para volver al diseño anterior, cámbiala a 'actual'. */
export const PROGRESS_VARIANT: ProgressVariant = 'oscura';

const NUMBER_CLASSES = 32;
const NUMBER_UNLIMITED = 36;
const TOTAL_SIZE = 15;
const SMALL = 12; // título, "N reservada(s)" y leyenda: 12 sp (el pedido pedía 11 a 12; FONT_SIZE.xs es 11, FONT_SIZE.sm es 12)
const BAR_H = 8;
const CAPSULE_MIN_H = 28;
const PAD = 16;
/** Tope de la letra del sistema, igual que el resto de Inicio. */
const MAX_MULT = 1.3;

type Look = {
  background: string;
  border: string | null;
  muted: string;
  number: string;
  fill: string;
  track: string;
  capsuleBg: string;
  capsuleBorder: string;
  capsuleText: string;
};

function useLook(variant: Exclude<ProgressVariant, 'actual'>): Look {
  const c = useColors();
  if (variant === 'clara') {
    return {
      background: c.card,
      border: c.border,
      muted: c.creamMuted,
      number: c.quoteInk,
      fill: c.navActiveTextSmall,
      track: c.input,
      capsuleBg: c.accent,
      capsuleBorder: 'transparent',
      capsuleText: c.accentForeground,
    };
  }
  return {
    background: c.nextClassCard,
    border: null,
    muted: c.charcoalMuted,
    number: c.nextClassCardForeground,
    fill: c.charcoalAccentLight,
    // Pista: el token más cercano al borde de la paleta oscura (#2C2F34) en el claro es nextClassCardPressed (#2E2F35); no se crea un color nuevo.
    track: c.nextClassCardPressed,
    capsuleBg: c.glassBackground,
    capsuleBorder: c.charcoalAccentLight,
    capsuleText: c.nextClassCardForeground,
  };
}

export function MonthlyProgressCard({
  view,
  variant = PROGRESS_VARIANT,
  fontScale,
}: {
  view: PlanProgressView;
  variant?: ProgressVariant;
  /** Solo la pantalla de desarrollo: simula la letra del sistema (el tope de 1,3 también se aplica). */
  fontScale?: number;
}) {
  if (variant === 'actual') return <ActualCard view={view} />;
  return <RefinedCard view={view} variant={variant} fontScale={fontScale} />;
}

function RefinedCard({ view, variant, fontScale }: { view: PlanProgressView; variant: 'oscura' | 'clara'; fontScale?: number }) {
  const colors = useColors();
  const look = useLook(variant);
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
  const frame = [
    styles.card,
    variant === 'oscura' ? styles.shadowDark : styles.shadowSoft,
    { backgroundColor: look.background, shadowColor: colors.charcoal },
    look.border ? { borderWidth: 1, borderColor: look.border } : null,
  ];
  const devBadge = __DEV__ ? (
    <View pointerEvents="none" style={styles.devBadge}>
      <Text style={styles.devBadgeText}>{`Alto: ${cardH} dp`}</Text>
    </View>
  ) : null;

  if (view.kind === 'loading') {
    // Esqueleto con la misma forma y alto que la tarjeta con plan por cantidad (título, número, barra y leyenda), con el Skeleton de siempre.
    return (
      <View
        style={frame}
        onLayout={onCardLayout}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Cargando tu progreso mensual"
      >
        <Skeleton width="45%" height={SMALL} />
        <View style={styles.skeletonBody} importantForAccessibility="no-hide-descendants">
          <Skeleton width="30%" height={NUMBER_CLASSES} />
          <Skeleton width="100%" height={BAR_H} borderRadius={BAR_H / 2} />
          <Skeleton width="55%" height={SMALL} />
        </View>
        {devBadge}
      </View>
    );
  }

  if (view.kind === 'none' || !monthly) {
    // Sin plan: la tarjeta compacta de siempre ("—" y "Sin plan activo") en el estilo oscuro; no ocupa más alto que antes.
    return (
      <View style={[frame, styles.empty, { padding: SPACING.lg }]} onLayout={onCardLayout} accessible accessibilityLabel="Progreso mensual: sin plan activo">
        <View importantForAccessibility="no-hide-descendants">
          <Text style={[styles.small, size(SMALL), { color: look.muted }]} maxFontSizeMultiplier={MAX_MULT}>
            Progreso mensual
          </Text>
          <Text style={[styles.dash, size(26), { lineHeight: 26 * fs, color: look.number }]} maxFontSizeMultiplier={MAX_MULT}>
            —
          </Text>
        </View>
        <Text style={[styles.small, size(SMALL), { color: look.muted, flexShrink: 1, textAlign: 'right' }]} maxFontSizeMultiplier={MAX_MULT}>
          Sin plan activo
        </Text>
        {devBadge}
      </View>
    );
  }

  const label = monthlyProgressA11yLabel(view) ?? 'Progreso mensual';
  const reserved = monthly.topRightReserved ?? monthly.chipReserved;
  const unlimited = monthly.chip !== null;
  const bar = monthlyProgressBarValue(view);

  return (
    <View style={frame} onLayout={onCardLayout} accessible accessibilityLabel={label}>
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
        style={[styles.number, size(unlimited ? NUMBER_UNLIMITED : NUMBER_CLASSES), { color: look.number }]}
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
    </View>
  );
}

type Parameter0 = Parameters<typeof readLayout>[0];

/** El diseño anterior (tarjeta blanca), sin cambios, para poder volver con PROGRESS_VARIANT = 'actual'. */
function ActualCard({ view }: { view: PlanProgressView }) {
  const colors = useColors();
  const monthly = monthlyCardParts(view);
  const soft = {
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.charcoal,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  } as const;
  if (view.kind === 'loading') {
    return (
      <View style={[old.wideCard, soft, { backgroundColor: colors.card }]}>
        <Skeleton width="45%" height={FONT_SIZE.xs} />
        <View style={old.skeletonBottom}>
          <Skeleton width="30%" height={FONT_SIZE.display} />
          <Skeleton width="100%" height={7} />
          <Skeleton width="55%" height={FONT_SIZE.xs} />
        </View>
      </View>
    );
  }
  if (view.kind === 'none') {
    return (
      <View style={[old.emptyCard, soft, { backgroundColor: colors.card }]}>
        <View>
          <Text style={[old.label, { color: colors.creamMuted }]} maxFontSizeMultiplier={1.3}>
            Progreso mensual
          </Text>
          <Text style={[old.value, { color: colors.foreground }]} maxFontSizeMultiplier={1.3}>
            —
          </Text>
        </View>
        <Text style={[old.detail, { color: colors.creamMuted }]} maxFontSizeMultiplier={1.3}>
          Sin plan activo
        </Text>
      </View>
    );
  }
  if (!monthly) return null;
  return (
    <View style={[old.wideCard, soft, { backgroundColor: colors.card }]}>
      <View style={old.header}>
        <Text style={[old.label, { color: colors.creamMuted }]} maxFontSizeMultiplier={1.3}>
          Progreso mensual
        </Text>
        <View style={old.topEnd}>
          {monthly.chip ? (
            <View style={[old.chip, { backgroundColor: colors.accent }]}>
              <Text style={[old.chipText, { color: colors.accentForeground }]} maxFontSizeMultiplier={1.3}>
                {monthly.chip}
              </Text>
            </View>
          ) : null}
          {monthly.topRightReserved || monthly.chipReserved ? (
            <Text style={[old.detail, { color: colors.creamMuted }]} maxFontSizeMultiplier={1.3}>
              {monthly.topRightReserved ?? monthly.chipReserved}
            </Text>
          ) : null}
        </View>
      </View>
      <Text style={[old.value, { color: colors.foreground }]} maxFontSizeMultiplier={1.3}>
        {monthly.value}
        {monthly.totalSuffix ? <Text style={[old.total, { color: colors.creamMuted }]}>{monthly.totalSuffix}</Text> : null}
      </Text>
      {monthly.showBar ? (
        <View style={[old.track, { backgroundColor: colors.input, marginTop: SPACING.sm }]}>
          <View style={[old.fill, { backgroundColor: colors.navActive, width: `${monthly.ratio * 100}%` }]} />
        </View>
      ) : null}
      <Text style={[old.detail, { color: colors.creamMuted }]} maxFontSizeMultiplier={1.3}>
        {monthly.legend}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Mismo radio (20) que las tarjetas de próxima clase y de frases; sombra suave como las otras tarjetas oscuras.
  card: { borderRadius: RADIUS.xl, padding: PAD },
  shadowDark: { shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 2 },
  shadowSoft: { shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 1 },
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
  empty: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: SPACING.md },
  dash: { fontFamily: 'Inter_500Medium', marginTop: SPACING.sm },
  skeletonBody: { gap: SPACING.md, marginTop: SPACING.md },
  devBadge: { position: 'absolute', right: 6, bottom: 4, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  devBadgeText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'Inter_600SemiBold' },
});

// Estilos del diseño anterior, copiados tal cual de HomeView.tsx.
const old = StyleSheet.create({
  wideCard: { minHeight: 112, borderRadius: RADIUS.xl, padding: SPACING.lg },
  emptyCard: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', borderRadius: RADIUS.xl, padding: SPACING.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.md },
  topEnd: { alignItems: 'flex-end' },
  label: { fontSize: FONT_SIZE.xs, fontFamily: 'Inter_600SemiBold', marginTop: 0 },
  value: { fontSize: FONT_SIZE.display, lineHeight: 26, fontFamily: 'Anton_400Regular', marginTop: SPACING.sm2 },
  detail: { fontSize: FONT_SIZE.xs, lineHeight: 15, fontFamily: 'Inter_500Medium', marginTop: 3 },
  total: { fontSize: FONT_SIZE.base, fontFamily: 'Inter_600SemiBold' },
  chip: { alignSelf: 'flex-end', borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, marginTop: 0 },
  chipText: { fontSize: FONT_SIZE.xs, fontFamily: 'Inter_700Bold' },
  track: { height: 7, borderRadius: RADIUS.sm, overflow: 'hidden', marginTop: SPACING.xs },
  fill: { height: '100%', borderRadius: RADIUS.sm },
  skeletonBottom: { gap: SPACING.md, marginTop: SPACING.md },
});
