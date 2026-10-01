import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  cancelBooking,
  createBooking,
  listClassSessions,
  type ClassSessionDto,
} from '@workspace/api-client-react';
import { addDays, formatDuration, formatHM, toDateKey } from '@/lib/dateUtils';

export interface ClassSession {
  id: string;
  date: Date;
  dateKey: string;
  type: string;
  coach: string;
  startMinutes: number;
  endMinutes: number;
  startDate: Date;
  timeRangeLabel: string;
  durationLabel: string;
  durationMin: number;
  capacity: number;
  isBooked: boolean;
  remaining: number;
  hasStarted: boolean;
  canCancel: boolean;
  isWaitlisted: boolean;
  waitlistPosition: number | null;
  attendeeNames: string[];
  /** Coach's short note on what was worked on this session -- only ever
   *  populated by the server when this athlete is booked into it. */
  notes: string | null;
}

const CANCEL_CUTOFF_MS = 60 * 60 * 1000;
// How far back/forward real class_sessions are fetched from — a box's real
// schedule is a small, bounded dataset (unlike the old infinite fake daily
// template), so one range covers normal calendar browsing without needing
// per-day requests or a dynamically expanding window.
const RANGE_BEFORE_DAYS = 30;
const RANGE_AFTER_DAYS = 60;

interface BookingContextValue {
  isLoading: boolean;
  now: Date;
  getSessionsForDate: (date: Date) => ClassSession[];
  getUpcomingBooked: (limit?: number) => ClassSession[];
  /** dateKeys ("YYYY-MM-DD") that have at least one confirmed or waitlisted
   *  booking — drives the calendar's "day with something agendado" dot. */
  bookedDateKeys: Set<string>;
  /** True if the athlete already has a confirmed or waitlisted booking on
   *  that date — the self-service daily limit (see book()'s server-side
   *  enforcement of the same rule). */
  hasAnyBookingOnDate: (date: Date) => boolean;
  book: (session: ClassSession) => Promise<'confirmed' | 'waiting'>;
  cancel: (session: ClassSession) => Promise<void>;
  getAttendeeNames: (session: ClassSession, userName: string) => string[];
  /** Passed straight to useRefetchOnFocusIfStale by consumers (calendar.tsx)
   *  — only actually re-fetches the current window when past staleTime, e.g.
   *  in case a coach added/changed a class since the last load, instead of
   *  unconditionally on every focus. */
  sessionsQuery: Pick<UseQueryResult, 'isStale' | 'refetch'>;
}

const BookingContext = createContext<BookingContextValue | undefined>(undefined);

function toClassSession(dto: ClassSessionDto, now: Date): ClassSession {
  const [year, month, day] = dto.date.split('-').map(Number);
  const [hour, minute] = dto.startTime.split(':').map(Number);
  const date = new Date(year, month - 1, day);
  const startMinutes = hour * 60 + minute;
  const endMinutes = startMinutes + dto.durationMinutes;
  const startDate = new Date(year, month - 1, day, hour, minute, 0, 0);
  const isBooked = dto.myStatus === 'confirmed';
  const isWaitlisted = dto.myStatus === 'waiting';
  const hasStarted = now.getTime() >= startDate.getTime();
  const canCancel =
    (isBooked || isWaitlisted) && startDate.getTime() - now.getTime() > CANCEL_CUTOFF_MS;

  return {
    id: dto.id,
    date,
    dateKey: dto.date,
    type: dto.name,
    coach: dto.coachName ?? 'Sin coach asignado',
    startMinutes,
    endMinutes,
    startDate,
    timeRangeLabel: `${formatHM(startMinutes)} a ${formatHM(endMinutes)}`,
    durationLabel: formatDuration(dto.durationMinutes),
    durationMin: dto.durationMinutes,
    capacity: dto.capacity,
    isBooked,
    remaining: dto.remaining,
    hasStarted,
    canCancel,
    isWaitlisted,
    waitlistPosition: dto.myWaitlistPosition,
    attendeeNames: dto.attendeeNames,
    notes: dto.notes,
  };
}

/** Reads the `code` api-server attaches to a 409 booking error body — duck-
 *  typed here (ApiError.data) rather than importing that class just for
 *  this. POST /bookings currently returns three distinct 409s (waitlist
 *  full, daily self-booking limit, plan's classes_per_period reached);
 *  `code` is what tells them apart, since they all share the same HTTP
 *  status. */
function apiErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const data = (error as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return null;
  const code = (data as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const { user, hasBoxMembership } = useAuth();
  const [now, setNow] = useState(new Date());

  const sessionsQuery = useQuery({
    queryKey: ['class-sessions', user?.id],
    queryFn: async () => {
      const reference = new Date();
      const from = toDateKey(addDays(reference, -RANGE_BEFORE_DAYS));
      const to = toDateKey(addDays(reference, RANGE_AFTER_DAYS));
      const dtos = await listClassSessions({ userId: user!.id, from, to });
      return dtos.map((dto) => toClassSession(dto, reference));
    },
    enabled: !!user?.id && !!hasBoxMembership,
  });
  const sessions = (hasBoxMembership && sessionsQuery.data) || [];
  const isLoading = sessionsQuery.isPending;

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getSessionsForDate = (date: Date): ClassSession[] => {
    const key = toDateKey(date);
    return sessions.filter((s) => s.dateKey === key);
  };

  const bookedDateKeys = useMemo(
    () => new Set(sessions.filter((s) => s.isBooked || s.isWaitlisted).map((s) => s.dateKey)),
    [sessions],
  );

  const getUpcomingBooked = (limit = 20): ClassSession[] =>
    sessions
      .filter((s) => s.isBooked && s.startDate.getTime() >= now.getTime() - CANCEL_CUTOFF_MS)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, limit);

  const book = async (session: ClassSession): Promise<'confirmed' | 'waiting'> => {
    if (!user) return 'confirmed';
    try {
      const result = await createBooking({ sessionId: session.id, userId: user.id });
      // Unconditional, unlike useRefetchOnFocusIfStale elsewhere — we just
      // changed this data ourselves, so it's known-stale regardless of
      // staleTime.
      await sessionsQuery.refetch();
      return result.status === 'waiting' ? 'waiting' : 'confirmed';
    } catch (error) {
      const code = apiErrorCode(error);
      if (code === 'WAITLIST_FULL' || code === 'DAILY_LIMIT_REACHED' || code === 'PLAN_LIMIT_REACHED') {
        throw new Error(code);
      }
      throw error;
    }
  };

  /** Same-day cap the server enforces (one confirmed seat or waitlist spot
   *  per day, self-service only — see POST /bookings). Lets the calendar
   *  screen block the attempt client-side, before hitting the network, from
   *  data it already has loaded. */
  const hasAnyBookingOnDate = (date: Date): boolean =>
    getSessionsForDate(date).some((s) => s.isBooked || s.isWaitlisted);

  const cancel = async (session: ClassSession): Promise<void> => {
    if (!user) return;
    await cancelBooking({ sessionId: session.id, userId: user.id });
    await sessionsQuery.refetch();
  };

  const getAttendeeNames = (session: ClassSession, userName: string): string[] =>
    session.attendeeNames.map((name) => (name === userName ? `${name} (tú)` : name));

  const value = useMemo<BookingContextValue>(
    () => ({
      isLoading,
      now,
      getSessionsForDate,
      getUpcomingBooked,
      bookedDateKeys,
      hasAnyBookingOnDate,
      book,
      cancel,
      getAttendeeNames,
      sessionsQuery: { isStale: sessionsQuery.isStale, refetch: sessionsQuery.refetch },
    }),
    [isLoading, now, sessions, bookedDateKeys, user?.id, sessionsQuery.isStale, sessionsQuery.refetch],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}
