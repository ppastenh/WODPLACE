import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ATTENDEE_POOL,
  ClassType,
  DAILY_TEMPLATE,
  getBaseAttendeeCount,
  getBaseAttendeeNames,
  getSessionId,
} from '@/constants/classSchedule';
import { addDays, formatDuration, formatHM, parseTimeToMinutes, toDateKey } from '@/lib/dateUtils';

export interface ClassSession {
  id: string;
  date: Date;
  dateKey: string;
  type: ClassType;
  coach: string;
  startMinutes: number;
  endMinutes: number;
  startDate: Date;
  timeRangeLabel: string;
  durationLabel: string;
  durationMin: number;
  capacity: number;
  baseAttendees: number;
  isBooked: boolean;
  remaining: number;
  hasStarted: boolean;
  canCancel: boolean;
}

const STORAGE_KEY = 'wodplace_bookings';
const CANCEL_CUTOFF_MS = 60 * 60 * 1000;

interface BookingContextValue {
  isLoading: boolean;
  now: Date;
  getSessionsForDate: (date: Date) => ClassSession[];
  getUpcomingBooked: (limit?: number) => ClassSession[];
  book: (session: ClassSession) => Promise<void>;
  cancel: (session: ClassSession) => Promise<void>;
  getAttendeeNames: (session: ClassSession, userName: string) => string[];
}

const BookingContext = createContext<BookingContextValue | undefined>(undefined);

function buildSession(date: Date, now: Date, bookedIds: Set<string>) {
  const dateKey = toDateKey(date);
  return DAILY_TEMPLATE.map((template) => {
    const id = getSessionId(dateKey, template.time);
    const startMinutes = parseTimeToMinutes(template.time);
    const endMinutes = startMinutes + template.durationMin;
    const startDate = new Date(date);
    startDate.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
    const baseAttendees = getBaseAttendeeCount(id, template.capacity);
    const isBooked = bookedIds.has(id);
    const remaining = Math.max(0, template.capacity - baseAttendees - (isBooked ? 1 : 0));
    const hasStarted = now.getTime() >= startDate.getTime();
    const canCancel = isBooked && startDate.getTime() - now.getTime() > CANCEL_CUTOFF_MS;

    const session: ClassSession = {
      id,
      date,
      dateKey,
      type: template.type,
      coach: template.coach,
      startMinutes,
      endMinutes,
      startDate,
      timeRangeLabel: `${formatHM(startMinutes)} a ${formatHM(endMinutes)}`,
      durationLabel: formatDuration(template.durationMin),
      durationMin: template.durationMin,
      capacity: template.capacity,
      baseAttendees,
      isBooked,
      remaining,
      hasStarted,
      canCancel,
    };
    return session;
  });
}

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const list = JSON.parse(raw) as string[];
          setBookedIds(new Set(list));
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const persist = async (next: Set<string>) => {
    setBookedIds(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
  };

  const book = async (session: ClassSession) => {
    const next = new Set(bookedIds);
    next.add(session.id);
    await persist(next);
  };

  const cancel = async (session: ClassSession) => {
    const next = new Set(bookedIds);
    next.delete(session.id);
    await persist(next);
  };

  const getSessionsForDate = (date: Date) => buildSession(date, now, bookedIds);

  const getUpcomingBooked = (limit = 20) => {
    const results: ClassSession[] = [];
    for (let i = 0; i < 45 && results.length < limit; i++) {
      const day = addDays(now, i);
      const sessions = buildSession(day, now, bookedIds).filter(
        (s) => s.isBooked && s.startDate.getTime() >= now.getTime() - CANCEL_CUTOFF_MS,
      );
      results.push(...sessions);
    }
    return results
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, limit);
  };

  const getAttendeeNames = (session: ClassSession, userName: string) => {
    const names = getBaseAttendeeNames(session.id, session.baseAttendees);
    if (session.isBooked) {
      return [...names, `${userName} (tú)`];
    }
    return names;
  };

  const value = useMemo<BookingContextValue>(
    () => ({
      isLoading,
      now,
      getSessionsForDate,
      getUpcomingBooked,
      book,
      cancel,
      getAttendeeNames,
    }),
    [isLoading, now, bookedIds],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}

export { ATTENDEE_POOL };
