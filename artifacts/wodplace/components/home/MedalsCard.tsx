import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { MedalBadge } from '@/components/MedalBadge';
import { useColors } from '@/hooks/useColors';
import { readLayout } from '@/components/home/layoutEvents';
import { AchievementShowcase } from '@/components/home/AchievementShowcase';
import { ArrowBadge } from '@/components/home/ArrowBadge';
import { ARROW_BADGE_SMALL } from '@/components/home/arrowBadgeSpec';
import { DEFAULT_SCALE } from '@/components/home/achievementShowcaseLayout';
import {
  GLOW_OPACITY,
  LAUREL_OPACITY_DIM,
  SEPARATOR_OPACITY,
  medalsColors,
  medalsMeasure,
  type MedalsColors,
  type MedalsGradient,
} from '@/components/home/medalsColors';
import {
  FIRST_MEDAL_HINT,
  GENERIC_ICON,
  MEDALS_TITLE,
  NO_DATA,
  MIN_FILL_PX,
  barFraction,
  counterSizes,
  medalsA11yLabel,
  medalsView,
  type MedalsStatus,
  type MedalsSummary,
  type MedalsView,
} from '@/components/home/medalsModel';
import { getMedalIconColor } from '@/lib/medalColors';
import { FONT_SIZE } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

/**
 * TARJETA "MEDALLAS" de Inicio (decisión (y) de DECISIONES-DISENO.md, Copper Achievement). Antes vivía dentro de HomeView; se movió aquí SIN cambiar su lógica, sus datos ni su toque:
 * HomeView entrega el resumen (medalsSummary: N desbloqueadas, M totales y la lista de las últimas por fecha de desbloqueo; la primera es "la última"), el estado de la consulta
 * (el mismo de la racha) y onOpenMedals (toca → pantalla Medallas). Qué decide qué: medalsModel.ts (estados, textos, barra y tramos; puro), medalsColors.ts (colores y contraste; puro)
 * y achievementShowcaseLayout.ts (laurel, medalla y nombre; puro). Aquí solo se dibuja.
 *
 * variant 'cobre' (por defecto) = tarjeta de cobre en dos áreas ("Colección" a la izquierda, "Logro destacado" a la derecha); 'actual' = el diseño de siempre (solo desarrollo).
 * La tarjeta entera es UN botón (presionado SÓLIDO). Cinta, brillo, separador, corona, medalla y flecha son decorativos: ocultos a lectores de pantalla y sin tapar el toque.
 * ALTO ESTABLE: cargando, error, sin medallas y con medalla miden lo mismo (el nombre y la etiqueta van en casillas de alto fijo).
 */
export type MedalsVariant = 'actual' | 'cobre';
/** laurelScale: escala del bloque derecho (laurel + medalla): 1, 0,95 (por defecto), 0,9 o 0,85. */
export type MedalsLook = { variant: MedalsVariant; gradient: MedalsGradient; laurelScale: number };

/** Valor por defecto: el diseño Copper Achievement con el degradado legible y el bloque derecho al 95 %. Para volver al diseño anterior basta poner variant: 'actual'. */
export const MEDALS_LOOK: MedalsLook = { variant: 'cobre', gradient: 'legible', laurelScale: DEFAULT_SCALE };

const MAX_MULT = 1.3;
const TITLE = FONT_SIZE.sm + 1; // 13 sp
// Cinta: 30 x 46 dp en total, con 12 dp ocultos sobre el borde superior de la tarjeta (se ven 34 dp de alto, con la muesca abajo); ícono de 18 dp.
const RIBBON = { w: 30, h: 46 };
const RIBBON_ICON = 18;
const BAR_H = 7;
const PAD_V = 12;
const PAD_H = 14;
const RIGHT_W = 120; // mitad derecha: el nombre del logro dispone de RIGHT_W menos el relleno izquierdo
const RIGHT_PAD = 8;
const COUNTER_BASE = 36; // el tramo mayor del contador: la casilla del contador mide una línea de este tamaño en todos los estados

type Props = {
  summary: MedalsSummary;
  /** Estado de la consulta de logros (el mismo de la racha). Si no llega, 'ready'. */
  status?: MedalsStatus;
  onOpenMedals: () => void;
  look?: MedalsLook;
  /** Solo la pantalla de desarrollo: simula la letra del sistema (el tope de 1,3 también se aplica). */
  fontScale?: number;
  /** Solo la pantalla de desarrollo: simula un ancho de pantalla (320, 360, 412 dp). */
  screenWidth?: number;
};

type Parameter0 = Parameters<typeof readLayout>[0];

const r2 = (n: number) => (Math.round(n * 100) / 100).toString().replace('.', ',');

export function MedalsCard({ summary, status, onOpenMedals, look = MEDALS_LOOK, fontScale, screenWidth }: Props) {
  const colors = useColors();
  const view = medalsView(summary, status);
  const fs = Math.min(fontScale ?? 1, MAX_MULT);
  // Alto medido (solo desarrollo). El evento se lee de forma SINCRÓNICA (readLayout) y solo después se usa setState.
  const [boxH, setBoxH] = useState(0);
  const onLayout = __DEV__
    ? (e: Parameter0) => {
        const m = readLayout(e);
        if (!m) return;
        const height = Math.round(m.height);
        setBoxH(height);
      }
    : undefined;
  // Ancho simulado: el contenido de Inicio mide el ancho de la pantalla menos 20 dp de cada lado.
  const wrapStyle = __DEV__ && screenWidth ? { width: screenWidth - 2 * SPACING.xxl, alignSelf: 'center' as const } : undefined;
  const devBadge = __DEV__ ? (
    <View pointerEvents="none" style={styles.devBadge}>
      <Text style={styles.devBadgeText}>{`Alto: ${boxH} dp`}</Text>
    </View>
  ) : null;
  // Línea de depuración (solo desarrollo, solo con el degradado "como lo pedí"): marca lo que NO pasa el contraste. En Inicio real nunca se dibuja.
  const c = medalsColors(colors, look.gradient);
  const debugLine = __DEV__ && look.variant === 'cobre' && look.gradient === 'pedido' ? <DebugLine c={c} /> : null;

  return (
    <View style={[styles.outer, wrapStyle]}>
      <View onLayout={onLayout}>
        {look.variant === 'actual' ? (
          <ActualCard view={view} summary={summary} onOpenMedals={onOpenMedals} />
        ) : (
          <CopperCard c={c} view={view} onOpenMedals={onOpenMedals} scale={look.laurelScale} fs={fs} />
        )}
        {devBadge}
      </View>
      {debugLine}
    </View>
  );
}

/* ───────────── Diseño ACTUAL (movido tal cual desde HomeView; solo desarrollo) ───────────── */

function ActualCard({ view, summary, onOpenMedals }: { view: MedalsView; summary: MedalsSummary; onOpenMedals: () => void }) {
  const colors = useColors();
  const soft = {
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.charcoal,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  } as const;
  const first = summary.recent[0];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ver medallas"
      onPress={onOpenMedals}
      style={({ pressed }) => [actual.card, soft, { backgroundColor: pressed ? colors.cardPressed : colors.card }]}
    >
      <View style={actual.left}>
        <View style={actual.header}>
          <View style={[actual.iconBadge, { backgroundColor: colors.accent }]}>
            <Feather name="award" size={17} color={colors.accentForeground} />
          </View>
        </View>
        <Text style={[actual.label, { color: colors.creamMuted }]} maxFontSizeMultiplier={MAX_MULT}>
          {MEDALS_TITLE}
        </Text>
        <Text style={[actual.value, { color: colors.foreground }]} maxFontSizeMultiplier={MAX_MULT}>
          {summary.totalUnlocked} de {summary.totalAchievements}
        </Text>
        <View style={[actual.track, { backgroundColor: colors.input, marginTop: 6 }]}>
          <View
            style={[
              actual.fill,
              {
                backgroundColor: colors.navActive,
                width: `${summary.totalAchievements > 0 ? (summary.totalUnlocked / summary.totalAchievements) * 100 : 0}%`,
              },
            ]}
          />
        </View>
      </View>
      <View style={actual.right}>
        {first && view.kind !== 'empty' ? (
          <>
            <MedalBadge icon={first.icon} unlocked size={40} showRibbon={false} iconColor={getMedalIconColor(first.id)} />
            <Text style={[actual.recentName, { color: colors.creamMuted }]} numberOfLines={2} maxFontSizeMultiplier={MAX_MULT}>
              {first.name}
            </Text>
          </>
        ) : (
          <Text style={[actual.detail, { color: colors.creamMuted }]} maxFontSizeMultiplier={MAX_MULT}>
            {FIRST_MEDAL_HINT}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

/* ───────────── Piezas del diseño Copper Achievement ───────────── */

/** Cinta vertical de grafito con muesca inferior (silueta dibujada con react-native-svg) y, si se pide, el ícono de medalla. Decorativa. */
function Ribbon({ c, icon }: { c: MedalsColors; icon: boolean }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.ribbon, { width: RIBBON.w, height: RIBBON.h }]}
    >
      <Svg width={RIBBON.w} height={RIBBON.h} viewBox="0 0 30 46">
        <Path d="M0 0 H30 V46 L15 37 L0 46 Z" fill={c.ribbon} />
      </Svg>
      {icon ? (
        <View style={styles.ribbonIcon}>
          <Feather name="award" size={RIBBON_ICON} color={c.ribbonIcon} />
        </View>
      ) : null}
    </View>
  );
}

/** Brillo difuso muy tenue de cobre claro en la esquina superior izquierda (sin imágenes ni patrones). Decorativo. */
function Glow({ c }: { c: MedalsColors }) {
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="medals-glow" cx="12%" cy="0%" rx="55%" ry="120%" fx="12%" fy="0%" gradientUnits="objectBoundingBox">
            <Stop offset="0" stopColor={c.glow} stopOpacity={GLOW_OPACITY} />
            <Stop offset="1" stopColor={c.glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#medals-glow)" />
      </Svg>
    </View>
  );
}

function Bone({ c, width, height, round }: { c: MedalsColors; width: number | `${number}%`; height: number; round?: boolean }) {
  return <View style={{ width, height, borderRadius: round ? height / 2 : 6, backgroundColor: c.bone }} />;
}

function CopperCard({ c, view, onOpenMedals, scale, fs }: { c: MedalsColors; view: MedalsView; onOpenMedals: () => void; scale: number; fs: number }) {
  const colors = useColors();
  const unlocked = view.kind === 'medals' || view.kind === 'unidentified' ? view.unlocked : 0;
  const total = view.kind === 'loading' || view.kind === 'error' ? 0 : view.total;
  const sizes = counterSizes(unlocked, total);
  const pct = barFraction(unlocked, total) * 100;
  const counterSlotH = Math.round(COUNTER_BASE * 1.15 * fs);
  const text = { color: c.text };

  return (
    <View style={[styles.shadow, { shadowColor: colors.charcoal, backgroundColor: c.gradientStart }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={medalsA11yLabel(view)}
        onPress={onOpenMedals}
        style={({ pressed }) => [styles.card, { backgroundColor: pressed ? c.pressed : c.gradientStart, borderColor: c.border }]}
      >
        {({ pressed }) => (
          <>
            {pressed ? null : (
              <LinearGradient
                pointerEvents="none"
                colors={[c.gradientStart, c.gradientEnd]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            {pressed ? null : <Glow c={c} />}
            <View style={styles.row} importantForAccessibility="no-hide-descendants">
              {/* Lado izquierdo: Colección */}
              <View style={styles.left}>
                <Ribbon c={c} icon={view.kind !== 'loading'} />
                <View style={styles.titleRow}>
                  <Text style={[styles.title, sizeOf(TITLE, fs), text]} maxFontSizeMultiplier={MAX_MULT}>
                    {MEDALS_TITLE}
                  </Text>
                </View>
                <View>
                {view.kind === 'loading' ? (
                  <View style={[styles.counterRow, { height: counterSlotH }]}>
                    <Bone c={c} width={72} height={Math.round(sizes.number * 0.7 * fs)} />
                  </View>
                ) : (
                  <View style={[styles.counterRow, { height: counterSlotH }]}>
                    <Text style={[styles.counter, { fontSize: sizes.number * fs, lineHeight: Math.round(sizes.number * 1.15 * fs) }, text]} maxFontSizeMultiplier={MAX_MULT}>
                      {view.kind === 'error' ? NO_DATA : unlocked}
                      {view.kind === 'error' ? null : <Text style={{ fontSize: sizes.of * fs, lineHeight: Math.round(sizes.number * 1.15 * fs) }}>{` de ${total}`}</Text>}
                    </Text>
                  </View>
                )}
                <View style={[styles.track, { backgroundColor: c.barTrack }]}>
                  {pct > 0 ? <View style={[styles.fill, { backgroundColor: c.barFill, width: `${pct}%`, minWidth: MIN_FILL_PX }]} /> : null}
                </View>
                </View>
              </View>
              <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.separatorWrap}>
                <View style={[styles.separator, { backgroundColor: c.separator, opacity: SEPARATOR_OPACITY }]} />
              </View>
              {/* Lado derecho: Logro destacado */}
              <View style={styles.right}>
                <AchievementShowcase
                  icon={view.kind === 'medals' ? view.last.icon : GENERIC_ICON}
                  name={view.kind === 'medals' ? view.last.name : view.kind === 'empty' ? FIRST_MEDAL_HINT : undefined}
                  scale={scale}
                  fontScale={fs}
                  textWidth={RIGHT_W - RIGHT_PAD}
                  laurelOpacity={view.kind === 'medals' || view.kind === 'unidentified' ? undefined : LAUREL_OPACITY_DIM}
                  muted={view.kind === 'empty' || view.kind === 'error'}
                  mutedIconColor={c.mutedIcon}
                  skeletonColor={view.kind === 'loading' ? c.bone : undefined}
                />
              </View>
            </View>
            <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.arrow}>
              <ArrowBadge size={ARROW_BADGE_SMALL} borderColor={c.arrowBorder} backgroundColor={c.arrowFill} arrowColor={c.text} />
            </View>
          </>
        )}
      </Pressable>
    </View>
  );
}

const sizeOf = (n: number, fs: number) => ({ fontSize: n * fs, lineHeight: Math.round(n * 1.2 * fs) });

/** Línea de depuración (solo desarrollo): el contraste medido del degradado "como lo pedí", con ✗ donde no pasa el mínimo. */
function DebugLine({ c }: { c: MedalsColors }) {
  const m = medalsMeasure(c);
  const item = (name: string, v: number, min: number) => `${name} ${r2(v)}${v >= min ? ' ✓' : ' ✗'}`;
  return (
    <Text style={styles.debug}>
      {`Degradado "como lo pedí": ${item('título', m.titleWorst, 4.5)} · ${item('contador', m.counterWorst, 3)} · ${item('etiqueta/nombre', m.rightText, 4.5)} · ${item('barra/tarjeta', m.barFillVsCard, 3)}`}
    </Text>
  );
}

/* Estilos del diseño ACTUAL (copia de los de HomeView, que ya no los necesita). */
const actual = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.xl, padding: SPACING.lg },
  left: { flex: 1 },
  right: { alignItems: 'center', gap: SPACING.sm, width: 72 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 },
  iconBadge: { width: 32, height: 32, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: FONT_SIZE.xs, fontFamily: 'Inter_600SemiBold', marginTop: SPACING.lg },
  value: { fontSize: FONT_SIZE.display, lineHeight: 26, fontFamily: 'Anton_400Regular', marginTop: SPACING.sm2 },
  detail: { fontSize: FONT_SIZE.xs, lineHeight: 15, fontFamily: 'Inter_500Medium', marginTop: 3 },
  recentName: { fontSize: FONT_SIZE.xs, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  track: { height: 7, borderRadius: RADIUS.sm, overflow: 'hidden', marginTop: SPACING.xs },
  fill: { height: '100%', borderRadius: RADIUS.sm },
});

const styles = StyleSheet.create({
  outer: { marginTop: 12 },
  shadow: {
    borderRadius: RADIUS.xl,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  card: { borderRadius: RADIUS.xl, borderWidth: 1, overflow: 'hidden', paddingVertical: PAD_V, paddingHorizontal: PAD_H },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  left: { flex: 1, paddingRight: SPACING.md, justifyContent: 'space-between' },
  ribbon: { position: 'absolute', top: -PAD_V, left: 0 },
  ribbonIcon: { position: 'absolute', top: PAD_V + 4, left: 0, right: 0, alignItems: 'center' },
  // El título queda a la altura del ícono de la cinta; el contador empieza debajo de las puntas de la cinta (34 dp desde el borde superior de la columna).
  titleRow: { marginLeft: RIBBON.w + SPACING.sm2, minHeight: 26, justifyContent: 'center', marginBottom: SPACING.sm },
  title: { fontFamily: 'Inter_500Medium' },
  counter: { fontFamily: 'Anton_400Regular', includeFontPadding: false },
  counterRow: { justifyContent: 'center', marginTop: 2 },
  track: { height: BAR_H, borderRadius: BAR_H / 2, overflow: 'hidden', marginTop: SPACING.sm },
  fill: { height: BAR_H, borderRadius: BAR_H / 2 },
  separatorWrap: { width: 1, paddingVertical: SPACING.sm },
  separator: { flex: 1, width: 1 },
  right: { width: RIGHT_W, alignItems: 'center', justifyContent: 'center', paddingLeft: RIGHT_PAD },
  arrow: { position: 'absolute', top: 10, right: 8 },
  debug: { color: '#B42318', fontSize: 10, fontFamily: 'Inter_600SemiBold', marginTop: 4 },
  // Solo desarrollo
  devBadge: { position: 'absolute', right: 6, bottom: 4, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  devBadgeText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'Inter_600SemiBold' },
});
