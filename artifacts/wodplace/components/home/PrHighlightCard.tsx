import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Ellipse, G, Path, Pattern, Rect } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import { readLayout } from '@/components/home/layoutEvents';
import { prColors, TEXTURE_OPACITY, type PrColors, type PrVariant } from '@/components/home/prHighlightColors';
import {
  PR_A11Y_LABEL,
  PR_EMPTY_HINT,
  PR_EMPTY_TITLE,
  PR_A11Y_NO_DATA,
  PR_LABEL,
  PR_NO_DATA,
  prNameFontSize,
  prValueText,
  prView,
  type PrStatus,
  type PrView,
} from '@/components/home/prHighlightModel';
import { FONT_SIZE } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

/**
 * TARJETA "PR DESTACADO" de Inicio (decisión (x) de DECISIONES-DISENO.md). Antes vivía dentro de HomeView; se movió aquí SIN cambiar su lógica, sus datos ni su toque:
 * HomeView entrega la marca de hoy (rotatingFeaturedPr, la rotación diaria la sigue haciendo app/home.tsx), el estado de la consulta (prStatus) y onOpenRm (toca → RM).
 * Qué decide qué: prHighlightModel.ts (estados, textos y tramos del nombre, puro) y prHighlightColors.ts (colores y contraste, puro). Aquí solo se dibuja.
 *
 * variant 'champion' (por defecto) = grafito con insignia hexagonal y barra olímpica; 'actual' = el diseño de siempre (solo desarrollo); 'clara' = para comparar (solo desarrollo).
 * La tarjeta entera es UN botón (etiqueta "Ver progreso y PRs", presionado SÓLIDO; con error de la consulta sigue tocable hacia RM, que carga sus propias marcas, y su frase es "PR destacado: sin datos"); insignia, textura, acento y flecha son decorativos: ocultos a lectores de pantalla y sin tapar el toque.
 */
export type PrBadgeShape = 'hexagono' | 'escudo';
export type PrLook = { variant: PrVariant; laurels: boolean; badge: PrBadgeShape };

/** Valor por defecto: el concepto PR Champion, sin laureles y con hexágono. Para volver al diseño anterior basta poner variant: 'actual'. */
export const PR_LOOK: PrLook = { variant: 'champion', laurels: false, badge: 'hexagono' };

const MAX_MULT = 1.3;
const LABEL = FONT_SIZE.sm; // 12 sp (mínimo de Inicio: 11)
const CAPSULE_TEXT = 13;
const EMPTY_TITLE = 22;
const PAD = 16;
const HEX = { w: 44, h: 48 };
const HEX_PATH = 'M22 2 L40.5 12.5 V35.5 L22 46 L3.5 35.5 V12.5 Z';
const SHIELD_PATH = 'M17 2 L31 7 V19 C31 28 25 34 17 36.5 C9 34 3 28 3 19 V7 Z';
// Barra olímpica: barra horizontal con dos discos a cada lado, trazo uniforme y extremos redondeados (centrada en 22,24).
const BAR_PATH = 'M10 24 H34 M14 16 V32 M30 16 V32 M10 20 V28 M34 20 V28';
// Laureles pequeños (solo desarrollo): hojas a los lados del hexágono.
const LEAVES: { x: number; y: number; r: number }[] = [
  { x: -1, y: 36, r: 25 },
  { x: -3, y: 29, r: 10 },
  { x: -3, y: 22, r: -5 },
  { x: -2, y: 15, r: -20 },
];

type Props = {
  pr: { liftName: string; weightKg: number } | null;
  /** Estado de la consulta de las marcas. Si no llega, 'ready' (null = sin marcas, como hasta ahora). */
  prStatus?: PrStatus;
  onOpenRm: () => void;
  look?: PrLook;
  /** Solo la pantalla de desarrollo: simula la letra del sistema (el tope de 1,3 también se aplica). */
  fontScale?: number;
  /** Solo la pantalla de desarrollo: simula un ancho de pantalla (320, 360, 412 dp). */
  screenWidth?: number;
};

type Parameter0 = Parameters<typeof readLayout>[0];

const sizeOf = (n: number, fs: number, line = 1.2) => ({ fontSize: n * fs, lineHeight: Math.round(n * line * fs) });

export function PrHighlightCard({ pr, prStatus, onOpenRm, look = PR_LOOK, fontScale, screenWidth }: Props) {
  const colors = useColors();
  const view = prView(pr, prStatus);
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

  return (
    <View onLayout={onLayout} style={wrapStyle}>
      {look.variant === 'actual' ? (
        <ActualCard pr={pr} onOpenRm={onOpenRm} />
      ) : (
        <ChampionCard
          c={prColors(colors, look.variant)}
          clara={look.variant === 'clara'}
          view={view}
          onOpenRm={onOpenRm}
          look={look}
          fs={fs}
        />
      )}
      {devBadge}
    </View>
  );
}

/* ───────────── Diseño ACTUAL (movido tal cual desde HomeView; solo desarrollo) ───────────── */

function ActualCard({ pr, onOpenRm }: { pr: { liftName: string; weightKg: number } | null; onOpenRm: () => void }) {
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={PR_A11Y_LABEL}
      onPress={onOpenRm}
      style={({ pressed }) => [
        actual.wideCard,
        soft,
        { backgroundColor: pressed ? colors.successBackgroundPressed : colors.successBackground },
      ]}
    >
      <View style={actual.smallCardHeader}>
        <View style={[actual.iconBadge, { backgroundColor: colors.card }]}>
          <MaterialCommunityIcons name="trophy-outline" size={18} color={colors.success} />
        </View>
        <Feather name="chevron-right" size={18} color={colors.creamMuted} />
      </View>
      <Text style={[actual.smallCardLabel, { color: colors.creamMuted }]} maxFontSizeMultiplier={MAX_MULT}>
        {PR_LABEL}
      </Text>
      {pr ? (
        <>
          <Text style={[actual.statsValue, { color: colors.foreground }]} numberOfLines={2} maxFontSizeMultiplier={MAX_MULT}>
            {pr.liftName}
          </Text>
          <Text style={[actual.statsDetail, { color: colors.creamMuted }]} maxFontSizeMultiplier={MAX_MULT}>
            {prValueText(pr.weightKg)}
          </Text>
        </>
      ) : (
        <>
          <Text style={[actual.prEmptyValue, { color: colors.foreground }]} maxFontSizeMultiplier={MAX_MULT}>
            {PR_EMPTY_TITLE}
          </Text>
          <Text style={[actual.statsDetail, { color: colors.creamMuted }]} maxFontSizeMultiplier={MAX_MULT}>
            {PR_EMPTY_HINT}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/* ───────────── Piezas del concepto PR Champion ───────────── */

/** Barra olímpica: trazo uniforme con extremos redondeados. */
function BarbellPath({ color, width = 2.2 }: { color: string; width?: number }) {
  return <Path d={BAR_PATH} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill="none" />;
}

/** Insignia: hexágono deportivo (o escudo, solo desarrollo) con la barra olímpica dentro. Decorativa: oculta a lectores de pantalla y sin tapar toques. */
function Badge({ c, shape, laurels, dim, dashed }: { c: PrColors; shape: PrBadgeShape; laurels: boolean; dim: boolean; dashed: boolean }) {
  const border = dim ? c.muted : c.badgeBorder;
  const icon = dim ? c.muted : c.icon;
  const w = laurels ? HEX.w + 12 : HEX.w;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: w, height: HEX.h }}
    >
      <Svg width={w} height={HEX.h} viewBox={laurels ? `-6 0 ${HEX.w + 12} ${HEX.h}` : `0 0 ${HEX.w} ${HEX.h}`}>
        {shape === 'hexagono' ? (
          <Path d={HEX_PATH} fill={c.badgeFill} stroke={border} strokeWidth={1.5} strokeLinejoin="round" strokeDasharray={dashed ? '3 3' : undefined} />
        ) : (
          <G transform="scale(1.294 1.263)">
            <Path d={SHIELD_PATH} fill={c.badgeFill} stroke={border} strokeWidth={1.2} strokeLinejoin="round" strokeDasharray={dashed ? '3 3' : undefined} />
          </G>
        )}
        <BarbellPath color={icon} />
        {laurels
          ? LEAVES.flatMap((l, i) => [
              <Ellipse key={`l${i}`} cx={l.x} cy={l.y} rx={1.6} ry={3.6} fill={border} transform={`rotate(${l.r} ${l.x} ${l.y})`} />,
              <Ellipse key={`r${i}`} cx={HEX.w - l.x} cy={l.y} rx={1.6} ry={3.6} fill={border} transform={`rotate(${-l.r} ${HEX.w - l.x} ${l.y})`} />,
            ])
          : null}
      </Svg>
    </View>
  );
}

/** Textura casi imperceptible (rombos de moleteado) en el extremo derecho y acento diagonal de cobre en la esquina inferior derecha. Decorativos. */
function Decor({ c, clara }: { c: PrColors; clara: boolean }) {
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      {clara ? null : (
        <View style={styles.texture}>
          <Svg width="100%" height="100%">
            <Defs>
              <Pattern id="pr-rombos" width={12} height={12} patternUnits="userSpaceOnUse">
                <Path d="M0 12 L12 0 M0 0 L12 12" stroke={c.texture} strokeWidth={1} strokeOpacity={TEXTURE_OPACITY} />
              </Pattern>
            </Defs>
            <Rect x={0} y={0} width="100%" height="100%" fill="url(#pr-rombos)" />
          </Svg>
        </View>
      )}
      <View style={styles.accent}>
        <Svg width={48} height={48} viewBox="0 0 48 48">
          <Path d="M48 10 L48 18 L18 48 L10 48 Z" fill={c.accent} />
          <Path d="M48 24 L48 28 L28 48 L24 48 Z" fill={c.accent} />
        </Svg>
      </View>
    </View>
  );
}

function Bone({ c, width, height }: { c: PrColors; width: number | `${number}%`; height: number }) {
  return <View style={[styles.bone, { width, height, backgroundColor: c.bone }]} />;
}

function ChampionCard({
  c,
  clara,
  view,
  onOpenRm,
  look,
  fs,
}: {
  c: PrColors;
  clara: boolean;
  view: PrView;
  onOpenRm: () => void;
  look: PrLook;
  fs: number;
}) {
  const colors = useColors();
  const label = [styles.label, sizeOf(LABEL, fs), { color: c.label }];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={view.kind === 'error' ? PR_A11Y_NO_DATA : PR_A11Y_LABEL}
      accessibilityHint={view.kind === 'error' ? PR_A11Y_LABEL : undefined}
      onPress={onOpenRm}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? c.pressed : c.background },
        clara && { borderWidth: 1, borderColor: c.border, shadowColor: colors.charcoal, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
      ]}
    >
      {({ pressed }) => (
        <>
          {clara || pressed ? null : (
            <LinearGradient
              pointerEvents="none"
              colors={[c.background, c.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          <Decor c={c} clara={clara} />
          <View style={styles.row}>
            <Badge c={c} shape={look.badge} laurels={look.laurels} dim={view.kind !== 'pr'} dashed={view.kind === 'empty'} />
            <View style={styles.body} importantForAccessibility="no-hide-descendants">
              <Text style={label} maxFontSizeMultiplier={MAX_MULT}>
                {PR_LABEL}
              </Text>
              {view.kind === 'pr' ? (
                <>
                  <Text
                    style={[styles.name, { color: c.primary, fontSize: prNameFontSize(view.name) * fs, lineHeight: Math.round(prNameFontSize(view.name) * 1.15 * fs) }]}
                    maxFontSizeMultiplier={MAX_MULT}
                  >
                    {view.name}
                  </Text>
                  <View style={[styles.capsule, { backgroundColor: c.capsuleFill, borderColor: c.capsuleBorder }]}>
                    <Svg width={16} height={12} viewBox="9 14 26 20">
                      <BarbellPath color={c.capsuleText} width={3} />
                    </Svg>
                    <Text style={[styles.capsuleText, sizeOf(CAPSULE_TEXT, fs), { color: c.capsuleText }]} maxFontSizeMultiplier={MAX_MULT}>
                      {prValueText(view.weightKg)}
                    </Text>
                  </View>
                </>
              ) : view.kind === 'error' ? (
                <Text style={[styles.name, sizeOf(EMPTY_TITLE, fs, 1.15), { color: c.primary }]} maxFontSizeMultiplier={MAX_MULT}>
                  {PR_NO_DATA}
                </Text>
              ) : view.kind === 'empty' ? (
                <>
                  <Text style={[styles.name, sizeOf(EMPTY_TITLE, fs, 1.15), { color: c.primary }]} maxFontSizeMultiplier={MAX_MULT}>
                    {PR_EMPTY_TITLE}
                  </Text>
                  <View style={[styles.capsule, styles.capsuleDashed, { borderColor: c.muted }]}>
                    <Text style={[styles.capsuleText, sizeOf(LABEL, fs), { color: c.muted }]} maxFontSizeMultiplier={MAX_MULT}>
                      {PR_EMPTY_HINT}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <Bone c={c} width="55%" height={22} />
                  <Bone c={c} width={96} height={24} />
                </>
              )}
            </View>
            <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.chevron}>
              <Feather name="chevron-right" size={18} color={c.primary} />
            </View>
          </View>
        </>
      )}
    </Pressable>
  );
}

/* Estilos del diseño ACTUAL (copia de los de HomeView; los de HomeView siguen sirviendo a las otras tarjetas). */
const actual = StyleSheet.create({
  wideCard: { minHeight: 112, borderRadius: RADIUS.xl, padding: SPACING.lg },
  statsValue: { fontSize: FONT_SIZE.display, lineHeight: 26, fontFamily: 'Anton_400Regular', marginTop: SPACING.sm2 },
  statsDetail: { fontSize: FONT_SIZE.xs, lineHeight: 15, fontFamily: 'Inter_500Medium', marginTop: 3 },
  prEmptyValue: { fontSize: FONT_SIZE.sm, lineHeight: 16, fontFamily: 'Inter_700Bold', marginTop: SPACING.sm2 },
  smallCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 },
  iconBadge: { width: 32, height: 32, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  smallCardLabel: { fontSize: FONT_SIZE.xs, fontFamily: 'Inter_600SemiBold', marginTop: SPACING.lg },
});

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.xl, padding: PAD, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  body: { flex: 1, gap: SPACING.xs2, alignItems: 'flex-start' },
  label: { fontFamily: 'Inter_500Medium' },
  name: { fontFamily: 'Anton_400Regular', includeFontPadding: false },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs2,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.sm2,
    paddingVertical: 3,
    marginTop: 2,
  },
  capsuleDashed: { borderStyle: 'dashed' },
  capsuleText: { fontFamily: 'Inter_700Bold' },
  chevron: { alignSelf: 'flex-start' },
  bone: { borderRadius: 6 },
  texture: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '42%' },
  accent: { position: 'absolute', right: 0, bottom: 0, width: 48, height: 48 },
  // Solo desarrollo
  devBadge: { position: 'absolute', right: 6, bottom: 4, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  devBadgeText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'Inter_600SemiBold' },
});
