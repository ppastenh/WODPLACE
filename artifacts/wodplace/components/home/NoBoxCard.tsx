import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import { readLayout } from '@/components/home/layoutEvents';
import { NOBOX_TEXTURE_ALPHA, noBoxColors } from '@/components/home/noBoxCardColors';
import { useColors } from '@/hooks/useColors';
import { RADIUS } from '@/constants/radius';
import { SPACING } from '@/constants/spacing';

/**
 * TARJETA "TODAVÍA NO TIENES UN BOX" de Inicio (decisión (ac) de DECISIONES-DISENO.md): grafito, rombos del moleteado casi invisibles a la derecha, ícono en un círculo con borde de cobre a la izquierda del título (una sola fila: tarjeta compacta), título en Anton crema, subtítulo en gris cálido
 * y un botón ancho de cobre #B98250 con texto carbón #0D0F10. Mismos textos y mismo botón que la tarjeta anterior (JoinBoxCard.tsx): el botón abre la ventana para unirse (JoinBoxModal) con el mismo evento.
 * Presionado SÓLIDO (cobre claro #C79A6B), nunca opacidad; el botón mide 48 dp de alto como mínimo; los adornos van en Views con pointerEvents="none" (nunca en un Text). Es de claro fijo, como todo Inicio.
 */
type Props = { onPress: () => void };

type Parameter0 = Parameters<typeof readLayout>[0];

let uid = 0;

export function NoBoxCard({ onPress }: Props) {
  const colors = useColors();
  const c = noBoxColors(colors);
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
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };
  return (
    <View onLayout={onLayout} style={[styles.card, { backgroundColor: c.background }]}>
      <Texture color={c.primary} background={c.background} />
      <View style={styles.header}>
        <View style={[styles.iconCircle, { borderColor: c.circleBorder }]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Feather name="key" size={18} color={c.icon} />
        </View>
        <Text style={[styles.title, { color: c.primary }]} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
          Todavía no tienes un box
        </Text>
      </View>
      <Text style={[styles.subtitle, { color: c.secondary }]} maxFontSizeMultiplier={1.3}>
        Ingresa el código de invitación que te dio tu box para unirte y desbloquear el resto de la app.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ingresar código de invitación"
        onPress={handlePress}
        style={({ pressed }) => [styles.button, { backgroundColor: pressed ? c.buttonPressed : c.button }]}
      >
        <Feather name="plus-circle" size={18} color={c.buttonText} />
        <Text style={[styles.buttonText, { color: c.buttonText }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
          Ingresar código de invitación
        </Text>
      </Pressable>
      {__DEV__ ? (
        <View pointerEvents="none" style={styles.devBadge}>
          <Text style={styles.devBadgeText}>{`Alto: ${boxH} dp`}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Rombos del moleteado (dos diagonales cada 12 dp) en la parte derecha, casi invisibles, que se funden con el grafito hacia la izquierda. Decorativos: en Views con pointerEvents="none", ocultos a lectores. */
function Texture({ color, background }: { color: string; background: string }) {
  const id = useRef(`nobox-rombos-${uid++}`).current;
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.texture}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} width={12} height={12} patternUnits="userSpaceOnUse">
            <Path d="M0 12 L12 0 M0 0 L12 12" stroke={color} strokeWidth={1} strokeOpacity={NOBOX_TEXTURE_ALPHA} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      <LinearGradient colors={[background, `${background}00`]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.xl, padding: SPACING.xl, gap: SPACING.sm2, overflow: 'hidden' },
  texture: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '60%' },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  iconCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 22, lineHeight: 26, fontFamily: 'Anton_400Regular' },
  subtitle: { fontSize: 13, lineHeight: 19, fontFamily: 'Inter_500Medium' },
  button: { minHeight: 48, borderRadius: 999, paddingHorizontal: 20, marginTop: SPACING.xs2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm2 },
  buttonText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  // Solo __DEV__ (texto de depuración con el alto medido).
  devBadge: { position: 'absolute', right: 6, top: 4, backgroundColor: 'rgba(0,0,0,0.75)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  devBadgeText: { fontSize: 9, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
});
