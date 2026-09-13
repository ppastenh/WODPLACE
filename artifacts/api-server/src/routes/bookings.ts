import {
  CancelBookingBody,
  CancelBookingResponse,
  CreateBookingBody,
  CreateBookingResponse,
  ListBookingsQueryParams,
  ListBookingsResponse,
  ListClassSessionsQueryParams,
  ListClassSessionsResponse,
} from "@workspace/api-zod";
import {
  classBookingsTable,
  db,
  wodplaceNotificationsTable,
} from "@workspace/db";
import { and, asc, eq, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";

import { resolveBoxIdForAthlete } from "../lib/boxContext";

const router: IRouter = Router();
const WAITLIST_LIMIT = 5;

// class_bookings' real status vocabulary — the SAME strings box-admin's own
// class-scheduling UI already writes/reads on this table (see
// classes.$id.tsx). The wire contract this app's own client sees
// (BookingRecord.status / CreateBookingResponse.status) stays
// "confirmed"/"waiting" regardless — only these two constants ever touch
// the database.
const DB_CONFIRMED = "inscrito";
const DB_WAITING = "lista_espera";

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Human label for the promotion notification — looks up the real session
 *  since `sessionId` is now an opaque class_sessions.id (a uuid), not the
 *  old "date_time" string a label could be parsed back out of. */
async function describeSession(sessionId: string): Promise<string> {
  const rows = await db.execute<{
    name: string;
    session_date: string;
    start_time: string;
  }>(sql`
    SELECT name, session_date, start_time FROM public.class_sessions WHERE id = ${sessionId}
  `);
  const row = rows.rows[0];
  if (!row) return "la clase seleccionada";
  const [year, month, day] = row.session_date.split("-");
  const time = row.start_time.slice(0, 5);
  const label = row.name?.trim() || "tu clase";
  return `${label} del ${day}/${month} a las ${time}`;
}

function positionInWaitingRows(
  waiting: Array<{ id: string }>,
  bookingId: string,
): number | null {
  const index = waiting.findIndex((row) => row.id === bookingId);
  return index === -1 ? null : index + 1;
}

async function positionFor(
  tx: Pick<typeof db, "select">,
  sessionId: string,
  bookingId: string,
): Promise<number | null> {
  const waiting = await tx
    .select({ id: classBookingsTable.id })
    .from(classBookingsTable)
    .where(
      and(
        eq(classBookingsTable.sessionId, sessionId),
        eq(classBookingsTable.status, DB_WAITING),
      ),
    )
    .orderBy(asc(classBookingsTable.createdAt), asc(classBookingsTable.id));

  return positionInWaitingRows(waiting, bookingId);
}

/**
 * GET /class-sessions?userId=&from=&to=
 *
 * Replaces the old client-side fixed mock schedule — real class_sessions
 * for this athlete's box (via box_members, see resolveBoxIdForAthlete), in
 * one range query rather than one call per calendar day. No box -> empty
 * list, never another box's (or nobody's) schedule.
 */
router.get("/class-sessions", async (req: Request, res: Response) => {
  const parsed = ListClassSessionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "userId, from and to are required" });
    return;
  }
  const { userId, from, to } = parsed.data;

  try {
    const boxId = await resolveBoxIdForAthlete(userId);
    if (!boxId) {
      res.json(ListClassSessionsResponse.parse([]));
      return;
    }

    const sessions = await db.execute<{
      id: string;
      box_id: string;
      name: string;
      session_date: string;
      start_time: string;
      duration_minutes: number;
      capacity: number;
      level: string;
      coach_name: string | null;
    }>(sql`
      SELECT cs.id, cs.box_id, coalesce(nullif(cs.name, ''), cl.name, 'Clase') AS name,
             cs.session_date::text AS session_date, cs.start_time::text AS start_time,
             cs.duration_minutes, cs.capacity, cs.level,
             co.name AS coach_name
      FROM public.class_sessions cs
      LEFT JOIN public.classes cl ON cl.id = cs.class_id
      LEFT JOIN public.coaches co ON co.id = cs.coach_id
      WHERE cs.box_id = ${boxId}
        AND cs.session_date >= ${from}
        AND cs.session_date <= ${to}
        AND cs.status != 'cancelada'
      ORDER BY cs.session_date ASC, cs.start_time ASC
    `);

    if (sessions.rows.length === 0) {
      res.json(ListClassSessionsResponse.parse([]));
      return;
    }

    const sessionIds = sessions.rows.map((r) => r.id);
    const bookings = await db.execute<{
      session_id: string;
      user_id: string;
      status: string;
      created_at: string;
      user_name: string;
    }>(sql`
      SELECT cb.session_id, cb.user_id, cb.status, cb.created_at, wu.name AS user_name
      FROM public.class_bookings cb
      JOIN public.wodplace_users wu ON wu.id = cb.user_id
      WHERE cb.session_id = ANY(${sessionIds})
      ORDER BY cb.created_at ASC
    `);

    const bySession = new Map<string, typeof bookings.rows>();
    for (const row of bookings.rows) {
      const list = bySession.get(row.session_id) ?? [];
      list.push(row);
      bySession.set(row.session_id, list);
    }

    const result = sessions.rows.map((s) => {
      const rows = bySession.get(s.id) ?? [];
      const confirmed = rows.filter((r) => r.status === DB_CONFIRMED);
      const waiting = rows.filter((r) => r.status === DB_WAITING);
      const mine = rows.find((r) => r.user_id === userId);

      let myStatus: "none" | "confirmed" | "waiting" = "none";
      let myWaitlistPosition: number | null = null;
      if (mine?.status === DB_CONFIRMED) {
        myStatus = "confirmed";
      } else if (mine?.status === DB_WAITING) {
        myStatus = "waiting";
        myWaitlistPosition = waiting.findIndex((r) => r.user_id === userId) + 1;
      }

      return {
        id: s.id,
        boxId: s.box_id,
        name: s.name,
        date: s.session_date,
        startTime: s.start_time.slice(0, 5),
        durationMinutes: s.duration_minutes,
        capacity: s.capacity,
        level: s.level,
        coachName: s.coach_name,
        confirmedCount: confirmed.length,
        remaining: Math.max(0, s.capacity - confirmed.length),
        myStatus,
        myWaitlistPosition,
        attendeeNames: confirmed.map((r) => r.user_name),
      };
    });

    res.json(ListClassSessionsResponse.parse(result));
  } catch (error) {
    req.log.error({ err: error }, "Error listing class sessions");
    res.status(500).json({ error: "Failed to list class sessions" });
  }
});

router.get("/bookings", async (req: Request, res: Response) => {
  const parsed = ListBookingsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(classBookingsTable)
      .where(eq(classBookingsTable.userId, parsed.data.userId))
      .orderBy(asc(classBookingsTable.createdAt));

    const result = await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        sessionId: row.sessionId,
        userId: row.userId,
        status: (row.status === DB_WAITING ? "waiting" : "confirmed") as "confirmed" | "waiting",
        createdAt: row.createdAt.toISOString(),
        position:
          row.status === DB_WAITING
            ? await positionFor(db, row.sessionId, row.id)
            : null,
      })),
    );

    res.json(ListBookingsResponse.parse(result));
  } catch (error) {
    req.log.error({ err: error }, "Error listing class bookings");
    res.status(500).json({ error: "Failed to list bookings" });
  }
});

router.post("/bookings", async (req: Request, res: Response) => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid booking fields" });
    return;
  }

  const { sessionId, userId } = parsed.data;

  try {
    const boxId = await resolveBoxIdForAthlete(userId);
    if (!boxId) {
      res.status(403).json({ error: "Necesitás pertenecer a un box para agendar." });
      return;
    }

    // Real capacity, read straight from the session this box actually
    // scheduled — never trusted from the client (the old mock template
    // used to send its own capacity/baseAttendees guesses here).
    const sessionRows = await db.execute<{ capacity: number; status: string }>(sql`
      SELECT capacity, status FROM public.class_sessions
      WHERE id = ${sessionId} AND box_id = ${boxId}
    `);
    const sessionRow = sessionRows.rows[0];
    if (!sessionRow) {
      res.status(404).json({ error: "Clase no encontrada." });
      return;
    }
    if (sessionRow.status === "cancelada") {
      res.status(400).json({ error: "Esta clase fue cancelada." });
      return;
    }
    const capacity = sessionRow.capacity;

    const result = await db.transaction(async (tx) => {
      // Serialize changes for one class so two users cannot take the last
      // seat or fifth waitlist position at the same time.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${sessionId}))`);

      const existing = await tx
        .select()
        .from(classBookingsTable)
        .where(
          and(
            eq(classBookingsTable.sessionId, sessionId),
            eq(classBookingsTable.userId, userId),
          ),
        );
      const current = existing[0];
      if (current) {
        return {
          sessionId,
          userId,
          status: (current.status === DB_WAITING ? "waiting" : "confirmed") as "confirmed" | "waiting",
          position:
            current.status === DB_WAITING
              ? await positionFor(tx, sessionId, current.id)
              : null,
          promotedUserId: null,
        };
      }

      const confirmed = await tx
        .select({ id: classBookingsTable.id })
        .from(classBookingsTable)
        .where(
          and(
            eq(classBookingsTable.sessionId, sessionId),
            eq(classBookingsTable.status, DB_CONFIRMED),
          ),
        );
      const waiting = await tx
        .select({ id: classBookingsTable.id })
        .from(classBookingsTable)
        .where(
          and(
            eq(classBookingsTable.sessionId, sessionId),
            eq(classBookingsTable.status, DB_WAITING),
          ),
        );

      const hasSeat = confirmed.length < capacity;
      if (hasSeat) {
        await tx.insert(classBookingsTable).values({
          id: makeId("booking"),
          boxId,
          sessionId,
          userId,
          status: DB_CONFIRMED,
        });
        return {
          sessionId,
          userId,
          status: "confirmed" as const,
          position: null,
          promotedUserId: null,
        };
      }

      if (waiting.length >= WAITLIST_LIMIT) {
        throw new Error("WAITLIST_FULL");
      }

      const id = makeId("wait");
      await tx.insert(classBookingsTable).values({
        id,
        boxId,
        sessionId,
        userId,
        status: DB_WAITING,
      });
      return {
        sessionId,
        userId,
        status: "waiting" as const,
        position: waiting.length + 1,
        promotedUserId: null,
      };
    });

    res.json(CreateBookingResponse.parse(result));
  } catch (error) {
    if (error instanceof Error && error.message === "WAITLIST_FULL") {
      res.status(409).json({ error: "La lista de espera ya tiene 5 alumnos." });
      return;
    }
    req.log.error({ err: error }, "Error creating class booking");
    res.status(400).json({
      error: "No se pudo agendar la clase. Verifica que tu usuario esté sincronizado.",
    });
  }
});

router.post("/bookings/cancel", async (req: Request, res: Response) => {
  const parsed = CancelBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid cancellation fields" });
    return;
  }

  const { sessionId, userId } = parsed.data;

  try {
    // Fetched once, up front — the promotion notification needs it inside
    // the transaction below, and describeSession's own read doesn't need
    // to run on that transaction's connection.
    const sessionDescription = await describeSession(sessionId);

    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${sessionId}))`);

      const [current] = await tx
        .select()
        .from(classBookingsTable)
        .where(
          and(
            eq(classBookingsTable.sessionId, sessionId),
            eq(classBookingsTable.userId, userId),
          ),
        );

      if (!current) return null;

      await tx
        .delete(classBookingsTable)
        .where(eq(classBookingsTable.id, current.id));

      let promotedUserId: string | null = null;
      if (current.status === DB_CONFIRMED) {
        const [next] = await tx
          .select()
          .from(classBookingsTable)
          .where(
            and(
              eq(classBookingsTable.sessionId, sessionId),
              eq(classBookingsTable.status, DB_WAITING),
            ),
          )
          .orderBy(asc(classBookingsTable.createdAt), asc(classBookingsTable.id))
          .limit(1);

        if (next) {
          promotedUserId = next.userId;
          await tx
            .update(classBookingsTable)
            .set({ status: DB_CONFIRMED })
            .where(eq(classBookingsTable.id, next.id));
          await tx.insert(wodplaceNotificationsTable).values({
            id: makeId("notification"),
            userId: next.userId,
            title: "¡Tu clase se agendó!",
            body: `Se liberó un cupo en ${sessionDescription}. Ya estás agendado.`,
          });
        }
      }

      return {
        sessionId,
        userId,
        status: "cancelled" as const,
        position: null,
        promotedUserId,
      };
    });

    if (!result) {
      res.status(404).json({ error: "No encontramos una reserva o lista de espera activa." });
      return;
    }

    res.json(CancelBookingResponse.parse(result));
  } catch (error) {
    req.log.error({ err: error }, "Error cancelling class booking");
    res.status(400).json({ error: "No se pudo cancelar la reserva." });
  }
});

export default router;
