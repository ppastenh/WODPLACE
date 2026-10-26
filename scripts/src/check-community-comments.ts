/**
 * Chequeo permanente de Comunidad (2026-10-25): "el comentario creado es visible para el autor de la publicación, para
 * otro alumno del mismo box y para el administrador del box" y el contador del feed coincide con la lista.
 *
 * Por qué existe: en octubre nadie veía el texto de los comentarios en la app y tardamos en notarlo, porque nada lo
 * comprobaba. Este script cubre la parte del SERVIDOR (ruta de comentarios, contador del feed, borrado por el
 * administrador, que bloquear al autor no oculta comentarios). NO detecta problemas de dibujo en el teléfono (como la
 * lista con alto cero): para eso la checklist de teléfono tiene una línea fija -- "el comentario se ve para el autor,
 * para otro alumno y para el administrador".
 *
 * Cómo trabaja: crea cuentas desechables (check-comments-*@wodplace.test) y UN box desechable, usa la API real
 * como la app (publicar, comentar, listar, feed, borrar) y al final borra TODO lo que creó (por id/box propio).
 * No toca publicaciones, comentarios ni reportes reales: además comprueba que sus conteos no cambiaron.
 *
 * Corre con: pnpm --filter @workspace/scripts check:community-comments
 * Necesita en el entorno: DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y, opcional, API_URL
 * (por defecto https://api.wodplace.cl/api). Sale con código 1 si algo falla.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { Client } from "pg";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const API_URL = (process.env.API_URL ?? "https://api.wodplace.cl/api").replace(/\/+$/, "");

if (!SUPABASE_URL || !SERVICE_KEY || !DATABASE_URL) {
  console.error("Faltan variables de entorno: DATABASE_URL, SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const adminHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
const password = `Tmp!${randomBytes(9).toString("hex")}Aa1`;
const BOX_ID = randomUUID();
const WHO = ["author", "student", "admin"] as const;
type Who = (typeof WHO)[number];
const email = (k: Who) => `check-comments-${k}@wodplace.test`;
const wodplaceId = (k: Who) => `chk-${k}`;

let ok = 0;
let bad = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    ok++;
    console.log(`OK   ${name}`);
  } else {
    bad++;
    console.log(`MAL  ${name}: obtuve ${a}, esperaba ${e}`);
  }
}

async function authAdmin(path: string, init: RequestInit) {
  return fetch(`${SUPABASE_URL}/auth/v1${path}`, { ...init, headers: { ...adminHeaders, ...(init.headers ?? {}) } });
}

async function api(method: string, path: string, jwt?: string, body?: unknown) {
  const r = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text().catch(() => "");
  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {
    /* sin cuerpo */
  }
  return { status: r.status, json };
}

async function main() {
  const db = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  const authIds: Partial<Record<Who, string>> = {};
  const jwt: Partial<Record<Who, string>> = {};

  const realCounts = async () =>
    JSON.stringify(
      (
        await db.query(
          `select (select count(*) from social_posts where box_id <> $1) posts,
                  (select count(*) from social_comments where box_id <> $1) comentarios,
                  (select count(*) from social_reports) reportes,
                  (select count(*) from blocked_users where box_id <> $1) bloqueos`,
          [BOX_ID],
        )
      ).rows[0],
    );
  const antes = await realCounts();

  try {
    for (const k of WHO) {
      const r = await authAdmin("/admin/users", {
        method: "POST",
        body: JSON.stringify({ email: email(k), password, email_confirm: true }),
      });
      const j: any = await r.json();
      if (!j.id) throw new Error(`No se pudo crear la cuenta de prueba ${k} (${r.status})`);
      authIds[k] = j.id;
    }
    for (const k of WHO) {
      await db.query("insert into wodplace_users(id,name,email,auth_user_id) values($1,$2,$3,$4)", [wodplaceId(k), `Chk ${k}`, email(k), authIds[k]]);
    }
    await db.query("insert into boxes(id,name,owner_user_id) values($1,'Check Comentarios',$2)", [BOX_ID, authIds.admin]);
    await db.query("insert into user_roles(user_id,role,box_id) values($1,'box_admin',$2)", [authIds.admin, BOX_ID]);
    await db.query(
      "insert into box_members(box_id,user_id,status) values($1,'chk-author','activo'),($1,'chk-student','activo'),($1,'chk-admin','activo')",
      [BOX_ID],
    );
    for (const k of WHO) {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: SERVICE_KEY!, "Content-Type": "application/json" },
        body: JSON.stringify({ email: email(k), password }),
      });
      const j: any = await r.json();
      if (!j.access_token) throw new Error(`No se pudo iniciar sesión con la cuenta de prueba ${k}`);
      jwt[k] = j.access_token;
    }

    // A publica; B (otro alumno) y el administrador comentan, como lo hace la app.
    const post = await api("POST", "/social/posts", jwt.author, { userId: "chk-author", authorName: "Chk author", body: "Publicación de chequeo" });
    check("el autor publica (201)", post.status, 201);
    const postId: string = post.json.id;
    const c1 = await api("POST", `/social/posts/${postId}/comments`, jwt.student, { userId: "chk-student", authorName: "Chk student", body: "Comentario del alumno" });
    check("otro alumno comenta (201)", c1.status, 201);
    const c2 = await api("POST", `/social/posts/${postId}/comments`, jwt.admin, { userId: "chk-admin", authorName: "Chk admin", body: "Comentario del administrador" });
    check("el administrador comenta (201)", c2.status, 201);

    // El comentario ES VISIBLE (con su texto) para el autor, para otro alumno y para el administrador.
    const textos = ["Comentario del alumno", "Comentario del administrador"];
    for (const [k, nombre] of [["author", "el autor de la publicación"], ["student", "otro alumno del mismo box"], ["admin", "el administrador del box"]] as const) {
      const l = await api("GET", `/social/posts/${postId}/comments?limit=20`, jwt[k]);
      check(`la lista de comentarios la ve con texto ${nombre}`, [l.status, (l.json.comments ?? []).map((c: any) => c.body)], [200, textos]);
    }
    // El contador del feed coincide con la lista.
    for (const [k, uid] of [["author", "chk-author"], ["student", "chk-student"], ["admin", "chk-admin"]] as const) {
      const f = await api("GET", `/social/feed?userId=${uid}`, jwt[k]);
      const p = (f.json.posts ?? []).find((x: any) => x.id === postId);
      check(`el contador del feed (visto por ${k}) coincide con la lista (2)`, p?.commentCount, 2);
    }
    // Bloquear al autor de la publicación no oculta sus comentarios.
    await db.query("insert into blocked_users(user_id,box_id) values('chk-author',$1)", [BOX_ID]);
    const lb = await api("GET", `/social/posts/${postId}/comments?limit=20`, jwt.admin);
    check("con el autor bloqueado, la lista de comentarios sigue completa", (lb.json.comments ?? []).length, 2);
    await db.query("delete from blocked_users where user_id='chk-author'");
    // El administrador borra un comentario ajeno y la lista y el contador bajan.
    const primero = (await api("GET", `/social/posts/${postId}/comments?limit=20`, jwt.admin)).json.comments[0];
    const del = await api("DELETE", `/social/posts/${postId}/comments/${primero.id}`, jwt.admin);
    check("el administrador borra un comentario ajeno (204)", del.status, 204);
    const l2 = await api("GET", `/social/posts/${postId}/comments?limit=20`, jwt.student);
    check("después de borrar, la lista queda con 1", (l2.json.comments ?? []).length, 1);
    const f2 = await api("GET", "/social/feed?userId=chk-student", jwt.student);
    check("después de borrar, el contador del feed queda en 1", (f2.json.posts ?? []).find((x: any) => x.id === postId)?.commentCount, 1);
  } finally {
    const q = async (sql: string, params: unknown[] = [BOX_ID]) => {
      try {
        await db.query(sql, params);
      } catch (e) {
        console.log("limpieza:", (e as Error).message.slice(0, 100));
      }
    };
    await q("delete from social_comments where box_id = $1");
    await q("delete from social_posts where box_id = $1");
    await q("delete from blocked_users where box_id = $1");
    await q("delete from box_members where box_id = $1");
    await q("delete from user_roles where box_id = $1");
    await q("delete from wodplace_users where id like 'chk-%'", []);
    await q("delete from boxes where id = $1");
    for (const id of Object.values(authIds)) await authAdmin(`/admin/users/${id}`, { method: "DELETE" });
    const restos = (
      await db.query(
        `select (select count(*) from boxes where id = $1) cajas, (select count(*) from wodplace_users where id like 'chk-%') usuarios,
                (select count(*) from social_posts where box_id = $1) posts`,
        [BOX_ID],
      )
    ).rows[0];
    check("limpieza: no quedó nada de lo creado", [restos.cajas, restos.usuarios, restos.posts], ["0", "0", "0"]);
    check("los datos reales (publicaciones, comentarios, reportes, bloqueos) no cambiaron", await realCounts(), antes);
    await db.end();
  }
  console.log(`\nOK=${ok} MAL=${bad}`);
  process.exit(bad > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("ERROR:", (e as Error).message);
  process.exit(1);
});
