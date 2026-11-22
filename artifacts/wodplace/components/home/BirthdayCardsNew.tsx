import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { UpcomingBirthday } from '@workspace/api-client-react';
import {
  AVATAR_SIZE,
  AVATAR_TEXT_SIZE,
  DATE_SIZE,
  DATE_SPACING,
  LIST_PADDING_H,
  LIST_RADIUS,
  NAME_SIZE,
  OWN_ICON_CIRCLE,
  OWN_ICON_CIRCLE_BORDER,
  OWN_ICON_SIZE,
  OWN_PADDING,
  OWN_RADIUS,
  OWN_SUBTITLE_SIZE,
  OWN_TITLE_MAX_LINES,
  OWN_TITLE_SIZE,
  ROW_MIN_HEIGHT,
  SEPARATOR_WIDTH,
  TODAY_BORDER,
  TODAY_ICON_SIZE,
  birthdayRowA11yLabel,
  dayLabelOf,
  firstNameOf,
  initialsOf,
} from '@/components/home/birthdayNewSpec';
import { NOTICE_BODY_COLOR } from '@/components/ui/noticeBannerSpec';
import { useColors } from '@/hooks/useColors';
import { FONT_SIZE } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';

/**
 * CUMPLEAÑOS NUEVOS (pedido 45), en el estilo oscuro de Inicio. Por ahora solo se ven en "Estados de Inicio (dev)" → "Ver avisos", junto al diseño actual (ConditionalCards.tsx); NO están conectados a Inicio.
 * Mismos textos, mismas condiciones y mismos datos (nombre y día/mes; nunca edad ni año). Sin botones, sin degradados, sin sombras y sin opacidad. Son de claro fijo, como todo Inicio.
 */

/** Tarjeta de celebración del cumpleaños propio: cobre oscuro #8B5E34 con todo en crema (no es un botón). */
export function OwnBirthdayCardNew({ name }: { name: string }) {
  const colors = useColors();
  const title = `¡Feliz cumpleaños, ${firstNameOf(name)}!`;
  const subtitle = 'Que tengas un gran entrenamiento hoy';
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={`${title} ${subtitle}`} style={[styles.ownCard, { backgroundColor: colors.navActiveTextSmall }]}>
      <View style={[styles.ownIconCircle, { borderColor: colors.nextClassCardForeground }]} importantForAccessibility="no-hide-descendants">
        <Feather name="gift" size={OWN_ICON_SIZE} color={colors.nextClassCardForeground} />
      </View>
      <View style={styles.ownTextCol} importantForAccessibility="no-hide-descendants">
        <Text style={[styles.ownTitle, { color: colors.nextClassCardForeground }]} numberOfLines={OWN_TITLE_MAX_LINES} maxFontSizeMultiplier={1.3}>
          {title}
        </Text>
        <Text style={[styles.ownSubtitle, { color: colors.nextClassCardForeground }]} maxFontSizeMultiplier={1.3}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

/** Sección "Próximos cumpleaños": el mismo título de siempre y la lista en una tarjeta grafito (sin botones). */
export function UpcomingBirthdaysSectionNew({ birthdays }: { birthdays: UpcomingBirthday[] }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeadingRow}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Próximos cumpleaños</Text>
        <Feather name="gift" size={19} color={colors.navActiveTextSmall} />
      </View>
      <View style={[styles.list, { backgroundColor: colors.nextClassCard }]}>
        {birthdays.map((birthday, i) => {
          const isToday = birthday.daysUntil === 0;
          const last = i === birthdays.length - 1;
          return (
            <View
              key={`${birthday.name}-${birthday.month}-${birthday.day}`}
              accessible
              accessibilityRole="text"
              accessibilityLabel={birthdayRowA11yLabel(birthday)}
              style={[styles.row, !last && { borderBottomWidth: SEPARATOR_WIDTH, borderBottomColor: colors.nextClassCardPressed }]}
            >
              <View style={[styles.avatar, { backgroundColor: colors.charcoalAccent }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Text style={[styles.avatarText, { color: colors.nextClassCard }]} maxFontSizeMultiplier={1.3}>
                  {initialsOf(birthday.name)}
                </Text>
              </View>
              <Text style={[styles.name, { color: colors.nextClassCardForeground }]} numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={1.3}>
                {birthday.name}
              </Text>
              {isToday ? (
                <View style={[styles.todayChip, { borderColor: colors.charcoalAccent }]}>
                  <Feather name="gift" size={TODAY_ICON_SIZE} color={colors.charcoalAccentLight} />
                  <Text style={[styles.todayText, { color: colors.charcoalAccentLight }]} maxFontSizeMultiplier={1.3}>
                    Hoy
                  </Text>
                </View>
              ) : (
                <Text style={[styles.date, { color: NOTICE_BODY_COLOR }]} maxFontSizeMultiplier={1.3}>
                  {dayLabelOf(birthday.month, birthday.day)}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ownCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: OWN_RADIUS, padding: OWN_PADDING },
  ownIconCircle: { width: OWN_ICON_CIRCLE, height: OWN_ICON_CIRCLE, borderRadius: OWN_ICON_CIRCLE / 2, borderWidth: OWN_ICON_CIRCLE_BORDER, alignItems: 'center', justifyContent: 'center' },
  ownTextCol: { flex: 1, gap: 2 },
  ownTitle: { fontSize: OWN_TITLE_SIZE, lineHeight: 20, fontFamily: 'Inter_700Bold' },
  ownSubtitle: { fontSize: OWN_SUBTITLE_SIZE, lineHeight: 18, fontFamily: 'Inter_400Regular' },

  // Título de sección: el de siempre (mismo texto, tamaño y fuente).
  section: { marginTop: SPACING.xs },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONT_SIZE.xl, fontFamily: 'Anton_400Regular' },
  list: { borderRadius: LIST_RADIUS, paddingHorizontal: LIST_PADDING_H },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: ROW_MIN_HEIGHT },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: AVATAR_TEXT_SIZE, fontFamily: 'Inter_600SemiBold' },
  name: { flex: 1, fontSize: NAME_SIZE, fontFamily: 'Inter_600SemiBold' },
  date: { fontSize: DATE_SIZE, letterSpacing: DATE_SPACING, fontFamily: 'Inter_600SemiBold' },
  todayChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: TODAY_BORDER, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  todayText: { fontSize: DATE_SIZE, fontFamily: 'Inter_600SemiBold' },
});
