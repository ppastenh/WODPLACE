# CLAUDE.md

Reglas de trabajo y datos fijos del proyecto WODPLACEtes, para no repetirlos en cada conversación. Complementa a `replit.md` (stack, comandos, variables de entorno, esquema/migraciones) — ese archivo no se duplica aquí, se referencia.

## Cómo trabajar en este proyecto

- Responder siempre en español chileno neutro (tuteo, nunca voseo), incluyendo informes y todos los textos de la app. No mezclar inglés en las respuestas.
- Pía no programa: explicar en simple lo importante. Cuando ella deba hacer algo, decirle paso a paso qué hacer y dónde (qué terminal, qué sitio, qué pantalla).
- Cambios chicos (textos, estilos, tamaños): implementarlos directo y reportar.
- Cambios que tocan base de datos, seguridad o permisos, borrados, pagos, despliegue, o cualquier cosa irreversible: primero relevamiento y plan, esperar su aprobación antes de programar.
- Nunca hacer commit ni push sin su aprobación explícita. Al hacerlos, el mensaje del commit debe describir TODO lo que incluye.
- Verificar en vivo, no solo con typecheck. Usar datos de prueba temporales y limpiarlos al terminar. Decir siempre qué NO se pudo verificar (por ejemplo, lo que solo se ve en un teléfono real).
- No asumir que algo "ya funciona": verificarlo contra el código/la base real. Si algo que ella pide contradice una decisión anterior, o parece mala idea, decirlo antes de hacerlo.
- No repetir ni pegar secretos (claves, tokens) en las respuestas.
- Nunca generar enlaces de acceso ni tokens reales de las cuentas de Pía (`pasten.hueche@gmail.com` y cualquier otra cuenta real suya) para investigar o probar algo — usar siempre una cuenta de prueba (ej. `test-box-admin@wodplace.test`), aunque haya que crearla para la ocasión.
- Una cosa a la vez: no mezclar arreglos distintos en un mismo commit sin avisarle.
- Formato de informe, máximo ~15 líneas: **Hecho**, **Verificado** (cómo), **No pude verificar**, **Qué necesito de ti**. Sin repetir código ni listas largas de archivos, salvo que lo pida.
- Al terminar cada tarea, actualizar `ESTADO.md`.

## Datos fijos del proyecto

- Monorepo pnpm. Apps en `artifacts/`: `wodplace` (app del alumno, Expo), `api-server` (Express), `box-admin` (panel del box), `super-admin` (panel de la plataforma). También `mockup-sandbox`.
- Una sola base de datos Supabase (proyecto `wiwpaekdykxernegicdv`), compartida por el entorno local y producción — no hay bases separadas por ambiente.
- Despliegue: un push a la rama de trabajo redespliega la API (api-server, en Render, dominio `api.wodplace.cl`) y los paneles (box-admin y super-admin, en Cloudflare Workers, dominios `admin.wodplace.cl` y `super.wodplace.cl`). La config de Render no vive en este repo (se administra desde el dashboard de Render); la de Cloudflare sí, vía Wrangler.
- "Hoy" siempre se calcula en hora de Chile (`America/Santiago`), nunca en UTC ni en la hora del dispositivo — usar el helper `todayDateKey()` (api-server, `src/lib/dateUtils.ts`) o su equivalente de cliente (`wodplace`, `lib/dateUtils.ts: todayInChile()`). Nunca usar `new Date()` + sus métodos locales (`getFullYear`/`getMonth`/`getDate`) para decidir "qué día es hoy" — eso fue exactamente el bug ya encontrado y corregido en el WOD del día y en los cumpleaños.
- Paleta clara para la app general (`wodplace`): fondo `#F6F1E8`, acento/cobre `#B98250`, texto chico sobre fondo claro `#8B5E34` (el cobre normal no cumple contraste mínimo para texto chico). Paleta oscura para el módulo RM de `wodplace` y para los paneles de administración (`box-admin`, `super-admin`), fondo `#0E0F11`.
- Seguridad: cada tabla nueva lleva RLS desde el día uno. Cada endpoint de api-server que actúa sobre la cuenta de un alumno llama `assertOwnsAccount`. Las pruebas de permisos (quién puede/no puede hacer algo) se hacen con transacciones de base de datos con rollback, nunca dejando cambios reales de prueba en tablas de permisos/roles.
- Menores de edad: nunca exponer su edad ni su año de nacimiento en ninguna pantalla ni respuesta de API. El cumpleaños de un menor (nombre + día/mes) solo se muestra al resto del box con autorización explícita del apoderado — ver `ESTADO.md` para el estado de esa función.

## Trampas ya resueltas (no repetirlas)

- **Google OAuth en Android**: el crypto de React Native/Hermes puede tener `crypto` definido pero sin un `getRandomValues` real — hay que revisar el método mismo, no solo si existe. Samsung Internet como navegador por defecto rompe el Custom Tabs del login; se fuerza Chrome específicamente cuando está disponible (`AuthContext.tsx`, alrededor de la línea 715).
- **Cloudflare Workers**: los paneles (box-admin, super-admin) necesitan que el build del servidor SSR quede en un solo archivo — un bundling con chunks separados puede generar una importación circular que falla en el runtime de Workers (no en Node). Los secretos de cada panel se configuran en Cloudflare, con un script propio que parchea la config de Wrangler.
- **Render (api-server)**: son 12 variables de entorno configuradas ahí, incluyendo `ADMIN_ACCESS_CODE` (secreto de firma de sesión admin) — no viven en este repo.

## Referencias

- `replit.md`: stack, comandos de desarrollo, variables de entorno completas, convención de migraciones (Drizzle vs SQL manual en `supabase/migrations/`), gotchas técnicos.
- `ESTADO.md`: qué está hecho, en curso, pendiente, bloqueado, y los datos de prueba vivos por limpiar.
