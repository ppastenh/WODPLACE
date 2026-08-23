import {
  CancelBookingBody,
  CancelBookingResponse,
  CreateBookingBody,
  CreateBookingResponse,
  ListBookingsQueryParams,
  ListBookingsResponse,
} from "@workspace/api-zod";
import {
  classBookingsTable,
  db,
  wodplaceNotificationsTable,
} from "@workspace/db";
import { and, asc, eq, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();
const WAITLIST_LIMIT = 5;

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function sessionLabel(sessionId: string): string {
  const [date, time] = sessionId.split("_");
  if (!date || !time) return "la clase seleccionada";
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return "la clase seleccionada";
  return `la clase del ${day}/${month} a las ${time}`;
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
        eq(classBookingsTable.status, "waiting"),
      ),
    )
    .orderBy(asc(classBookingsTable.createdAt), asc(classBookingsTable.id));

  return positionInWaitingRows(waiting, bookingId);
}

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
        status: row.status as "confirmed" | "waiting",
        createdAt: row.createdAt.toISOString(),
        position:
          row.status === "waiting"
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

  const { sessionId, userId, capacity, baseAttendees } = parsed.data;

  try {
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
          status: current.status as "confirmed" | "waiting",
          position:
            current.status === "waiting"
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
            eq(classBookingsTable.status, "confirmed"),
          ),
        );
      const waiting = await tx
        .select({ id: classBookingsTable.id })
        .from(classBookingsTable)
        .where(
          and(
            eq(classBookingsTable.sessionId, sessionId),
            eq(classBookingsTable.status, "waiting"),
          ),
        );

      const hasSeat = Math.min(baseAttendees, capacity) + confirmed.length < capacity;
      if (hasSeat) {
        await tx.insert(classBookingsTable).values({
          id: makeId("booking"),
          sessionId,
          userId,
          status: "confirmed",
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
        sessionId,
        userId,
        status: "waiting",
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
      if (current.status === "confirmed") {
        const [next] = await tx
          .select()
          .from(classBookingsTable)
          .where(
            and(
              eq(classBookingsTable.sessionId, sessionId),
              eq(classBookingsTable.status, "waiting"),
            ),
          )
          .orderBy(asc(classBookingsTable.createdAt), asc(classBookingsTable.id))
          .limit(1);

        if (next) {
          promotedUserId = next.userId;
          await tx
            .update(classBookingsTable)
            .set({ status: "confirmed" })
            .where(eq(classBookingsTable.id, next.id));
          await tx.insert(wodplaceNotificationsTable).values({
            id: makeId("notification"),
            userId: next.userId,
            title: "¡Tu clase se agendó!",
            body: `Se liberó un cupo en ${sessionLabel(sessionId)}. Ya estás agendado.`,
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