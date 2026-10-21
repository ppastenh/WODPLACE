import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  // Solo en el log de arranque, nunca expuesto en /healthz ni en ninguna
  // ruta pública: sirve para verificar qué commit corre realmente,
  // porque el aviso "live" de Render no siempre coincide con el momento
  // real del corte de tráfico (ver ESTADO.md, 2026-10-19).
  logger.info(
    { renderGitCommit: process.env["RENDER_GIT_COMMIT"] ?? "desconocido" },
    "Deployed commit",
  );

  logger.info({ port }, "Server listening");
});
