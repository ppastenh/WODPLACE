import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { AutoFitImage } from '@/components/AutoFitImage';

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
import { router, usePathname, useFocusEffect } from 'expo-router';
import {
  getAchievements,
  getBoxAnnouncements,
  getMyPlans,
  getTodayWod,
  getUpcomingBirthdays,
  markAnnouncementRead,
  markBoxWelcomeShown,
  type BoxAnnouncement,
} from '@workspace/api-client-react';
import { AnnouncementModal } from '@/components/AnnouncementModal';
import { AppHeader } from '@/components/AppHeader';
import { MedalBadge } from '@/components/MedalBadge';
import { JoinBoxCard } from '@/components/JoinBoxCard';
import { JoinBoxModal } from '@/components/JoinBoxModal';
import { SideDrawer, DrawerNavItem } from '@/components/SideDrawer';
import { useAuth } from '@/context/AuthContext';
import { useBooking } from '@/context/BookingContext';
import { useNotifications } from '@/context/NotificationsContext';
import { useColors } from '@/hooks/useColors';
import { getAdminNavItem, shouldShowContracts } from '@/lib/navigation';
import { useRefetchOnFocusIfStale } from '@/lib/useRefetchOnFocusIfStale';
import {
  addDays,
  formatDayLabel,
  formatHM,
  MONTH_NAMES,
  toDateKey,
} from '@/lib/dateUtils';
import { hashString } from '@/constants/classSchedule';

// scrollContent has 20px horizontal padding each side; the pinned aviso
// card itself has 16px padding each side (see pinnedAvisoCard).
const PINNED_AVISO_IMAGE_WIDTH = Dimensions.get('window').width - 40 - 32;

const DAILY_QUOTES = [
  'La constancia de hoy construye la fuerza de mañana.',
  'Cada repetición cuenta cuando eliges seguir avanzando.',
  'Entrenar también es una forma de cuidar tu mente.',
  'No necesitas hacerlo perfecto; necesitas volver a intentarlo.',
  'Tu progreso se mide en disciplina, no en comparación.',
];

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

type CoachNotice = {
  text: string;
  active: boolean;
};

// The coach dashboard can replace this local seed with an active API notice
// without changing the Home layout.
const COACH_NOTICE: CoachNotice = {
  active: false,
  text: 'Trae guantes — WOD con cuerdas.',
};

function getFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] || 'Atleta';
}


function findNextAvailableSession(
  now: Date,
  getSessionsForDate: ReturnType<typeof useBooking>['getSessionsForDate'],
) {
  for (let offset = 0; offset < 14; offset += 1) {
    const date = addDays(now, offset);
    const session = getSessionsForDate(date).find(
      (candidate) => !candidate.hasStarted && candidate.remaining > 0,
    );
    if (session) return session;
  }
  return null;
}

const NAV_ITEMS: Omit<DrawerNavItem, 'badge'>[] = [
  { key: 'personal-data', label: 'Datos Personales', icon: 'user', route: '/personal-data' },
  { key: 'notifications', label: 'Notificaciones', icon: 'bell', route: '/notifications' },
  { key: 'plan', label: 'Plan', icon: 'award', route: '/plan' },
  { key: 'contracts', label: 'Contratos Activos', icon: 'file-text', route: '/active-contracts' },
];

export default function HomeScreen() {
  const colors = useColors();
  const {
    user,
    adminStatus,
    hasBoxMembership,
    hasActivePlan,
    myBox,
    logout,
    redeemBoxCode,
    refreshActivationStatus,
  } = useAuth();
  const { now, getSessionsForDate, getUpcomingBooked } = useBooking();
  const { unreadCount } = useNotifications();
  const pathname = usePathname();
  const [drawerVisible, setDrawerVisible] = useState(false);
  // Push avisos queue — one at a time, most recent first (see
  // GET /box-memberships/announcements). Each one requires the athlete to
  // confirm they've read it before it's removed from the queue.
  const [pushQueue, setPushQueue] = useState<BoxAnnouncement[]>([]);
  // The most recent push aviso regardless of read state — stays visible as
  // a fixed card even after the popup above has been confirmed, so the
  // athlete can still find it without digging through Comunidad.
  const [pinnedPush, setPinnedPush] = useState<BoxAnnouncement | null>(null);
  // Opened only by tapping the JoinBoxCard button below — no more auto-shown
  // popup (that one-time approach was replaced by the persistent card, which
  // stays on screen for as long as hasBoxMembership is false instead of
  // showing once and disappearing).
  const [joinBoxVisible, setJoinBoxVisible] = useState(false);

  // Defensive re-sync every time Home gains focus — e.g. right after "Crear
  // mi Box" grants the box_admin role server-side, so the drawer's admin
  // items (and the Contratos Activos filter below) never stay stuck showing
  // a stale pre-role state.
  useFocusEffect(
    useCallback(() => {
      refreshActivationStatus();
    }, [refreshActivationStatus]),
  );

  // Real per-box birthdays (see GET /box-memberships/upcoming-birthdays).
  // useQuery instead of a plain fetch-on-focus: within the QueryClient's
  // staleTime (see _layout.tsx), returning to Home doesn't re-hit the
  // network — useRefetchOnFocusIfStale only refetches once that window has
  // passed, so a newly-set birthdate still shows up without needing an app
  // restart, just not on every single visit.
  const birthdaysQuery = useQuery({
    queryKey: ['upcoming-birthdays', user?.id],
    queryFn: () => getUpcomingBirthdays(user!.id),
    enabled: !!user?.id && !!hasBoxMembership,
  });
  useRefetchOnFocusIfStale(birthdaysQuery);
  const birthdays = (hasBoxMembership && birthdaysQuery.data?.birthdays) || [];

  // Subscribed plan + real period stats (see GET /box-memberships/my-plans).
  const myPlanQuery = useQuery({
    queryKey: ['my-plans', user?.id],
    queryFn: () => getMyPlans(user!.id),
    enabled: !!user?.id && !!hasActivePlan,
  });
  useRefetchOnFocusIfStale(myPlanQuery);
  const myPlan = hasActivePlan
    ? (myPlanQuery.data?.plans.find((p) => p.isSubscribed) ?? null)
    : null;

  // Home's 4 stat cards (total de clases, racha de constancia, PR destacado,
  // medallas) — see GET /achievements, which computes these as a side effect
  // of evaluating medallas. Doesn't require box membership/an active plan
  // (streaks, PRs, and unlocked count are all independent of that).
  const achievementsQuery = useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: () => getAchievements(user!.id),
    enabled: !!user?.id,
  });
  useRefetchOnFocusIfStale(achievementsQuery);
  const achievementStats = achievementsQuery.data?.stats ?? null;

  // Home's "Medallas" card: total unlocked across every category, plus the
  // most recently unlocked ones (by unlockedAt) as a little icon preview.
  const medalsSummary = useMemo(() => {
    const categories = achievementsQuery.data?.categories ?? [];
    const totalUnlocked = categories.reduce((sum, c) => sum + c.unlocked, 0);
    const totalAchievements = categories.reduce((sum, c) => sum + c.total, 0);
    const recent = categories
      .flatMap((c) => c.achievements)
      .filter((a) => a.unlocked && a.unlockedAt)
      .sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime())
      .slice(0, 3);
    return { totalUnlocked, totalAchievements, recent };
  }, [achievementsQuery.data]);

  const wodQuery = useQuery({
    queryKey: ['wod-today', user?.id],
    queryFn: () => getTodayWod(user!.id),
    enabled: !!user?.id,
  });
  useRefetchOnFocusIfStale(wodQuery);
  const todayWod = wodQuery.data?.wod ?? null;

  // Push avisos (see GET /box-memberships/announcements). pushQueue/
  // pinnedPush stay their own local state, synced from the query result
  // below — confirming a popup (AnnouncementModal) shrinks the queue
  // in-place via setPushQueue, which query-driven state alone doesn't
  // cleanly support yet (that's the mutations/cache-invalidation pass,
  // deliberately left for later).
  const announcementsQuery = useQuery({
    queryKey: ['announcements', user?.id],
    queryFn: () => getBoxAnnouncements(user!.id),
    enabled: !!user?.id && !!hasBoxMembership,
  });
  useRefetchOnFocusIfStale(announcementsQuery);
  useEffect(() => {
    if (!hasBoxMembership || !announcementsQuery.data) {
      setPushQueue([]);
      setPinnedPush(null);
      return;
    }
    setPushQueue(announcementsQuery.data.push);
    setPinnedPush(announcementsQuery.data.pinnedPush);
  }, [hasBoxMembership, announcementsQuery.data]);

  // One-time "your box is approved" popup — see boxes.welcome_shown_at.
  // Marked shown immediately (not on the alert's dismiss) so it can't
  // reappear on a later open even if the alert gets dismissed some other
  // way (e.g. the Android back button); the ref just guards against firing
  // twice in the same mount before that server round-trip finishes.
  const welcomeShownRef = useRef(false);
  useEffect(() => {
    if (!user?.id || !adminStatus?.box?.showWelcome || welcomeShownRef.current) return;
    welcomeShownRef.current = true;
    markBoxWelcomeShown(user.id).catch(() => {});
    Alert.alert(
      '¡Tu box ya está aprobado!',
      'Ya podés administrarlo y empezar a invitar alumnos.',
    );
  }, [user?.id, adminStatus?.box?.showWelcome]);

  // Contratos Activos and Plan only make sense once the athlete belongs to
  // a box — an admin role has the platform agreement instead (see
  // getAdminNavItem below), not either of these.
  const showContracts = shouldShowContracts(adminStatus, hasBoxMembership);
  const navItems: DrawerNavItem[] = NAV_ITEMS.filter(
    (item) => (item.key !== 'contracts' && item.key !== 'plan') || showContracts,
  ).map((item) => ({
    ...item,
    badge: item.key === 'notifications' ? unreadCount : undefined,
  }));
  const adminNavItem = getAdminNavItem(adminStatus);
  if (adminNavItem) {
    navItems.push(adminNavItem);
  }

  const handleNavigate = (route: string) => {
    setDrawerVisible(false);
    if (route !== pathname) router.push(route as any);
  };

  const handleLogout = async () => {
    setDrawerVisible(false);
    await logout();
    router.replace('/login');
  };

  // Progreso Mensual only renders once the plan's real period stats are
  // known (classesPerPeriod set AND next_payment_at seeded server-side) —
  // an unlimited plan, or one with no period yet, has nothing to show a
  // ceiling against.
  const hasPeriodProgress =
    myPlan?.classesPerPeriod != null && myPlan?.classesUsedInPeriod != null;
  const periodProgress = hasPeriodProgress
    ? Math.min((myPlan!.classesUsedInPeriod as number) / (myPlan!.classesPerPeriod as number), 1)
    : 0;
  const nearPlanLimit =
    !!myPlan &&
    ((myPlan.classesPerPeriod != null &&
      myPlan.classesRemaining != null &&
      myPlan.classesRemaining <= 2) ||
      (myPlan.daysUntilRenewal != null && myPlan.daysUntilRenewal <= 7));
  const nextBooked = getUpcomingBooked(1)[0] ?? null;
  const nextSession = nextBooked ?? findNextAvailableSession(now, getSessionsForDate);
  const isNextSessionBooked = !!nextBooked;

  const quote = useMemo(() => {
    const index = hashString(toDateKey(now)) % DAILY_QUOTES.length;
    return DAILY_QUOTES[index] ?? DAILY_QUOTES[0];
  }, [now]);

  if (!user) return null;

  const shareQuote = async () => {
    try {
      await Share.share({ message: `“${quote}” — WODPLACE` });
    } catch {
      // Sharing is optional and can be unavailable in a browser preview.
    }
  };

  const nextClassLabel = nextSession
    ? `${formatDayLabel(nextSession.startDate, now)} a las ${formatHM(nextSession.startMinutes)}`
    : 'Sin clases disponibles';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader showBell onMenu={() => setDrawerVisible(true)} menuOpen={drawerVisible} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.homeHeaderGroup}>
          <Text style={styles.greeting}>
            <Text style={{ color: colors.foreground }}>Hola, </Text>
            <Text style={{ color: colors.navActive }}>{getFirstName(user.name)}</Text>
          </Text>
          {myBox ? (
            <View style={styles.boxBadge}>
              {myBox.photoUrl ? (
                <BoxLogoImage uri={myBox.photoUrl} />
              ) : (
                <View style={[styles.boxLogoFallback, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.boxLogoFallbackText, { color: colors.navActive }]}>
                    {myBox.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text
                style={[styles.boxBadgeName, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {myBox.name}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.homeHeaderDivider, { backgroundColor: colors.navActive }]} />

        {hasBoxMembership === false ? (
          <JoinBoxCard onPress={() => setJoinBoxVisible(true)} />
        ) : null}

        {hasActivePlan && nearPlanLimit ? (
          <View style={[styles.noticeCard, { backgroundColor: colors.warningBackground }]}>
            <View style={[styles.noticeIcon, { backgroundColor: colors.warning }]}>
              <Feather name="alert-circle" size={16} color={colors.foreground} />
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

        {hasActivePlan && hasPeriodProgress ? (
          <View style={[styles.progressCard, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeadingRow}>
              <Text style={[styles.cardEyebrow, { color: colors.navInactive }]}>
                Progreso del período
              </Text>
              <Text style={[styles.progressCount, { color: colors.foreground }]}>
                {myPlan!.classesUsedInPeriod} de {myPlan!.classesPerPeriod} clases
              </Text>
            </View>
            {myPlan!.daysUntilRenewal != null ? (
              <Text style={[styles.monthLabel, { color: colors.foreground }]}>
                {myPlan!.daysUntilRenewal <= 0
                  ? 'Vence hoy'
                  : `Vence en ${myPlan!.daysUntilRenewal} día${myPlan!.daysUntilRenewal === 1 ? '' : 's'}`}
              </Text>
            ) : null}
            <View style={[styles.progressTrack, { backgroundColor: colors.input }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.navActive, width: `${periodProgress * 100}%` },
                ]}
              />
            </View>
          </View>
        ) : null}

        {hasBoxMembership && pinnedPush ? (
          <View style={[styles.pinnedAvisoCard, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeadingRow}>
              <Text style={[styles.cardEyebrow, { color: colors.navInactive }]}>Aviso del box</Text>
              <Feather name="bell" size={16} color={colors.navActive} />
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
              <Text style={[styles.pinnedAvisoBody, { color: colors.mutedForeground }]} numberOfLines={3}>
                {pinnedPush.body}
              </Text>
            ) : null}
          </View>
        ) : null}

        {hasBoxMembership && COACH_NOTICE.active ? (
          <View style={[styles.noticeCard, { backgroundColor: colors.warningBackground }]}>
            <View style={[styles.noticeIcon, { backgroundColor: colors.warning }]}>
              <Feather name="alert-triangle" size={16} color={colors.foreground} />
            </View>
            <Text style={[styles.noticeText, { color: colors.foreground }]}>
              {COACH_NOTICE.text}
            </Text>
          </View>
        ) : null}

        {hasBoxMembership ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver próxima clase"
            onPress={() => router.push('/calendar')}
            style={({ pressed }) => [
              styles.nextClassCard,
              { backgroundColor: colors.navFloating },
              pressed && styles.pressedCard,
            ]}
          >
            <View style={styles.nextClassTop}>
              <View style={[styles.timeChip, { backgroundColor: colors.navActive }]}>
                <Feather name="clock" size={13} color={colors.card} />
                <Text style={[styles.timeChipText, { color: colors.card }]}>{nextClassLabel}</Text>
              </View>
              <Feather name="arrow-up-right" size={18} color={colors.navFloatingForeground} />
            </View>
            <Text style={[styles.nextClassLabel, { color: colors.navFloatingForeground }]}>
              {isNextSessionBooked ? 'Tu próxima clase' : 'Reserva tu próxima clase'}
            </Text>
            <Text style={[styles.nextClassName, { color: colors.navFloatingForeground }]}>
              {nextSession?.type ?? 'Revisa el calendario'}
            </Text>
            <Text style={[styles.nextClassCoach, { color: colors.navInactive }]}>
              {nextSession ? `Coach ${nextSession.coach}` : 'Encuentra un horario para tu próximo WOD'}
            </Text>
          </Pressable>
        ) : null}

        {hasBoxMembership && todayWod ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver WOD de hoy"
            onPress={() => router.push('/wod' as never)}
            style={({ pressed }) => [
              styles.wodCard,
              { backgroundColor: colors.card },
              pressed && styles.pressedCard,
            ]}
          >
            <View style={styles.smallCardHeader}>
              <View style={styles.wodTitleRow}>
                <Feather name="zap" size={18} color={colors.navActive} />
                <Text style={[styles.smallCardLabel, { color: colors.navInactive, marginTop: 0 }]}>
                  WOD de hoy{todayWod.myResult ? ' · registrado' : ''}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.navInactive} />
            </View>
            <Text style={[styles.wodName, { color: colors.foreground }]}>{todayWod.name}</Text>
            <Text style={[styles.wodDescription, { color: colors.navInactive }]} numberOfLines={2}>
              {todayWod.description}
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.twoColumnRow}>
          <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
            <View style={styles.smallCardHeader}>
              <Feather name="calendar" size={19} color={colors.navActive} />
            </View>
            <Text style={[styles.smallCardLabel, { color: colors.navInactive }]}>Total de clases</Text>
            <Text style={[styles.statsValue, { color: colors.foreground }]}>
              {achievementStats?.totalBookings ?? 0}
            </Text>
            <Text style={[styles.statsDetail, { color: colors.navInactive }]}>clases reservadas</Text>
          </View>

          <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
            <View style={styles.smallCardHeader}>
              <Feather name="zap" size={19} color={colors.navActive} />
            </View>
            <Text style={[styles.smallCardLabel, { color: colors.navInactive }]}>Racha de constancia</Text>
            <Text style={[styles.statsValue, { color: colors.foreground }]}>
              {achievementStats?.currentStreakDays ?? 0}
            </Text>
            <Text style={[styles.statsDetail, { color: colors.navInactive }]}>
              {achievementStats?.currentStreakDays ? 'días seguidos' : 'Empezá hoy'}
            </Text>
          </View>
        </View>

        <View style={[styles.twoColumnRow, { marginTop: 12 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver progreso y PRs"
            onPress={() => router.push('/rm')}
            style={({ pressed }) => [
              styles.statsCard,
              { backgroundColor: colors.successBackground },
              pressed && styles.pressedCard,
            ]}
          >
            <View style={styles.smallCardHeader}>
              <MaterialCommunityIcons name="trophy-outline" size={21} color={colors.success} />
              <Feather name="chevron-right" size={18} color={colors.navInactive} />
            </View>
            <Text style={[styles.smallCardLabel, { color: colors.navInactive }]}>PR destacado</Text>
            <Text style={[styles.statsValue, { color: colors.foreground }]} numberOfLines={1}>
              {achievementStats?.featuredPr?.liftName ?? 'Aún no hay PRs'}
            </Text>
            <Text style={[styles.statsDetail, { color: colors.navInactive }]}>
              {achievementStats?.featuredPr
                ? `${achievementStats.featuredPr.weightKg} kg${
                    achievementStats.featuredPr.improvementPct > 0
                      ? ` (+${achievementStats.featuredPr.improvementPct}%)`
                      : ''
                  }`
                : 'Registrá tu primera marca'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver medallas"
            onPress={() => router.push('/medallas')}
            style={({ pressed }) => [
              styles.statsCard,
              { backgroundColor: colors.card },
              pressed && styles.pressedCard,
            ]}
          >
            <View style={styles.smallCardHeader}>
              <Feather name="award" size={19} color={colors.navActive} />
              <Feather name="chevron-right" size={18} color={colors.navInactive} />
            </View>
            <Text style={[styles.smallCardLabel, { color: colors.navInactive }]}>Medallas</Text>
            <Text style={[styles.statsValue, { color: colors.foreground }]}>
              {medalsSummary.totalUnlocked}/{medalsSummary.totalAchievements}
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
            {medalsSummary.recent.length > 0 ? (
              <View style={styles.medalIconsRow}>
                {medalsSummary.recent.map((a) => (
                  <MedalBadge key={a.id} icon={a.icon} unlocked size={30} showRibbon={false} />
                ))}
              </View>
            ) : (
              <Text style={[styles.statsDetail, { color: colors.navInactive }]}>Desbloqueá tu primera</Text>
            )}
          </Pressable>
        </View>

        <View style={[styles.quoteCard, { backgroundColor: colors.card, marginTop: 12 }]}>
          <View style={styles.smallCardHeader}>
            <Feather name="message-circle" size={19} color={colors.navActive} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Compartir frase motivacional"
              onPress={shareQuote}
              hitSlop={10}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Feather name="share-2" size={18} color={colors.navInactive} />
            </Pressable>
          </View>
          <Text style={[styles.smallCardLabel, { color: colors.navInactive }]}>
            Frase del día
          </Text>
          <Text style={[styles.quoteText, { color: colors.foreground }]}>“{quote}”</Text>
        </View>

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
                    {birthdayDayLabel(birthday.month, birthday.day)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
      <SideDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onOpen={() => setDrawerVisible(true)}
        onNavigate={handleNavigate}
        currentRoute={pathname}
        userName={user.name}
        avatarUri={user.avatarUri}
        navItems={navItems}
        onLogout={handleLogout}
      />
      <JoinBoxModal
        visible={joinBoxVisible}
        onClose={() => setJoinBoxVisible(false)}
        onRedeem={async (code) => {
          const result = await redeemBoxCode(code);
          // So Contratos Activos can show up right away instead of only
          // after the next focus/refresh — see shouldShowContracts.
          if (result.joined || result.alreadyMember) void refreshActivationStatus();
          return result;
        }}
      />
      <AnnouncementModal
        visible={pushQueue.length > 0}
        announcement={pushQueue[0] ?? null}
        onClose={() => setPushQueue((q) => q.slice(1))}
        onConfirmRead={() => {
          const current = pushQueue[0];
          if (current && user?.id) markAnnouncementRead(current.id, user.id).catch(() => {});
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, gap: 14 },
  homeHeaderGroup: {
    gap: 18,
  },
  greeting: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  boxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  boxLogoFallback: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxLogoFallbackText: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  boxBadgeName: {
    fontSize: 21,
    fontFamily: 'Anton_400Regular',
    flexShrink: 1,
  },
  homeHeaderDivider: {
    height: 2,
    borderRadius: 1,
  },
  progressCard: {
    borderRadius: 20,
    padding: 17,
    gap: 8,
  },
  pinnedAvisoCard: {
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  pinnedAvisoImageWrap: {
    marginTop: 2,
  },
  pinnedAvisoTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
  pinnedAvisoBody: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Inter_400Regular',
  },
  cardHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardEyebrow: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  progressCount: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  monthLabel: {
    fontSize: 21,
    fontFamily: 'Anton_400Regular',
  },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    padding: 13,
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
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  nextClassCard: {
    borderRadius: 22,
    padding: 18,
    minHeight: 148,
    justifyContent: 'space-between',
  },
  nextClassTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  timeChipText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  nextClassLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 12,
  },
  nextClassName: {
    fontSize: 25,
    fontFamily: 'Anton_400Regular',
    marginTop: 1,
  },
  nextClassCoach: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 3,
  },
  wodCard: {
    borderRadius: 20,
    padding: 15,
    marginTop: 12,
  },
  wodTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wodName: { fontSize: 18, fontFamily: 'Anton_400Regular', marginTop: 8 },
  wodDescription: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4, lineHeight: 17 },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statsCard: {
    flex: 1,
    minHeight: 128,
    borderRadius: 20,
    padding: 15,
  },
  statsValue: {
    fontSize: 22,
    lineHeight: 26,
    fontFamily: 'Anton_400Regular',
    marginTop: 8,
  },
  statsDetail: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Inter_500Medium',
    marginTop: 3,
  },
  medalIconsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  quoteCard: {
    flex: 1,
    minHeight: 174,
    borderRadius: 20,
    padding: 15,
  },
  smallCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 22,
  },
  smallCardLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 12,
  },
  quoteText: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 8,
  },
  birthdaySection: {
    marginTop: 2,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Anton_400Regular',
  },
  birthdayList: {
    gap: 8,
  },
  birthdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  birthdayName: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  birthdayDay: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  pressed: { opacity: 0.65 },
  pressedCard: { opacity: 0.88 },
});