---
name: WODPLACE social feed
description: Feed social en backend, zod/v4 ausente, drizzle-zod conflicto con zod 3.x
---

## Reglas clave

**zod/v4 no existe:** El workspace tiene zod 3.25.76. Siempre importar `from "zod"` (nunca `from "zod/v4"`).

**drizzle-zod con zod 3.x:** drizzle-zod@0.8.3 tiene tipos incompatibles con zod 3.x al usar createInsertSchema + z.infer. Solución: usar `typeof table.$inferInsert` directamente en lugar de `z.infer<typeof insertSchema>`.

**api-client-react d.ts:** Necesita rebuild cuando se agregan nuevos exports. Ejecutar `npx tsc -p lib/api-client-react/tsconfig.json`. Para que funcione, @types/react debe estar en devDependencies.

**Social posts FK:** `social_posts.user_id` tiene FK a `wodplace_users.id`. El userId del post debe existir en la tabla de usuarios primero (ya ocurre normalmente porque el app registra al usuario en cada login).

**Feed paginado:** 60 días, 15 posts por página, cursor por `createdAt` ISO string.

**Notificaciones sociales:** Fire-and-forget `.catch(() => {})`.

## Archivos clave
- `artifacts/api-server/src/routes/social.ts` — Todas las rutas del feed social
- `lib/api-client-react/src/social.ts` — Hooks React para el feed (manuales, no generados por orval)
- `lib/db/src/schema/wodplace.ts` — Tablas: socialPostsTable, socialCommentsTable, socialReactionsTable, socialReportsTable, blockedUsersTable, boxSettingsTable

**Why:** El feed social necesita ser multi-usuario y persistente — AsyncStorage solo funciona por dispositivo.

## Subida de imágenes (presigned URLs)
- No validar respuestas de rutas hand-written con esquemas generados por orval de OTRA ruta: pueden imponer restricciones ajenas (p. ej. size >= 1) y convertir una respuesta válida en 500. Usar un esquema zod local dedicado.
- **Why:** los clientes móviles no siempre conocen el tamaño del archivo (ImagePicker puede omitir fileSize), así que size 0/ausente debe ser válido en rutas de presign.
- El size/contentType que declara el cliente al pedir la URL firmada NO es un control de seguridad (el cliente controla el PUT real). La validación efectiva de tamaño/contenido se hace al publicar, contra los bytes reales del objeto (metadata + magic bytes). La falta de auth en presign sigue abierta como tarea aparte.
