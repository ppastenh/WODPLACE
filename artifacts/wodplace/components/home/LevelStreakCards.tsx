import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import { readLayout } from '@/components/home/layoutEvents';
import { levelStreakColors, type LevelStreakColors, type Tone } from '@/components/home/levelStreakColors';
import {
  LEVEL_DETAIL,
  STREAK_DOTS,
  levelA11yLabel,
  levelText,
  levelView,
  rankFontSize,
  streakA11yLabel,
  streakSuffix,
  streakView,
  type LevelView,
  type StreakView,
} from '@/components/home/levelStreakModel';
import { FONT_SIZE } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

/**
 * RECUADROS "TU NIVEL" Y "RACHA DE CONSTANCIA" de Inicio (decisión (w) de DECISIONES-DISENO.md, en evaluación). Antes vivían dentro de HomeView; se movieron aquí SIN cambiar su
 * lógica ni sus datos: HomeView entrega el rango (user.rank), el número de días seguidos (achievementStats) y el toque de "Tu nivel" (onOpenProfile → Datos personales).
 * Qué decide qué: levelStreakModel.ts (estados y textos, puro) y levelStreakColors.ts (colores y contraste, puro). Aquí solo se dibuja.
 *
 * layout 'actual' = el diseño de siempre (el valor por defecto, Inicio real no cambia); 'C' = UNA tarjeta con dos mitades; 'E' = dos tarjetas con insignia de escudo.
 * tone: 'grafito' o 'cobre' (solo para C y E). "Tu nivel" es un botón (efecto presionado SÓLIDO); "Racha de constancia" NO lo es, como hoy.
 * Los siete indicadores de la racha son un progreso visual hasta siete (los primeros N pintados, N = min(días, 7)): NO son días de la semana, porque el cliente solo recibe el número.
 */
export type LevelStreakLayout = 'actual' | 'C' | 'E';
export type ValueFont = 'anton' | 'inter';
export type LevelStreakLook = { layout: LevelStreakLayout; tone: Tone; valueFont: ValueFont };

/** Valor por defecto: el diseño actual. Para elegir C o E basta cambiar `layout` aquí (y `tone`), una vez que Pía lo apruebe. */
export const LEVEL_STREAK_LOOK: LevelStreakLook = { layout: 'actual', tone: 'grafito', valueFont: 'anton' };

const MAX_MULT = 1.3;
const LABEL = FONT_SIZE.sm; // etiqueta y detalle: 12 sp (mínimo de Inicio: 11)
const VALUE_ANTON = FONT_SIZE.display; // 22
const VALUE_INTER = 20; // Inter Bold es más ancha que Anton: un punto más chico para igualar el espacio
const SUFFIX = FONT_SIZE.sm;
const DOT = 10;
const DOT_BORDER = 1.5;
const BADGE_C = 28;
const PAD = 14;
/** Desde esta letra efectiva (simulada x sistema) la etiqueta de la tarjeta E pasa bajo la insignia. */
const STACK_SCALE = 1.15;

type Props = {
  rank: string;
  achievementStats: { currentStreakDays?: number | null } | null;
  onOpenProfile: () => void;
  look?: LevelStreakLook;
  /** Solo la pantalla de desarrollo: simula la letra del sistema (el tope de 1,3 también se aplica). */
  fontScale?: number;
  /** Solo la pantalla de desarrollo: simula un ancho de pantalla (320, 360, 412 dp). */
  screenWidth?: number;
};

type Parameter0 = Parameters<typeof readLayout>[0];

export function LevelStreakCards({ rank, achievementStats, onOpenProfile, look = LEVEL_STREAK_LOOK, fontScale, screenWidth }: Props) {
  const colors = useColors();
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
  const level = levelView(rank);
  const streak = streakView(achievementStats);
  const fs = Math.min(fontScale ?? 1, MAX_MULT);
  // Ancho simulado: el contenido de Inicio mide el ancho de la pantalla menos 20 dp de cada lado.
  const wrapStyle = __DEV__ && screenWidth ? { width: screenWidth - 2 * SPACING.xxl, alignSelf: "center" as const } : undefined;

  const devBadge = __DEV__ ? (
    <View pointerEvents="none" style={styles.devBadge}>
      <Text style={styles.devBadgeText}>{`Alto: ${boxH} dp`}</Text>
    </View>
  ) : null;

  if (look.layout === 'actual') {
    return (
      <View onLayout={onLayout} style={wrapStyle}>
        <ActualCards level={level} stats={achievementStats} onOpenProfile={onOpenProfile} />
        {devBadge}
      </View>
    );
  }

  const c = levelStreakColors(colors, look.tone);
  return (
    <View onLayout={onLayout} style={wrapStyle}>
      {look.layout === 'C' ? (
        <UnifiedCard c={c} level={level} streak={streak} onOpenProfile={onOpenProfile} look={look} fs={fs} />
      ) : (
        <BadgeCards c={c} level={level} streak={streak} onOpenProfile={onOpenProfile} look={look} fs={fs} />
      )}
      {devBadge}
    </View>
  );
}

/* ───────────── Diseño ACTUAL (movido tal cual desde HomeView) ───────────── */

function ActualCards({
  level,
  stats,
  onOpenProfile,
}: {
  level: LevelView;
  stats: { currentStreakDays?: number | null } | null;
  onOpenProfile: () => void;
}) {
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
    <View style={actual.twoColumnRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ver perfil"
        onPress={onOpenProfile}
        style={({ pressed }) => [actual.statsCard, soft, { backgroundColor: pressed ? colors.cardPressed : colors.card }]}
      >
        <View style={actual.smallCardHeader}>
          <View style={[actual.iconBadge, { backgroundColor: colors.accent }]}>
            <Feather name="shield" size={17} color={colors.accentForeground} />
          </View>
          <Feather name="chevron-right" size={18} color={colors.creamMuted} />
        </View>
        <Text style={[actual.smallCardLabel, { color: colors.creamMuted }]} maxFontSizeMultiplier={MAX_MULT}>
          Tu nivel
        </Text>
        <Text
          style={[actual.statsValue, { color: colors.foreground }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          maxFontSizeMultiplier={MAX_MULT}
        >
          {levelText(level)}
        </Text>
        <Text style={[actual.statsDetail, { color: colors.creamMuted }]} maxFontSizeMultiplier={MAX_MULT}>
          {LEVEL_DETAIL}
        </Text>
      </Pressable>
      <View style={[actual.statsCard, soft, { backgroundColor: colors.card }]}>
        <View style={actual.smallCardHeader}>
          <View style={[actual.iconBadge, { backgroundColor: colors.warningBackground }]}>
            <MaterialCommunityIcons name="fire" size={18} color={colors.warning} />
          </View>
        </View>
        <Text style={[actual.smallCardLabel, { color: colors.creamMuted }]} maxFontSizeMultiplier={MAX_MULT}>
          Racha de constancia
        </Text>
        <Text style={[actual.statsValue, { color: colors.foreground }]} maxFontSizeMultiplier={MAX_MULT}>
          {stats?.currentStreakDays ?? 0}
        </Text>
        <Text style={[actual.statsDetail, { color: colors.creamMuted }]} maxFontSizeMultiplier={MAX_MULT}>
          {stats?.currentStreakDays ? 'días seguidos' : 'Empieza hoy'}
        </Text>
      </View>
    </View>
  );
}

/* ───────────── Piezas compartidas de C y E ───────────── */

type Shared = {
  c: LevelStreakColors;
  level: LevelView;
  streak: StreakView;
  onOpenProfile: () => void;
  look: LevelStreakLook;
  fs: number;
};

const sizeOf = (n: number, fs: number) => ({ fontSize: n * fs, lineHeight: Math.round(n * 1.2 * fs) });

/** Tipografía del valor principal (rango y número de días). */
function valueStyle(font: ValueFont, fs: number, n?: number) {
  const base = font === 'anton' ? VALUE_ANTON : VALUE_INTER;
  const size = n ?? base;
  return [
    { fontFamily: font === 'anton' ? 'Anton_400Regular' : 'Inter_700Bold' },
    { fontSize: size * fs, lineHeight: Math.round(size * 1.2 * fs) },
  ];
}

/** Siete indicadores: un progreso visual hasta siete. Ocultos a lectores de pantalla (la frase del recuadro ya los incluye) y sin tapar toques. */
function Dots({ c, filled }: { c: LevelStreakColors; filled: number }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.dots}
    >
      {Array.from({ length: STREAK_DOTS }, (_, i) => {
        const on = i < filled;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              on
                ? { backgroundColor: c.dotFilled, borderColor: c.dotFilled }
                : { backgroundColor: 'transparent', borderColor: c.dotOutline },
            ]}
          />
        );
      })}
    </View>
  );
}

function Bone({ c, width, height }: { c: LevelStreakColors; width: number | `${number}%`; height: number }) {
  return <View style={[styles.bone, { width, height, backgroundColor: c.bone }]} />;
}

/** Rango: tamaño por tramos según el largo, una línea, sin "…" ni adjustsFontSizeToFit. */
function RankValue({ c, level, look, fs }: { c: LevelStreakColors; level: LevelView; look: LevelStreakLook; fs: number }) {
  const text = levelText(level);
  const full = look.valueFont === 'anton' ? VALUE_ANTON : VALUE_INTER;
  return (
    <Text
      style={[valueStyle(look.valueFont, fs, rankFontSize(text, full)), styles.value, { color: c.primary }]}
      maxFontSizeMultiplier={MAX_MULT}
      numberOfLines={1}
      ellipsizeMode="clip"
    >
      {text}
    </Text>
  );
}

/** Número de días (grande) con "días seguidos" al lado; sin racha, "0" con "Empieza hoy". Cargando: esqueleto. */
function StreakValue({ c, streak, look, fs }: { c: LevelStreakColors; streak: StreakView; look: LevelStreakLook; fs: number }) {
  if (streak.kind === 'loading') {
    return (
      <View style={styles.boneRow}>
        <Bone c={c} width={38} height={22} />
        <Bone c={c} width={60} height={12} />
      </View>
    );
  }
  const days = streak.kind === 'streak' ? streak.days : 0;
  const suffix = streak.kind === 'streak' ? streakSuffix(streak.days) : 'Empieza hoy';
  return (
    <Text style={[valueStyle(look.valueFont, fs), styles.value, { color: c.primary }]} maxFontSizeMultiplier={MAX_MULT}>
      {days}
      <Text style={[styles.suffix, sizeOf(SUFFIX, fs), { color: c.secondary }]}>{` ${suffix}`}</Text>
    </Text>
  );
}

function StreakDots({ c, streak }: { c: LevelStreakColors; streak: StreakView }) {
  if (streak.kind === 'loading') return <Bone c={c} width={DOT * STREAK_DOTS + 5 * (STREAK_DOTS - 1)} height={DOT} />;
  return <Dots c={c} filled={streak.kind === 'streak' ? streak.filled : 0} />;
}

/* ───────────── C: UNA tarjeta, dos mitades ───────────── */

function CircleIcon({ c, size, children }: { c: LevelStreakColors; size: number; children: React.ReactNode }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: c.badgeFill, borderColor: c.badgeBorder }]}
    >
      {children}
    </View>
  );
}

function UnifiedCard({ c, level, streak, onOpenProfile, look, fs }: Shared) {
  const colors = useColors();
  const levelBody = (
    <>
      <View style={styles.headerRow} importantForAccessibility="no-hide-descendants">
        <CircleIcon c={c} size={BADGE_C}>
          <Feather name="shield" size={14} color={c.icon} />
        </CircleIcon>
        <Text style={[styles.label, sizeOf(LABEL, fs), { color: c.secondary }]} maxFontSizeMultiplier={MAX_MULT}>
          Tu nivel
        </Text>
        <Feather name="chevron-right" size={16} color={c.secondary} />
      </View>
      <View importantForAccessibility="no-hide-descendants">
        <RankValue c={c} level={level} look={look} fs={fs} />
        <Text style={[styles.detail, sizeOf(LABEL, fs), { color: c.secondary }]} maxFontSizeMultiplier={MAX_MULT}>
          {LEVEL_DETAIL}
        </Text>
      </View>
    </>
  );
  return (
    <View style={[styles.cardC, { backgroundColor: c.background, shadowColor: colors.charcoal }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={levelA11yLabel(level)}
        accessibilityHint="Abre tus Datos personales"
        onPress={onOpenProfile}
        style={({ pressed }) => [styles.halfC, styles.halfLeft, { backgroundColor: pressed ? c.pressed : 'transparent' }]}
      >
        {levelBody}
      </Pressable>
      <View pointerEvents="none" style={styles.dividerWrap}>
        <View style={[styles.divider, { backgroundColor: c.divider }]} />
      </View>
      <View style={[styles.halfC, styles.halfRight]} accessible accessibilityLabel={streakA11yLabel(streak)}>
        <View style={styles.headerRow} importantForAccessibility="no-hide-descendants">
          <CircleIcon c={c} size={BADGE_C}>
            <MaterialCommunityIcons name="fire" size={16} color={c.icon} />
          </CircleIcon>
          <Text style={[styles.label, sizeOf(LABEL, fs), { color: c.secondary }]} maxFontSizeMultiplier={MAX_MULT}>
            Racha de constancia
          </Text>
        </View>
        <View importantForAccessibility="no-hide-descendants" style={styles.streakBody}>
          <StreakValue c={c} streak={streak} look={look} fs={fs} />
          <StreakDots c={c} streak={streak} />
        </View>
      </View>
    </View>
  );
}

/* ───────────── E: DOS tarjetas con insignia de escudo ───────────── */

/** Insignia: escudo deportivo dibujado con react-native-svg (contorno y ícono en el color del borde, relleno oscuro). Decorativa: oculta a lectores de pantalla y sin tapar toques. */
function ShieldBadge({ c, children }: { c: LevelStreakColors; children: React.ReactNode }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.shield}
    >
      <Svg width={34} height={38} viewBox="0 0 34 38">
        <Path
          d="M17 2 L31 7 V19 C31 28 25 34 17 36.5 C9 34 3 28 3 19 V7 Z"
          fill={c.badgeFill}
          stroke={c.badgeBorder}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      </Svg>
      <View style={styles.shieldIcon}>{children}</View>
    </View>
  );
}

/** Detalles geométricos discretos (dos esquinas finas) en cobre oscuro (grafito) o negro (cobre). */
function CornerDetails({ c }: { c: LevelStreakColors }) {
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      <View style={[styles.cornerTop, { borderColor: c.detail }]} />
      <View style={[styles.cornerBottom, { borderColor: c.detail }]} />
    </View>
  );
}

function BadgeCards({ c, level, streak, onOpenProfile, look, fs }: Shared) {
  const colors = useColors();
  // Con letra grande (la simulada de desarrollo por la del sistema, esta con su tope de 1,3) la etiqueta "Racha de constancia" no cabe al lado de la insignia en 320 dp:
  // pasa debajo de ella (misma pieza, solo cambia el orden).
  const { fontScale: systemScale } = useWindowDimensions();
  const stack = fs * Math.min(systemScale, MAX_MULT) > STACK_SCALE;
  const headerE = [styles.headerRowE, stack && styles.headerStackE];
  const frame = [styles.cardE, { backgroundColor: c.background, borderColor: c.detail, shadowColor: colors.charcoal }];
  return (
    <View style={styles.rowE}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={levelA11yLabel(level)}
        accessibilityHint="Abre tus Datos personales"
        onPress={onOpenProfile}
        style={({ pressed }) => [frame, { backgroundColor: pressed ? c.pressed : c.background }]}
      >
        <CornerDetails c={c} />
        <View style={headerE} importantForAccessibility="no-hide-descendants">
          <ShieldBadge c={c}>
            <Feather name="shield" size={13} color={c.icon} />
          </ShieldBadge>
          <Text style={[styles.label, stack && styles.labelStack, sizeOf(LABEL, fs), { color: c.secondary }]} maxFontSizeMultiplier={MAX_MULT}>
            Tu nivel
          </Text>
        </View>
        <View importantForAccessibility="no-hide-descendants">
          <RankValue c={c} level={level} look={look} fs={fs} />
          <Text style={[styles.detail, sizeOf(LABEL, fs), { color: c.secondary }]} maxFontSizeMultiplier={MAX_MULT}>
            {LEVEL_DETAIL}
          </Text>
        </View>
      </Pressable>
      <View style={frame} accessible accessibilityLabel={streakA11yLabel(streak)}>
        <CornerDetails c={c} />
        <View style={headerE} importantForAccessibility="no-hide-descendants">
          <ShieldBadge c={c}>
            <MaterialCommunityIcons name="fire" size={15} color={c.icon} />
          </ShieldBadge>
          <Text style={[styles.label, stack && styles.labelStack, sizeOf(LABEL, fs), { color: c.secondary }]} maxFontSizeMultiplier={MAX_MULT}>
            Racha de constancia
          </Text>
        </View>
        <View importantForAccessibility="no-hide-descendants" style={styles.streakBody}>
          <StreakValue c={c} streak={streak} look={look} fs={fs} />
          <StreakDots c={c} streak={streak} />
        </View>
      </View>
    </View>
  );
}

/* Estilos del diseño ACTUAL (copia de los de HomeView; los de HomeView siguen sirviendo al recuadro "PR destacado"). */
const actual = StyleSheet.create({
  twoColumnRow: { flexDirection: 'row', gap: SPACING.lg },
  statsCard: { flex: 1, minHeight: 112, borderRadius: RADIUS.xl, padding: SPACING.lg },
  statsValue: { fontSize: FONT_SIZE.display, lineHeight: 26, fontFamily: 'Anton_400Regular', marginTop: SPACING.sm2 },
  statsDetail: { fontSize: FONT_SIZE.xs, lineHeight: 15, fontFamily: 'Inter_500Medium', marginTop: 3 },
  smallCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 },
  iconBadge: { width: 32, height: 32, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
  smallCardLabel: { fontSize: FONT_SIZE.xs, fontFamily: 'Inter_600SemiBold', marginTop: SPACING.lg },
});

const styles = StyleSheet.create({
  // C
  cardC: {
    flexDirection: 'row',
    borderRadius: RADIUS.xl,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 1,
  },
  halfC: { flex: 1, padding: PAD, justifyContent: 'space-between', gap: SPACING.md },
  halfLeft: { borderTopLeftRadius: RADIUS.xl, borderBottomLeftRadius: RADIUS.xl },
  halfRight: { borderTopRightRadius: RADIUS.xl, borderBottomRightRadius: RADIUS.xl },
  // El separador no llega a los bordes: aire arriba y abajo.
  dividerWrap: { width: 1, paddingVertical: SPACING.xl },
  divider: { flex: 1, width: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm2 },
  label: { flex: 1, fontFamily: 'Inter_600SemiBold' },
  labelStack: { flex: 0, flexGrow: 0 },
  detail: { fontFamily: 'Inter_500Medium', marginTop: 2 },
  value: { includeFontPadding: false },
  suffix: { fontFamily: 'Inter_500Medium' },
  streakBody: { gap: SPACING.sm2 },
  circle: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  dots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: DOT_BORDER },
  bone: { borderRadius: 6 },
  boneRow: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm2 },
  // E
  rowE: { flexDirection: 'row', gap: SPACING.lg },
  cardE: {
    flex: 1,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: PAD,
    gap: SPACING.md,
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 1,
  },
  headerRowE: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm2 },
  headerStackE: { flexDirection: 'column', alignItems: 'flex-start', gap: SPACING.xs2 },
  shield: { width: 34, height: 38, alignItems: 'center', justifyContent: 'center' },
  shieldIcon: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  cornerTop: { position: 'absolute', top: 8, right: 8, width: 10, height: 10, borderTopWidth: 1.5, borderRightWidth: 1.5, borderTopRightRadius: 3 },
  cornerBottom: { position: 'absolute', bottom: 8, right: 8, width: 10, height: 10, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderBottomRightRadius: 3 },
  // Solo desarrollo
  devBadge: { position: 'absolute', right: 6, bottom: 4, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  devBadgeText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'Inter_600SemiBold' },
});
