/**
 * Frontera del diseño: una tarea de DISEÑO solo puede tocar presentación. Este chequeo mira los archivos de un commit, del
 * área de preparación o de un rango, y FALLA (código 1) si:
 *   1. algún archivo cae en una ruta PROHIBIDA, o queda fuera del área PERMITIDA (lo que no está en ninguna lista se rechaza);
 *   2. algún archivo SENSIBLE (acceso, arranque, administración, reservas...) no tiene aprobación explícita de Pía: solo pasa
 *      si su ruta exacta está en la variable DESIGN_SENSITIVE_OK (varias separadas por coma), que solo pone Pía;
 *   3. las líneas AGREGADAS en un archivo de código permitido contienen algo que no es presentación (llamadas de red,
 *      supabase, claves, almacenamiento de datos, eval, abrir direcciones, o un import de una librería no declarada).
 *
 * Uso (desde la raíz del repositorio):
 *   pnpm --filter @workspace/scripts check:design-boundary                       -> área de preparación (git diff --cached)
 *   pnpm --filter @workspace/scripts check:design-boundary -- --range main..HEAD  -> un rango de commits
 *   pnpm --filter @workspace/scripts check:design-boundary -- --commit <sha>      -> los archivos de un commit
 *   pnpm --filter @workspace/scripts check:design-boundary -- --files a b c       -> una lista (sin escaneo de contenido)
 *   pnpm --filter @workspace/scripts check:design-boundary -- --print-lists       -> imprime las listas
 *
 * Sin dependencias nuevas: solo git y Node. Las listas viven aquí, a propósito, con su razón (ver CLAUDE.md, "Frontera del diseño").
 * Este archivo y su prueba NO están en el área permitida: una tarea de diseño no puede editarlos.
 */
import { execFileSync } from 'node:child_process';
import { builtinModules } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

export type Rule = { pattern: string; reason: string };

/** Rutas PROHIBIDAS para una tarea de diseño. `**` = cualquier cantidad de carpetas; `*` = dentro de una carpeta. */
export const FORBIDDEN: Rule[] = [
  { pattern: 'artifacts/api-server/**', reason: 'servidor (API)' },
  { pattern: 'supabase/**', reason: 'base de datos, migraciones y políticas' },
  { pattern: 'lib/db/**', reason: 'esquema de la base de datos' },
  { pattern: 'lib/api-*/**', reason: 'contrato de la API y cliente generado' },
  { pattern: 'workers/**', reason: 'workers de Cloudflare' },
  { pattern: 'artifacts/box-admin/**', reason: 'panel del box' },
  { pattern: 'artifacts/super-admin/**', reason: 'panel de la plataforma' },
  { pattern: 'artifacts/wodplace/app/super-admin.tsx', reason: 'pantalla de super administrador' },
  { pattern: '**/package.json', reason: 'dependencias y scripts' },
  { pattern: '**/pnpm-lock.yaml', reason: 'versiones de dependencias' },
  { pattern: '**/pnpm-workspace.yaml', reason: 'configuración del monorepo' },
  { pattern: '**/app.json', reason: 'configuración de la app' },
  { pattern: '**/eas.json', reason: 'configuración de las builds' },
  { pattern: '**/.env*', reason: 'claves y variables de entorno' },
  { pattern: '**/.easignore', reason: 'qué archivos entran a la build' },
  { pattern: '.github/**', reason: 'automatizaciones de GitHub' },
];

/** Reglas e instrucciones: NO se editan desde una tarea de diseño (quedan fuera aunque sean .md). */
export const NOT_ALLOWED: Rule[] = [
  { pattern: '**/CLAUDE.md', reason: 'las reglas del proyecto no se editan desde tareas de diseño' },
  { pattern: '**/AGENTS.md', reason: 'instrucciones para asistentes: no se editan desde tareas de diseño' },
  { pattern: '**/replit.md', reason: 'comandos y variables de entorno: no se editan desde tareas de diseño' },
];

/** Área PERMITIDA: presentación. Todo lo demás (que no sea prohibido) también se rechaza. */
export const ALLOWED: Rule[] = [
  { pattern: 'artifacts/wodplace/app/**', reason: 'pantallas' },
  { pattern: 'artifacts/wodplace/components/**', reason: 'componentes de presentación' },
  { pattern: 'artifacts/wodplace/constants/colors.ts', reason: 'paleta clara' },
  { pattern: 'artifacts/wodplace/constants/darkColors.ts', reason: 'paleta oscura' },
  { pattern: 'artifacts/wodplace/constants/radius.ts', reason: 'radios' },
  { pattern: 'artifacts/wodplace/constants/spacing.ts', reason: 'espaciado' },
  { pattern: 'artifacts/wodplace/constants/typography.ts', reason: 'tipografía' },
  { pattern: 'artifacts/wodplace/assets/images/**', reason: 'imágenes' },
  { pattern: 'artifacts/wodplace/context/ThemeContext.tsx', reason: 'contexto de tema' },
  { pattern: 'artifacts/wodplace/hooks/useColors.ts', reason: 'colores del tema activo' },
  { pattern: 'artifacts/wodplace/hooks/useDarkColors.ts', reason: 'colores de la paleta oscura fija' },
  { pattern: 'artifacts/wodplace/lib/theme.ts', reason: 'lógica pura del tema' },
  { pattern: 'artifacts/wodplace/lib/planProgress.ts', reason: 'lógica pura de la tarjeta de progreso' },
  { pattern: 'artifacts/wodplace/lib/nextClassCard.ts', reason: 'lógica pura de la tarjeta de próxima clase' },
  { pattern: 'artifacts/wodplace/lib/medalColors.ts', reason: 'colores de medallas' },
  { pattern: 'artifacts/wodplace/lib/rm/plateColors.ts', reason: 'colores de discos' },
  { pattern: 'scripts/src/test-theme.ts', reason: 'prueba del tema' },
  { pattern: 'scripts/src/test-dark-contrast.ts', reason: 'prueba de contraste' },
  { pattern: 'scripts/src/dark-contrast-pairs.ts', reason: 'pares de contraste' },
  { pattern: 'scripts/src/test-home-logic.ts', reason: 'prueba de la lógica de Inicio' },
  { pattern: '**/*.md', reason: 'documentos (salvo las reglas: ver NOT_ALLOWED)' },
];

/**
 * Archivos de la zona permitida que son SENSIBLES (arranque, navegación, acceso, administración, reservas, contratos,
 * datos de la cuenta): FALLAN por defecto. Pasan solo con la aprobación explícita de Pía por archivo, en la variable
 * DESIGN_SENSITIVE_OK con la ruta exacta.
 */
export const SENSITIVE: Rule[] = [
  // Pedidos por Pía
  { pattern: 'artifacts/wodplace/components/AdminLockPrompt.tsx', reason: 'candado del PIN' },
  { pattern: 'artifacts/wodplace/components/PinField.tsx', reason: 'campo del PIN' },
  { pattern: 'artifacts/wodplace/app/login.tsx', reason: 'inicio de sesión' },
  { pattern: 'artifacts/wodplace/app/login-password.tsx', reason: 'inicio de sesión con contraseña' },
  { pattern: 'artifacts/wodplace/app/register.tsx', reason: 'registro' },
  { pattern: 'artifacts/wodplace/app/register-google.tsx', reason: 'registro con Google' },
  { pattern: 'artifacts/wodplace/app/forgot-password.tsx', reason: 'recuperación de contraseña' },
  { pattern: 'artifacts/wodplace/app/reset-password.tsx', reason: 'recuperación de contraseña' },
  { pattern: 'artifacts/wodplace/app/create-box.tsx', reason: 'creación de box (rol de administrador)' },
  { pattern: 'artifacts/wodplace/components/JoinBoxModal.tsx', reason: 'canje de código de box' },
  { pattern: 'artifacts/wodplace/app/admin-login.tsx', reason: 'acceso al panel de administración' },
  { pattern: 'artifacts/wodplace/app/admin-dashboard.tsx', reason: 'panel de administración dentro de la app' },
  { pattern: 'artifacts/wodplace/app/auth-callback.tsx', reason: 'retorno del inicio de sesión' },
  { pattern: 'artifacts/wodplace/app/platform-agreement.tsx', reason: 'acuerdo de plataforma' },
  { pattern: 'artifacts/wodplace/app/_layout.tsx', reason: 'arranque de la app: proveedores, navegación y pantalla de carga' },
  // Agregados tras revisar arranque, navegación, autenticación y reservas (Pía puede podar esta parte)
  { pattern: 'artifacts/wodplace/app/index.tsx', reason: 'arranque: decide a qué pantalla va cada sesión' },
  { pattern: 'artifacts/wodplace/app/choose-view.tsx', reason: 'elección de vista según el rol (alumno o administración)' },
  { pattern: 'artifacts/wodplace/app/box-waiting.tsx', reason: 'espera de aprobación del box' },
  { pattern: 'artifacts/wodplace/app/box-details.tsx', reason: 'datos del box en el alta' },
  { pattern: 'artifacts/wodplace/app/home.tsx', reason: 'Inicio: consultas, reglas por rol, menú y modales (el dibujo vive en components/home)' },
  { pattern: 'artifacts/wodplace/app/calendar.tsx', reason: 'reservas y cancelaciones' },
  { pattern: 'artifacts/wodplace/app/profile.tsx', reason: 'cerrar sesión y cancelar reservas' },
  { pattern: 'artifacts/wodplace/app/personal-data.tsx', reason: 'edita celular y fecha de nacimiento (datos de la cuenta, incluidos menores)' },
  { pattern: 'artifacts/wodplace/app/active-contracts.tsx', reason: 'lectura y aceptación de contratos' },
  { pattern: 'artifacts/wodplace/components/ErrorBoundary.tsx', reason: 'arranque: captura de errores de toda la app' },
  { pattern: 'artifacts/wodplace/components/CancelConfirmModal.tsx', reason: 'confirmación de cancelación de reservas' },
  { pattern: 'artifacts/wodplace/components/AttendeesModal.tsx', reason: 'nombres de los asistentes (privacidad)' },
  { pattern: 'artifacts/wodplace/components/BirthdateModal.tsx', reason: 'fecha de nacimiento (datos de menores)' },
  { pattern: 'artifacts/wodplace/components/PhoneModal.tsx', reason: 'celular de la cuenta' },
  { pattern: 'DECISIONES-DISENO.md', reason: 'decisiones de diseño: solo se edita con la aprobación explícita de Pía' },
];

const toRegex = (pattern: string): RegExp => {
  let out = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]!;
    if (c === '*' && pattern[i + 1] === '*') {
      if (pattern[i + 2] === '/') {
        out += '(?:.*/)?'; // "**/" = cero o más carpetas
        i += 2;
      } else {
        out += '.*';
        i += 1;
      }
    } else if (c === '*') out += '[^/]*';
    else out += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${out}$`);
};

const matches = (rules: Rule[], file: string): Rule | undefined => rules.find((r) => toRegex(r.pattern).test(file));
const norm = (p: string) => p.trim().replace(/\\/g, '/');

export type Verdict = {
  file: string;
  kind: 'prohibido' | 'fuera' | 'sensible' | 'permitido';
  reason: string;
};

export function classify(file: string, approvedSensitive: string[] = []): Verdict {
  const f = norm(file);
  const forbidden = matches(FORBIDDEN, f);
  if (forbidden) return { file: f, kind: 'prohibido', reason: `${forbidden.pattern} (${forbidden.reason})` };
  const notAllowed = matches(NOT_ALLOWED, f);
  if (notAllowed) return { file: f, kind: 'fuera', reason: notAllowed.reason };
  const allowed = matches(ALLOWED, f);
  if (!allowed) return { file: f, kind: 'fuera', reason: 'no está en el área permitida para diseño' };
  const sensitive = matches(SENSITIVE, f);
  if (sensitive && !approvedSensitive.map(norm).includes(f)) {
    return { file: f, kind: 'sensible', reason: `${sensitive.reason}. Necesita la aprobación explícita de Pía: DESIGN_SENSITIVE_OK=${f}` };
  }
  return { file: f, kind: 'permitido', reason: sensitive ? `${allowed.reason} (sensible, aprobado por Pía)` : allowed.reason };
}

// ─── Escaneo de contenido de las líneas AGREGADAS ───────────────────────────────────────────────────────────────────────

export type Finding = { file: string; line: string; why: string };

type ScanRule = { id: string; test: RegExp; why: string };
const SCAN_RULES: ScanRule[] = [
  { id: 'fetch', test: /\bfetch\s*\(/, why: 'llamada de red (fetch)' },
  { id: 'xhr', test: /XMLHttpRequest/, why: 'llamada de red (XMLHttpRequest)' },
  { id: 'websocket', test: /\bWebSocket\b/, why: 'conexión de red (WebSocket)' },
  { id: 'customFetch', test: /\bcustomFetch\b/, why: 'llamada a la API (customFetch)' },
  { id: 'supabase', test: /supabase/i, why: 'acceso a Supabase' },
  { id: 'api-client', test: /api-client-react/, why: 'cliente de la API (solo se admiten imports de tipos en una línea)' },
  { id: 'secure-store', test: /expo-secure-store|SecureStore/, why: 'almacenamiento seguro (sesión y claves)' },
  { id: 'async-storage', test: /AsyncStorage|async-storage/, why: 'almacenamiento de datos del teléfono (solo se admite la clave del tema)' },
  { id: 'process-env', test: /process\.env/, why: 'variables de entorno' },
  { id: 'expo-public', test: /EXPO_PUBLIC/, why: 'variables públicas de configuración' },
  { id: 'eval', test: /\beval\s*\(/, why: 'ejecución de código dinámico (eval)' },
  { id: 'new-function', test: /new\s+Function\b/, why: 'ejecución de código dinámico (new Function)' },
  { id: 'open-url', test: /Linking\.openURL\s*\(|openBrowserAsync\s*\(/, why: 'abrir una dirección externa' },
];

/** Excepciones EXPLÍCITAS y mínimas: una por regla de arriba. */
function isException(ruleId: string, file: string, line: string): boolean {
  if (ruleId === 'api-client') {
    // Solo un import de TIPOS en una sola línea (no ejecuta nada).
    return /^\s*import\s+type\b[^;]*\bfrom\s+['"]@workspace\/api-client-react['"]\s*;?\s*$/.test(line);
  }
  if (ruleId === 'async-storage') {
    // Solo el contexto de tema, y solo con la clave del tema (o su import).
    return (
      file === 'artifacts/wodplace/context/ThemeContext.tsx' &&
      (/THEME_STORAGE_KEY/.test(line) || /^\s*import\s+AsyncStorage\s+from\s+['"]@react-native-async-storage\/async-storage['"]\s*;?\s*$/.test(line))
    );
  }
  return false;
}

const isCommentOnly = (line: string): boolean => /^\s*(\/\/|\/\*|\*)/.test(line);

/** Nombre de paquete de un especificador de módulo, o null si es relativo, un alias propio (@/...) o un módulo de Node. */
export function packageOf(spec: string): string | null {
  if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('@/')) return null;
  if (spec.startsWith('node:') || builtinModules.includes(spec.split('/')[0]!)) return null;
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]!;
}

export function scanAddedLines(file: string, lines: string[], declaredDeps: string[]): Finding[] {
  const out: Finding[] = [];
  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    if (!line.trim() || isCommentOnly(line)) continue;
    for (const rule of SCAN_RULES) {
      if (rule.test.test(line) && !isException(rule.id, file, line)) out.push({ file, line: line.trim(), why: rule.why });
    }
    const specs: string[] = [];
    for (const re of [/\bfrom\s+['"]([^'"]+)['"]/g, /\bimport\s+['"]([^'"]+)['"]/g, /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g, /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g]) {
      for (const m of line.matchAll(re)) specs.push(m[1]!);
    }
    for (const spec of specs) {
      const pkg = packageOf(spec);
      if (pkg && !declaredDeps.includes(pkg)) out.push({ file, line: line.trim(), why: `librería no declarada en artifacts/wodplace/package.json: ${pkg}` });
    }
    if (/\b(require|import)\(\s*[^'"\s)]/.test(line)) out.push({ file, line: line.trim(), why: 'import dinámico que no es un texto fijo' });
  }
  return out;
}

const CODE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

function declaredDependencies(): string[] {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot(), 'artifacts/wodplace/package.json'), 'utf8')) as Record<string, Record<string, string> | undefined>;
  return [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
}

// ─── git ────────────────────────────────────────────────────────────────────────────────────────────────────────────────

let cachedRoot: string | undefined;
/** Raíz del repositorio: pnpm corre este script desde scripts/, y las rutas de git deben ser relativas a la raíz. */
function repoRoot(): string {
  cachedRoot ??= execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  return cachedRoot;
}

function git(args: string[]): string[] {
  const out = execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 26, cwd: repoRoot() });
  return out.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.length > 0);
}

type Source = { label: string; files: string[]; diffArgs?: (file: string) => string[] };

function sourceFromArgs(argv: string[]): Source {
  const i = (flag: string) => argv.indexOf(flag);
  if (i('--files') >= 0) return { label: 'lista dada', files: argv.slice(i('--files') + 1) };
  if (i('--range') >= 0) {
    const range = argv[i('--range') + 1];
    if (!range) throw new Error('--range necesita un rango, por ejemplo main..HEAD');
    return {
      label: `rango ${range}`,
      files: git(['diff', '--name-only', '--no-renames', range]).map((l) => l.trim()),
      diffArgs: (f) => ['diff', '-U0', '--no-renames', '--diff-filter=ACMR', range, '--', f],
    };
  }
  if (i('--commit') >= 0) {
    const sha = argv[i('--commit') + 1];
    if (!sha) throw new Error('--commit necesita un commit');
    return {
      label: `commit ${sha}`,
      files: git(['show', '--name-only', '--format=', '--no-renames', sha]).map((l) => l.trim()),
      diffArgs: (f) => ['show', '-U0', '--format=', '--no-renames', '--diff-filter=ACMR', sha, '--', f],
    };
  }
  return {
    label: 'área de preparación',
    files: git(['diff', '--cached', '--name-only', '--no-renames']).map((l) => l.trim()),
    diffArgs: (f) => ['diff', '--cached', '-U0', '--no-renames', '--diff-filter=ACMR', '--', f],
  };
}

const addedLinesOf = (src: Source, file: string): string[] =>
  src.diffArgs
    ? git(src.diffArgs(file))
        .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
        .map((l) => l.slice(1))
    : [];

export function printLists(): void {
  const show = (title: string, rules: Rule[]) => {
    console.log(`\n${title} (${rules.length}):`);
    for (const r of rules) console.log(`  ${r.pattern}  -- ${r.reason}`);
  };
  show('PROHIBIDAS (fallan)', FORBIDDEN);
  show('FUERA DE LO PERMITIDO aunque parezcan permitidas (fallan)', NOT_ALLOWED);
  show('PERMITIDAS', ALLOWED);
  show('SENSIBLES (dentro de lo permitido, fallan salvo DESIGN_SENSITIVE_OK con la ruta exacta)', SENSITIVE);
}

export function run(argv: string[]): number {
  if (argv.includes('--print-lists')) {
    printLists();
    return 0;
  }
  const src = sourceFromArgs(argv);
  const approved = (process.env.DESIGN_SENSITIVE_OK ?? '').split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  if (src.files.length === 0) {
    console.log(`Frontera del diseño (${src.label}): no hay archivos que revisar.`);
    return 0;
  }
  const verdicts = src.files.map((f) => classify(f, approved));
  const findings: Finding[] = [];
  if (src.diffArgs) {
    const deps = declaredDependencies();
    for (const v of verdicts) {
      if (v.kind === 'permitido' && CODE_FILE.test(v.file)) findings.push(...scanAddedLines(v.file, addedLinesOf(src, v.file), deps));
    }
  }
  console.log(`Frontera del diseño (${src.label}): ${src.files.length} archivo(s).`);
  for (const v of verdicts) {
    if (v.kind === 'permitido' && v.reason.includes('aprobado por Pía')) console.log(`  (aprobado) ${v.file}`);
  }
  const bad = verdicts.filter((v) => v.kind !== 'permitido');
  for (const v of bad) console.log(`  ${v.kind === 'prohibido' ? 'PROHIBIDO' : v.kind === 'sensible' ? 'SENSIBLE ' : 'FUERA    '}  ${v.file}  -> ${v.reason}`);
  for (const f of findings) console.log(`  CONTENIDO  ${f.file}  -> ${f.why}:  ${f.line.slice(0, 110)}`);
  const total = bad.length + findings.length;
  if (total === 0) {
    console.log('OK: todo es presentación.');
    return 0;
  }
  console.log(`FALLA: ${total} problema(s). Una tarea de diseño no puede hacer esto: se detiene y se le avisa a Pía.`);
  return 1;
}

if (process.argv[1] && /check-design-boundary\.ts$/.test(process.argv[1].replace(/\\/g, '/'))) {
  process.exit(run(process.argv.slice(2).filter((a) => a !== '--')));
}
