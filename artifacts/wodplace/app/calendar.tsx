import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { AppHeader } from '@/components/AppHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { MonthCalendar } from '@/components/MonthCalendar';
import { WeekCalendar } from '@/components/WeekCalendar';
import { ClassCard, ClassActionButton } from '@/components/ClassCard';
import { MenuSheet } from '@/components/MenuSheet';
import { AttendeesModal } from '@/components/AttendeesModal';
import { CancelConfirmModal } from '@/components/CancelConfirmModal';
import { useAuth } from '@/context/AuthContext';
import { useBooking, ClassSession } from '@/context/BookingContext';
import { useColors } from '@/hooks/useColors';
import {
  addDays,
  addMonths,
  formatWeekdayLong,
  isSameDay,
  MONTH_NAMES,
  startOfDay,
} from '@/lib/dateUtils';

type ViewMode = 'month' | 'week';

export default function CalendarScreen() {
  const colors = useColors();
  const { user, logout } = useAuth();
  const { now, getSessionsForDate, book, cancel, getAttendeeNames } = useBooking();
  const today = startOfDay(now);

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [monthCursor, setMonthCursor] = useState(new Date(today));
  const [weekCursor, setWeekCursor] = useState(new Date(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const [menuVisible, setMenuVisible] = useState(false);
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
    await book(session);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const handleConfirmCancel = async () => {
    if (!cancelSession) return;
    await cancel(cancelSession);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    setCancelSession(null);
  };

  if (!user) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader onBack={() => router.back()} onMenu={() => setMenuVisible(true)} />
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

      <MenuSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onLogout={async () => {
          await logout();
          router.replace('/login');
        }}
        userName={user.name}
        userEmail={user.email}
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
