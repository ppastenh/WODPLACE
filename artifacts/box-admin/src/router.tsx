import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // S4 (auditoría de seguridad): ninguna consulta (useQuery) de este panel
  // llama hoy a api-server (solo mutaciones, que ya no reintentan por
  // defecto, y dos llamadas sueltas fuera de React Query que ya manejan
  // su propio 429 -- ver auth.tsx/claim-invite.tsx) -- este default queda
  // de todas formas, para que una consulta que sí lo haga en el futuro no
  // reintente un 429 del límite general nuevo de api-server.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          const status = (error as { status?: number } | null)?.status;
          if (typeof status === "number" && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
