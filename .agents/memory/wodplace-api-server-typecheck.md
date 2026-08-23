---
name: WODPLACE api-server typecheck
description: api-server usa esbuild para runtime, no tsc. Errores TS2769 de drizzle-orm no bloquean el servidor.
---

## Runtime vs Typecheck

El api-server se construye con **esbuild** (`node ./build.mjs`) que resuelve imports desde source sin type-checking. Los errores de `tsc --noEmit` no impiden que el servidor funcione.

**Errores conocidos en social.ts:** TS2769 en operaciones drizzle-orm (overload resolution). El runtime funciona correctamente — esbuild bundlea desde source.

## Para agregar dependencias al api-server

Agregar al `artifacts/api-server/package.json` y reiniciar el workflow. Si el paquete está en el catalog (`pnpm-workspace.yaml`), usar `"catalog:"` como versión.

**Why:** esbuild puede resolver dependencias transitivas (via @workspace/db o @workspace/api-zod), pero para tipos y resolución correcta en el monorepo, mejor declararlas directamente.

## Rebuilt después de cambios

Después de cualquier cambio en `artifacts/api-server/src/`: el workflow `artifacts/api-server: API Server` llama automáticamente a `pnpm run build` (esbuild) antes de `pnpm run start`. Solo hace falta reiniciar el workflow.
