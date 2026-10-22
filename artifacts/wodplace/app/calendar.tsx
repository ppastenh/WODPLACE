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
import { getAdminNavItem, shouldShowContracts } from '@/lib/navigation';
import { useRefetchOnFocusIfStale } from '@/lib/useRefetchOnFocusIfStale';
import {
  addDays,
  addMonths,
  formatWeekdayLong,
  isSameDay,
  MONTH_NAMES,
  startOfDay,
} from '@/lib/dateUtils';
import { SPACING } from '@/constants/spacing';
import { FONT_SIZE } from '@/constants/typography';

type ViewMode = 'month' | 'week';

const NAV_ITEMS: Omit<DrawerNavItem, 'badge'>[] = [
  { key: 'personal-data', label: 'Datos Personales', icon: 'user', route: '/personal-data' },
  { key: 'notifications', label: 'Notificaciones', icon: 'bell', route: '/notifications' },
  { key: 'plan', label: 'Plan', icon: 'award', route: '/plan' },
  { key: 'contracts', label: 'Contratos Activos', icon: 'file-text', route: '/active-contracts' },
];

export default function CalendarScreen() {
  const colors = useColors();
  const { user, adminStatus, hasBoxMembership, logout } = useAuth();
  const { now, getSessionsForDate, bookedDateKeys, hasAnyBookingOnDate, book, cancel, getAttendeeNames, sessionsQuery } = useBooking();
  const { unreadCount } = useNotifications();
  const pathname = usePathname();
  const today = startOfDay(now);
  // Booking is limited to a 7-day rolling window (today included) — see
  // MonthCalendar/WeekCalendar's `maxDate`, which dims/disables anything past it
  // the same way past days already are.
  const maxBookableDate = addDays(today, 6);

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [monthCursor, setMonthCursor] = useState(new Date(today));
  const [weekCursor, setWeekCursor] = useState(new Date(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [attendeesSession, setAttendeesSession] = useState<ClassSession | null>(null);
  const [cancelSession, setCancelSession] = useState<ClassSession | null>(null);
  const [startedConfirmSession, setStartedConfirmSession] = useState<ClassSession | null>(null);

  // Picks up a class a coach just added/changed in box-admin, or a booking
  // made from another device — only actually refetches once the query is
  // past staleTime (see useRefetchOnFocusIfStale), not on every focus.
  useRefetchOnFocusIfStale(sessionsQuery);

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

  const warnDailyLimit = () => {
    Alert.alert(
      'Ya tienes algo agendado hoy',
      'El auto-agendamiento admite una sola clase (o lista de espera) por día. Para una segunda clase el mismo día, pídeselo al administrador de tu box.',
    );
  };

  const performBook = async (session: ClassSession) => {
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
      if (error instanceof Error && error.message === 'DAILY_LIMIT_REACHED') {
        warnDailyLimit();
        return;
      }
      if (error instanceof Error && error.message === 'PLAN_LIMIT_REACHED') {
        Alert.alert(
          'Alcanzaste el límite de tu plan',
          'Ya usaste todas las clases incluidas en tu plan para este período.',
        );
        return;
      }
      if (error instanceof Error && error.message === 'CONTRACTS_PENDING') {
        Alert.alert(
          'Contratos pendientes',
          'Tienes contratos pendientes por aceptar. Acéptalos para poder reservar.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Ir a contratos', onPress: () => router.push('/active-contracts' as never) },
          ],
        );
        return;
      }
      // No debería llegar aquí desde el botón normal -- una clase
      // terminada ya no muestra "Agendar" (ver ClassCard) -- pero puede
      // pasar si justo terminó mientras el diálogo de confirmación estaba
      // abierto.
      if (error instanceof Error && error.message === 'SESSION_ENDED') {
        Alert.alert('Esta clase ya terminó', 'Ya no se puede reservar.');
        return;
      }
      Alert.alert('No se pudo agendar', 'Intenta nuevamente en unos segundos.');
    }
  };

  const handleBook = async (session: ClassSession) => {
    if (user?.status !== 'active') {
      Alert.alert(
        'Cuenta no activa',
        'Activa tu cuenta completando el registro en Contratos Activos para poder reservar clases. Mientras tanto puedes ver el calendario y quién está anotado.',
      );
      return;
    }
    // Checked client-side first (data already loaded, no round-trip) — the
    // server enforces the same rule regardless, see the DAILY_LIMIT_REACHED
    // catch below for when this check races with another request.
    if (hasAnyBookingOnDate(session.date)) {
      warnDailyLimit();
      return;
    }
    // Still bookable, just gated behind a confirmation — see
    // startedConfirmSession's CancelConfirmModal below. The server has no
    // time-of-day restriction of its own to race against here.
    if (session.hasStarted) {
      setStartedConfirmSession(session);
      return;
    }
    await performBook(session);
  };

  const handleConfirmStartedBook = async () => {
    const session = startedConfirmSession;
    setStartedConfirmSession(null);
    if (session) await performBook(session);
  };

  const handleConfirmCancel = async () => {
    if (!cancelSession) return;
    const session = cancelSession;
    setCancelSession(null);
    try {
      await cancel(session);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } catch (error) {
      if (error instanceof Error && error.message === 'CANNOT_CANCEL_PAST_SESSION') {
        Alert.alert(
          'No se puede cancelar',
          'Esta clase ya terminó, así que queda registrada en tu historial.',
        );
        return;
      }
      Alert.alert('No se pudo cancelar', 'Intenta nuevamente en unos segundos.');
    }
  };

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
              maxDate={maxBookableDate}
              bookedDates={bookedDateKeys}
              onSelect={handleSelectDate}
            />
          ) : (
            <WeekCalendar
              anchorDate={weekCursor}
              selectedDate={selectedDate}
              today={today}
              maxDate={maxBookableDate}
              bookedDates={bookedDateKeys}
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

        {!hasBoxMembership ? (
          <View style={styles.emptyState}>
            <Feather name="calendar" size={26} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Todavía no tienes un box. Únete desde Inicio para ver sus clases disponibles.
            </Text>
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="calendar" size={26} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No hay clases programadas para este día.
            </Text>
          </View>
        ) : (
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
        )}
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
        adminNavItem={adminNavItem}
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
      <CancelConfirmModal
        visible={!!startedConfirmSession}
        onClose={() => setStartedConfirmSession(null)}
        onConfirm={handleConfirmStartedBook}
        title="Esta clase ya empezó"
        subtitle="Puedes perderte parte de la clase si te sumas ahora. ¿Quieres reservar igual?"
        confirmLabel="Reservar igual"
        cancelLabel="Cancelar"
      />
    </View>
  );
}

// Fase 1 (tokens): solo valores que calzan EXACTO con SPACING/FONT_SIZE.
// 48, 18 (gap), 24 (radio), 14 (padding) no calzan con ningún token y
// quedan sin tocar a propósito -- ver la propuesta de Fase 2 (alineación)
// en AUDITORIA-VISUAL.md antes de mover cualquiera de esos.
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.xxl,
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
    gap: SPACING.sm2,
  },
  monthLabel: {
    fontSize: FONT_SIZE.xl,
    fontFamily: 'Anton_400Regular',
  },
  calendarCard: {
    borderRadius: 24,
    padding: 14,
  },
  selectedDateLabel: {
    fontSize: FONT_SIZE.xl,
    fontFamily: 'Anton_400Regular',
  },
  list: {
    gap: SPACING.lg,
  },
  emptyState: {
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.xxxl,
  },
  emptyText: {
    fontSize: FONT_SIZE.base,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
});
