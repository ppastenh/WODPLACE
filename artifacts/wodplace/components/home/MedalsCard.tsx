import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { MedalBadge } from '@/components/MedalBadge';
import { useColors } from '@/hooks/useColors';
import { readLayout } from '@/components/home/layoutEvents';
import { LaurelWreath } from '@/components/home/LaurelWreath';
import {
  GLOW_OPACITY,
  LAUREL_OPACITY,
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
  LABEL_SIZE,
  LAST_ACHIEVEMENT_LABEL,
  MEDALS_TITLE,
  NO_DATA,
  MIN_FILL_PX,
  barFraction,
  counterSizes,
  isTrophy,
  medalIconColor,
  medalsA11yLabel,
  medalsView,
  nameFontSize,
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
 * y laurelGeometry.ts (corona de laurel; puro). Aquí solo se dibuja.
 *
 * variant 'cobre' (por defecto) = tarjeta de cobre en dos áreas ("Colección" a la izquierda, "Logro destacado" a la derecha); 'actual' = el diseño de siempre (solo desarrollo).
 * La tarjeta entera es UN botón (presionado SÓLIDO). Cinta, brillo, separador, corona, medalla y flecha son decorativos: ocultos a lectores de pantalla y sin tapar el toque.
 * ALTO ESTABLE: cargando, error, sin medallas y con medalla miden lo mismo (el nombre y la etiqueta van en casillas de alto fijo).
 */
export type MedalsVariant = 'actual' | 'cobre';
export type MedalsLook = { variant: MedalsVariant; gradient: MedalsGradient; laurel: boolean };

/** Valor por defecto: el diseño Copper Achievement con el degradado legible y la corona. Para volver al diseño anterior basta poner variant: 'actual'. */
export const MEDALS_LOOK: MedalsLook = { variant: 'cobre', gradient: 'legible', laurel: true };

const MAX_MULT = 1.3;
const LABEL_MAX_MULT = 1.1; // la etiqueta de 10 sp con letra espaciada no crece más que esto: con más no cabría en una línea
const TITLE = FONT_SIZE.sm + 1; // 13 sp
const MEDAL = 42; // diámetro de la medalla (dp)
const RIBBON = { w: 26, h: 38 };
const BAR_H = 5;
const PAD_V = 12;
const PAD_H = 14;
const RIGHT_W = 108;
const NAME_BASE = 13; // el tramo mayor del nombre: la casilla del nombre mide dos líneas de este tamaño en todos los estados
const COUNTER_BASE = 36; // el tramo mayor del contador: la casilla del contador mide una línea de este tamaño en todos los estados
const SLOT_H = 52; // casilla de la medalla: la corona se sale un poco, sin cambiar el alto
const NAME_LINES = 2;

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
          <CopperCard c={c} view={view} onOpenMedals={onOpenMedals} laurel={look.laurel} fs={fs} />
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
      <Svg width={RIBBON.w} height={RIBBON.h} viewBox="0 0 26 38">
        <Path d="M0 0 H26 V38 L13 30 L0 38 Z" fill={c.ribbon} />
      </Svg>
      {icon ? (
        <View style={styles.ribbonIcon}>
          <Feather name="award" size={14} color={c.medalIcon} />
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

/** Ícono real del logro (el mismo mapeo que MedalBadge: glifo de Feather, salvo "trophy", que es de MaterialCommunityIcons) y el color de podio si se distingue del relleno. */
function MedalGlyph({ icon, color, size }: { icon: string; color: string; size: number }) {
  return isTrophy(icon) ? (
    <MaterialCommunityIcons name="trophy" size={size} color={color} />
  ) : (
    <Feather name={icon as React.ComponentProps<typeof Feather>['name']} size={size} color={color} />
  );
}

/** Medalla circular de cobre profundo con borde fino de cobre claro y el ícono real; atenuada (contorno punteado, sin relleno) sin medallas, con error o cargando. */
function Medal({ c, view }: { c: MedalsColors; view: MedalsView }) {
  if (view.kind === 'loading') return <View style={[styles.medal, { backgroundColor: c.bone }]} />;
  const solid = view.kind === 'medals' || view.kind === 'unidentified';
  const icon = view.kind === 'medals' ? view.last.icon : GENERIC_ICON;
  const color = view.kind === 'medals' ? medalIconColor(getMedalIconColor(view.last.id), c.medalFill, c.medalIcon) : solid ? c.medalIcon : c.mutedIcon;
  return (
    <View
      style={[
        styles.medal,
        solid
          ? { backgroundColor: c.medalFill, borderColor: c.medalBorder }
          : { borderColor: c.medalBorder, borderStyle: 'dashed' },
      ]}
    >
      <MedalGlyph icon={icon} color={color} size={20} />
    </View>
  );
}

function CopperCard({ c, view, onOpenMedals, laurel, fs }: { c: MedalsColors; view: MedalsView; onOpenMedals: () => void; laurel: boolean; fs: number }) {
  const colors = useColors();
  const unlocked = view.kind === 'medals' || view.kind === 'unidentified' ? view.unlocked : 0;
  const total = view.kind === 'loading' || view.kind === 'error' ? 0 : view.total;
  const sizes = counterSizes(unlocked, total);
  const pct = barFraction(unlocked, total) * 100;
  const nameSize = view.kind === 'medals' ? nameFontSize(view.last.name) : 13;
  const nameLine = Math.round(nameSize * 1.15 * fs);
  const nameSlotH = Math.round(NAME_BASE * 1.15 * fs) * NAME_LINES;
  const counterSlotH = Math.round(COUNTER_BASE * 1.15 * fs);
  const laurelOpacity = view.kind === 'medals' || view.kind === 'unidentified' ? LAUREL_OPACITY : LAUREL_OPACITY_DIM;
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
                {view.kind === 'loading' ? (
                  <View style={[styles.counterRow, { minHeight: counterSlotH }]}>
                    <Bone c={c} width={72} height={Math.round(sizes.number * 0.7 * fs)} />
                  </View>
                ) : (
                  <View style={[styles.counterRow, { minHeight: counterSlotH }]}>
                    <Text style={[styles.counter, { fontSize: sizes.number * fs, lineHeight: Math.round(sizes.number * 1.15 * fs) }, text]} maxFontSizeMultiplier={MAX_MULT}>
                      {view.kind === 'error' ? NO_DATA : unlocked}
                      {view.kind === 'error' ? null : <Text style={{ fontSize: sizes.of * fs }}>{` de ${total}`}</Text>}
                    </Text>
                  </View>
                )}
                <View style={[styles.track, { backgroundColor: c.barTrack }]}>
                  {pct > 0 ? <View style={[styles.fill, { backgroundColor: c.barFill, width: `${pct}%`, minWidth: MIN_FILL_PX }]} /> : null}
                </View>
              </View>
              <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.separatorWrap}>
                <View style={[styles.separator, { backgroundColor: c.separator, opacity: SEPARATOR_OPACITY }]} />
              </View>
              {/* Lado derecho: Logro destacado */}
              <View style={styles.right}>
                <View style={styles.slot}>
                  {laurel ? <LaurelWreath size={MEDAL} color={c.laurel} opacity={view.kind === 'loading' ? 0.2 : laurelOpacity} /> : null}
                  <Medal c={c} view={view} />
                </View>
                <Text
                  style={[styles.label, { fontSize: LABEL_SIZE * Math.min(fs, LABEL_MAX_MULT), lineHeight: Math.round(LABEL_SIZE * 1.3 * Math.min(fs, LABEL_MAX_MULT)) }, text]}
                  maxFontSizeMultiplier={LABEL_MAX_MULT}
                >
                  {/* Sin una última identificable la etiqueta se omite, pero la línea conserva su alto (un espacio) para que la tarjeta no cambie de alto. */}
                  {view.kind === 'unidentified' ? ' ' : LAST_ACHIEVEMENT_LABEL}
                </Text>
                <View style={[styles.nameSlot, { minHeight: nameSlotH }]}>
                  {view.kind === 'loading' ? (
                    <Bone c={c} width={70} height={12} round />
                  ) : view.kind === 'medals' ? (
                    <Text style={[styles.name, { fontSize: nameSize * fs, lineHeight: nameLine }, text]} maxFontSizeMultiplier={MAX_MULT}>
                      {view.last.name}
                    </Text>
                  ) : view.kind === 'empty' ? (
                    <Text style={[styles.name, { fontSize: 12 * fs, lineHeight: Math.round(12 * 1.15 * fs) }, text]} maxFontSizeMultiplier={MAX_MULT}>
                      {FIRST_MEDAL_HINT}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
            <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.arrow}>
              <Feather name="chevron-right" size={18} color={c.text} />
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
  left: { flex: 1, paddingRight: SPACING.md },
  ribbon: { position: 'absolute', top: -PAD_V, left: 0 },
  ribbonIcon: { position: 'absolute', top: 10, left: 0, right: 0, alignItems: 'center' },
  titleRow: { marginLeft: RIBBON.w + SPACING.sm2, minHeight: RIBBON.h - PAD_V + 2, justifyContent: 'center' },
  title: { fontFamily: 'Inter_500Medium' },
  counter: { fontFamily: 'Anton_400Regular', includeFontPadding: false },
  counterRow: { justifyContent: 'center', marginTop: 2 },
  track: { height: BAR_H, borderRadius: BAR_H / 2, overflow: 'hidden', marginTop: SPACING.sm },
  fill: { height: BAR_H, borderRadius: BAR_H / 2 },
  separatorWrap: { width: 1, paddingVertical: SPACING.sm },
  separator: { flex: 1, width: 1 },
  right: { width: RIGHT_W, alignItems: 'center', paddingLeft: SPACING.sm },
  slot: { width: MEDAL, height: SLOT_H, alignItems: 'center', justifyContent: 'center' },
  medal: { width: MEDAL, height: MEDAL, borderRadius: MEDAL / 2, borderWidth: 1.2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, textAlign: 'center', marginTop: 2 },
  nameSlot: { alignItems: 'center', justifyContent: 'flex-start', marginTop: 2 },
  name: { fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  arrow: { position: 'absolute', top: 10, right: 8 },
  debug: { color: '#B42318', fontSize: 10, fontFamily: 'Inter_600SemiBold', marginTop: 4 },
  // Solo desarrollo
  devBadge: { position: 'absolute', right: 6, bottom: 4, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  devBadgeText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'Inter_600SemiBold' },
});
