/**
 * wodplace-keepalive -- único propósito: evitar que el proyecto de
 * Supabase se pause por inactividad (plan Free, se pausa tras 1 semana
 * sin actividad -- ver supabase.com/pricing). Cada 12 horas hace UNA
 * consulta mínima, de solo lectura, sin datos ni efectos.
 *
 * Alcance deliberadamente mínimo: sin `fetch` handler (nadie puede
 * invocarlo desde afuera, solo el cron), sin acceso a nada más que estos
 * dos secretos. Ninguno de los dos es, por sí solo, capaz de leer ni
 * escribir datos reales:
 * - SUPABASE_ANON_KEY: la misma clave pública que ya usan la app y los
 *   paneles -- no es un secreto nuevo, solo se guarda aquí también.
 * - HEALTHCHECK_PING_URL: una URL de healthchecks.io (dead man's switch).
 *   Si se filtra, lo peor que permite es fingir que este Worker corrió.
 *
 * `app_settings` tiene RLS sin ninguna política -- con la clave pública
 * siempre devuelve `[]` (200, vacío), nunca datos reales, así que esta
 * consulta no revela nada (a diferencia de llamar a una función como
 * is_aal2_enforced(), que sí expone el valor del interruptor).
 */

const SUPABASE_URL = "https://wiwpaekdykxernegicdv.supabase.co";

export interface Env {
  SUPABASE_ANON_KEY: string;
  HEALTHCHECK_PING_URL: string;
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(run(env));
  },
} satisfies ExportedHandler<Env>;

async function run(env: Env): Promise<void> {
  let supabaseOk = false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?select=key&limit=1`, {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      },
    });
    supabaseOk = res.status === 200;
    if (!supabaseOk) {
      console.error(`wodplace-keepalive: Supabase respondió ${res.status}, no se avisa éxito`);
    }
  } catch (err) {
    console.error("wodplace-keepalive: error de red llamando a Supabase", err);
  }

  // Solo se avisa "corrí bien" a healthchecks.io si Supabase de verdad
  // respondió 200 -- si Supabase falla, simplemente no se pinga, y
  // healthchecks.io avisará por correo cuando se agote el período + la
  // gracia configurados ahí (ver ESTADO.md).
  if (supabaseOk) {
    try {
      await fetch(env.HEALTHCHECK_PING_URL);
    } catch (err) {
      // Un fallo de red justo pingueando el monitor no debe tirar abajo
      // nada más -- healthchecks.io detectará la ausencia de este ping
      // igual, por su propio período + gracia.
      console.error("wodplace-keepalive: error de red pingueando healthchecks.io", err);
    }
  }
}
