import { Router, type IRouter, type Request, type Response } from "express";
import {
  blockedUsersTable,
  boxSettingsTable,
  db,
  socialCommentsTable,
  socialPostsTable,
  socialReactionsTable,
  socialReportsTable,
  wodplaceNotificationsTable,
} from "@workspace/db";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lt,
  not,
  or,
} from "drizzle-orm";
import { z } from "zod";
import { requireAdminCode } from "../lib/adminAuth";

const router: IRouter = Router();

const EDIT_WINDOW_MS = 15 * 60 * 1000;
const ALLOWED_EMOJIS = ["💪", "🔥", "👏", "❤️", "🎉"] as const;
const REPORT_REASONS = ["spam", "inappropriate", "other"] as const;
const FEED_DAYS = 60;
const PAGE = 15;

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseImageUris(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

type PostRow = typeof socialPostsTable.$inferSelect;

type EnrichedPost = {
  id: string; userId: string | null; authorName: string;
  body: string; imageUris: string[]; type: string;
  createdAt: string; canEdit: boolean;
  reactions: { emoji: string; count: number }[];
  myReaction: string | null; commentCount: number;
};

async function enrichPosts(rows: PostRow[], viewerUserId?: string): Promise<EnrichedPost[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const now = Date.now();

  const [reactions, comments] = await Promise.all([
    db.select().from(socialReactionsTable).where(inArray(socialReactionsTable.postId, ids)),
    db
      .select({ postId: socialCommentsTable.postId })
      .from(socialCommentsTable)
      .where(and(inArray(socialCommentsTable.postId, ids), isNull(socialCommentsTable.deletedAt))),
  ]);

  const reactionsByPost = new Map<string, (typeof reactions)[0][]>();
  const commentCountByPost = new Map<string, number>();
  for (const r of reactions) {
    if (!reactionsByPost.has(r.postId)) reactionsByPost.set(r.postId, []);
    reactionsByPost.get(r.postId)!.push(r);
  }
  for (const c of comments) {
    commentCountByPost.set(c.postId, (commentCountByPost.get(c.postId) ?? 0) + 1);
  }

  return rows.map((row) => {
    const postReactions = reactionsByPost.get(row.id) ?? [];
    const emojiCounts = new Map<string, number>();
    let myReaction: string | null = null;
    for (const r of postReactions) {
      emojiCounts.set(r.emoji, (emojiCounts.get(r.emoji) ?? 0) + 1);
      if (r.userId === viewerUserId) myReaction = r.emoji;
    }
    const reactionsList = ALLOWED_EMOJIS.filter((e) => emojiCounts.has(e)).map((e) => ({
      emoji: e, count: emojiCounts.get(e)!,
    }));
    const ageMs = now - new Date(row.createdAt).getTime();
    const canEdit = !!viewerUserId && row.userId === viewerUserId && ageMs < EDIT_WINDOW_MS;
    return {
      id: row.id, userId: row.userId, authorName: row.authorName,
      body: row.body, imageUris: parseImageUris(row.imageUris), type: row.type,
      createdAt: row.createdAt.toISOString(), canEdit,
      reactions: reactionsList, myReaction, commentCount: commentCountByPost.get(row.id) ?? 0,
    };
  });
}

// ─── Box settings ─────────────────────────────────────────────────────────────

router.get("/settings/box-name", async (_req: Request, res: Response) => {
  try {
    const [row] = await db.select().from(boxSettingsTable).where(eq(boxSettingsTable.key, "box_name")).limit(1);
    res.json({ name: row?.value ?? "" });
  } catch { res.json({ name: "" }); }
});

router.put("/admin/settings/box-name", requireAdminCode, async (req: Request, res: Response) => {
  const parsed = z.object({ name: z.string().trim().min(1).max(60) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Nombre inválido" }); return; }
  try {
    await db.insert(boxSettingsTable).values({ key: "box_name", value: parsed.data.name })
      .onConflictDoUpdate({ target: boxSettingsTable.key, set: { value: parsed.data.name, updatedAt: new Date() } });
    res.json({ name: parsed.data.name });
  } catch (error) {
    req.log.error({ err: error }, "Error updating box name");
    res.status(500).json({ error: "No se pudo actualizar." });
  }
});

// ─── Feed (paginated, last 60 days) ──────────────────────────────────────────

router.get("/social/feed", async (req: Request, res: Response) => {
  const parsed = z.object({
    userId: z.string().optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().min(1).max(30).default(PAGE),
  }).safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query" }); return; }
  const { userId, cursor, limit } = parsed.data;
  const cutoff = new Date(Date.now() - FEED_DAYS * 86_400_000);
  try {
    const blocked = await db.select({ userId: blockedUsersTable.userId }).from(blockedUsersTable);
    const blockedIds = blocked.map((r) => r.userId);
    const conditions = [
      isNull(socialPostsTable.deletedAt),
      gte(socialPostsTable.createdAt, cutoff),
      ...(cursor ? [lt(socialPostsTable.createdAt, new Date(cursor))] : []),
      ...(blockedIds.length > 0
        ? [or(isNull(socialPostsTable.userId), not(inArray(socialPostsTable.userId, blockedIds)))!]
        : []),
    ];
    const rows = await db.select().from(socialPostsTable)
      .where(and(...conditions)).orderBy(desc(socialPostsTable.createdAt)).limit(limit + 1);
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const enriched = await enrichPosts(page, userId);
    const nextCursor = hasMore && page.length > 0 ? page[page.length - 1].createdAt.toISOString() : null;
    res.json({ posts: enriched, nextCursor, hasMore });
  } catch (error) {
    req.log.error({ err: error }, "Error fetching feed");
    res.status(500).json({ error: "Failed to fetch feed" });
  }
});

// ─── My posts (no 60-day cutoff) ─────────────────────────────────────────────

router.get("/social/posts/mine", async (req: Request, res: Response) => {
  const parsed = z.object({
    userId: z.string(),
    cursor: z.string().optional(),
    limit: z.coerce.number().min(1).max(30).default(PAGE),
  }).safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "userId required" }); return; }
  const { userId, cursor, limit } = parsed.data;
  try {
    const conditions = [
      isNull(socialPostsTable.deletedAt),
      eq(socialPostsTable.userId, userId),
      ...(cursor ? [lt(socialPostsTable.createdAt, new Date(cursor))] : []),
    ];
    const rows = await db.select().from(socialPostsTable)
      .where(and(...conditions)).orderBy(desc(socialPostsTable.createdAt)).limit(limit + 1);
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const enriched = await enrichPosts(page, userId);
    const nextCursor = hasMore && page.length > 0 ? page[page.length - 1].createdAt.toISOString() : null;
    res.json({ posts: enriched, nextCursor, hasMore });
  } catch (error) {
    req.log.error({ err: error }, "Error fetching user posts");
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// ─── Create / Edit / Delete post ─────────────────────────────────────────────

router.post("/social/posts", async (req: Request, res: Response) => {
  const parsed = z.object({
    userId: z.string(), authorName: z.string(),
    body: z.string().default(""),
    imageUris: z.array(z.string()).max(4).default([]),
    type: z.enum(["post", "announcement"]).default("post"),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Datos inválidos" }); return; }
  const { userId, authorName, body, imageUris, type } = parsed.data;
  if (!body.trim() && imageUris.length === 0) {
    res.status(400).json({ error: "Se requiere texto o al menos una foto." }); return;
  }
  try {
    const id = makeId("post");
    await db.insert(socialPostsTable).values({
      id, userId, authorName,
      body: body.trim() || "Compartió una foto con la comunidad.",
      imageUris: imageUris.length > 0 ? JSON.stringify(imageUris) : null,
      type,
    });
    const [row] = await db.select().from(socialPostsTable).where(eq(socialPostsTable.id, id));
    const [enriched] = await enrichPosts([row], userId);
    res.status(201).json(enriched);
  } catch (error) {
    req.log.error({ err: error }, "Error creating post");
    res.status(500).json({ error: "No se pudo publicar." });
  }
});

router.patch("/social/posts/:id", async (req: Request, res: Response) => {
  const parsed = z.object({ userId: z.string(), body: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Body required" }); return; }
  const { userId, body } = parsed.data;
  try {
    const [post] = await db.select().from(socialPostsTable).where(eq(socialPostsTable.id, req.params.id));
    if (!post || post.deletedAt) { res.status(404).json({ error: "No encontrado." }); return; }
    if (post.userId !== userId) { res.status(403).json({ error: "No puedes editar esta publicación." }); return; }
    if (Date.now() - new Date(post.createdAt).getTime() > EDIT_WINDOW_MS) {
      res.status(403).json({ error: "El tiempo de edición (15 min) ha expirado." }); return;
    }
    await db.update(socialPostsTable).set({ body: body.trim() }).where(eq(socialPostsTable.id, req.params.id));
    const [updated] = await db.select().from(socialPostsTable).where(eq(socialPostsTable.id, req.params.id));
    const [enriched] = await enrichPosts([updated], userId);
    res.json(enriched);
  } catch (error) {
    req.log.error({ err: error }, "Error editing post");
    res.status(500).json({ error: "No se pudo editar." });
  }
});

router.delete("/social/posts/:id", async (req: Request, res: Response) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  const adminCode = req.headers["x-admin-code"];
  const isAdmin = !!adminCode && adminCode === process.env.ADMIN_ACCESS_CODE;
  try {
    const [post] = await db.select().from(socialPostsTable).where(eq(socialPostsTable.id, req.params.id));
    if (!post || post.deletedAt) { res.status(404).json({ error: "No encontrado." }); return; }
    if (!isAdmin && post.userId !== userId) { res.status(403).json({ error: "No puedes eliminar esta publicación." }); return; }
    await db.update(socialPostsTable).set({ deletedAt: new Date() }).where(eq(socialPostsTable.id, req.params.id));
    res.status(204).end();
  } catch (error) {
    req.log.error({ err: error }, "Error deleting post");
    res.status(500).json({ error: "No se pudo eliminar." });
  }
});

// ─── Comments ─────────────────────────────────────────────────────────────────

router.get("/social/posts/:id/comments", async (req: Request, res: Response) => {
  const parsed = z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().min(1).max(30).default(20),
  }).safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Invalid query" }); return; }
  const { cursor, limit } = parsed.data;
  try {
    const conditions = [
      eq(socialCommentsTable.postId, req.params.id),
      isNull(socialCommentsTable.deletedAt),
      ...(cursor ? [gt(socialCommentsTable.createdAt, new Date(cursor))] : []),
    ];
    const rows = await db.select().from(socialCommentsTable)
      .where(and(...conditions)).orderBy(asc(socialCommentsTable.createdAt)).limit(limit + 1);
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    res.json({
      comments: page.map((r) => ({
        id: r.id, postId: r.postId, userId: r.userId, authorName: r.authorName,
        body: r.body, createdAt: r.createdAt.toISOString(),
      })),
      nextCursor: hasMore && page.length > 0 ? page[page.length - 1].createdAt.toISOString() : null,
      hasMore,
    });
  } catch (error) {
    req.log.error({ err: error }, "Error fetching comments");
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

router.post("/social/posts/:id/comments", async (req: Request, res: Response) => {
  const parsed = z.object({ userId: z.string(), authorName: z.string(), body: z.string().min(1).max(500) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Missing fields" }); return; }
  const { userId, authorName, body } = parsed.data;
  try {
    const [post] = await db.select().from(socialPostsTable).where(eq(socialPostsTable.id, req.params.id));
    if (!post || post.deletedAt) { res.status(404).json({ error: "No encontrado." }); return; }
    const id = makeId("comment");
    await db.insert(socialCommentsTable).values({ id, postId: req.params.id, userId, authorName, body });
    if (post.userId && post.userId !== userId) {
      db.insert(wodplaceNotificationsTable).values({
        id: makeId("notif"), userId: post.userId,
        title: "Nuevo comentario", body: `${authorName} comentó en tu publicación.`,
      }).catch(() => {});
    }
    const [row] = await db.select().from(socialCommentsTable).where(eq(socialCommentsTable.id, id));
    res.status(201).json({
      id: row.id, postId: row.postId, userId: row.userId, authorName: row.authorName,
      body: row.body, createdAt: row.createdAt.toISOString(),
    });
  } catch (error) {
    req.log.error({ err: error }, "Error creating comment");
    res.status(500).json({ error: "No se pudo comentar." });
  }
});

router.delete("/social/posts/:id/comments/:commentId", async (req: Request, res: Response) => {
  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  const adminCode = req.headers["x-admin-code"];
  const isAdmin = !!adminCode && adminCode === process.env.ADMIN_ACCESS_CODE;
  try {
    const [comment] = await db.select().from(socialCommentsTable).where(eq(socialCommentsTable.id, req.params.commentId));
    if (!comment || comment.deletedAt) { res.status(404).json({ error: "No encontrado." }); return; }
    if (!isAdmin && comment.userId !== userId) { res.status(403).json({ error: "No puedes eliminar este comentario." }); return; }
    await db.update(socialCommentsTable).set({ deletedAt: new Date() }).where(eq(socialCommentsTable.id, req.params.commentId));
    res.status(204).end();
  } catch (error) {
    req.log.error({ err: error }, "Error deleting comment");
    res.status(500).json({ error: "No se pudo eliminar." });
  }
});

// ─── Reactions ────────────────────────────────────────────────────────────────

router.post("/social/posts/:id/reactions", async (req: Request, res: Response) => {
  const parsed = z.object({ userId: z.string(), emoji: z.enum(ALLOWED_EMOJIS) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "emoji inválido" }); return; }
  const { userId, emoji } = parsed.data;
  try {
    const [post] = await db.select().from(socialPostsTable).where(eq(socialPostsTable.id, req.params.id));
    if (!post || post.deletedAt) { res.status(404).json({ error: "No encontrado." }); return; }
    const [existing] = await db.select().from(socialReactionsTable)
      .where(and(eq(socialReactionsTable.postId, req.params.id), eq(socialReactionsTable.userId, userId)));

    let isNew = false;
    if (existing) {
      if (existing.emoji === emoji) {
        await db.delete(socialReactionsTable).where(eq(socialReactionsTable.id, existing.id));
      } else {
        await db.update(socialReactionsTable).set({ emoji }).where(eq(socialReactionsTable.id, existing.id));
        isNew = true;
      }
    } else {
      await db.insert(socialReactionsTable).values({ id: makeId("reaction"), postId: req.params.id, userId, emoji });
      isNew = true;
      if (post.userId && post.userId !== userId) {
        db.insert(wodplaceNotificationsTable).values({
          id: makeId("notif"), userId: post.userId,
          title: "Nueva reacción", body: `Alguien reaccionó a tu publicación con ${emoji}.`,
        }).catch(() => {});
      }
    }

    const allReactions = await db.select().from(socialReactionsTable).where(eq(socialReactionsTable.postId, req.params.id));
    const emojiCounts: Record<string, number> = {};
    let myReaction: string | null = null;
    for (const r of allReactions) {
      emojiCounts[r.emoji] = (emojiCounts[r.emoji] ?? 0) + 1;
      if (r.userId === userId) myReaction = r.emoji;
    }
    const reactionsList = ALLOWED_EMOJIS.filter((e) => emojiCounts[e]).map((e) => ({ emoji: e, count: emojiCounts[e] }));
    res.json({ added: isNew, myReaction, reactions: reactionsList });
  } catch (error) {
    req.log.error({ err: error }, "Error toggling reaction");
    res.status(500).json({ error: "No se pudo reaccionar." });
  }
});

// ─── Reports ─────────────────────────────────────────────────────────────────

router.post("/social/posts/:id/report", async (req: Request, res: Response) => {
  const parsed = z.object({
    reporterId: z.string(), reporterName: z.string(), reason: z.enum(REPORT_REASONS),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Datos inválidos" }); return; }
  try {
    await db.insert(socialReportsTable).values({
      id: makeId("report"), postId: req.params.id,
      reporterId: parsed.data.reporterId, reporterName: parsed.data.reporterName, reason: parsed.data.reason,
    });
    res.status(201).json({ ok: true });
  } catch (error) {
    req.log.error({ err: error }, "Error creating report");
    res.status(500).json({ error: "No se pudo reportar." });
  }
});

router.get("/admin/social/reports", requireAdminCode, async (req: Request, res: Response) => {
  try {
    const reports = await db
      .select({ report: socialReportsTable, post: socialPostsTable })
      .from(socialReportsTable)
      .leftJoin(socialPostsTable, eq(socialReportsTable.postId, socialPostsTable.id))
      .where(isNull(socialReportsTable.resolvedAt))
      .orderBy(desc(socialReportsTable.createdAt));
    res.json(reports.map((r) => ({
      id: r.report.id, postId: r.report.postId,
      reporterName: r.report.reporterName, reason: r.report.reason,
      createdAt: r.report.createdAt.toISOString(),
      post: r.post ? {
        id: r.post.id, authorName: r.post.authorName, body: r.post.body,
        createdAt: r.post.createdAt.toISOString(), deletedAt: r.post.deletedAt?.toISOString() ?? null,
      } : null,
    })));
  } catch (error) {
    req.log.error({ err: error }, "Error fetching reports");
    res.status(500).json({ error: "Failed" });
  }
});

router.patch("/admin/social/reports/:id/resolve", requireAdminCode, async (req: Request, res: Response) => {
  try {
    await db.update(socialReportsTable).set({ resolvedAt: new Date() }).where(eq(socialReportsTable.id, req.params.id));
    res.json({ ok: true });
  } catch (error) {
    req.log.error({ err: error }, "Error resolving report");
    res.status(500).json({ error: "No se pudo resolver." });
  }
});

// ─── Block ────────────────────────────────────────────────────────────────────

router.post("/admin/users/:userId/block", requireAdminCode, async (req: Request, res: Response) => {
  try {
    await db.insert(blockedUsersTable).values({ userId: req.params.userId }).onConflictDoNothing();
    res.status(201).json({ ok: true });
  } catch (error) {
    req.log.error({ err: error }, "Error blocking user");
    res.status(500).json({ error: "No se pudo bloquear." });
  }
});

router.delete("/admin/users/:userId/block", requireAdminCode, async (req: Request, res: Response) => {
  try {
    await db.delete(blockedUsersTable).where(eq(blockedUsersTable.userId, req.params.userId));
    res.status(204).end();
  } catch (error) {
    req.log.error({ err: error }, "Error unblocking user");
    res.status(500).json({ error: "No se pudo desbloquear." });
  }
});

export default router;
