import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export type UpcomingClass = {
  bookingId: string;
  status: string;
  sessionId: string;
  name: string;
  session_date: string;
  start_time: string;
  coachName: string | null;
};

/**
 * An athlete's confirmed/waitlisted reservations from today onward — shared
 * by member-detail's "Clases" tab and BookClassSheet's "Reservar" sheet, so
 * quitting a reservation from either place is instantly reflected in the
 * other (same query key). No FK between class_bookings.session_id and
 * class_sessions.id (see wodplace_admin_panel_port.sql), so this is two
 * plain queries correlated in JS, not one embedded select.
 */
export function useUpcomingBookings(boxId: string, userId: string, enabled = true) {
  return useQuery({
    queryKey: ["member-upcoming-classes", boxId, userId],
    enabled,
    queryFn: async (): Promise<UpcomingClass[]> => {
      const { data: bookings } = await supabase
        .from("class_bookings")
        .select("id, session_id, status")
        .eq("box_id", boxId)
        .eq("user_id", userId)
        .in("status", ["inscrito", "lista_espera"]);
      const sessionIds = (bookings ?? []).map((b) => b.session_id);
      if (sessionIds.length === 0) return [];

      const today = format(new Date(), "yyyy-MM-dd");
      const { data: sessions } = await supabase
        .from("class_sessions")
        .select("id, name, session_date, start_time, coach:coaches(name)")
        .eq("box_id", boxId)
        .in("id", sessionIds)
        .gte("session_date", today)
        .order("session_date", { ascending: true })
        .order("start_time", { ascending: true });

      const byBooking = new Map((bookings ?? []).map((b) => [b.session_id, b]));
      return ((sessions ?? []) as unknown as {
        id: string; name: string; session_date: string; start_time: string; coach: { name: string } | null;
      }[]).map((s) => {
        const b = byBooking.get(s.id)!;
        return {
          bookingId: b.id,
          status: b.status,
          sessionId: s.id,
          name: s.name,
          session_date: s.session_date,
          start_time: s.start_time,
          coachName: s.coach?.name ?? null,
        };
      });
    },
  });
}
