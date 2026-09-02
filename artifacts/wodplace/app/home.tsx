import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { SideDrawer, DrawerNavItem } from '@/components/SideDrawer';
import { useAuth } from '@/context/AuthContext';
import { useBooking } from '@/context/BookingContext';
import { useNotifications } from '@/context/NotificationsContext';
import { useColors } from '@/hooks/useColors';
import { canAccessAdminNavigation } from '@/lib/navigation';
import {
  addDays,
  daysInMonth,
  formatDayLabel,
  formatHM,
  MONTH_NAMES,
  toDateKey,
} from '@/lib/dateUtils';
import { hashString } from '@/constants/classSchedule';

const MONTHLY_GOAL = 12;

const DAILY_QUOTES = [
  'La constancia de hoy construye la fuerza de mañana.',
  'Cada repetición cuenta cuando eliges seguir avanzando.',
  'Entrenar también es una forma de cuidar tu mente.',
  'No necesitas hacerlo perfecto; necesitas volver a intentarlo.',
  'Tu progreso se mide en disciplina, no en comparación.',
];

const UPCOMING_BIRTHDAYS = [
  { initials: 'PP', name: 'Pía Pastén', day: '18 AGO' },
  { initials: 'TH', name: 'Tomás Herrera', day: '22 AGO' },
  { initials: 'AS', name: 'Antonia Sepúlveda', day: '26 AGO' },
];

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

function getMonthlyBookedCount(
  now: Date,
  getSessionsForDate: ReturnType<typeof useBooking>['getSessionsForDate'],
): number {
  const count = daysInMonth(now.getFullYear(), now.getMonth());
  let bookedCount = 0;

  for (let day = 1; day <= count; day += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), day);
    bookedCount += getSessionsForDate(date).filter((session) => session.isBooked).length;
  }

  return bookedCount;
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
  const { user, logout } = useAuth();
  const { now, getSessionsForDate, getUpcomingBooked } = useBooking();
  const { unreadCount } = useNotifications();
  const pathname = usePathname();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const navItems: DrawerNavItem[] = NAV_ITEMS.map((item) => ({
    ...item,
    badge: item.key === 'notifications' ? unreadCount : undefined,
  }));
  if (canAccessAdminNavigation(user)) {
    navItems.push({
      key: 'admin',
      label: 'Administrador',
      icon: 'shield',
      route: '/admin-login',
    });
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

  const monthlyBooked = useMemo(
    () => getMonthlyBookedCount(now, getSessionsForDate),
    [now, getSessionsForDate],
  );
  const monthlyProgress = Math.min(monthlyBooked / MONTHLY_GOAL, 1);
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
        <Text style={[styles.greeting, { color: colors.foreground }]}>
          Hola, {getFirstName(user.name)}
        </Text>

        <View style={[styles.progressCard, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeadingRow}>
            <Text style={[styles.cardEyebrow, { color: colors.navInactive }]}>
              Progreso mensual
            </Text>
            <Text style={[styles.progressCount, { color: colors.foreground }]}>
              {monthlyBooked} de {MONTHLY_GOAL} clases
            </Text>
          </View>
          <Text style={[styles.monthLabel, { color: colors.foreground }]}>
            {MONTH_NAMES[now.getMonth()]}
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: colors.input }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.navActive, width: `${monthlyProgress * 100}%` },
              ]}
            />
          </View>
        </View>

        {COACH_NOTICE.active ? (
          <View style={[styles.noticeCard, { backgroundColor: colors.warningBackground }]}>
            <View style={[styles.noticeIcon, { backgroundColor: colors.warning }]}>
              <Feather name="alert-triangle" size={16} color={colors.foreground} />
            </View>
            <Text style={[styles.noticeText, { color: colors.foreground }]}>
              {COACH_NOTICE.text}
            </Text>
          </View>
        ) : null}

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

        <View style={styles.twoColumnRow}>
          <View style={[styles.quoteCard, { backgroundColor: colors.card }]}>
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

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver progreso y PRs"
            onPress={() => router.push('/rm')}
            style={({ pressed }) => [
              styles.prCard,
              { backgroundColor: colors.successBackground },
              pressed && styles.pressedCard,
            ]}
          >
            <View style={styles.smallCardHeader}>
              <MaterialCommunityIcons name="trophy-outline" size={21} color={colors.success} />
              <Feather name="chevron-right" size={18} color={colors.navInactive} />
            </View>
            <Text style={[styles.smallCardLabel, { color: colors.navInactive }]}>PR del día</Text>
            <Text style={[styles.prTitle, { color: colors.foreground }]}>
              Aún no hay PRs
            </Text>
            <Text style={[styles.prDetail, { color: colors.navInactive }]}>
              Registra tu primera marca
            </Text>
          </Pressable>
        </View>

        <View style={styles.birthdaySection}>
          <View style={styles.sectionHeadingRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Próximos cumpleaños
            </Text>
            <Feather name="gift" size={19} color={colors.navActive} />
          </View>
          <View style={styles.birthdayList}>
            {UPCOMING_BIRTHDAYS.map((birthday) => (
              <View key={birthday.name} style={styles.birthdayRow}>
                <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.avatarText, { color: colors.navActive }]}>
                    {birthday.initials}
                  </Text>
                </View>
                <Text style={[styles.birthdayName, { color: colors.foreground }]}>
                  {birthday.name}
                </Text>
                <Text style={[styles.birthdayDay, { color: colors.navInactive }]}>
                  {birthday.day}
                </Text>
              </View>
            ))}
          </View>
        </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, gap: 14 },
  greeting: {
    fontSize: 26,
    fontFamily: 'Anton_400Regular',
    marginBottom: 2,
  },
  progressCard: {
    borderRadius: 20,
    padding: 17,
    gap: 8,
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
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quoteCard: {
    flex: 1,
    minHeight: 174,
    borderRadius: 20,
    padding: 15,
  },
  prCard: {
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
  prTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Anton_400Regular',
    marginTop: 10,
  },
  prDetail: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Inter_500Medium',
    marginTop: 5,
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