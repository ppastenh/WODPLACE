import React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { BoxAnnouncement, MyPlan, UpcomingBirthday } from '@workspace/api-client-react';
import { AutoFitImage } from '@/components/AutoFitImage';
import { useColors } from '@/hooks/useColors';
import { MONTH_NAMES } from '@/lib/dateUtils';
import { FONT_SIZE } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

/**
 * TARJETAS CONDICIONALES de Inicio: las que solo aparecen en ciertos casos (cumpleaños propio, aviso del plan, contrato pendiente, aviso fijo del box, WOD de hoy y próximos cumpleaños).
 * Antes vivían en línea dentro de HomeView.tsx; se movieron aquí SIN cambiar su dibujo (mismos estilos, textos y colores) para poder verlas una por una en la pantalla de desarrollo
 * ("Ver avisos") y rediseñarlas por piezas. La CONDICIÓN de cada una (cuándo aparece) sigue en HomeView.tsx: aquí solo se dibujan. Son de claro fijo, como todo Inicio.
 */

// scrollContent has 20px horizontal padding each side; the pinned aviso card itself has 16px padding each side (see pinnedAvisoCard).
const PINNED_AVISO_IMAGE_WIDTH = Dimensions.get('window').width - 40 - 32;

export function getFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] || 'Atleta';
}

function birthdayInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

function birthdayDayLabel(month: number, day: number): string {
  const abbrev = (MONTH_NAMES[month - 1] ?? '').slice(0, 3).toUpperCase();
  return `${day} ${abbrev}`;
}

/** Tarjeta "¡Feliz cumpleaños, Nombre!" (hoy es el cumpleaños de la alumna). */
export function OwnBirthdayCard({ name }: { name: string }) {
  const colors = useColors();
  return (
    <View style={[styles.ownBirthdayCard, { backgroundColor: colors.accent }]}>
      <View style={[styles.iconBadge, { backgroundColor: colors.card }]}>
        <Feather name="gift" size={17} color={colors.navActive} />
      </View>
      <View style={styles.ownBirthdayTextCol}>
        <Text style={[styles.ownBirthdayTitle, { color: colors.accentForeground }]}>¡Feliz cumpleaños, {getFirstName(name)}!</Text>
        <Text style={[styles.ownBirthdaySubtitle, { color: colors.accentForeground }]}>Que tengas un gran entrenamiento hoy</Text>
      </View>
    </View>
  );
}

/** Aviso del plan: "Te quedan N clases este período." y/o "Tu plan vence en N días." (cada línea aparece sola si cumple su regla). */
export function PlanNoticeCard({ plan }: { plan: MyPlan }) {
  const colors = useColors();
  return (
    <View style={[styles.noticeCard, { backgroundColor: colors.warningBackground }]}>
      <View style={[styles.noticeIcon, { backgroundColor: colors.warning }]}>
        <Feather name="alert-circle" size={16} color={colors.warningForeground} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        {plan.classesPerPeriod != null && plan.classesRemaining != null && plan.classesRemaining <= 2 ? (
          <Text style={[styles.noticeText, { color: colors.foreground }]}>
            Te quedan {plan.classesRemaining} clase{plan.classesRemaining === 1 ? '' : 's'} este período.
          </Text>
        ) : null}
        {plan.daysUntilRenewal != null && plan.daysUntilRenewal <= 7 ? (
          <Text style={[styles.noticeText, { color: colors.foreground }]}>
            Tu plan {plan.daysUntilRenewal <= 0 ? 'vence hoy' : `vence en ${plan.daysUntilRenewal} día${plan.daysUntilRenewal === 1 ? '' : 's'}`}.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Aviso "Tienes un contrato pendiente de leer y aceptar": toda la tarjeta es un botón que abre Contratos Activos. */
export function PendingContractCard({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ir a Contratos Activos"
      onPress={onPress}
      style={({ pressed }) => [styles.pinnedAvisoCard, { backgroundColor: pressed ? colors.warningBackgroundPressed : colors.warningBackground }]}
    >
      <View style={styles.cardHeadingRow}>
        <Text style={[styles.cardEyebrow, { color: colors.creamMuted }]}>Aviso Importante</Text>
        <Feather name="file-text" size={16} color={colors.warning} />
      </View>
      <Text style={[styles.pinnedAvisoTitle, { color: colors.foreground }]}>Tienes un contrato pendiente de leer y aceptar</Text>
      <Text style={[styles.pinnedAvisoBodyBold, { color: colors.foreground }]}>
        Toca aquí para revisarlo en Contratos Activos. Mientras esté pendiente, no podrás hacer nuevas reservas.
      </Text>
    </Pressable>
  );
}

/** Aviso fijo del box (el más reciente aviso "push", lea o no la alumna): con imagen opcional, título y hasta 3 líneas de texto. Sin botones. */
export function PinnedAvisoCard({ announcement }: { announcement: BoxAnnouncement }) {
  const colors = useColors();
  return (
    <View style={[styles.pinnedAvisoCard, { backgroundColor: colors.warningBackground }]}>
      <View style={styles.cardHeadingRow}>
        <Text style={[styles.cardEyebrow, { color: colors.creamMuted }]}>Aviso Importante</Text>
        <Feather name="bell" size={16} color={colors.warning} />
      </View>
      {announcement.imageUrl ? (
        <View style={styles.pinnedAvisoImageWrap}>
          <AutoFitImage uri={announcement.imageUrl} width={PINNED_AVISO_IMAGE_WIDTH} borderRadius={12} />
        </View>
      ) : null}
      <Text style={[styles.pinnedAvisoTitle, { color: colors.foreground }]}>{announcement.title}</Text>
      {announcement.body ? (
        <Text style={[styles.pinnedAvisoBodyBold, { color: colors.foreground }]} numberOfLines={3}>
          {announcement.body}
        </Text>
      ) : null}
    </View>
  );
}

/** Tarjeta "WOD de hoy" (con " · registrado" si la alumna ya registró su resultado): toda la tarjeta es un botón que abre el WOD. */
export function WodTodayCard({ wod, onPress }: { wod: { name: string; description: string; myResult?: unknown }; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ver WOD de hoy"
      onPress={onPress}
      style={({ pressed }) => [styles.wodCard, { backgroundColor: pressed ? colors.accentPressed : colors.accent }]}
    >
      <View style={styles.smallCardHeader}>
        <View style={styles.wodTitleRow}>
          <Feather name="zap" size={18} color={colors.accentForeground} />
          <Text style={[styles.smallCardLabel, { color: colors.accentForeground, marginTop: 0 }]}>WOD de hoy{wod.myResult ? ' · registrado' : ''}</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.accentForeground} />
      </View>
      <Text style={[styles.wodName, { color: colors.accentForeground }]}>{wod.name}</Text>
      <Text style={[styles.wodDescription, { color: colors.accentForeground }]} numberOfLines={2}>
        {wod.description}
      </Text>
    </Pressable>
  );
}

/** Sección "Próximos cumpleaños": iniciales, nombre y día ("Hoy" si es hoy). Nunca muestra edad ni año. Sin botones. */
export function UpcomingBirthdaysSection({ birthdays }: { birthdays: UpcomingBirthday[] }) {
  const colors = useColors();
  return (
    <View style={styles.birthdaySection}>
      <View style={styles.sectionHeadingRow}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Próximos cumpleaños</Text>
        <Feather name="gift" size={19} color={colors.navActiveTextSmall} />
      </View>
      <View style={styles.birthdayList}>
        {birthdays.map((birthday) => (
          <View key={`${birthday.name}-${birthday.month}-${birthday.day}`} style={styles.birthdayRow}>
            <View style={[styles.avatar, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
              <Text style={[styles.avatarText, { color: colors.navActiveTextSmall }]}>{birthdayInitials(birthday.name)}</Text>
            </View>
            <Text style={[styles.birthdayName, { color: colors.foreground }]}>{birthday.name}</Text>
            <Text style={[styles.birthdayDay, { color: colors.creamMuted }]}>
              {birthday.daysUntil === 0 ? 'Hoy' : birthdayDayLabel(birthday.month, birthday.day)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pinnedAvisoCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  pinnedAvisoImageWrap: {
    marginTop: SPACING.xs,
  },
  pinnedAvisoTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
  },
  pinnedAvisoBodyBold: {
    fontSize: FONT_SIZE.sm,
    lineHeight: 18,
    fontFamily: 'Inter_700Bold',
  },
  cardHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardEyebrow: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_600SemiBold',
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: 13,
  },
  ownBirthdayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: 13,
  },
  ownBirthdayTextCol: {
    flex: 1,
    gap: 1,
  },
  ownBirthdayTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_700Bold',
  },
  ownBirthdaySubtitle: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_500Medium',
  },
  noticeIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    lineHeight: 17,
    fontFamily: 'Inter_600SemiBold',
  },
  wodCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginTop: SPACING.md,
  },
  wodTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  wodName: { fontSize: FONT_SIZE.lg, fontFamily: 'Anton_400Regular', marginTop: SPACING.sm2 },
  wodDescription: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_400Regular',
    marginTop: SPACING.xs2,
    lineHeight: 16,
  },
  smallCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallCardLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_600SemiBold',
    marginTop: SPACING.lg,
  },
  birthdaySection: {
    marginTop: SPACING.xs,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.xl,
    fontFamily: 'Anton_400Regular',
  },
  birthdayList: {
    gap: SPACING.sm2,
  },
  birthdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: 45,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_700Bold',
  },
  birthdayName: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_600SemiBold',
  },
  birthdayDay: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_700Bold',
  },
});
