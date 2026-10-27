/**
 * Chequeo permanente de reservas, notificaciones y estadísticas del plan (2026-10-28).
 *
 * Por qué existe: durante meses TODA notificación creada por el servidor falló en silencio (la tabla exigía box_id y el
 * código no lo enviaba) y, peor, cancelar una reserva confirmada con alguien en lista de espera respondía 400 sin
 * cancelar nada. Nada lo comprobaba. Este script usa la API real, como la app, con cuentas, dos boxes, clases, planes y
 * reservas DESECHABLES, y comprueba:
 *   A. GET /box-memberships/my-plans: clases realizadas y reservadas del período (plan por cantidad e ilimitado), el cupo
 *      gastado, y que una reserva en lista de espera o fuera del período no cuenta;
 *   B. cancelar una reserva confirmada CON alguien en lista de espera: responde 200, la persona en espera asciende y recibe
 *      la notificación "¡Tu clase se agendó!" con el box_id de la clase;
 *   C. cancelar una reserva SIN lista de espera: responde 200, la reserva desaparece y no se crea ninguna notificación;
 *   D. aislamiento: un alumno de OTRO box no ve esas notificaciones, ni puede pedir la lista de otra cuenta;
 *   E. comentar y reaccionar a una publicación crea "Nuevo comentario" y "Nueva reacción" para su autor (con box_id);
 *   F. el estado leído/no leído lo guarda el servidor: sigue leído tras iniciar sesión de nuevo.
 * Al terminar borra TODO lo que creó (por id/box propio) y comprueba que los datos reales no cambiaron.
 *
 * Corre con: pnpm --filter @workspace/scripts check:booking-notifications
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

const password = `Tmp!${randomBytes(9).toString("hex")}Aa1`;
const BOX_A = randomUUID();
const BOX_B = randomUUID();
const USERS = ["a1", "a2", "a3", "a4", "a5", "b1"] as const;
type U = (typeof USERS)[number];
const email = (k: U) => `check-booking-${k}@wodplace.test`;
const wid = (k: U) => `cbn-${k}`;

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
  const authIds: Partial<Record<U, string>> = {};
  const jwt: Partial<Record<U, string>> = {};
  const sql = async (s: string, p: unknown[] = []) => db.query(s, p);

  const realCounts = async () =>
    JSON.stringify(
      (
        await sql(
          `select (select count(*) from wodplace_notifications where box_id not in ($1,$2)) notificaciones,
                  (select count(*) from class_bookings where box_id not in ($1,$2)) reservas,
                  (select count(*) from class_sessions where box_id not in ($1,$2)) clases,
                  (select count(*) from plans where box_id not in ($1,$2)) planes,
                  (select count(*) from social_posts where box_id not in ($1,$2)) publicaciones`,
          [BOX_A, BOX_B],
        )
      ).rows[0],
    );
  const antes = await realCounts();

  try {
    // ── Cuentas, boxes, planes, clases
    for (const k of USERS) {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: "POST",
        headers: { apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email: email(k), password, email_confirm: true }),
      });
      const j: any = await r.json();
      if (!j.id) throw new Error(`No se pudo crear la cuenta de prueba ${k} (${r.status})`);
      authIds[k] = j.id;
      await sql("insert into wodplace_users(id,name,email,auth_user_id) values($1,$2,$3,$4)", [wid(k), `Cbn ${k}`, email(k), j.id]);
    }
    await sql("insert into boxes(id,name,owner_user_id) values($1,'Check Reservas A',$2),($3,'Check Reservas B',$4)", [BOX_A, authIds.a1, BOX_B, authIds.b1]);
    for (const k of ["a1", "a2", "a3", "a4", "a5"] as U[]) await sql("insert into box_members(box_id,user_id,status) values($1,$2,'activo')", [BOX_A, wid(k)]);
    await sql("insert into box_members(box_id,user_id,status) values($1,$2,'activo')", [BOX_B, wid("b1")]);
    for (const k of USERS) {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { apikey: SERVICE_KEY!, "Content-Type": "application/json" },
        body: JSON.stringify({ email: email(k), password }),
      });
      const j: any = await r.json();
      if (!j.access_token) throw new Error(`No se pudo iniciar sesión con la cuenta de prueba ${k}`);
      jwt[k] = j.access_token;
    }
    const hoy: string = (await sql("select (now() at time zone 'America/Santiago')::date::text d")).rows[0].d;
    const dia = async (n: number): Promise<string> => (await sql("select ($1::date + $2::int)::text d", [hoy, n])).rows[0].d;
    const finPeriodo = await dia(20); // período de 30 días: empezó hace 10 días y termina en 20

    // ── A. my-plans
    await sql("insert into plans(id,box_id,name,price,duration_days,classes_per_period,benefits,is_featured,is_active) values('cbn-planA',$1,'Check Plan 8',1000,30,8,'{}',false,true),('cbn-planB',$1,'Check Plan Ilimitado',2000,30,null,'{}',false,true)", [BOX_A]);
    await sql("update box_members set plan_id='cbn-planA', next_payment_at=$1 where box_id=$2 and user_id=$3", [finPeriodo, BOX_A, wid("a1")]);
    await sql("update box_members set plan_id='cbn-planB', next_payment_at=$1 where box_id=$2 and user_id=$3", [finPeriodo, BOX_A, wid("a2")]);
    const sesiones: Array<[string, number]> = [["cbn-sA", -11], ["cbn-sB", -10], ["cbn-sC", -3], ["cbn-sD", 2], ["cbn-sE", 5], ["cbn-sF", 20]];
    for (const [id, off] of sesiones) {
      await sql("insert into class_sessions(id,box_id,name,session_date,start_time,duration_minutes,capacity,status) values($1,$2,'Check clase',$3,'07:00',60,10,'programada')", [id, BOX_A, await dia(off)]);
      for (const k of ["a1", "a2"] as U[]) await sql("insert into class_bookings(id,session_id,user_id,status,box_id) values($1,$2,$3,'inscrito',$4)", [`cbn-b-${k}-${id}`, id, wid(k), BOX_A]);
    }
    const miPlan = async (k: U) => {
      const r = await api("GET", `/box-memberships/my-plans?userId=${wid(k)}`, jwt[k]);
      return { status: r.status, plan: (r.json.plans ?? []).find((p: any) => p.isSubscribed) };
    };
    const p1 = await miPlan("a1");
    check("A. plan por cantidad: realizadas 2 (primer día del período y hace 3 días; la de antes no)", p1.plan?.classesCompletedInPeriod, 2);
    check("A. plan por cantidad: reservadas 2 (en 2 y 5 días; la del día del próximo pago no)", p1.plan?.classesReservedInPeriod, 2);
    check("A. plan por cantidad: cupo gastado 4 y quedan 4 (una reserva gasta cupo)", [p1.plan?.classesUsedInPeriod, p1.plan?.classesRemaining], [4, 4]);
    const p2 = await miPlan("a2");
    check("A. plan ilimitado: también devuelve realizadas y reservadas (2 y 2), sin tope", [p2.plan?.classesCompletedInPeriod, p2.plan?.classesReservedInPeriod, p2.plan?.classesPerPeriod, p2.plan?.classesRemaining], [2, 2, null, null]);
    check("A. durationDays viaja en el plan", p2.plan?.durationDays, 30);
    await sql("update class_bookings set status='lista_espera' where id='cbn-b-a1-cbn-sB'");
    const p1b = await miPlan("a1");
    check("A. una reserva que pasa a lista de espera deja de contar (1 realizada, 2 reservadas, quedan 5)", [p1b.plan?.classesCompletedInPeriod, p1b.plan?.classesReservedInPeriod, p1b.plan?.classesRemaining], [1, 2, 5]);

    // ── B. cancelar CON lista de espera
    const futura = await dia(7);
    await sql("insert into class_sessions(id,box_id,name,session_date,start_time,duration_minutes,capacity,status) values('cbn-cap1',$1,'Check cupo 1',$2,'18:00',60,1,'programada'),('cbn-cap5',$1,'Check cupo 5',$2,'19:00',60,5,'programada')", [BOX_A, futura]);
    const reservar = (k: U, sid: string) => api("POST", "/bookings", jwt[k], { sessionId: sid, userId: wid(k) });
    const r3 = await reservar("a3", "cbn-cap1");
    const r4 = await reservar("a4", "cbn-cap1");
    check("B. a3 queda confirmada y a4 en lista de espera", [r3.json.status, r4.json.status], ["confirmed", "waiting"]);
    const cancel = await api("POST", "/bookings/cancel", jwt.a3, { sessionId: "cbn-cap1", userId: wid("a3") });
    check("B. cancelar con lista de espera responde 200", cancel.status, 200);
    const reservas = (await sql("select user_id, status from class_bookings where session_id='cbn-cap1' order by user_id")).rows.map((x: any) => `${x.user_id}:${x.status}`);
    check("B. la reserva cancelada desaparece y a4 asciende a inscrito", reservas, ["cbn-a4:inscrito"]);
    const nA4 = (await sql("select title, box_id, read_at is null nueva from wodplace_notifications where user_id=$1", [wid("a4")])).rows;
    check("B. a4 recibe '¡Tu clase se agendó!' con el box_id de la clase, sin leer", nA4.map((x: any) => [x.title, x.box_id === BOX_A, x.nueva]), [["¡Tu clase se agendó!", true, true]]);
    const listaA4 = await api("GET", `/notifications?userId=${wid("a4")}`, jwt.a4);
    check("B. la app de a4 la recibe por la API (nueva)", [listaA4.status, (listaA4.json as any[]).map((x) => [x.title, x.read])], [200, [["¡Tu clase se agendó!", false]]]);

    // ── C. cancelar SIN lista de espera
    const total0 = (await sql("select count(*)::int n from wodplace_notifications where box_id=$1", [BOX_A])).rows[0].n;
    const r5 = await reservar("a5", "cbn-cap5");
    check("C. a5 reserva en una clase con cupo", r5.json.status, "confirmed");
    const cancel2 = await api("POST", "/bookings/cancel", jwt.a5, { sessionId: "cbn-cap5", userId: wid("a5") });
    check("C. cancelar sin lista de espera responde 200", cancel2.status, 200);
    check("C. no queda ninguna reserva en esa clase", (await sql("select count(*)::int n from class_bookings where session_id='cbn-cap5'")).rows[0].n, 0);
    check("C. no se crea ninguna notificación", (await sql("select count(*)::int n from wodplace_notifications where box_id=$1", [BOX_A])).rows[0].n, total0);

    // ── D. aislamiento
    const listaB = await api("GET", `/notifications?userId=${wid("b1")}`, jwt.b1);
    check("D. un alumno de otro box ve 0 notificaciones", [listaB.status, (listaB.json as any[]).length], [200, 0]);
    check("D. y no puede pedir la lista de otra cuenta (403)", (await api("GET", `/notifications?userId=${wid("a4")}`, jwt.b1)).status, 403);
    const intruso = await api("POST", `/notifications/${nA4[0] ? (await sql("select id from wodplace_notifications where user_id=$1", [wid("a4")])).rows[0].id : "x"}/read`, jwt.b1, { userId: wid("b1") });
    check("D. el alumno de otro box no puede marcar leída la de a4 (no cambia nada)", [intruso.status, (await sql("select read_at is null nueva from wodplace_notifications where user_id=$1", [wid("a4")])).rows[0].nueva], [204, true]);

    // ── E. comentario y reacción -> notificación al autor (con box_id)
    await sql("insert into social_posts(id,user_id,author_name,body,box_id) values('cbn-post','cbn-a1','Cbn a1','publicación de chequeo',$1)", [BOX_A]);
    await api("POST", "/social/posts/cbn-post/comments", jwt.a3, { userId: wid("a3"), authorName: "Cbn a3", body: "hola" });
    await api("POST", "/social/posts/cbn-post/reactions", jwt.a3, { userId: wid("a3"), emoji: "🔥" });
    await new Promise((r) => setTimeout(r, 1500));
    const nA1 = (await sql("select title, box_id from wodplace_notifications where user_id=$1 order by title", [wid("a1")])).rows;
    check("E. el autor recibe 'Nuevo comentario' y 'Nueva reacción' con el box_id de la publicación", nA1.map((x: any) => [x.title, x.box_id === BOX_A]), [["Nueva reacción", true], ["Nuevo comentario", true]]);

    // ── F. el estado leído lo guarda el servidor
    const idA4: string = (await sql("select id from wodplace_notifications where user_id=$1", [wid("a4")])).rows[0].id;
    check("F. a4 la marca leída (204)", (await api("POST", `/notifications/${idA4}/read`, jwt.a4, { userId: wid("a4") })).status, 204);
    const nuevaSesion = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: SERVICE_KEY!, "Content-Type": "application/json" },
      body: JSON.stringify({ email: email("a4"), password }),
    });
    const jwtNuevo: string = ((await nuevaSesion.json()) as any).access_token;
    const recarga = await api("GET", `/notifications?userId=${wid("a4")}`, jwtNuevo);
    check("F. con una sesión nueva sigue leída (la guarda el servidor)", (recarga.json as any[]).map((x) => x.read), [true]);
  } finally {
    const q = async (s: string, p: unknown[] = [BOX_A, BOX_B]) => {
      try {
        await sql(s, p);
      } catch (e) {
        console.log("limpieza:", (e as Error).message.slice(0, 100));
      }
    };
    await q("delete from wodplace_notifications where box_id = any($1)", [[BOX_A, BOX_B]]);
    await q("delete from social_reactions where box_id = any($1)", [[BOX_A, BOX_B]]);
    await q("delete from social_comments where box_id = any($1)", [[BOX_A, BOX_B]]);
    await q("delete from social_posts where box_id = any($1)", [[BOX_A, BOX_B]]);
    await q("delete from class_bookings where box_id = any($1)", [[BOX_A, BOX_B]]);
    await q("delete from class_sessions where box_id = any($1)", [[BOX_A, BOX_B]]);
    await q("delete from box_members where box_id = any($1)", [[BOX_A, BOX_B]]);
    await q("delete from plans where box_id = any($1)", [[BOX_A, BOX_B]]);
    await q("delete from wodplace_users where id like 'cbn-%'", []);
    await q("delete from boxes where id = any($1)", [[BOX_A, BOX_B]]);
    for (const id of Object.values(authIds)) {
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: { apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY}` } });
    }
    const restos = (
      await sql(
        `select (select count(*) from boxes where id = any($1)) cajas, (select count(*) from wodplace_users where id like 'cbn-%') usuarios,
                (select count(*) from class_sessions where box_id = any($1)) clases, (select count(*) from wodplace_notifications where box_id = any($1)) notificaciones`,
        [[BOX_A, BOX_B]],
      )
    ).rows[0];
    check("limpieza: no quedó nada de lo creado", [restos.cajas, restos.usuarios, restos.clases, restos.notificaciones], ["0", "0", "0", "0"]);
    check("los datos reales (notificaciones, reservas, clases, planes, publicaciones) no cambiaron", await realCounts(), antes);
    await db.end();
  }
  console.log(`\nOK=${ok} MAL=${bad}`);
  process.exit(bad > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("ERROR:", (e as Error).message);
  process.exit(1);
});
