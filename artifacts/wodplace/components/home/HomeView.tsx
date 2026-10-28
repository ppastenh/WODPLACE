import React, { useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line } from 'react-native-svg';
import {
  SKILL_LEVEL_LABELS,
  type BoxAnnouncement,
  type MyPlan,
  type SkillLevel,
  type TodayWod,
  type UpcomingBirthday,
} from '@workspace/api-client-react';
import { AutoFitImage } from '@/components/AutoFitImage';
import { JoinBoxCard } from '@/components/JoinBoxCard';
import { MedalBadge } from '@/components/MedalBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import type { useBooking } from '@/context/BookingContext';
import { useColors } from '@/hooks/useColors';
import { getMedalIconColor } from '@/lib/medalColors';
import { coachLine, type nextClassCardState } from '@/lib/nextClassCard';
import { monthlyCardParts, type PlanProgressView } from '@/lib/planProgress';
import { formatClassDateShort, formatHM, MONTH_NAMES } from '@/lib/dateUtils';
import { FONT_SIZE } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

/**
 * Lo que se DIBUJA en Inicio. HomeScreen (app/home.tsx) calcula todo (consultas, reglas, sesión) y se lo entrega a este
 * componente como `data`, junto con los eventos; aquí no hay consultas ni reglas. Los textos fijos de las tarjetas
 * ("Tu próxima clase", "Plan ilimitado", ...) viven aquí: los datos traen valores, no frases.
 */
export type HomeViewData = {
  user: { name: string; rank: SkillLevel };
  myBox: { name: string; photoUrl?: string | null } | null;
  isOwnBirthdayToday: boolean;
  /** true / false = ya se sabe; null = todavía cargando. */
  hasBoxMembership: boolean | null;
  hasActivePlan: boolean | null;
  myPlan: MyPlan | null;
  nearPlanLimit: boolean;
  nextClassState: ReturnType<typeof nextClassCardState>;
  nextBooked: ReturnType<ReturnType<typeof useBooking>['getUpcomingBooked']>[number] | null;
  quote: string;
  /** Contrato pendiente de leer y aceptar, y la cuenta no es de personal del box. */
  hasPendingContract: boolean;
  pinnedPush: BoxAnnouncement | null;
  todayWod: TodayWod | null;
  planView: PlanProgressView;
  achievementStats: { currentStreakDays?: number | null } | null;
  rotatingFeaturedPr: { liftName: string; weightKg: number } | null;
  medalsSummary: {
    totalUnlocked: number;
    totalAchievements: number;
    recent: { id: string; icon: React.ComponentProps<typeof MedalBadge>['icon']; name: string }[];
  };
  birthdays: UpcomingBirthday[];
};

export type HomeViewEvents = {
  onJoinBox: () => void;
  onOpenCalendar: () => void;
  onOpenContracts: () => void;
  onOpenWod: () => void;
  onOpenRm: () => void;
  onOpenProfile: () => void;
  onOpenMedals: () => void;
  onShareQuote: () => void;
};

/** Purely decorative, no photos: a faint diagonal-line pattern (abstract
 *  "weight plates lined up" motif) behind the header's text, low enough
 *  opacity to never compete with the greeting/box name sitting on top of
 *  it. `color` is supplied by the caller so it follows the theme's own
 *  accent instead of a hardcoded value. */
function HeaderPattern({ color }: { color: string }) {
  const lines = Array.from({ length: 10 }, (_, i) => i * 16);
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      {lines.map((x) => (
        <Line
          key={x}
          x1={x}
          y1={0}
          x2={x - 40}
          y2={120}
          stroke={color}
          strokeWidth={10}
          strokeOpacity={0.06}
        />
      ))}
    </Svg>
  );
}

/** The box logo in Home's header — height-fixed, width follows the image's
 *  real aspect ratio (measured on load), never cropped or circle-masked
 *  (unlike the small round badge used elsewhere in the app). */
function BoxLogoImage({ uri, height = 48 }: { uri: string; height?: number }) {
  const [ratio, setRatio] = useState<number | null>(null);
  const width = ratio ? height * ratio : height;
  return (
    <Image
      source={{ uri }}
      style={{ width, height, borderRadius: 8 }}
      contentFit="contain"
      transition={300}
      onLoad={(event) => {
        const { width: w, height: h } = event.source;
        if (w > 0 && h > 0) setRatio(w / h);
      }}
    />
  );
}

// scrollContent has 20px horizontal padding each side; the pinned aviso
// card itself has 16px padding each side (see pinnedAvisoCard).
const PINNED_AVISO_IMAGE_WIDTH = Dimensions.get('window').width - 40 - 32;

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

function getFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] || 'Atleta';
}


// Matches the level values box-admin's own class-scheduling UI writes
// (classes.tsx's level Select) -- "todos" means no restriction, shown as
// "Todos los niveles" rather than literally "Todos".
const CLASS_LEVEL_LABELS: Record<string, string> = {
  todos: 'Todos los niveles',
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

export function HomeView({ data, events }: { data: HomeViewData; events: HomeViewEvents }) {
  const colors = useColors();
  const {
    user,
    myBox,
    isOwnBirthdayToday,
    hasBoxMembership,
    hasActivePlan,
    myPlan,
    nearPlanLimit,
    nextClassState,
    nextBooked,
    quote,
    hasPendingContract,
    pinnedPush,
    todayWod,
    planView,
    achievementStats,
    rotatingFeaturedPr,
    medalsSummary,
    birthdays,
  } = data;
  const monthly = monthlyCardParts(planView);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.homeHeaderWrap, { backgroundColor: colors.card }]}>
        <HeaderPattern color={colors.navActive} />
        <View style={styles.homeHeaderGroup}>
        {myBox?.photoUrl ? (
          <BoxLogoImage uri={myBox.photoUrl} height={48} />
        ) : myBox ? (
          <View style={[styles.boxLogoFallback, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.boxLogoFallbackText, { color: colors.navActive }]}>
              {myBox.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        ) : null}
        <View style={styles.homeHeaderTextCol}>
          {myBox ? (
            <Text
              style={[styles.boxBadgeNameSmall, { color: colors.navActiveTextSmall }]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {myBox.name}
            </Text>
          ) : null}
          <Text style={[styles.greeting, { color: colors.foreground }]}>
            Hola, {getFirstName(user.name)}
          </Text>
        </View>
        </View>
      </View>
      <View style={[styles.homeHeaderDivider, { backgroundColor: colors.navActive }]} />

      {isOwnBirthdayToday ? (
        <View style={[styles.ownBirthdayCard, { backgroundColor: colors.accent }]}>
          <View style={[styles.iconBadge, { backgroundColor: colors.card }]}>
            <Feather name="gift" size={17} color={colors.navActive} />
          </View>
          <View style={styles.ownBirthdayTextCol}>
            <Text style={[styles.ownBirthdayTitle, { color: colors.accentForeground }]}>
              ¡Feliz cumpleaños, {getFirstName(user.name)}!
            </Text>
            <Text style={[styles.ownBirthdaySubtitle, { color: colors.accentForeground }]}>
              Que tengas un gran entrenamiento hoy
            </Text>
          </View>
        </View>
      ) : null}

      {hasBoxMembership === false ? (
        <JoinBoxCard onPress={() => events.onJoinBox()} />
      ) : null}

      {hasActivePlan && nearPlanLimit ? (
        <View style={[styles.noticeCard, { backgroundColor: colors.warningBackground }]}>
          <View style={[styles.noticeIcon, { backgroundColor: colors.warning }]}>
            <Feather name="alert-circle" size={16} color={colors.warningForeground} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            {myPlan!.classesPerPeriod != null &&
            myPlan!.classesRemaining != null &&
            myPlan!.classesRemaining <= 2 ? (
              <Text style={[styles.noticeText, { color: colors.foreground }]}>
                Te quedan {myPlan!.classesRemaining} clase{myPlan!.classesRemaining === 1 ? '' : 's'} este período.
              </Text>
            ) : null}
            {myPlan!.daysUntilRenewal != null && myPlan!.daysUntilRenewal <= 7 ? (
              <Text style={[styles.noticeText, { color: colors.foreground }]}>
                Tu plan {myPlan!.daysUntilRenewal <= 0
                  ? 'vence hoy'
                  : `vence en ${myPlan!.daysUntilRenewal} día${myPlan!.daysUntilRenewal === 1 ? '' : 's'}`}.
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {hasBoxMembership && nextClassState === 'loading' ? (
        // Cargando: ni invitación ni datos; esqueleto con la misma forma y altura de la tarjeta.
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Cargando tu próxima clase"
          style={[styles.nextClassCard, { backgroundColor: colors.nextClassCard }]}
        >
          <Skeleton width="40%" height={SPACING.xxl} />
          <View style={styles.nextClassSkeletonBottom}>
            <Skeleton width="85%" height={FONT_SIZE.hero} />
            <Skeleton width="60%" height={FONT_SIZE.xs} />
          </View>
        </View>
      ) : null}

      {hasBoxMembership && nextClassState === 'invite' ? (
        // Sin reserva (haya o no clases, o haya fallado la carga): solo la invitación.
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ir al Calendario para reservar una clase"
          onPress={() => events.onOpenCalendar()}
          style={({ pressed }) => [
            styles.nextClassCard,
            { backgroundColor: pressed ? colors.nextClassCardPressed : colors.nextClassCard },
          ]}
        >
          <View style={styles.nextClassTopEnd}>
            <Feather name="arrow-up-right" size={18} color={colors.nextClassCardForeground} />
          </View>
          <Text style={[styles.nextClassName, { color: colors.nextClassCardForeground }]} numberOfLines={2}>
            Reserva tu próxima clase
          </Text>
        </Pressable>
      ) : null}

      {hasBoxMembership && nextClassState === 'booked' && nextBooked ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver próxima clase"
          onPress={() => events.onOpenCalendar()}
          style={({ pressed }) => [
            styles.nextClassCard,
            { backgroundColor: pressed ? colors.nextClassCardPressed : colors.nextClassCard },
          ]}
        >
          <View style={styles.nextClassTop}>
            <View style={[styles.timeChip, { backgroundColor: colors.navActive }]}>
              <Feather name="calendar" size={13} color={colors.card} />
              <Text style={[styles.timeChipText, { color: colors.card }]} numberOfLines={1}>
                {formatClassDateShort(nextBooked.startDate)} · {formatHM(nextBooked.startMinutes)}
              </Text>
            </View>
            <Feather name="arrow-up-right" size={18} color={colors.nextClassCardForeground} />
          </View>
          <Text style={[styles.nextClassLabel, { color: colors.nextClassCardForeground }]}>Tu próxima clase</Text>
          <Text style={[styles.nextClassName, { color: colors.nextClassCardForeground }]}>{nextBooked.type}</Text>
          {coachLine(nextBooked.coach) ? (
            <Text style={[styles.nextClassCoach, { color: colors.inactive }]}>{coachLine(nextBooked.coach)}</Text>
          ) : null}
          <View style={styles.nextClassMetaRow}>
            <View style={styles.nextClassMetaChip}>
              <Feather name="clock" size={12} color={colors.inactive} />
              <Text style={[styles.nextClassMetaText, { color: colors.inactive }]}>{nextBooked.durationLabel}</Text>
            </View>
            <View style={styles.nextClassMetaChip}>
              <Feather name="bar-chart-2" size={12} color={colors.inactive} />
              <Text style={[styles.nextClassMetaText, { color: colors.inactive }]}>
                {CLASS_LEVEL_LABELS[nextBooked.level] ?? nextBooked.level}
              </Text>
            </View>
          </View>
        </Pressable>
      ) : null}

      <LinearGradient
        colors={[colors.accent, colors.accentGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.quoteRow}
      >
        <MaterialCommunityIcons
          name="image-filter-hdr"
          size={30}
          color={colors.accentForeground}
          style={styles.quoteIconLeft}
        />
        <View style={styles.quoteRowTextWrap}>
          <Text style={[styles.quoteRowText, { color: colors.accentForeground }]} numberOfLines={3}>
            {quote.toUpperCase()}
          </Text>
        </View>
        <View style={styles.quoteRowActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Compartir frase motivacional"
            onPress={events.onShareQuote}
            hitSlop={10}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Feather name="share-2" size={16} color={colors.accentForeground} />
          </Pressable>
          <Feather name="chevron-right" size={20} color={colors.accentForeground} />
        </View>
      </LinearGradient>

      {hasBoxMembership && hasPendingContract ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ir a Contratos Activos"
          onPress={() => events.onOpenContracts()}
          style={({ pressed }) => [
            styles.pinnedAvisoCard,
            { backgroundColor: colors.warningBackground },
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.cardHeadingRow}>
            <Text style={[styles.cardEyebrow, { color: colors.navInactive }]}>Aviso Importante</Text>
            <Feather name="file-text" size={16} color={colors.warning} />
          </View>
          <Text style={[styles.pinnedAvisoTitle, { color: colors.foreground }]}>
            Tienes un contrato pendiente de leer y aceptar
          </Text>
          <Text style={[styles.pinnedAvisoBodyBold, { color: colors.foreground }]}>
            Toca aquí para revisarlo en Contratos Activos. Mientras esté pendiente, no podrás hacer
            nuevas reservas.
          </Text>
        </Pressable>
      ) : null}

      {hasBoxMembership && pinnedPush ? (
        <View style={[styles.pinnedAvisoCard, { backgroundColor: colors.warningBackground }]}>
          <View style={styles.cardHeadingRow}>
            <Text style={[styles.cardEyebrow, { color: colors.navInactive }]}>Aviso Importante</Text>
            <Feather name="bell" size={16} color={colors.warning} />
          </View>
          {pinnedPush.imageUrl ? (
            <View style={styles.pinnedAvisoImageWrap}>
              <AutoFitImage uri={pinnedPush.imageUrl} width={PINNED_AVISO_IMAGE_WIDTH} borderRadius={12} />
            </View>
          ) : null}
          <Text style={[styles.pinnedAvisoTitle, { color: colors.foreground }]}>
            {pinnedPush.title}
          </Text>
          {pinnedPush.body ? (
            <Text style={[styles.pinnedAvisoBodyBold, { color: colors.foreground }]} numberOfLines={3}>
              {pinnedPush.body}
            </Text>
          ) : null}
        </View>
      ) : null}

      {hasBoxMembership && todayWod ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver WOD de hoy"
          onPress={() => events.onOpenWod()}
          style={({ pressed }) => [
            styles.wodCard,
            { backgroundColor: colors.accent },
            pressed && styles.pressedCard,
          ]}
        >
          <View style={styles.smallCardHeader}>
            <View style={styles.wodTitleRow}>
              <Feather name="zap" size={18} color={colors.accentForeground} />
              <Text style={[styles.smallCardLabel, { color: colors.accentForeground, marginTop: 0 }]}>
                WOD de hoy{todayWod.myResult ? ' · registrado' : ''}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.accentForeground} />
          </View>
          <Text style={[styles.wodName, { color: colors.accentForeground }]}>{todayWod.name}</Text>
          <Text style={[styles.wodDescription, { color: colors.accentForeground }]} numberOfLines={2}>
            {todayWod.description}
          </Text>
        </Pressable>
      ) : null}

      {planView.kind === 'loading' ? (
        <View style={[styles.wideCard, { backgroundColor: colors.card }]}>
          <Skeleton width="45%" height={FONT_SIZE.xs} />
          <View style={styles.monthlySkeletonBottom}>
            <Skeleton width="30%" height={FONT_SIZE.display} />
            <Skeleton width="100%" height={7} />
            <Skeleton width="55%" height={FONT_SIZE.xs} />
          </View>
        </View>
      ) : planView.kind === 'none' ? (
        <View style={[styles.monthlyEmptyCard, { backgroundColor: colors.card }]}>
          <View>
            <Text style={[styles.smallCardLabel, styles.monthlyTitle, { color: colors.navInactive }]} maxFontSizeMultiplier={1.3}>
              Progreso mensual
            </Text>
            <Text style={[styles.statsValue, { color: colors.foreground }]} maxFontSizeMultiplier={1.3}>
              —
            </Text>
          </View>
          <Text style={[styles.statsDetail, { color: colors.navInactive }]} maxFontSizeMultiplier={1.3}>
            Sin plan activo
          </Text>
        </View>
      ) : monthly ? (
        <View style={[styles.wideCard, { backgroundColor: colors.card }]}>
          <View style={styles.monthlyHeader}>
            <Text style={[styles.smallCardLabel, styles.monthlyTitle, { color: colors.navInactive }]} maxFontSizeMultiplier={1.3}>
              Progreso mensual
            </Text>
            <View style={styles.monthlyTopEnd}>
              {monthly.chip ? (
                <View style={[styles.planChip, styles.monthlyChip, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.planChipText, { color: colors.accentForeground }]} maxFontSizeMultiplier={1.3}>
                    {monthly.chip}
                  </Text>
                </View>
              ) : null}
              {monthly.topRightReserved || monthly.chipReserved ? (
                <Text style={[styles.statsDetail, { color: colors.navInactive }]} maxFontSizeMultiplier={1.3}>
                  {monthly.topRightReserved ?? monthly.chipReserved}
                </Text>
              ) : null}
            </View>
          </View>
          <Text style={[styles.statsValue, { color: colors.foreground }]} maxFontSizeMultiplier={1.3}>
            {monthly.value}
            {monthly.totalSuffix ? (
              <Text style={[styles.monthlyTotal, { color: colors.navInactive }]}>{monthly.totalSuffix}</Text>
            ) : null}
          </Text>
          {monthly.showBar ? (
            <View style={[styles.progressTrack, { backgroundColor: colors.input, marginTop: SPACING.sm }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.navActive, width: `${monthly.ratio * 100}%` }]} />
            </View>
          ) : null}
          <Text style={[styles.statsDetail, { color: colors.navInactive }]} maxFontSizeMultiplier={1.3}>
            {monthly.legend}
          </Text>
        </View>
      ) : null}

      <View style={styles.twoColumnRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver perfil"
          onPress={() => events.onOpenProfile()}
          style={({ pressed }) => [
            styles.statsCard,
            { backgroundColor: colors.card },
            pressed && styles.pressedCard,
          ]}
        >
          <View style={styles.smallCardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: colors.accent }]}>
              <Feather name="shield" size={17} color={colors.accentForeground} />
            </View>
            <Feather name="chevron-right" size={18} color={colors.navInactive} />
          </View>
          <Text style={[styles.smallCardLabel, { color: colors.navInactive }]} maxFontSizeMultiplier={1.3}>
            Tu nivel
          </Text>
          <Text
            style={[styles.statsValue, { color: colors.foreground }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            maxFontSizeMultiplier={1.3}
          >
            {SKILL_LEVEL_LABELS[user.rank] ?? user.rank}
          </Text>
          <Text
            style={[styles.statsDetail, { color: colors.navInactive }]}
            maxFontSizeMultiplier={1.3}
          >
            Sigue avanzando
          </Text>
        </Pressable>
        <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
          <View style={styles.smallCardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: colors.warningBackground }]}>
              <MaterialCommunityIcons name="fire" size={18} color={colors.warning} />
            </View>
          </View>
          <Text style={[styles.smallCardLabel, { color: colors.navInactive }]} maxFontSizeMultiplier={1.3}>
            Racha de constancia
          </Text>
          <Text
            style={[styles.statsValue, { color: colors.foreground }]}
            maxFontSizeMultiplier={1.3}
          >
            {achievementStats?.currentStreakDays ?? 0}
          </Text>
          <Text
            style={[styles.statsDetail, { color: colors.navInactive }]}
            maxFontSizeMultiplier={1.3}
          >
            {achievementStats?.currentStreakDays ? 'días seguidos' : 'Empieza hoy'}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ver progreso y PRs"
        onPress={() => events.onOpenRm()}
        style={({ pressed }) => [
          styles.wideCard,
          { backgroundColor: colors.successBackground },
          pressed && styles.pressedCard,
        ]}
      >
        <View style={styles.smallCardHeader}>
          <View style={[styles.iconBadge, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons name="trophy-outline" size={18} color={colors.success} />
          </View>
          <Feather name="chevron-right" size={18} color={colors.navInactive} />
        </View>
        <Text style={[styles.smallCardLabel, { color: colors.navInactive }]} maxFontSizeMultiplier={1.3}>
          PR destacado
        </Text>
        {rotatingFeaturedPr ? (
          <>
            <Text
              style={[styles.statsValue, { color: colors.foreground }]}
              numberOfLines={2}
              maxFontSizeMultiplier={1.3}
            >
              {rotatingFeaturedPr.liftName}
            </Text>
            <Text
              style={[styles.statsDetail, { color: colors.navInactive }]}
              maxFontSizeMultiplier={1.3}
            >
              {rotatingFeaturedPr.weightKg} kg
            </Text>
          </>
        ) : (
          <>
            <Text
              style={[styles.prEmptyValue, { color: colors.foreground }]}
              maxFontSizeMultiplier={1.3}
            >
              Aún no hay PRs
            </Text>
            <Text
              style={[styles.statsDetail, { color: colors.navInactive }]}
              maxFontSizeMultiplier={1.3}
            >
              Registra tu primera marca
            </Text>
          </>
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ver medallas"
        onPress={() => events.onOpenMedals()}
        style={({ pressed }) => [
          styles.medalsWideCard,
          { backgroundColor: colors.card, marginTop: 12 },
          pressed && styles.pressedCard,
        ]}
      >
        <View style={styles.medalsWideLeft}>
          <View style={styles.smallCardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: colors.accent }]}>
              <Feather name="award" size={17} color={colors.accentForeground} />
            </View>
          </View>
          <Text style={[styles.smallCardLabel, { color: colors.navInactive }]} maxFontSizeMultiplier={1.3}>
            Medallas
          </Text>
          <Text
            style={[styles.statsValue, { color: colors.foreground }]}
            maxFontSizeMultiplier={1.3}
          >
            {medalsSummary.totalUnlocked} de {medalsSummary.totalAchievements}
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: colors.input, marginTop: 6 }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.navActive,
                  width: `${
                    medalsSummary.totalAchievements > 0
                      ? (medalsSummary.totalUnlocked / medalsSummary.totalAchievements) * 100
                      : 0
                  }%`,
                },
              ]}
            />
          </View>
        </View>
        <View style={styles.medalsWideRight}>
          {medalsSummary.recent[0] ? (
            <>
              <MedalBadge
                icon={medalsSummary.recent[0].icon}
                unlocked
                size={40}
                showRibbon={false}
                iconColor={getMedalIconColor(medalsSummary.recent[0].id)}
              />
              <Text
                style={[styles.medalsRecentName, { color: colors.navInactive }]}
                numberOfLines={2}
                maxFontSizeMultiplier={1.3}
              >
                {medalsSummary.recent[0].name}
              </Text>
            </>
          ) : (
            <Text
              style={[styles.statsDetail, { color: colors.navInactive }]}
              maxFontSizeMultiplier={1.3}
            >
              Desbloquea tu primera
            </Text>
          )}
        </View>
      </Pressable>

      {hasBoxMembership && birthdays.length > 0 ? (
        <View style={styles.birthdaySection}>
          <View style={styles.sectionHeadingRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Próximos cumpleaños
            </Text>
            <Feather name="gift" size={19} color={colors.navActive} />
          </View>
          <View style={styles.birthdayList}>
            {birthdays.map((birthday) => (
              <View key={`${birthday.name}-${birthday.month}-${birthday.day}`} style={styles.birthdayRow}>
                <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.avatarText, { color: colors.navActive }]}>
                    {birthdayInitials(birthday.name)}
                  </Text>
                </View>
                <Text style={[styles.birthdayName, { color: colors.foreground }]}>
                  {birthday.name}
                </Text>
                <Text style={[styles.birthdayDay, { color: colors.navInactive }]}>
                  {birthday.daysUntil === 0 ? 'Hoy' : birthdayDayLabel(birthday.month, birthday.day)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Fase 1 (tokens): solo valores que calzan EXACTO con SPACING/RADIUS.
  // Fase 2, paso 1 (2026-10-21): los 8/4 que eran gap/marginTop reales ya
  // se migraron a SPACING.sm2/xs2. El borderRadius:8 de BoxLogoImage (más
  // arriba, estilo inline) NO se tocó: es un radio, no un espaciado, y no
  // hay un escalón RADIUS de valor 8.
  // 11, 14, 1, 13, 15, 18, 170, 1, 3, 5, 104, 32, 45, etc. no calzan con
  // ningún token de la escala y quedan sin tocar a propósito -- ver la
  // propuesta de Fase 2 (alineación) en AUDITORIA-VISUAL.md antes de
  // mover cualquiera de esos.
  scrollContent: {
    paddingHorizontal: SPACING.xxl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxxl,
    gap: 11,
  },
  homeHeaderWrap: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 14,
  },
  homeHeaderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  homeHeaderTextCol: {
    flex: 1,
    gap: SPACING.xs,
  },
  greeting: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Inter_700Bold',
  },
  boxLogoFallback: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxLogoFallbackText: {
    fontSize: FONT_SIZE.lg,
    fontFamily: 'Inter_700Bold',
  },
  boxBadgeNameSmall: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_700Bold',
    flexShrink: 1,
  },
  homeHeaderDivider: {
    height: 2,
    borderRadius: 1,
  },
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
  progressTrack: {
    height: 7,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    marginTop: SPACING.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.sm,
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
  nextClassCard: {
    borderRadius: RADIUS.xl,
    padding: 18,
    minHeight: 170,
    justifyContent: 'space-between',
  },
  nextClassTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Chip "Plan ilimitado" del mosaico "Clases del plan": mismos tokens que el resto (accent / accentForeground).
  planChip: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginTop: SPACING.sm,
  },
  planChipText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_700Bold',
  },
  // Invitación sin chip: la flecha va a la derecha.
  nextClassTopEnd: { alignItems: 'flex-end' },
  // Esqueleto: los dos renglones de abajo, separados como el título y la línea de la tarjeta real.
  nextClassSkeletonBottom: { gap: SPACING.md },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.full,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  timeChipText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_700Bold',
  },
  nextClassLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_500Medium',
    marginTop: SPACING.lg,
  },
  nextClassName: {
    fontSize: FONT_SIZE.hero,
    fontFamily: 'Anton_400Regular',
    marginTop: 1,
  },
  nextClassCoach: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_500Medium',
    marginTop: 3,
  },
  nextClassMetaRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  nextClassMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  nextClassMetaText: {
    fontSize: FONT_SIZE.xs,
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
  wideCard: {
    minHeight: 112,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  monthlyEmptyCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  monthlyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  monthlyTitle: { marginTop: 0 },
  monthlyTopEnd: { alignItems: 'flex-end' },
  monthlyChip: { marginTop: 0, alignSelf: 'flex-end' },
  monthlyTotal: {
    fontSize: FONT_SIZE.base,
    fontFamily: 'Inter_600SemiBold',
  },
  monthlySkeletonBottom: { gap: SPACING.md, marginTop: SPACING.md },
  twoColumnRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  statsCard: {
    flex: 1,
    minHeight: 112,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  statsValue: {
    fontSize: FONT_SIZE.display,
    lineHeight: 26,
    fontFamily: 'Anton_400Regular',
    marginTop: SPACING.sm2,
  },
  statsDetail: {
    fontSize: FONT_SIZE.xs,
    lineHeight: 15,
    fontFamily: 'Inter_500Medium',
    marginTop: 3,
  },
  // "PR destacado" empty state only — deliberately smaller than statsValue
  // so "Aún no hay PRs" fits the card's width without truncating (statsValue
  // is 22px Anton, too wide for that string in a 2-column card).
  prEmptyValue: {
    fontSize: FONT_SIZE.sm,
    lineHeight: 16,
    fontFamily: 'Inter_700Bold',
    marginTop: SPACING.sm2,
  },
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 104,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    gap: SPACING.lg,
  },
  quoteIconLeft: {
    opacity: 0.8,
  },
  quoteRowTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  quoteRowText: {
    fontSize: FONT_SIZE.base,
    lineHeight: 18,
    fontFamily: 'Inter_700Bold',
    fontStyle: 'italic',
  },
  quoteRowActions: {
    alignItems: 'center',
    gap: SPACING.sm2,
  },
  medalsWideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  medalsWideLeft: {
    flex: 1,
  },
  medalsWideRight: {
    alignItems: 'center',
    gap: SPACING.sm,
    width: 72,
  },
  medalsRecentName: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
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
  pressed: { opacity: 0.65 },
  pressedCard: { opacity: 0.88 },
});