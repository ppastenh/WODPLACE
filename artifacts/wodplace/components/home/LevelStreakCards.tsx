import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { ArrowBadge } from '@/components/home/ArrowBadge';
import { ARROW_BADGE_SMALL, arrowBadgeCorner } from '@/components/home/arrowBadgeSpec';
import { useColors } from '@/hooks/useColors';
import { readLayout } from '@/components/home/layoutEvents';
import { levelStreakColors, type LevelStreakColors } from '@/components/home/levelStreakColors';
import {
  COMPACT_SCALE,
  LEVEL_DETAIL,
  STREAK_DOTS,
  STREAK_NO_DATA,
  levelA11yLabel,
  levelText,
  levelView,
  rankFontSize,
  streakA11yLabel,
  streakSuffix,
  streakView,
  type LevelView,
  type StreakStatus,
  type StreakView,
} from '@/components/home/levelStreakModel';
import { FONT_SIZE } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

/**
 * RECUADROS "TU NIVEL" Y "RACHA DE CONSTANCIA" de Inicio (decisión (w) de DECISIONES-DISENO.md, VIGENTE): dos tarjetas independientes con insignias de escudo en cobre,
 * tratamiento grafito, rango y número en Anton. HomeView entrega el rango (user.rank), los días seguidos (achievementStats), el estado de la consulta (streakStatus) y el toque
 * de "Tu nivel" (onOpenProfile → Datos personales). Qué decide qué: levelStreakModel.ts (estados y textos, puro) y levelStreakColors.ts (colores y contraste, puro). Aquí solo se dibuja.
 *
 * "Tu nivel" es un botón (efecto presionado SÓLIDO); "Racha de constancia" NO lo es. Los siete indicadores son un progreso visual hasta siete (los primeros N pintados,
 * N = min(días, 7)): NO son días de la semana, porque el cliente solo recibe el número de días seguidos.
 * Letra grande (efectiva > COMPACT_SCALE): modo compacto (insignia más chica, etiqueta bajo la insignia, "días seguidos" en su propia línea) para que ningún texto se corte.
 */

const MAX_MULT = 1.3;
const LABEL = FONT_SIZE.sm; // etiqueta y detalle: 12 sp (mínimo de Inicio: 11)
const VALUE = FONT_SIZE.display; // 22, Anton
const SUFFIX = FONT_SIZE.sm;
const DOT = 10;
const DOT_BORDER = 1.5;
const PAD = 14;
const PAD_COMPACT = 12;
const SHIELD = { w: 34, h: 38 };
const SHIELD_COMPACT = { w: 22, h: 25 };
const SHIELD_PATH = 'M17 2 L31 7 V19 C31 28 25 34 17 36.5 C9 34 3 28 3 19 V7 Z';

type Props = {
  rank: string;
  achievementStats: { currentStreakDays?: number | null } | null;
  /** Estado de la consulta de la racha; si no llega, se deduce de los datos (null = cargando). */
  streakStatus?: StreakStatus;
  onOpenProfile: () => void;
  /** Solo la pantalla de desarrollo: simula la letra del sistema (el tope de 1,3 también se aplica). */
  fontScale?: number;
  /** Solo la pantalla de desarrollo: simula un ancho de pantalla (320, 360, 412 dp). */
  screenWidth?: number;
};

type Parameter0 = Parameters<typeof readLayout>[0];

// Interlineado: 1,2 normal; 1,1 en modo compacto (letra grande), para que la tarjeta no crezca de más.
const LINE = 1.2;
const LINE_COMPACT = 1.1;
const sizeOf = (n: number, fs: number, line = LINE) => ({ fontSize: n * fs, lineHeight: Math.round(n * line * fs) });

export function LevelStreakCards({ rank, achievementStats, streakStatus, onOpenProfile, fontScale, screenWidth }: Props) {
  const colors = useColors();
  const c = levelStreakColors(colors);
  const level = levelView(rank);
  const streak = streakView(achievementStats, streakStatus);
  // Letra efectiva: la simulada de desarrollo por la del sistema, esta con su tope de 1,3.
  const { fontScale: systemScale } = useWindowDimensions();
  const fs = Math.min(fontScale ?? 1, MAX_MULT);
  const compact = fs * Math.min(systemScale, MAX_MULT) > COMPACT_SCALE;
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

  const pad = compact ? PAD_COMPACT : PAD;
  const frame = [styles.card, compact && styles.cardCompact, { padding: pad, backgroundColor: c.background, borderColor: c.detail, shadowColor: colors.charcoal }];
  const headerStyle = [styles.header, compact ? styles.headerCompact : styles.headerArrowRoom];
  const line = compact ? LINE_COMPACT : LINE;
  const labelStyle = [styles.label, compact && styles.labelCompact, sizeOf(LABEL, fs, line), { color: c.secondary }];

  return (
    <View onLayout={onLayout} style={wrapStyle}>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={levelA11yLabel(level)}
          accessibilityHint="Abre tus Datos personales"
          onPress={onOpenProfile}
          style={({ pressed }) => [frame, { backgroundColor: pressed ? c.pressed : c.background }]}
        >
          <CornerDetails c={c} top={false} />
          <View style={headerStyle} importantForAccessibility="no-hide-descendants">
            <ShieldBadge c={c} compact={compact}>
              <Feather name="shield" size={compact ? 9 : 13} color={c.icon} />
            </ShieldBadge>
            <Text style={labelStyle} maxFontSizeMultiplier={MAX_MULT}>
              Tu nivel
            </Text>
          </View>
          <View importantForAccessibility="no-hide-descendants">
            <RankValue c={c} level={level} fs={fs} line={line} />
            <Text style={[styles.detail, sizeOf(LABEL, fs, line), { color: c.secondary }]} maxFontSizeMultiplier={MAX_MULT}>
              {LEVEL_DETAIL}
            </Text>
          </View>
          <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={arrowBadgeCorner}>
            <ArrowBadge size={ARROW_BADGE_SMALL} borderColor={c.arrowBorder} backgroundColor={c.arrowFill} arrowColor={c.primary} />
          </View>
        </Pressable>
        <View style={frame} accessible accessibilityLabel={streakA11yLabel(streak)}>
          <CornerDetails c={c} top />
          <View style={headerStyle} importantForAccessibility="no-hide-descendants">
            <ShieldBadge c={c} compact={compact}>
              <MaterialCommunityIcons name="fire" size={compact ? 11 : 15} color={c.icon} />
            </ShieldBadge>
            <Text style={labelStyle} maxFontSizeMultiplier={MAX_MULT}>
              Racha de constancia
            </Text>
          </View>
          <View importantForAccessibility="no-hide-descendants" style={styles.streakBody}>
            <StreakValue c={c} streak={streak} fs={fs} compact={compact} line={line} />
            <StreakDots c={c} streak={streak} />
          </View>
        </View>
      </View>
      {devBadge}
    </View>
  );
}

/** Insignia: escudo deportivo dibujado con react-native-svg (contorno y ícono en cobre, relleno carbón). Decorativa: oculta a lectores de pantalla y sin tapar toques. */
function ShieldBadge({ c, compact, children }: { c: LevelStreakColors; compact: boolean; children: React.ReactNode }) {
  const size = compact ? SHIELD_COMPACT : SHIELD;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size.w, height: size.h, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size.w} height={size.h} viewBox="0 0 34 38">
        <Path d={SHIELD_PATH} fill={c.badgeFill} stroke={c.badgeBorder} strokeWidth={1.6} strokeLinejoin="round" />
      </Svg>
      <View style={styles.shieldIcon}>{children}</View>
    </View>
  );
}

/** Detalles geométricos discretos (esquinas finas) en cobre oscuro. "Tu nivel" no lleva la de arriba: ahí va la flecha. */
function CornerDetails({ c, top }: { c: LevelStreakColors; top: boolean }) {
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      {top ? <View style={[styles.cornerTop, { borderColor: c.detail }]} /> : null}
      <View style={[styles.cornerBottom, { borderColor: c.detail }]} />
    </View>
  );
}

/** Rango en Anton: tamaño por tramos según el largo, una línea, sin "…" ni adjustsFontSizeToFit. */
function RankValue({ c, level, fs, line }: { c: LevelStreakColors; level: LevelView; fs: number; line: number }) {
  const text = levelText(level);
  const n = rankFontSize(text, VALUE);
  return (
    <Text
      style={[styles.value, { fontSize: n * fs, lineHeight: Math.round(n * line * fs), color: c.primary }]}
      maxFontSizeMultiplier={MAX_MULT}
      numberOfLines={1}
      ellipsizeMode="clip"
    >
      {text}
    </Text>
  );
}

function Bone({ c, width, height }: { c: LevelStreakColors; width: number | `${number}%`; height: number }) {
  return <View style={[styles.bone, { width, height, backgroundColor: c.bone }]} />;
}

/**
 * Número de días (Anton) con "días seguidos" al lado (en modo compacto, en su propia línea). Sin racha: "0" con "Empieza hoy".
 * Cargando: esqueleto. Error: guion "—", sin "Empieza hoy" ni esqueleto.
 */
function StreakValue({ c, streak, fs, compact, line }: { c: LevelStreakColors; streak: StreakView; fs: number; compact: boolean; line: number }) {
  if (streak.kind === 'loading') {
    return (
      <View style={styles.boneRow}>
        <Bone c={c} width={38} height={22} />
        <Bone c={c} width={60} height={12} />
      </View>
    );
  }
  const valueStyle = [styles.value, sizeOf(VALUE, fs, line), { color: c.primary }];
  if (streak.kind === 'error') {
    return (
      <Text style={valueStyle} maxFontSizeMultiplier={MAX_MULT}>
        {STREAK_NO_DATA}
      </Text>
    );
  }
  const days = streak.kind === 'streak' ? streak.days : 0;
  const suffix = streak.kind === 'streak' ? streakSuffix(streak.days) : 'Empieza hoy';
  const suffixStyle = [styles.suffix, sizeOf(SUFFIX, fs, line), { color: c.secondary }];
  if (compact) {
    return (
      <View>
        <Text style={valueStyle} maxFontSizeMultiplier={MAX_MULT}>
          {days}
        </Text>
        <Text style={suffixStyle} maxFontSizeMultiplier={MAX_MULT}>
          {suffix}
        </Text>
      </View>
    );
  }
  return (
    <Text style={valueStyle} maxFontSizeMultiplier={MAX_MULT}>
      {days}
      <Text style={suffixStyle}>{` ${suffix}`}</Text>
    </Text>
  );
}

/** Siete indicadores: un progreso visual hasta siete. Ocultos a lectores de pantalla (la frase del recuadro ya los incluye) y sin tapar toques. */
function StreakDots({ c, streak }: { c: LevelStreakColors; streak: StreakView }) {
  if (streak.kind === 'loading') return <Bone c={c} width={DOT * STREAK_DOTS + 5 * (STREAK_DOTS - 1)} height={DOT} />;
  const filled = streak.kind === 'streak' ? streak.filled : 0;
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.dots}>
      {Array.from({ length: STREAK_DOTS }, (_, i) => {
        const on = i < filled;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              on ? { backgroundColor: c.dotFilled, borderColor: c.dotFilled } : { backgroundColor: 'transparent', borderColor: c.dotOutline },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: SPACING.lg },
  card: {
    flex: 1,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    gap: SPACING.md,
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 1,
  },
  cardCompact: { gap: SPACING.sm2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm2 },
  // Compacto: la etiqueta pasa bajo la insignia (la flecha de "Tu nivel" queda arriba a la derecha).
  headerCompact: { flexDirection: 'column', alignItems: 'flex-start', gap: SPACING.xs2 },
  label: { flex: 1, fontFamily: 'Inter_600SemiBold' },
  labelCompact: { flex: 0, flexGrow: 0 },
  // Flecha pequeña de "Tu nivel" en la esquina superior derecha, con el margen compartido (arrowBadgeCorner; decorativa). Sin modo compacto, la fila de la etiqueta le deja su lugar a la derecha.
  headerArrowRoom: { paddingRight: ARROW_BADGE_SMALL },
  detail: { fontFamily: 'Inter_500Medium', marginTop: 2 },
  value: { fontFamily: 'Anton_400Regular', includeFontPadding: false },
  suffix: { fontFamily: 'Inter_500Medium' },
  streakBody: { gap: SPACING.sm2 },
  dots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: DOT_BORDER },
  bone: { borderRadius: 6 },
  boneRow: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm2 },
  shieldIcon: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  cornerTop: { position: 'absolute', top: 8, right: 8, width: 10, height: 10, borderTopWidth: 1.5, borderRightWidth: 1.5, borderTopRightRadius: 3 },
  cornerBottom: { position: 'absolute', bottom: 8, right: 8, width: 10, height: 10, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderBottomRightRadius: 3 },
  // Solo desarrollo
  devBadge: { position: 'absolute', right: 6, bottom: 4, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  devBadgeText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'Inter_600SemiBold' },
});
