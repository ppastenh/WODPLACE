import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import { ArrowBadge } from '@/components/home/ArrowBadge';
import { ARROW_BADGE_SMALL, arrowBadgeCorner } from '@/components/home/arrowBadgeSpec';
import { readLayout } from '@/components/home/layoutEvents';
import { WOD_A11Y_HINT, wodNameFontSize, type WodView } from '@/components/home/wodCardModel';
import { WOD_TEXTURE_ALPHA, wodColors, type WodColors } from '@/components/home/wodCardColors';
import { useColors } from '@/hooks/useColors';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';

/**
 * TARJETA DEL WOD de Inicio (decisión (ab) de DECISIONES-DISENO.md): UN componente con dos variantes según el tipo de WOD.
 *  - ESTÁNDAR (el WOD que escribe el coach): grafito sobrio, SIN borde de cobre, rótulo "WOD DEL DÍA" en gris cálido, nombre en Anton, modalidad y tope de tiempo en etiquetas y el texto del coach resumido (2 líneas).
 *  - ESPECIAL (un WOD del catálogo: Fran, Murph, Cindy, Helen…): Dark Athletic Premium: borde fino de cobre claro, sombra discreta, rombos del moleteado casi invisibles, rayo de cobre y "WOD ESPECIAL", cápsula "SOLO HOY"
 *    (solo si sessionDate es hoy en hora de Chile), nombre más grande y el texto resumido (2 líneas, igual que la estándar: la tarjeta se mantiene compacta).
 * Ambas: "Registrado" si ya hay resultado, flecha pequeña de Inicio (ArrowBadge, con la constante de margen común), toda la tarjeta es UN botón que abre el WOD, presionado sólido #2E2F35 (la textura se apaga), adornos con
 * pointerEvents="none" en Views (nunca en un Text), "sin descripción, sin hueco" y una sola frase para el lector de pantalla. Estados: cargando = esqueleto, error = marco con un guion, sin WOD = nada.
 * Qué dibujar lo decide wodCardModel.ts (wodCardView); los colores, wodCardColors.ts. No inventa datos. Es de claro fijo, como todo Inicio.
 */

type Props = { view: WodView; onPress: () => void };

type Parameter0 = Parameters<typeof readLayout>[0];

let uid = 0;

export function WodCard({ view, onPress }: Props) {
  const colors = useColors();
  const c = wodColors(colors);
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
  const devBadge = __DEV__ ? (
    <View pointerEvents="none" style={styles.devBadge}>
      <Text style={styles.devBadgeText}>{`Alto: ${boxH} dp`}</Text>
    </View>
  ) : null;

  if (view.kind === 'hidden') return null;

  if (view.kind === 'loading') {
    return (
      <View accessible accessibilityRole="progressbar" accessibilityLabel="Cargando el WOD de hoy" onLayout={onLayout} style={[styles.card, { backgroundColor: c.background }]}>
        <Bone c={c} width="34%" height={12} />
        <Bone c={c} width="52%" height={26} />
        <Bone c={c} width="92%" height={12} />
        <Bone c={c} width="64%" height={12} />
        {devBadge}
      </View>
    );
  }

  if (view.kind === 'error') {
    return (
      <View accessible accessibilityLabel="WOD de hoy: sin datos" onLayout={onLayout} style={[styles.card, styles.errorCard, { backgroundColor: c.background }]}>
        <Text style={[styles.errorDash, { color: c.secondary }]}>—</Text>
        {devBadge}
      </View>
    );
  }

  const special = view.variant === 'especial';
  const nameSize = wodNameFontSize(view.name, view.variant);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={view.a11yLabel} accessibilityHint={WOD_A11Y_HINT} onPress={onPress} onLayout={onLayout}>
      {({ pressed }) => (
        <View
          style={[
            styles.card,
            { backgroundColor: pressed ? c.pressed : c.background },
            special && [styles.special, { borderColor: c.cardBorder, shadowColor: colors.charcoal }],
          ]}
        >
          {special && !pressed ? <Texture color={c.primary} /> : null}
          <View style={[styles.header, { paddingRight: ARROW_BADGE_SMALL + SPACING.sm }]}>
            {special ? <Feather name="zap" size={14} color={c.bolt} /> : null}
            <Text style={[styles.label, { color: special ? c.label : c.secondary }]} maxFontSizeMultiplier={1.3}>
              {special ? 'WOD ESPECIAL' : 'WOD DEL DÍA'}
            </Text>
            {special && view.soloHoy ? (
              <View style={[styles.capsule, { backgroundColor: c.capsuleBg, borderColor: c.capsuleBorder }]}>
                <Feather name="clock" size={11} color={c.capsuleText} />
                <Text style={[styles.capsuleText, { color: c.capsuleText }]} maxFontSizeMultiplier={1.3}>
                  SOLO HOY
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.name, { color: c.primary, fontSize: nameSize, lineHeight: Math.round(nameSize * 1.15) }]} maxFontSizeMultiplier={1.3}>
            {view.name}
          </Text>
          {view.formatLabel || view.timeCapLabel || view.registered ? (
            <View style={styles.meta}>
              {view.formatLabel ? <Tag c={c} text={view.formatLabel} special={special} /> : null}
              {view.timeCapLabel ? <Tag c={c} text={view.timeCapLabel} special={special} /> : null}
              {view.registered ? (
                <View style={[styles.registered, { borderColor: c.chipBorder }]}>
                  <Feather name="check" size={12} color={c.chipText} />
                  <Text style={[styles.registeredText, { color: c.chipText }]} maxFontSizeMultiplier={1.3}>
                    Registrado
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
          {view.summary ? (
            <Text style={[styles.summary, { color: c.secondary }]} numberOfLines={2} ellipsizeMode="tail" maxFontSizeMultiplier={1.3}>
              {view.summary}
            </Text>
          ) : null}
          <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={arrowBadgeCorner}>
            <ArrowBadge size={ARROW_BADGE_SMALL} borderColor={colors.charcoalAccent} backgroundColor={colors.glassBackground} arrowColor={c.primary} />
          </View>
          {devBadge}
        </View>
      )}
    </Pressable>
  );
}

/** Etiqueta pequeña (modalidad o tope de tiempo): superficie interna #232428 con borde de cobre (especial) o gris cálido (estándar). */
function Tag({ c, text, special }: { c: WodColors; text: string; special: boolean }) {
  return (
    <View style={[styles.tag, { backgroundColor: c.inner, borderColor: special ? c.tagBorderSpecial : c.tagBorderStandard }]}>
      <Text style={[styles.tagText, { color: c.primary }]} maxFontSizeMultiplier={1.3}>
        {text}
      </Text>
    </View>
  );
}

/** Rombos del moleteado (dos diagonales cada 12 dp), casi invisibles. Decorativos: en un View con pointerEvents="none", oculto a lectores. */
function Texture({ color }: { color: string }) {
  const id = useRef(`wod-rombos-${uid++}`).current;
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} width={12} height={12} patternUnits="userSpaceOnUse">
            <Path d="M0 12 L12 0 M0 0 L12 12" stroke={color} strokeWidth={1} strokeOpacity={WOD_TEXTURE_ALPHA} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

function Bone({ c, width, height }: { c: WodColors; width: `${number}%`; height: number }) {
  return <View style={{ width, height, borderRadius: 6, backgroundColor: c.bone }} />;
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.xl, padding: SPACING.xl, gap: SPACING.sm2, overflow: 'hidden' },
  special: { borderWidth: 1, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 3 },
  errorCard: { minHeight: 96, alignItems: 'center', justifyContent: 'center' },
  errorDash: { fontSize: 26, fontFamily: 'Anton_400Regular' },
  // La fila del rótulo deja a la derecha el lugar de la flecha; si la cápsula no cabe (letra grande) pasa a la línea de abajo.
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, rowGap: 4, minHeight: ARROW_BADGE_SMALL },
  label: { fontSize: 12, letterSpacing: 1, fontFamily: 'Inter_600SemiBold' },
  capsule: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  capsuleText: { fontSize: 11, letterSpacing: 1, fontFamily: 'Inter_600SemiBold' },
  name: { fontFamily: 'Anton_400Regular' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  tag: { borderWidth: 1, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  registered: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  registeredText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  summary: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_400Regular' },
  // Solo __DEV__ (texto de depuración con el alto medido).
  devBadge: { position: 'absolute', right: 6, bottom: 4, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  devBadgeText: { fontSize: 9, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
});
