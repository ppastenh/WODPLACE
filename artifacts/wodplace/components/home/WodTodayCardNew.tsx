import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ArrowBadge } from '@/components/home/ArrowBadge';
import { ARROW_BADGE_SMALL } from '@/components/home/arrowBadgeSpec';
import {
  WOD_A11Y_HINT,
  WOD_CHIP_BORDER,
  WOD_CHIP_CHECK_SIZE,
  WOD_CHIP_SIZE,
  WOD_CHIP_TEXT,
  WOD_DESCRIPTION_LINE,
  WOD_DESCRIPTION_MAX_LINES,
  WOD_DESCRIPTION_SIZE,
  WOD_LABEL_SIZE,
  WOD_LABEL_SPACING,
  WOD_LABEL_TEXT,
  WOD_NAME_LINE,
  WOD_NAME_MAX_LINES,
  WOD_NAME_SIZE,
  WOD_PADDING,
  WOD_RADIUS,
  hasWodDescription,
  wodTodayA11yLabel,
} from '@/components/home/wodTodaySpec';
import { NOTICE_BODY_COLOR } from '@/components/ui/noticeBannerSpec';
import { useColors } from '@/hooks/useColors';

/**
 * TARJETA "WOD DE HOY" NUEVA (pedido 44): grafito con cobre, en el estilo de las tarjetas adaptadas de Inicio. Por ahora solo se ve en "Estados de Inicio (dev)" → "Ver avisos", junto al diseño actual
 * (ConditionalCards.tsx); NO está conectada a Inicio. Mismos textos, misma condición (hay WOD programado hoy) y mismo destino (toda la tarjeta es un botón que abre el WOD). Es de claro fijo.
 *
 * Presionado: el fondo pasa a #2E2F35 SÓLIDO (nunca opacidad). La flecha es la MISMA de las otras tarjetas (ArrowBadge pequeña), decorativa, arriba a la derecha y alineada con la fila del rótulo.
 * "Registrado" (check + palabra) reemplaza al "· registrado" del rótulo anterior; el lector de pantalla sigue diciendo "registrado".
 */
type Props = {
  wod: { name: string; description?: string | null; myResult?: unknown };
  onPress: () => void;
};

export function WodTodayCardNew({ wod, onPress }: Props) {
  const colors = useColors();
  const registered = !!wod.myResult;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={wodTodayA11yLabel(wod.name, registered)} accessibilityHint={WOD_A11Y_HINT} onPress={onPress}>
      {({ pressed }) => (
        <View style={[styles.card, { backgroundColor: pressed ? colors.nextClassCardPressed : colors.nextClassCard }]}>
          <View style={styles.header}>
            <Text style={[styles.label, { color: colors.charcoalAccentLight }]} maxFontSizeMultiplier={1.3}>
              {WOD_LABEL_TEXT}
            </Text>
            {registered ? (
              <View style={[styles.chip, { borderColor: colors.charcoalAccent }]}>
                <Feather name="check" size={WOD_CHIP_CHECK_SIZE} color={colors.charcoalAccentLight} />
                <Text style={[styles.chipText, { color: colors.charcoalAccentLight }]} maxFontSizeMultiplier={1.3}>
                  {WOD_CHIP_TEXT}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.name, { color: colors.nextClassCardForeground }]} numberOfLines={WOD_NAME_MAX_LINES} maxFontSizeMultiplier={1.3}>
            {wod.name}
          </Text>
          {hasWodDescription(wod.description) ? (
            <Text style={[styles.description, { color: NOTICE_BODY_COLOR }]} numberOfLines={WOD_DESCRIPTION_MAX_LINES} ellipsizeMode="tail" maxFontSizeMultiplier={1.3}>
              {wod.description}
            </Text>
          ) : null}
          <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.arrow}>
            <ArrowBadge size={ARROW_BADGE_SMALL} borderColor={colors.charcoalAccent} backgroundColor={colors.glassBackground} arrowColor={colors.nextClassCardForeground} />
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: WOD_RADIUS, padding: WOD_PADDING, gap: 8 },
  // La fila del rótulo mide lo mismo que la flecha y deja su lugar a la derecha; si no cabe (letra grande), la etiqueta pasa a la línea de abajo.
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 4, minHeight: ARROW_BADGE_SMALL, paddingRight: ARROW_BADGE_SMALL + 8 },
  label: { fontSize: WOD_LABEL_SIZE, letterSpacing: WOD_LABEL_SPACING, fontFamily: 'Inter_600SemiBold' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: WOD_CHIP_BORDER, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  chipText: { fontSize: WOD_CHIP_SIZE, fontFamily: 'Inter_600SemiBold' },
  name: { fontSize: WOD_NAME_SIZE, lineHeight: WOD_NAME_LINE, fontFamily: 'Anton_400Regular' },
  description: { fontSize: WOD_DESCRIPTION_SIZE, lineHeight: WOD_DESCRIPTION_LINE, fontFamily: 'Inter_400Regular' },
  arrow: { position: 'absolute', top: WOD_PADDING, right: WOD_PADDING },
});
