import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { corsOptions } from "./lib/cors";

const app: Express = express();

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  req.log?.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
