import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { corsOptions } from "./lib/cors";
import { generalRateLimiter } from "./lib/rateLimit";

const app: Express = express();

// Render sits in front of this app as a single reverse proxy — without
// this, Express's req.ip is Render's own proxy address, not the real
// client. Kept for Express's own hygiene (e.g. anything else that reads
// req.ip later), but NOT what routes/invites.ts relies on for its real
// client IP: in production Render itself sits behind Cloudflare, and
// X-Forwarded-For turned out to be attacker-controllable there (verified
// live — Cloudflare appends its own hop but doesn't strip a client's
// forged prefix). That code reads Cloudflare's CF-Connecting-IP header
// directly instead — see getRealClientIp() in routes/invites.ts.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors(corsOptions));

// S4 (auditoría de seguridad): cabeceras de seguridad adaptadas a una API
// JSON pura, que nunca sirve HTML propio -- por eso una CSP mínima
// (`default-src 'none'`) no rompe nada: no hay página que necesite cargar
// scripts/estilos/imágenes desde aquí. HSTS solo tiene efecto real en
// producción (Render ya sirve HTTPS); en dev no causa nada porque el
// navegador ignora el header sobre HTTP.
app.use(
  helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"] } },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// Límite general de peticiones -- va ANTES del router para que también
// cuente contra scanners de rutas que no existen (ver lib/rateLimit.ts).
// Los límites específicos de /invites/claim, /box-memberships/redeem y el
// PIN de admin siguen siendo la defensa real para esos endpoints puntuales
// y no cambian.
app.use(generalRateLimiter);

// Límite explícito de tamaño de body -- antes era el default implícito de
// Express (100kb). Ningún endpoint sube archivos a través de api-server
// (todo usa URLs firmadas directo a Supabase Storage, ver lib/objectStorage.ts),
// así que no hace falta una ruta con límite distinto.
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "256kb" }));

app.use("/api", router);

// Every route handler in this app already catches its own errors (try/catch
// -> res.status().json()); this only catches what falls through that --
// chiefly the CORS origin check rejecting (cors.ts), which calls
// next(err) internally. Without this, Express's default error handler
// returns the raw error + full stack trace (file paths, dependency
// versions) to whoever sent the request -- harmless from a trusted dev
// machine, but this app is about to be reachable from the public internet.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err.message?.startsWith("Origin ") && err.message?.endsWith("not allowed by CORS")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  // body-parser's own error for express.json()/urlencoded()'s `limit`
  // (S4) -- sin este caso especial cae al 500 genérico de abajo, que es
  // engañoso: un body de más de 256kb es un error del cliente, no del
  // servidor. Confirmado en vivo que el campo real es `err.name`
  // ("PayloadTooLargeError"), no el `err.type` ("entity.too.large") que
  // documentan versiones viejas de body-parser.
  if ((err as { statusCode?: number }).statusCode === 413) {
    res.status(413).json({ error: "El cuerpo de la petición es demasiado grande." });
    return;
  }
  req.log?.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
