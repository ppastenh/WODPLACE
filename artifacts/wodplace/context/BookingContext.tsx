import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
  book: (session: ClassSession) => Promise<'confirmed' | 'waiting'>;
  cancel: (session: ClassSession) => Promise<void>;
  getAttendeeNames: (session: ClassSession, userName: string) => string[];
  /** Re-fetches the current window — e.g. after focus, in case a coach
   *  added/changed a class since the last load. */
  refreshSessions: () => Promise<void>;
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
  };
}

/** True for a 409 from api-server (the waitlist is already at 5) — thrown
 *  by customFetch as an ApiError, duck-typed here rather than importing
 *  that class just for this one check. */
function isWaitlistFullError(error: unknown): boolean {
  return !!error && typeof error === 'object' && (error as { status?: unknown }).status === 409;
}

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const { user, hasBoxMembership } = useAuth();
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const loadSessions = useCallback(async () => {
    if (!user?.id || !hasBoxMembership) {
      setSessions([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const reference = new Date();
      const from = toDateKey(addDays(reference, -RANGE_BEFORE_DAYS));
      const to = toDateKey(addDays(reference, RANGE_AFTER_DAYS));
      const dtos = await listClassSessions({ userId: user.id, from, to });
      setSessions(dtos.map((dto) => toClassSession(dto, reference)));
    } catch {
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, hasBoxMembership]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getSessionsForDate = (date: Date): ClassSession[] => {
    const key = toDateKey(date);
    return sessions.filter((s) => s.dateKey === key);
  };

  const getUpcomingBooked = (limit = 20): ClassSession[] =>
    sessions
      .filter((s) => s.isBooked && s.startDate.getTime() >= now.getTime() - CANCEL_CUTOFF_MS)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, limit);

  const book = async (session: ClassSession): Promise<'confirmed' | 'waiting'> => {
    if (!user) return 'confirmed';
    try {
      const result = await createBooking({ sessionId: session.id, userId: user.id });
      await loadSessions();
      return result.status === 'waiting' ? 'waiting' : 'confirmed';
    } catch (error) {
      if (isWaitlistFullError(error)) throw new Error('WAITLIST_FULL');
      throw error;
    }
  };

  const cancel = async (session: ClassSession): Promise<void> => {
    if (!user) return;
    await cancelBooking({ sessionId: session.id, userId: user.id });
    await loadSessions();
  };

  const getAttendeeNames = (session: ClassSession, userName: string): string[] =>
    session.attendeeNames.map((name) => (name === userName ? `${name} (tú)` : name));

  const value = useMemo<BookingContextValue>(
    () => ({
      isLoading,
      now,
      getSessionsForDate,
      getUpcomingBooked,
      book,
      cancel,
      getAttendeeNames,
      refreshSessions: loadSessions,
    }),
    [isLoading, now, sessions, user?.id, loadSessions],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}
