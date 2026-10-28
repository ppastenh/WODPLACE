import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Share, StyleSheet, View } from 'react-native';
import { router, usePathname, useFocusEffect } from 'expo-router';
import {
  getAchievements,
  getBoxAnnouncements,
  getContractAcceptance,
  getMyPlans,
  getTodayWod,
  getUpcomingBirthdays,
  listPrs,
  markAnnouncementRead,
  markBoxWelcomeShown,
  type BoxAnnouncement,
} from '@workspace/api-client-react';
import { AnnouncementModal } from '@/components/AnnouncementModal';
import { AppHeader } from '@/components/AppHeader';
import { HomeView, type HomeViewData } from '@/components/home/HomeView';
import { JoinBoxModal } from '@/components/JoinBoxModal';
import { SideDrawer, DrawerNavItem } from '@/components/SideDrawer';
import { useAuth } from '@/context/AuthContext';
import { useBooking } from '@/context/BookingContext';
import { useNotifications } from '@/context/NotificationsContext';
import { useColors } from '@/hooks/useColors';
import { getAdminNavItem, shouldShowContracts } from '@/lib/navigation';
import { nextClassCardState } from '@/lib/nextClassCard';
import { planProgressView } from '@/lib/planProgress';
import { useRefetchOnFocusIfStale } from '@/lib/useRefetchOnFocusIfStale';
import { isBirthdayToday, toDateKey, todayInChile } from '@/lib/dateUtils';
import { hashString } from '@/constants/classSchedule';

const DAILY_QUOTES = [
  'La constancia de hoy construye la fuerza de mañana.',
  'Cada repetición cuenta cuando eliges seguir avanzando.',
  'Entrenar también es una forma de cuidar tu mente.',
  'No necesitas hacerlo perfecto; necesitas volver a intentarlo.',
  'Tu progreso se mide en disciplina, no en comparación.',
];


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
  const { now, isLoading: sessionsLoading, getUpcomingBooked } = useBooking();
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
  //
  // refreshActivationStatus itself is NOT a stable reference (AuthContext
  // wraps it fresh on every value recompute, and calling it is what updates
  // the state that triggers that recompute) — depending on it directly in
  // this effect's deps used to re-fire this effect every time it updated
  // anything, in a tight loop (confirmed live: ~20 calls/6s to /platform-
  // agreement, /box-memberships/my-box and /public-profile right after
  // login). Routing the call through a ref that's kept current on every
  // render means the effect's own useCallback has an empty, truly stable
  // dependency array — it only re-fires on a real focus event, but still
  // always calls the latest version of the function.
  const refreshActivationStatusRef = useRef(refreshActivationStatus);
  refreshActivationStatusRef.current = refreshActivationStatus;
  useFocusEffect(
    useCallback(() => {
      refreshActivationStatusRef.current();
    }, []),
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

  // Racha de constancia + the achievements catalog behind Medallas — see
  // GET /achievements, which computes these as a side effect of evaluating
  // medallas. Doesn't require box membership/an active plan (streaks and
  // unlocked count are independent of that). "PR destacado" now comes from
  // its own rotating pick below instead of achievementStats.featuredPr.
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

  // "PR destacado" now rotates one movement per day, instead of always
  // showing the single biggest recent % jump (that's still what /api/
  // achievements computes for other uses, e.g. the achievements screen --
  // this is Home-only). Only rotates through movements the athlete has
  // logged at least one PR for, so a day never lands on an empty one; the
  // day-index pick reuses the exact same hashString(dateKey) % length
  // pattern as the "Frase del día" rotation below, so it's deterministic
  // (stable all day, no re-roll on refresh) without needing a server call.
  const prsQuery = useQuery({
    queryKey: ['prs', user?.id],
    queryFn: () => listPrs({ userId: user!.id }),
    enabled: !!user?.id,
  });
  useRefetchOnFocusIfStale(prsQuery);
  const rotatingFeaturedPr = useMemo(() => {
    const prs = prsQuery.data ?? [];
    if (prs.length === 0) return null;
    const bestByMovement = new Map<string, (typeof prs)[number]>();
    for (const pr of prs) {
      const current = bestByMovement.get(pr.movementId);
      if (!current || pr.weightKg > current.weightKg) {
        bestByMovement.set(pr.movementId, pr);
      }
    }
    const movementIds = Array.from(bestByMovement.keys()).sort();
    if (movementIds.length === 0) return null;
    const index = hashString(toDateKey(now)) % movementIds.length;
    return bestByMovement.get(movementIds[index]) ?? null;
  }, [prsQuery.data, now]);

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

  // Pending-contracts aviso: GET /contracts/acceptance's pendingSlugs is
  // purely document-based (never [] just because the account happens to
  // hold a staff role) — [] for an athlete with no box, or for a box with
  // no contract documents of its own, but NOT staff-aware on its own. The
  // render condition below adds `!adminStatus?.roles.length`, same gate
  // shouldShowContracts() (lib/navigation.ts) uses, so a coach/box_admin/
  // super_admin who also happens to have an athlete membership with a
  // stale reading never sees this (they're exempt from the booking block
  // too — see api-server's isAnyStaff).
  const contractAcceptanceQuery = useQuery({
    queryKey: ['contract-acceptance', user?.id],
    queryFn: () => getContractAcceptance({ userId: user!.id }),
    enabled: !!user?.id && !!hasBoxMembership,
  });
  useRefetchOnFocusIfStale(contractAcceptanceQuery);
  const pendingContractSlugs = contractAcceptanceQuery.data?.pendingSlugs ?? [];

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
      'Ya puedes administrarlo y empezar a invitar alumnos.',
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
  // Solo en desarrollo -- nunca en una build de producción (ver app/dev-home.tsx).
  if (__DEV__) {
    navItems.push({ key: 'dev-home', label: 'Estados de Inicio (dev)', icon: 'layers', route: '/dev-home' });
  }
  const adminNavItem = getAdminNavItem(adminStatus);

  const handleNavigate = (route: string) => {
    setDrawerVisible(false);
    if (route !== pathname) router.push(route as any);
  };

  const handleLogout = async () => {
    setDrawerVisible(false);
    await logout();
    router.replace('/login');
  };

  // "Clases del plan" (el mosaico de más abajo): sin plan, plan ilimitado o plan con clases por período
  // (ver lib/planProgress.ts).
  const planView = planProgressView({
    hasActivePlan: !!hasActivePlan,
    planLoading: myPlanQuery.isPending,
    plan: myPlan,
  });
  const nearPlanLimit =
    !!myPlan &&
    ((myPlan.classesPerPeriod != null &&
      myPlan.classesRemaining != null &&
      myPlan.classesRemaining <= 2) ||
      (myPlan.daysUntilRenewal != null && myPlan.daysUntilRenewal <= 7));
  // Tarjeta de próxima clase: el estado se decide solo cuando terminó de cargar (ver lib/nextClassCard.ts).
  const nextBooked = getUpcomingBooked(1)[0] ?? null;
  const nextClassState = nextClassCardState({ isLoading: sessionsLoading, hasUpcomingBooking: !!nextBooked });

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

  const isOwnBirthdayToday = (() => {
    if (!user.birthdate) return false;
    const [, birthMonth, birthDay] = user.birthdate.split('-').map(Number);
    return isBirthdayToday(birthMonth, birthDay, todayInChile());
  })();

  const homeData: HomeViewData = {
    user: { name: user.name, rank: user.rank },
    myBox,
    isOwnBirthdayToday,
    hasBoxMembership,
    hasActivePlan,
    myPlan,
    nearPlanLimit,
    nextClassState,
    nextBooked,
    quote,
    hasPendingContract: pendingContractSlugs.length > 0 && !adminStatus?.roles.length,
    pinnedPush,
    todayWod,
    planView,
    achievementStats,
    rotatingFeaturedPr,
    medalsSummary,
    birthdays,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader showBell onMenu={() => setDrawerVisible(true)} menuOpen={drawerVisible} />
      <HomeView
        data={homeData}
        events={{
          onJoinBox: () => setJoinBoxVisible(true),
          onOpenCalendar: () => router.push('/calendar'),
          onOpenContracts: () => router.push('/active-contracts' as never),
          onOpenWod: () => router.push('/wod' as never),
          onOpenRm: () => router.push('/rm'),
          onOpenProfile: () => router.push('/personal-data'),
          onOpenMedals: () => router.push('/medallas'),
          onShareQuote: shareQuote,
        }}
      />
      <SideDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onOpen={() => setDrawerVisible(true)}
        onNavigate={handleNavigate}
        currentRoute={pathname}
        userName={user.name}
        avatarUri={user.avatarUri}
        navItems={navItems}
        adminNavItem={adminNavItem}
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
});
