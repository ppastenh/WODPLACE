/**
 * Defensa a futuro (2026-10-22): el estado "presionado" NUNCA se hace bajando
 * la opacidad -- se usa un color *Pressed SÓLIDO de la paleta (ver la regla en
 * CLAUDE.md y DESIGN.md). Este check lista los presionados con opacidad de
 * wodplace y falla si aparece alguno que NO está en la lista conocida de abajo.
 *
 * Detecta: una línea con `pressed`/`Pressed` y `opacity` a la vez, o la
 * definición de un estilo con nombre *Pressed/*pressed* que use opacity
 * (ignora comentarios). La lista es por archivo + texto de la línea (no por
 * número de línea, que cambia) y por cantidad.
 *
 * - group "critico": botones con relleno de color y texto/ícono encima; se
 *   corrigen de a una pantalla, con aprobación de Pía. Al corregir uno, se
 *   borra de la lista (el check avisa).
 * - group "despues": los demás; quedan para después de la "ronda de color"
 *   (ver ESTADO.md). Agregar una entrada nueva solo para que el check pase
 *   está prohibido: el check existe justamente para frenar eso.
 *
 * Corre con: pnpm --filter @workspace/scripts check:pressed-opacity
 * Sale con código 1 (falla) si encuentra un presionado con opacidad nuevo.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

type Known = { file: string; text: string; count: number; group: "critico" | "despues" };

const KNOWN: Known[] = [
  { file: "artifacts/wodplace/app/admin-dashboard.tsx", text: "viewTogglePressed: { opacity: 0.6 },", count: 1, group: "despues" },
  { file: "artifacts/wodplace/app/box-detail.tsx", text: "pressed && { opacity: 0.7 },", count: 1, group: "critico" },
  { file: "artifacts/wodplace/app/community.tsx", text: "style={({ pressed }) => [styles.sheetItem, pressed && { opacity: 0.6 }]}", count: 1, group: "despues" },
  { file: "artifacts/wodplace/app/community.tsx", text: "style={({ pressed }) => [styles.sheetCancel, { borderTopColor: colors.navBorder }, pressed && { opacity: 0.6 }]}", count: 2, group: "despues" },
  { file: "artifacts/wodplace/app/community.tsx", text: "pressed && { opacity: 0.7 },", count: 1, group: "despues" },
  { file: "artifacts/wodplace/app/community.tsx", text: "style={({ pressed }) => [styles.reportAttachBtn, { borderColor: colors.navBorder }, pressed && { opacity: 0.7 }]}", count: 1, group: "despues" },
  { file: "artifacts/wodplace/app/community.tsx", text: "style={({ pressed }) => [styles.menuDotBtn, pressed && { opacity: 0.5 }]}", count: 1, group: "despues" },
  { file: "artifacts/wodplace/app/community.tsx", text: "style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.65 }]}", count: 4, group: "despues" },
  { file: "artifacts/wodplace/app/community.tsx", text: "pressed && { opacity: 0.65 },", count: 1, group: "despues" },
  { file: "artifacts/wodplace/app/home.tsx", text: "pressed: { opacity: 0.65 },", count: 1, group: "despues" },
  { file: "artifacts/wodplace/app/home.tsx", text: "pressedCard: { opacity: 0.88 },", count: 1, group: "critico" },
  { file: "artifacts/wodplace/app/more.tsx", text: "pressed && { opacity: 0.7 },", count: 1, group: "despues" },
  { file: "artifacts/wodplace/app/more.tsx", text: "style={({ pressed }) => [styles.editNameBtn, { borderColor: colors.navBorder }, pressed && { opacity: 0.6 }]}", count: 1, group: "despues" },
  { file: "artifacts/wodplace/app/more.tsx", text: "style={({ pressed }) => [pressed && { opacity: 0.6 }]}", count: 1, group: "despues" },
  { file: "artifacts/wodplace/app/personal-data.tsx", text: "pressed && { opacity: 0.8 },", count: 1, group: "despues" },
  { file: "artifacts/wodplace/app/personal-data.tsx", text: "pressed && !user.phone && { opacity: 0.6 },", count: 1, group: "despues" },
  { file: "artifacts/wodplace/app/personal-data.tsx", text: "style={({ pressed }) => [styles.row, pressed && !user.birthdate && { opacity: 0.6 }]}", count: 1, group: "despues" },
  { file: "artifacts/wodplace/app/rm/history.tsx", text: "pressed && { opacity: 0.8 },", count: 1, group: "despues" },
  { file: "artifacts/wodplace/app/rm/record.tsx", text: "pressed && { opacity: 0.8 },", count: 1, group: "despues" },
  { file: "artifacts/wodplace/app/rm/record.tsx", text: "style={({ pressed }) => [styles.addLink, pressed && { opacity: 0.6 }]}", count: 1, group: "despues" },
  { file: "artifacts/wodplace/app/wod/index.tsx", text: "(pressed || submit.isPending) && { opacity: 0.85 },", count: 1, group: "critico" },
  { file: "artifacts/wodplace/components/rm/MovementSheet.tsx", text: "pressed && { opacity: 0.75 },", count: 1, group: "critico" },
  { file: "artifacts/wodplace/components/rm/MovementSheet.tsx", text: "pressed && { opacity: 0.7 },", count: 1, group: "despues" },
  { file: "artifacts/wodplace/components/rm/PercentDropdown.tsx", text: "pressed && { opacity: 0.7 },", count: 2, group: "despues" },
  { file: "artifacts/wodplace/components/rm/RmBottomNav.tsx", text: "style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}", count: 1, group: "despues" },
];

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SCAN_DIRS = ["artifacts/wodplace/app", "artifacts/wodplace/components"];

const HIT = /([pP]ressed|[pP]ress)\w*.*opacity|^\s*\w*[pP]ress\w*:\s*\{[^}]*opacity/;

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(e.name)) out.push(p);
  }
  return out;
}

const found = new Map<string, { file: string; text: string; count: number; lines: number[] }>();
for (const d of SCAN_DIRS) {
  for (const abs of walk(join(ROOT, d))) {
    const file = relative(ROOT, abs).split(sep).join("/");
    readFileSync(abs, "utf8").split(/\r?\n/).forEach((raw, i) => {
      const text = raw.trim();
      if (text.startsWith("//") || text.startsWith("*") || !HIT.test(text)) return;
      const key = `${file}|${text}`;
      const e = found.get(key) ?? { file, text, count: 0, lines: [] };
      e.count++;
      e.lines.push(i + 1);
      found.set(key, e);
    });
  }
}

const known = new Map(KNOWN.map((k) => [`${k.file}|${k.text}`, k]));
let failed = false;

for (const [key, e] of found) {
  const k = known.get(key);
  if (!k || e.count > k.count) {
    failed = true;
    console.error(
      `NUEVO presionado con opacidad: ${e.file}:${e.lines.join(",")}  ${e.text}\n  -> usa un color *Pressed sólido de la paleta (ver CLAUDE.md).`,
    );
  }
}
for (const [key, k] of known) {
  const e = found.get(key);
  if (!e || e.count < k.count) {
    console.warn(`(aviso) ya corregido o movido, borra de KNOWN: ${k.file}  ${k.text}`);
  }
}

const crit = KNOWN.filter((k) => k.group === "critico").reduce((n, k) => n + k.count, 0);
const later = KNOWN.filter((k) => k.group === "despues").reduce((n, k) => n + k.count, 0);
console.log(`Presionados con opacidad conocidos: ${crit} críticos pendientes + ${later} para después de la ronda de color.`);

if (failed) process.exit(1);
console.log("OK: no hay presionados con opacidad nuevos.");
