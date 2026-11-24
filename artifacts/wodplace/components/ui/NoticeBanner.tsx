import React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AutoFitImage } from '@/components/AutoFitImage';
import { useColors } from '@/hooks/useColors';
import {
  NOTICE_BODY_COLOR,
  NOTICE_BODY_SIZE,
  NOTICE_BORDER_ALPHA_HEX,
  NOTICE_BORDER_WIDTH,
  NOTICE_CHEVRON_SIZE,
  NOTICE_ICON_CIRCLE,
  NOTICE_ICON_CIRCLE_BORDER,
  NOTICE_ICON_SIZE,
  NOTICE_IMAGE_RADIUS,
  NOTICE_LABEL_SIZE,
  NOTICE_LABEL_SPACING,
  NOTICE_LABEL_TEXT,
  NOTICE_PADDING,
  NOTICE_RADIUS,
  NOTICE_STRIPE_WIDTH,
  NOTICE_TITLE_SIZE,
  noticeImageWidth,
  type NoticeLevel,
} from '@/components/ui/noticeBannerSpec';

/**
 * BANNER DE AVISO (pedido 43): una sola pieza para el contrato pendiente, el aviso fijo del box y el aviso del plan, en el estilo oscuro de Inicio (grafito con cobre).
 * Conectada a Inicio real desde el pedido 50 (vía components/home/NoticeBanners.tsx); también se ve en "Estados de Inicio (dev)" → "Ver avisos". Es de claro fijo, como todo Inicio.
 *
 *  - level 'importante': franja de cobre sólida de 3 dp en el borde izquierdo y el rótulo "IMPORTANTE" sobre el título (la diferencia no depende solo del color).
 *  - level 'info': sin franja ni rótulo.
 *  - onPress: la tarjeta entera es un botón (chevron de cobre a la derecha); al presionar el fondo pasa a #2E2F35 SÓLIDO, nunca opacidad.
 */
export type NoticeBannerProps = {
  level: NoticeLevel;
  icon: React.ComponentProps<typeof Feather>['name'];
  /** Una línea de título o varias (el aviso del plan con dos reglas): todas con el mismo estilo de título, una bajo la otra. */
  title: string | string[];
  body?: string | null;
  /** Máximo de líneas del cuerpo (el aviso fijo del box usa 3). Sin tope si no se indica. */
  bodyMaxLines?: number;
  /** Solo el aviso del box: imagen bajo el texto, a todo el ancho de la tarjeta. */
  image?: string | null;
  onPress?: () => void;
  /** Lo que lee el lector de pantalla tras el nombre (solo con onPress): a dónde lleva. */
  accessibilityHint?: string;
};

export function NoticeBanner({ level, icon, title, body, bodyMaxLines, image, onPress, accessibilityHint }: NoticeBannerProps) {
  const colors = useColors();
  const important = level === 'importante';
  const titles = Array.isArray(title) ? title : [title];
  const label = [important ? 'Importante' : null, ...titles, body].filter(Boolean).join('. ');

  const render = (pressed: boolean) => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: pressed ? colors.nextClassCardPressed : colors.nextClassCard,
          borderColor: `${colors.charcoalAccent}${NOTICE_BORDER_ALPHA_HEX}`,
        },
      ]}
    >
      {important ? <View pointerEvents="none" style={[styles.stripe, { backgroundColor: colors.charcoalAccent }]} /> : null}
      <View style={styles.row}>
        <View style={[styles.iconCircle, { borderColor: colors.charcoalAccent }]} importantForAccessibility="no-hide-descendants">
          <Feather name={icon} size={NOTICE_ICON_SIZE} color={colors.charcoalAccentLight} />
        </View>
        <View style={styles.textCol}>
          {important ? <Text style={[styles.label, { color: colors.charcoalAccentLight }]}>{NOTICE_LABEL_TEXT}</Text> : null}
          {titles.map((line) => (
            <Text key={line} style={[styles.title, { color: colors.nextClassCardForeground }]}>
              {line}
            </Text>
          ))}
          {body ? (
            <Text style={[styles.body, { color: NOTICE_BODY_COLOR }]} numberOfLines={bodyMaxLines}>
              {body}
            </Text>
          ) : null}
        </View>
        {onPress ? (
          <View importantForAccessibility="no-hide-descendants" style={styles.chevron}>
            <Feather name="chevron-right" size={NOTICE_CHEVRON_SIZE} color={colors.charcoalAccentLight} />
          </View>
        ) : null}
      </View>
      {image ? (
        <View style={styles.imageWrap}>
          <AutoFitImage uri={image} width={noticeImageWidth(Dimensions.get('window').width)} borderRadius={NOTICE_IMAGE_RADIUS} />
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={accessibilityHint} onPress={onPress}>
        {({ pressed }) => render(pressed)}
      </Pressable>
    );
  }
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={label}>
      {render(false)}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: NOTICE_RADIUS,
    borderWidth: NOTICE_BORDER_WIDTH,
    padding: NOTICE_PADDING,
    overflow: 'hidden',
    gap: 12,
  },
  stripe: { position: 'absolute', top: 0, bottom: 0, left: 0, width: NOTICE_STRIPE_WIDTH },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconCircle: {
    width: NOTICE_ICON_CIRCLE,
    height: NOTICE_ICON_CIRCLE,
    borderRadius: NOTICE_ICON_CIRCLE / 2,
    borderWidth: NOTICE_ICON_CIRCLE_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, gap: 2 },
  label: { fontSize: NOTICE_LABEL_SIZE, letterSpacing: NOTICE_LABEL_SPACING, fontFamily: 'Inter_600SemiBold' },
  title: { fontSize: NOTICE_TITLE_SIZE, lineHeight: 20, fontFamily: 'Inter_600SemiBold' },
  body: { fontSize: NOTICE_BODY_SIZE, lineHeight: 20, fontFamily: 'Inter_400Regular' },
  chevron: { alignSelf: 'center' },
  imageWrap: { alignItems: 'center' },
});
