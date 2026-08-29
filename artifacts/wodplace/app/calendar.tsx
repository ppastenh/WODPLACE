import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { AppHeader } from '@/components/AppHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { MonthCalendar } from '@/components/MonthCalendar';
import { WeekCalendar } from '@/components/WeekCalendar';
import { ClassCard, ClassActionButton } from '@/components/ClassCard';
import { SideDrawer, DrawerNavItem } from '@/components/SideDrawer';
import { AttendeesModal } from '@/components/AttendeesModal';
import { CancelConfirmModal } from '@/components/CancelConfirmModal';
import { useAuth } from '@/context/AuthContext';
import { useBooking, ClassSession } from '@/context/BookingContext';
import { useNotifications } from '@/context/NotificationsContext';
import { useColors } from '@/hooks/useColors';
import { canAccessAdminNavigation } from '@/lib/navigation';
import {
  addDays,
  addMonths,
  formatWeekdayLong,
  isSameDay,
  MONTH_NAMES,
  startOfDay,
} from '@/lib/dateUtils';

type ViewMode = 'month' | 'week';

const NAV_ITEMS: Omit<DrawerNavItem, 'badge'>[] = [
  { key: 'personal-data', label: 'Datos Personales', icon: 'user', route: '/personal-data' },
  { key: 'notifications', label: 'Notificaciones', icon: 'bell', route: '/notifications' },
  { key: 'plan', label: 'Plan', icon: 'award', route: '/plan' },
  { key: 'contracts', label: 'Contratos Activos', icon: 'file-text', route: '/active-contracts' },
  { key: 'admin', label: 'Administrador', icon: 'shield', route: '/admin-login' },
];

export default function CalendarScreen() {
  const colors = useColors();
  const { user, logout } = useAuth();
  const { now, getSessionsForDate, book, cancel, getAttendeeNames } = useBooking();
  const { unreadCount } = useNotifications();
  const pathname = usePathname();
  const today = startOfDay(now);

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [monthCursor, setMonthCursor] = useState(new Date(today));
  const [weekCursor, setWeekCursor] = useState(new Date(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [attendeesSession, setAttendeesSession] = useState<ClassSession | null>(null);
  const [cancelSession, setCancelSession] = useState<ClassSession | null>(null);

  const sessions = getSessionsForDate(selectedDate);

  const goToToday = () => {
    setMonthCursor(new Date(today));
    setWeekCursor(new Date(today));
    setSelectedDate(today);
  };

  const shiftMonth = (delta: number) => setMonthCursor((prev) => addMonths(prev, delta));
  const shiftWeek = (delta: number) => setWeekCursor((prev) => addDays(prev, delta * 7));

  const handleSelectDate = (date: Date) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedDate(date);
  };

  const handleBook = async (session: ClassSession) => {
    try {
      const status = await book(session);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (status === 'waiting') {
        Alert.alert(
          'Estás en la lista de espera',
          'Te avisaremos automáticamente si se libera un cupo. La lista admite hasta 5 alumnos.',
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'WAITLIST_FULL') {
        Alert.alert('Lista de espera llena', 'Ya hay 5 alumnos esperando esta clase.');
        return;
      }
      Alert.alert('No se pudo agendar', 'Intenta nuevamente en unos segundos.');
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelSession) return;
    await cancel(cancelSession);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    setCancelSession(null);
  };

  const navItems: DrawerNavItem[] = NAV_ITEMS.map((item) => ({
    ...item,
    badge: item.key === 'notifications' ? unreadCount : undefined,
  })).filter((item) => item.key !== 'admin' || canAccessAdminNavigation(user));

  const handleNavigate = (route: string) => {
    setDrawerVisible(false);
    if (route !== pathname) router.push(route as any);
  };

  const handleLogout = async () => {
    setDrawerVisible(false);
    await logout();
    router.replace('/login');
  };

  if (!user) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader showBell onMenu={() => setDrawerVisible(true)} menuOpen={drawerVisible} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SegmentedControl
          value={viewMode}
          onChange={(key) => setViewMode(key as ViewMode)}
          options={[
            { key: 'month', label: 'Mes' },
            { key: 'week', label: 'Semana' },
          ]}
        />

        <View style={styles.monthHeader}>
          <Pressable
            onPress={() => (viewMode === 'month' ? shiftMonth(-1) : shiftWeek(-1))}
            hitSlop={10}
          >
            <Feather name="chevron-left" size={22} color={colors.foreground} />
          </Pressable>

          <Pressable onPress={goToToday} style={styles.monthLabelRow} hitSlop={6}>
            <Text style={[styles.monthLabel, { color: colors.foreground }]}>
              {MONTH_NAMES[(viewMode === 'month' ? monthCursor : weekCursor).getMonth()]}{' '}
              {(viewMode === 'month' ? monthCursor : weekCursor).getFullYear()}
            </Text>
            <Feather name="calendar" size={16} color={colors.mutedForeground} />
          </Pressable>

          <Pressable
            onPress={() => (viewMode === 'month' ? shiftMonth(1) : shiftWeek(1))}
            hitSlop={10}
          >
            <Feather name="chevron-right" size={22} color={colors.foreground} />
          </Pressable>
        </View>

        <View style={[styles.calendarCard, { backgroundColor: colors.card }]}>
          {viewMode === 'month' ? (
            <MonthCalendar
              monthDate={monthCursor}
              selectedDate={selectedDate}
              today={today}
              onSelect={handleSelectDate}
            />
          ) : (
            <WeekCalendar
              anchorDate={weekCursor}
              selectedDate={selectedDate}
              today={today}
              onSelect={handleSelectDate}
            />
          )}
        </View>

        <Text style={[styles.selectedDateLabel, { color: colors.foreground }]}>
          {isSameDay(selectedDate, today)
            ? 'Hoy'
            : `${formatWeekdayLong(selectedDate)} ${selectedDate.getDate()} de ${
                MONTH_NAMES[selectedDate.getMonth()]
              }`}
        </Text>

        <View style={styles.list}>
          {sessions.map((session) => (
            <ClassCard
              key={session.id}
              session={session}
              now={now}
              onPressAttendees={() => setAttendeesSession(session)}
              actionSlot={
                <ClassActionButton
                  session={session}
                  onBook={() => handleBook(session)}
                  onRequestCancel={() => setCancelSession(session)}
                  cancelPending={cancelSession?.id === session.id}
                />
              }
            />
          ))}
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
      <AttendeesModal
        visible={!!attendeesSession}
        onClose={() => setAttendeesSession(null)}
        session={attendeesSession}
        names={attendeesSession ? getAttendeeNames(attendeesSession, user.name) : []}
      />
      <CancelConfirmModal
        visible={!!cancelSession}
        onClose={() => setCancelSession(null)}
        onConfirm={handleConfirmCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
    gap: 18,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthLabel: {
    fontSize: 18,
    fontFamily: 'Anton_400Regular',
  },
  calendarCard: {
    borderRadius: 24,
    padding: 14,
  },
  selectedDateLabel: {
    fontSize: 18,
    fontFamily: 'Anton_400Regular',
  },
  list: {
    gap: 12,
  },
});
