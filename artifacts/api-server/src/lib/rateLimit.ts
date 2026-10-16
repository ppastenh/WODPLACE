import rateLimit from "express-rate-limit";
import type { Request } from "express";

import { getRealClientIp } from "./inviteRateLimit";

/**
 * S4 (auditoría de seguridad): límite GENERAL de peticiones, de fondo --
 * distinto de los límites específicos ya existentes (invite_claim_attempts,
 * bloqueo progresivo del PIN de admin), que siguen siendo la defensa real
 * para esos endpoints puntuales. Este solo evita que un solo origen pueda
 * saturar el servidor con volumen bruto.
 *
 * Solo por IP real (cf-connecting-ip, igual que inviteRateLimit.ts) --
 * NO por id de sesión, a propósito. Un primer diseño keyeaba por el `sub`
 * del JWT decodificado SIN verificar firma (evitar el viaje de red de
 * resolveSupabaseUser en cada petición solo para esto). El problema real:
 * este middleware corre ANTES de que la ruta verifique el token (va antes
 * del router), así que un atacante podía mandar un JWT inválido/forjado
 * con el `sub` de una víctima real y gastar SU balde -- el 401 posterior
 * no revierte el conteo. Resultado: alguien podría agotarle las 500
 * peticiones/minuto a una cuenta real con tokens basura, sin necesitar un
 * token válido de verdad. Por IP no tiene este problema: nadie puede
 * completar una petición HTTP real fingiendo la IP de otra persona. El
 * límite por identidad YA VERIFICADA sigue existiendo donde de verdad
 * importa (invite_claim_attempts, el PIN de admin), que resuelven la
 * sesión real antes de contar.
 */
function generalKey(req: Request): string {
  const ip = getRealClientIp(req);
  return `ip:${ip ?? "unknown"}`;
}

/**
 * Techo generoso a propósito, por IP (ver ESTADO.md para las cifras que
 * lo justifican, revisadas con Pía): 50 alumnos a la vez en el WiFi de un
 * box, cada uno sondeando la red (~14 peticiones/minuto, ver "Sondeo de
 * red excesivo") son ≈700/min solo de sondeo; sumando sus acciones reales
 * (abrir pantallas, reservar, el panel de administración aparte) el uso
 * real holgado de esa IP se estima en ≈1.000/min. 2.000 da margen sobre
 * eso sin abrir la puerta a un flood real (pasado este techo hace falta
 * más de 30 peticiones POR SEGUNDO sostenidas desde una sola IP, muy por
 * encima de cualquier patrón humano). A revisar cuando el sondeo de red
 * baje (ver ese pendiente) -- un número más chico volverá a tener sentido
 * ahí. Un scanner de robots (/.env, /.git, etc.) golpeando rutas que no
 * existen igual pasa por este middleware (va ANTES del router) y cae en
 * el balde de su propia IP.
 */
export const generalRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generalKey,
  message: { error: "Demasiadas peticiones. Espera un momento e intenta de nuevo." },
});

/**
 * POST /auth/register no tiene sesión previa (es como se crea una) y no
 * tenía ningún límite propio hasta ahora -- a diferencia de /invites/claim
 * o el PIN de admin, nada le impedía a un mismo origen crear cuentas en
 * volumen. Importante: este endpoint crea la cuenta desde el servidor con
 * la API de administración de Supabase (`auth.admin.createUser`, ver
 * routes/auth.ts) -- el límite de señales/hora de Supabase Auth es para
 * signUp() desde el cliente, nunca se aplica aquí, así que este es el
 * ÚNICO límite real para este camino.
 *
 * 120 cada 15 minutos por IP real -- subido desde un primer borrador de
 * 20, que bloquearía a un box real: un box de 40 alumnos registrándose
 * la primera vez desde el mismo WiFi (clase de inducción, lanzamiento de
 * la app) agota 20 en minutos y deja al resto bloqueado. 120 cubre ese
 * caso con margen (40 alumnos, incluso con reintentos por typos) sin
 * acercarse a lo que un registro automatizado en volumen necesitaría.
 * Este límite NO es la defensa real contra bots de registro -- esa es el
 * CAPTCHA, decidido para después del lanzamiento (ver ESTADO.md) porque
 * la app móvil no tiene hoy una integración limpia de hCaptcha/Turnstile
 * y activarlo en Supabase exige a TODOS los clientes a la vez. Mientras
 * tanto, este número es solo para que un solo origen no pueda crear
 * cuentas en volumen bruto, no para distinguir un bot cuidadoso de una
 * persona.
 */
export const registerRateLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `ip:${getRealClientIp(req) ?? "unknown"}`,
  message: { error: "Demasiados registros desde este origen. Espera unos minutos e intenta de nuevo." },
});
