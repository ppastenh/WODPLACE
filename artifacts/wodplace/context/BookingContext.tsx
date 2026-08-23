import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import {
  cancelBooking,
  createBooking,
  listBookings,
  type BookingRecord,
} from '@workspace/api-client-react';
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
  isWaitlisted: boolean;
  waitlistPosition: number | null;
}

const STORAGE_KEY = 'wodplace_bookings';
const CANCEL_CUTOFF_MS = 60 * 60 * 1000;

interface BookingContextValue {
  isLoading: boolean;
  now: Date;
  getSessionsForDate: (date: Date) => ClassSession[];
  getUpcomingBooked: (limit?: number) => ClassSession[];
  book: (session: ClassSession) => Promise<'confirmed' | 'waiting'>;
  cancel: (session: ClassSession) => Promise<void>;
  getAttendeeNames: (session: ClassSession, userName: string) => string[];
}

const BookingContext = createContext<BookingContextValue | undefined>(undefined);

function buildSession(
  date: Date,
  now: Date,
  bookedIds: Set<string>,
  bookingRecords: Map<string, BookingRecord>,
  localWaitlistPositions: Map<string, number>,
) {
  const dateKey = toDateKey(date);
  return DAILY_TEMPLATE.map((template) => {
    const id = getSessionId(dateKey, template.time);
    const startMinutes = parseTimeToMinutes(template.time);
    const endMinutes = startMinutes + template.durationMin;
    const startDate = new Date(date);
    startDate.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
    const baseAttendees = getBaseAttendeeCount(id, template.capacity);
    const booking = bookingRecords.get(id);
    const isBooked = booking?.status === 'confirmed' || bookedIds.has(id);
    const isWaitlisted =
      booking?.status === 'waiting' || localWaitlistPositions.has(id);
    const waitlistPosition =
      booking?.position ?? localWaitlistPositions.get(id) ?? null;
    const remaining = Math.max(0, template.capacity - baseAttendees - (isBooked ? 1 : 0));
    const hasStarted = now.getTime() >= startDate.getTime();
    const canCancel =
      (isBooked || isWaitlisted) &&
      startDate.getTime() - now.getTime() > CANCEL_CUTOFF_MS;

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
      isWaitlisted,
      waitlistPosition,
    };
    return session;
  });
}

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set());
  const [bookingRecords, setBookingRecords] = useState<Map<string, BookingRecord>>(
    new Map(),
  );
  const [localWaitlistPositions, setLocalWaitlistPositions] = useState<Map<string, number>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const { user } = useAuth();

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
    if (!user) return;

    let mounted = true;
    const loadRemoteBookings = async () => {
      try {
        const rows = await listBookings({ userId: user.id });
        if (!mounted) return;
        const records = new Map(rows.map((row) => [row.sessionId, row]));
        setBookingRecords(records);
        setBookedIds(
          new Set(rows.filter((row) => row.status === 'confirmed').map((row) => row.sessionId)),
        );
        setLocalWaitlistPositions(new Map());
      } catch {
        // Keep the local fallback so the calendar remains usable if the API
        // is temporarily unavailable.
      }
    };

    void loadRemoteBookings();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const persist = async (next: Set<string>) => {
    setBookedIds(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
  };

  const book = async (session: ClassSession): Promise<'confirmed' | 'waiting'> => {
    if (!user) return 'confirmed';

    try {
      const result = await createBooking({
        sessionId: session.id,
        userId: user.id,
        capacity: session.capacity,
        baseAttendees: session.baseAttendees,
      });
      const record: BookingRecord = {
        id: `${session.id}-${user.id}`,
        sessionId: session.id,
        userId: user.id,
        status: result.status === 'waiting' ? 'waiting' : 'confirmed',
        createdAt: new Date().toISOString(),
        position: result.position,
      };
      const nextRecords = new Map(bookingRecords);
      nextRecords.set(session.id, record);
      setBookingRecords(nextRecords);
      setBookedIds((current) => {
        const next = new Set(current);
        if (result.status === 'confirmed') next.add(session.id);
        return next;
      });
      setLocalWaitlistPositions((current) => {
        const next = new Map(current);
        next.delete(session.id);
        return next;
      });
      return result.status === 'waiting' ? 'waiting' : 'confirmed';
    } catch {
      // Local fallback preserves the original offline-first behavior.
      if (session.remaining <= 0) {
        const nextPosition = localWaitlistPositions.size + 1;
        if (nextPosition > 5) throw new Error('WAITLIST_FULL');
        const nextWaitlist = new Map(localWaitlistPositions);
        nextWaitlist.set(session.id, nextPosition);
        setLocalWaitlistPositions(nextWaitlist);
        return 'waiting';
      }

      const next = new Set(bookedIds);
      next.add(session.id);
      await persist(next);
      return 'confirmed';
    }
  };

  const cancel = async (session: ClassSession) => {
    if (user) {
      try {
        await cancelBooking({ sessionId: session.id, userId: user.id });
        setBookingRecords((current) => {
          const next = new Map(current);
          next.delete(session.id);
          return next;
        });
        setBookedIds((current) => {
          const next = new Set(current);
          next.delete(session.id);
          return next;
        });
        setLocalWaitlistPositions((current) => {
          const next = new Map(current);
          next.delete(session.id);
          return next;
        });
        return;
      } catch {
        // Fall back to local state when the API is unreachable.
      }
    }

    const next = new Set(bookedIds);
    next.delete(session.id);
    await persist(next);
    setLocalWaitlistPositions((current) => {
      const next = new Map(current);
      next.delete(session.id);
      return next;
    });
  };

  const getSessionsForDate = (date: Date) =>
    buildSession(date, now, bookedIds, bookingRecords, localWaitlistPositions);

  const getUpcomingBooked = (limit = 20) => {
    const results: ClassSession[] = [];
    for (let i = 0; i < 45 && results.length < limit; i++) {
      const day = addDays(now, i);
      const sessions = buildSession(
        day,
        now,
        bookedIds,
        bookingRecords,
        localWaitlistPositions,
      ).filter(
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
    [isLoading, now, bookedIds, bookingRecords, localWaitlistPositions, user?.id],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}

export { ATTENDEE_POOL };
