import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, G, Path, Pattern, Rect } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import { readLayout } from '@/components/home/layoutEvents';
import { prColors, TEXTURE_OPACITY, type PrColors } from '@/components/home/prHighlightColors';
import {
  PR_A11Y_LABEL,
  PR_A11Y_NO_DATA,
  PR_EMPTY_HINT,
  PR_EMPTY_TITLE,
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
 * TARJETA "PR DESTACADO" de Inicio (decisión (x) de DECISIONES-DISENO.md, VIGENTE): concepto PR Champion en grafito, con insignia hexagonal de cobre y barra olímpica,
 * el nombre del movimiento en Anton y la marca en una cápsula con borde de cobre. El cobre y el tratamiento de la insignia son los MISMOS que los de "Tu nivel" y "Racha de constancia".
 * HomeView entrega la marca de hoy (rotatingFeaturedPr; la rotación diaria la sigue haciendo app/home.tsx), el estado de la consulta (prStatus) y onOpenRm (toca → RM).
 * Qué decide qué: prHighlightModel.ts (estados, textos y tramos del nombre, puro) y prHighlightColors.ts (colores y contraste, puro). Aquí solo se dibuja.
 *
 * La tarjeta entera es UN botón (etiqueta "Ver progreso y PRs", presionado SÓLIDO; con error de la consulta sigue tocable hacia RM, que carga sus propias marcas, y su frase es
 * "PR destacado: sin datos"). Insignia, textura, acento y flecha son decorativos: ocultos a lectores de pantalla y sin tapar el toque.
 * ALTO ESTABLE: cargando, error, vacío y con marca miden lo mismo (el nombre y la cápsula van en casillas de alto fijo), para que Inicio no "salte" al cambiar de estado.
 */

const MAX_MULT = 1.3;
const LABEL = FONT_SIZE.sm; // 12 sp (mínimo de Inicio: 11)
const CAPSULE_TEXT = 13;
const EMPTY_TITLE = 18; // "Aún no hay PRs" (14 letras) en una línea a 320 dp con letra 1,3, para que el vacío mida lo mismo que los demás estados
const NAME_SLOT = 26; // el nombre más grande de los tramos: la casilla del nombre mide una línea de este tamaño en todos los estados
const PAD = 16;
const HEX = { w: 44, h: 48 };
const HEX_PATH = 'M22 2 L40.5 12.5 V35.5 L22 46 L3.5 35.5 V12.5 Z';
// Barra olímpica: barra horizontal con dos discos a cada lado, trazo uniforme y extremos redondeados (centrada en 22,24).
const BAR_PATH = 'M10 24 H34 M14 16 V32 M30 16 V32 M10 20 V28 M34 20 V28';

type Props = {
  pr: { liftName: string; weightKg: number } | null;
  /** Estado de la consulta de las marcas. Si no llega, 'ready' (null = sin marcas, como hasta ahora). */
  prStatus?: PrStatus;
  onOpenRm: () => void;
  /** Solo la pantalla de desarrollo: simula la letra del sistema (el tope de 1,3 también se aplica). */
  fontScale?: number;
  /** Solo la pantalla de desarrollo: simula un ancho de pantalla (320, 360, 412 dp). */
  screenWidth?: number;
};

type Parameter0 = Parameters<typeof readLayout>[0];

const sizeOf = (n: number, fs: number, line = 1.2) => ({ fontSize: n * fs, lineHeight: Math.round(n * line * fs) });

export function PrHighlightCard({ pr, prStatus, onOpenRm, fontScale, screenWidth }: Props) {
  const colors = useColors();
  const c = prColors(colors);
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

  const nameSlotH = Math.round(NAME_SLOT * 1.15 * fs);
  const capsuleH = Math.round(CAPSULE_TEXT * 1.2 * fs) + 8;
  const label = [styles.label, sizeOf(LABEL, fs)];

  return (
    <View onLayout={onLayout} style={wrapStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={view.kind === 'error' ? PR_A11Y_NO_DATA : PR_A11Y_LABEL}
        accessibilityHint={view.kind === 'error' ? PR_A11Y_LABEL : undefined}
        onPress={onOpenRm}
        style={({ pressed }) => [styles.card, { backgroundColor: pressed ? c.pressed : c.background }]}
      >
        {({ pressed }) => (
          <>
            {pressed ? null : (
              <LinearGradient
                pointerEvents="none"
                colors={[c.background, c.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            <Decor c={c} />
            <View style={styles.col} importantForAccessibility="no-hide-descendants">
              <View style={styles.row}>
                <Badge c={c} kind={view.kind} />
                <View style={styles.body}>
                  <Text style={[label, { color: pressed ? c.labelPressed : c.label }]} maxFontSizeMultiplier={MAX_MULT}>
                    {PR_LABEL}
                  </Text>
                  <View style={[styles.nameSlot, { minHeight: nameSlotH }]}>
                    <NameSlot c={c} view={view} fs={fs} />
                  </View>
                </View>
                <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.chevron}>
                  <Feather name="chevron-right" size={18} color={c.primary} />
                </View>
              </View>
              <View style={[styles.capsuleSlot, { minHeight: capsuleH }]}>
                <CapsuleSlot c={c} view={view} fs={fs} height={capsuleH} />
              </View>
            </View>
          </>
        )}
      </Pressable>
      {devBadge}
    </View>
  );
}

/** Barra olímpica: trazo uniforme con extremos redondeados. */
function BarbellPath({ color, width }: { color: string; width: number }) {
  return <Path d={BAR_PATH} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill="none" />;
}

/**
 * Insignia: hexágono deportivo con la barra olímpica dentro. Mismo tratamiento que las insignias de "Tu nivel" y "Racha" (relleno de carbón, borde de cobre de 1,6 dp, ícono de cobre).
 * Con marca: cobre. Vacío: borde de cobre punteado e ícono atenuado. Cargando y error: insignia atenuada. Decorativa: oculta a lectores de pantalla y sin tapar toques.
 */
function Badge({ c, kind }: { c: PrColors; kind: PrView['kind'] }) {
  const border = kind === 'pr' || kind === 'empty' ? c.badgeBorder : c.muted;
  const icon = kind === 'pr' ? c.icon : c.muted;
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: HEX.w, height: HEX.h }}>
      <Svg width={HEX.w} height={HEX.h} viewBox={`0 0 ${HEX.w} ${HEX.h}`}>
        <Path d={HEX_PATH} fill={c.badgeFill} stroke={border} strokeWidth={1.6} strokeLinejoin="round" strokeDasharray={kind === 'empty' ? '3 3' : undefined} />
        <G transform="translate(4.4 4.8) scale(0.8)">
          <BarbellPath color={icon} width={2} />
        </G>
      </Svg>
    </View>
  );
}

/** Textura casi imperceptible (rombos de moleteado) en el extremo derecho y acento diagonal de cobre en la esquina inferior derecha. Decorativos. */
function Decor({ c }: { c: PrColors }) {
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
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

/** Casilla del nombre (una línea del tamaño mayor): nombre en Anton por tramos (si no cabe pasa a dos líneas, sin "…" ni cortes), título del vacío, guion del error o esqueleto. */
function NameSlot({ c, view, fs }: { c: PrColors; view: PrView; fs: number }) {
  if (view.kind === 'loading') return <Bone c={c} width="55%" height={22} />;
  if (view.kind === 'pr') {
    const n = prNameFontSize(view.name);
    return (
      <Text style={[styles.name, { color: c.primary, fontSize: n * fs, lineHeight: Math.round(n * 1.15 * fs) }]} maxFontSizeMultiplier={MAX_MULT}>
        {view.name}
      </Text>
    );
  }
  return (
    <Text style={[styles.name, sizeOf(EMPTY_TITLE, fs, 1.15), { color: c.primary }]} maxFontSizeMultiplier={MAX_MULT}>
      {view.kind === 'error' ? PR_NO_DATA : PR_EMPTY_TITLE}
    </Text>
  );
}

/** Casilla de la cápsula (alto fijo): la marca en una cápsula con borde de cobre, la sugerencia del vacío en una cápsula punteada, un esqueleto, o nada (error: solo reserva el alto). */
function CapsuleSlot({ c, view, fs, height }: { c: PrColors; view: PrView; fs: number; height: number }) {
  if (view.kind === 'loading') return <Bone c={c} width={96} height={height} />;
  if (view.kind === 'error') return null;
  if (view.kind === 'empty') {
    return (
      <View style={[styles.capsule, styles.capsuleDashed, { minHeight: height, borderColor: c.capsuleBorder }]}>
        <Text style={[styles.capsuleText, sizeOf(LABEL, fs), { color: c.muted }]} maxFontSizeMultiplier={MAX_MULT}>
          {PR_EMPTY_HINT}
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.capsule, { minHeight: height, backgroundColor: c.capsuleFill, borderColor: c.capsuleBorder }]}>
      <Svg width={16} height={12} viewBox="9 14 26 20">
        <BarbellPath color={c.capsuleText} width={3} />
      </Svg>
      <Text style={[styles.capsuleText, sizeOf(CAPSULE_TEXT, fs), { color: c.capsuleText }]} maxFontSizeMultiplier={MAX_MULT}>
        {prValueText(view.weightKg)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.xl, padding: PAD, overflow: 'hidden' },
  col: { gap: SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  body: { flex: 1 },
  label: { fontFamily: 'Inter_500Medium' },
  nameSlot: { justifyContent: 'center' },
  name: { fontFamily: 'Anton_400Regular', includeFontPadding: false },
  capsuleSlot: { alignItems: 'flex-start', justifyContent: 'center' },
  capsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs2,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.sm2,
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
