/**
 * S3-B: prueba de extremo a extremo de la exigencia aal2 en api-server.
 * No toca app_settings real -- usa el interruptor de prueba
 * (TEST_FORCE_AAL2_ENFORCED / TEST_FORCE_AAL2_READ_ERROR), que el propio
 * código de aal2Enforcement.ts ignora por completo salvo que
 * NODE_ENV === "test" (lo probamos explícitamente en la pasada 3).
 *
 * Levanta el servidor local 4 veces, con una configuración de entorno
 * distinta cada vez, contra el mismo set de cuentas desechables creado
 * una sola vez. Nunca usa el servidor de producción ni cuentas reales.
 *
 * Correr con: pnpm --filter @workspace/api-server exec tsx scripts/verify-aal2-enforcement.ts
 */
import { spawn, type ChildProcess } from "node:child_process";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// TOTP puro (RFC 6238), solo para generar códigos válidos en pruebas desde
// un secreto que esta misma corrida acaba de crear -- nunca un secreto real.
function base32Decode(base32: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of base32.replace(/=+$/, "").toUpperCase()) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}
function totp(secret: string): string {
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / 30);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, "0");
}

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PUB_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
const PORT = 5050;
const API = `http://localhost:${PORT}/api`;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function log(...a: unknown[]) {
  console.log(new Date().toISOString(), ...a);
}
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function newSession(email: string, password: string, retried = false): Promise<string> {
  const client = createClient(SUPABASE_URL, PUB_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (!data.session) {
    if (!retried) {
      // Tantos logins seguidos en pocos segundos pueden chocar con el
      // límite de Supabase -- un reintento con una pequeña pausa alcanza.
      await sleep(2000);
      return newSession(email, password, true);
    }
    throw error ?? new Error(`No se pudo iniciar sesión como ${email}`);
  }
  return data.session.access_token;
}

/** Inscribe un factor TOTP real una sola vez (código generado desde el
 *  secreto con la librería de arriba, nunca a mano) y lo deja listo para
 *  usarse en cada pasada, sin volver a inscribir nada. */
async function enrollFactorOnce(email: string, password: string): Promise<{ factorId: string; secret: string }> {
  const client = createClient(SUPABASE_URL, PUB_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await client.auth.signInWithPassword({ email, password });
  const { data: enrolled } = await client.auth.mfa.enroll({ factorType: "totp" });
  const { data: challenge } = await client.auth.mfa.challenge({ factorId: enrolled!.id });
  await client.auth.mfa.verify({
    factorId: enrolled!.id,
    challengeId: challenge!.id,
    code: totp(enrolled!.totp.secret),
  });
  return { factorId: enrolled!.id, secret: enrolled!.totp.secret };
}

/** Sesión aal2 real: entra con password y completa el desafío del factor
 *  YA inscrito por enrollFactorOnce(), con un código generado de nuevo. */
async function newAal2Session(
  email: string,
  password: string,
  factor: { factorId: string; secret: string },
): Promise<string> {
  const client = createClient(SUPABASE_URL, PUB_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await client.auth.signInWithPassword({ email, password });
  const { data: challenge } = await client.auth.mfa.challenge({ factorId: factor.factorId });
  await client.auth.mfa.verify({
    factorId: factor.factorId,
    challengeId: challenge!.id,
    code: totp(factor.secret),
  });
  const { data: session } = await client.auth.getSession();
  return session.session!.access_token;
}

async function startServer(
  env: Record<string, string>,
  baseEnv: NodeJS.ProcessEnv = process.env,
): Promise<ChildProcess> {
  const child = spawn(
    "node",
    ["--env-file=.env", "--enable-source-maps", "./dist/index.mjs"],
    {
      cwd: process.cwd(),
      env: { ...baseEnv, PORT: String(PORT), ...env },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stdoutBuf = "";
  let stderrBuf = "";
  child.stdout?.on("data", (chunk) => {
    stdoutBuf += chunk.toString();
  });
  child.stderr?.on("data", (chunk) => {
    stderrBuf += chunk.toString();
  });
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`servidor no arrancó a tiempo. stdout:\n${stdoutBuf}\nstderr:\n${stderrBuf}`));
    }, 20_000);
    const check = () => {
      if (stdoutBuf.includes("Server listening") || stderrBuf.includes("Server listening")) {
        clearTimeout(timeout);
        resolve();
      }
    };
    child.stdout?.on("data", check);
    child.stderr?.on("data", check);
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`servidor salió con código ${code}. stdout:\n${stdoutBuf}\nstderr:\n${stderrBuf}`));
      }
    });
  });
  return child;
}

function stopServer(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    child.once("exit", () => resolve());
    child.kill();
  });
}

type Fixtures = {
  boxId: string;
  sessionId: string;
  ownerAuthId: string;
  adminAuthId: string;
  coachAuthId: string;
  athleteAuthId: string;
  superAuthId: string;
  wpIds: Record<string, string>;
  password: string;
  emails: Record<string, string>;
  superFactor: { factorId: string; secret: string };
};

async function createFixtures(): Promise<Fixtures> {
  const password = "Verify-" + Math.random().toString(36).slice(2) + "!";
  const emails = {
    owner: "verify-aal2-owner@wodplace.test",
    admin: "verify-aal2-admin@wodplace.test",
    coach: "verify-aal2-coach@wodplace.test",
    athlete: "verify-aal2-athlete@wodplace.test",
    super: "verify-aal2-super@wodplace.test",
  };
  const ids: Record<string, string> = {};
  for (const [key, email] of Object.entries(emails)) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    ids[key] = data.user.id;
  }

  const boxId = "verify-aal2-box-" + Date.now();
  const wpIds: Record<string, string> = {};
  for (const key of Object.keys(emails) as (keyof typeof emails)[]) {
    wpIds[key] = `wp-verify-aal2-${key}-${Date.now()}`;
  }

  let r = await admin.from("boxes").insert({ id: boxId, name: "Verify AAL2", owner_user_id: ids.owner });
  if (r.error) throw r.error;
  r = await admin.from("user_roles").insert([
    { user_id: ids.admin, role: "box_admin", box_id: boxId },
    { user_id: ids.coach, role: "coach", box_id: boxId },
    { user_id: ids.super, role: "super_admin", box_id: null },
  ]);
  if (r.error) throw r.error;
  // Cada actor necesita su PROPIA fila de wodplace_users, con el mismo
  // email que su cuenta de Auth (resolveAdminRoles resuelve por email) y
  // auth_user_id apuntando a esa misma cuenta (assertOwnsAccount lo exige).
  r = await admin.from("wodplace_users").insert(
    Object.entries(emails).map(([key, email]) => ({
      id: wpIds[key],
      name: key,
      email,
      auth_user_id: ids[key],
    })),
  );
  if (r.error) throw r.error;
  r = await admin
    .from("contract_documents")
    .insert({ box_id: boxId, slug: "reglamento", title: "Reglamento", object_path: "https://example.test/x.pdf" });
  if (r.error) throw r.error;

  // box_members para admin/coach/super/athlete (no para owner -- no hace
  // falta para lo que se prueba) + una clase futura, para probar la
  // exención de isAnyStaff en POST /bookings con un contrato pendiente
  // real (nadie de estos tiene contract_read_progress -- todos están
  // "pendientes" salvo que la exención de staff los salve).
  r = await admin.from("box_members").insert(
    (["admin", "coach", "super", "athlete"] as const).map((key) => ({
      box_id: boxId,
      user_id: wpIds[key],
    })),
  );
  if (r.error) throw r.error;

  const sessionId = "verify-aal2-session-" + Date.now();
  r = await admin.from("class_sessions").insert({
    id: sessionId,
    box_id: boxId,
    name: "WOD",
    session_date: "2027-01-15",
    start_time: "10:00",
    capacity: 20,
  });
  if (r.error) throw r.error;

  const superFactor = await enrollFactorOnce(emails.super, password);

  return {
    boxId,
    sessionId,
    ownerAuthId: ids.owner,
    adminAuthId: ids.admin,
    coachAuthId: ids.coach,
    athleteAuthId: ids.athlete,
    superAuthId: ids.super,
    wpIds,
    password,
    emails,
    superFactor,
  };
}

async function cleanupFixtures(f: Fixtures) {
  await admin.from("class_bookings").delete().eq("session_id", f.sessionId);
  await admin.from("class_sessions").delete().eq("id", f.sessionId);
  await admin.from("box_members").delete().eq("box_id", f.boxId);
  await admin.from("contract_documents").delete().eq("box_id", f.boxId);
  await admin
    .from("wodplace_users")
    .delete()
    .in("id", Object.values(f.wpIds));
  await admin
    .from("user_roles")
    .delete()
    .in("user_id", [f.adminAuthId, f.coachAuthId, f.superAuthId]);
  await admin.from("boxes").delete().eq("id", f.boxId);
  for (const id of [f.ownerAuthId, f.adminAuthId, f.coachAuthId, f.athleteAuthId, f.superAuthId]) {
    await admin.auth.admin.deleteUser(id);
  }
}

type Expectation = { actor: string; expected: boolean };

async function checkContractsSignedUrl(f: Fixtures): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  const actors: ["owner" | "admin" | "coach" | "super", string][] = [
    ["owner", f.emails.owner],
    ["admin", f.emails.admin],
    ["coach", f.emails.coach],
    ["super", f.emails.super],
  ];
  for (const [key, email] of actors) {
    const token = await newSession(email, f.password);
    const res = await fetch(
      `${API}/contracts/signed-url?userId=${f.wpIds[key]}&slug=reglamento&boxId=${f.boxId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    results[key] = res.status === 200;
  }
  return results;
}

async function checkPlatformAgreementStatus(f: Fixtures): Promise<Record<string, boolean>> {
  // "accepted: true" sin haber aceptado nunca == exención de super_admin activa.
  const results: Record<string, boolean> = {};
  const res = await fetch(`${API}/platform-agreement?userId=${f.wpIds.super}`, {
    headers: { Authorization: `Bearer ${await newSession(f.emails.super, f.password)}` },
  });
  const body = (await res.json()) as { roles?: string[]; accepted?: boolean };
  results.super_admin_exempt = res.status === 200 && body.accepted === true;
  return results;
}

async function checkInviteNewCode(f: Fixtures): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  const actors: [string, string][] = [
    ["box_admin", f.emails.admin],
    ["coach", f.emails.coach],
    ["super_admin", f.emails.super],
  ];
  for (const [name, email] of actors) {
    const token = await newSession(email, f.password);
    const res = await fetch(`${API}/invites/new-code?boxId=${f.boxId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    results[name] = res.status === 200;
  }
  return results;
}

/** isAnyStaff vía POST /bookings: cada actor tiene un contrato pendiente
 *  real (nadie leyó "reglamento") -- solo la exención de staff puede
 *  salvarlos del 409 CONTRACTS_PENDING. Borra la reserva creada antes de
 *  devolver, para poder repetir la misma prueba en la siguiente pasada. */
async function checkBookingsExemption(f: Fixtures): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  const actors: [string, () => Promise<string>, string][] = [
    ["box_admin", () => newSession(f.emails.admin, f.password), "admin"],
    ["coach", () => newSession(f.emails.coach, f.password), "coach"],
    ["super_aal1", () => newSession(f.emails.super, f.password), "super"],
    ["super_aal2", () => newAal2Session(f.emails.super, f.password, f.superFactor), "super"],
    ["athlete", () => newSession(f.emails.athlete, f.password), "athlete"],
  ];
  for (const [key, getToken, wpKey] of actors) {
    const token = await getToken();
    const res = await fetch(`${API}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sessionId: f.sessionId, userId: f.wpIds[wpKey] }),
    });
    results[key] = res.status === 200;
    if (res.status !== 200) {
      log(`  (diagnóstico) POST /bookings para ${key} -> ${res.status}:`, await res.clone().text());
    }
    await admin.from("class_bookings").delete().eq("session_id", f.sessionId).eq("user_id", f.wpIds[wpKey]);
  }
  return results;
}

/** isAnyStaff vía GET /contracts/signed-url del Acuerdo de Plataforma
 *  (sin boxId). */
async function checkAcuerdoSignedUrl(f: Fixtures): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  const actors: [string, () => Promise<string>, string][] = [
    ["box_admin", () => newSession(f.emails.admin, f.password), "admin"],
    ["coach", () => newSession(f.emails.coach, f.password), "coach"],
    ["super_aal1", () => newSession(f.emails.super, f.password), "super"],
    ["super_aal2", () => newAal2Session(f.emails.super, f.password, f.superFactor), "super"],
    ["athlete", () => newSession(f.emails.athlete, f.password), "athlete"],
  ];
  for (const [key, getToken, wpKey] of actors) {
    const token = await getToken();
    const res = await fetch(`${API}/contracts/signed-url?userId=${f.wpIds[wpKey]}&slug=platform-agreement`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    results[key] = res.status === 200;
  }
  return results;
}

async function runBattery(f: Fixtures, label: string) {
  log(`\n==== ${label} ====`);
  const healthz = await fetch(`${API}/healthz`);
  log("GET /api/healthz (disponibilidad general):", healthz.status);

  const signed = await checkContractsSignedUrl(f);
  log("GET /contracts/signed-url (isBoxOwnerOrSuperAdmin):", signed);

  const platform = await checkPlatformAgreementStatus(f);
  log("GET /platform-agreement (exención inline de super_admin):", platform);

  const invites = await checkInviteNewCode(f);
  log("GET /invites/new-code (isBoxAdminOrSuperAdmin):", invites);

  const bookings = await checkBookingsExemption(f);
  log("POST /bookings (isAnyStaff, contrato pendiente real):", bookings);

  const acuerdo = await checkAcuerdoSignedUrl(f);
  log("GET /contracts/signed-url Acuerdo de Plataforma (isAnyStaff):", acuerdo);
}

async function main() {
  const f = await createFixtures();
  log("Cuentas desechables creadas:", Object.keys(f.emails));

  try {
    // Pasada 1: NODE_ENV=test, interruptor de prueba OFF -- debe ser
    // idéntico al comportamiento de siempre (super_admin sin aal2 sigue
    // pasando, porque el interruptor real sigue apagado).
    let server = await startServer({ NODE_ENV: "test", TEST_FORCE_AAL2_ENFORCED: "false" });
    await runBattery(f, "PASADA 1: NODE_ENV=test, interruptor de prueba APAGADO");
    await stopServer(server);

    // Pasada 2: NODE_ENV=test, interruptor de prueba ON -- super_admin
    // (que nunca completa aal2 con password-only) debe perder las 3
    // exenciones; dueño/box_admin/coach sin cambios.
    server = await startServer({ NODE_ENV: "test", TEST_FORCE_AAL2_ENFORCED: "true" });
    await runBattery(f, "PASADA 2: NODE_ENV=test, interruptor de prueba ENCENDIDO");
    await stopServer(server);

    // Pasada 3: NODE_ENV=production, con el override puesto -- debe ser
    // IGNORADO por completo (prueba que no hay atajo activable en prod).
    server = await startServer({
      NODE_ENV: "production",
      TEST_FORCE_AAL2_ENFORCED: "true",
      ALLOWED_ORIGINS: "http://localhost:5050",
    });
    await runBattery(f, "PASADA 3: NODE_ENV=production, override intentado (debe ser ignorado -> igual a Pasada 1)");
    await stopServer(server);

    // Pasada 4: falla de lectura de app_settings -- debe fallar cerrado
    // SOLO para super_admin, sin afectar /healthz ni a los demás actores.
    server = await startServer({ NODE_ENV: "test", TEST_FORCE_AAL2_READ_ERROR: "true" });
    await runBattery(f, "PASADA 4: NODE_ENV=test, lectura de app_settings simulada como fallida");
    await stopServer(server);

    // Pasada 5: sin pasar NODE_ENV explícitamente (acá cae a "development"
    // por el .env local -- en Render, que nunca lee ese archivo, un
    // NODE_ENV no definido simplemente queda vacío/undefined). Cualquiera
    // de los dos valores es "no es exactamente 'test'", así que el
    // override debe ignorarse igual, probando que el candado es
    // "solo test", no "cualquier cosa que no sea production".
    const envWithoutNodeEnv = { ...process.env };
    delete envWithoutNodeEnv.NODE_ENV;
    server = await startServer({ TEST_FORCE_AAL2_ENFORCED: "true" }, envWithoutNodeEnv);
    await runBattery(
      f,
      "PASADA 5: NODE_ENV no pasado explícitamente, override intentado (debe ser ignorado -> igual a Pasada 1)",
    );
    await stopServer(server);
  } finally {
    await cleanupFixtures(f);
    log("\nLimpieza de cuentas y datos desechables confirmada.");
  }
}

main().catch((e) => {
  console.error("ERROR FATAL:", e);
  process.exit(1);
});
