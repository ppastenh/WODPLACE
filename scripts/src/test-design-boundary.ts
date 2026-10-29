/**
 * Pruebas de la frontera del diseño (check-design-boundary.ts): clasificación de rutas, aprobación de archivos sensibles y
 * escaneo del contenido agregado. Corre con: pnpm --filter @workspace/scripts test:design-boundary
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ALLOWED, FORBIDDEN, NOT_ALLOWED, SENSITIVE, classify, packageOf, scanAddedLines } from './check-design-boundary';

const kind = (f: string, approved: string[] = []) => classify(f, approved).kind;

describe('frontera del diseño: rutas prohibidas', () => {
  const prohibidas = [
    'artifacts/api-server/src/routes/bookings.ts',
    'supabase/migrations/20261029_x.sql',
    'lib/db/src/schema/wodplace.ts',
    'lib/api-client-react/src/myBox.ts',
    'lib/api-spec/openapi.yaml',
    'lib/api-zod/src/generated/types/pr.ts',
    'workers/keepalive/src/index.ts',
    'artifacts/box-admin/src/styles.css',
    'artifacts/super-admin/src/routes/index.tsx',
    'artifacts/wodplace/app/super-admin.tsx',
    'package.json',
    'artifacts/wodplace/package.json',
    'scripts/package.json',
    'pnpm-lock.yaml',
    'workers/keepalive/pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'artifacts/wodplace/app.json',
    'artifacts/wodplace/eas.json',
    '.env',
    '.env.local',
    'artifacts/api-server/.env.production',
    '.easignore',
    'artifacts/wodplace/.easignore',
    '.github/workflows/deploy.yml',
  ];
  for (const f of prohibidas) it(`${f} es PROHIBIDO`, () => assert.equal(kind(f), 'prohibido'));
  it('también con barras de Windows', () => assert.equal(kind('artifacts\\api-server\\src\\x.ts'), 'prohibido'));
  it('una aprobación de archivo sensible NO levanta una ruta prohibida', () =>
    assert.equal(kind('artifacts/api-server/src/x.ts', ['artifacts/api-server/src/x.ts']), 'prohibido'));
});

describe('frontera del diseño: área permitida', () => {
  const permitidas = [
    'artifacts/wodplace/app/rm/index.tsx',
    'artifacts/wodplace/app/community.tsx',
    'artifacts/wodplace/components/home/HomeView.tsx',
    'artifacts/wodplace/components/SideDrawer.tsx',
    'artifacts/wodplace/constants/colors.ts',
    'artifacts/wodplace/constants/darkColors.ts',
    'artifacts/wodplace/assets/images/home/clase-piernas.webp',
    'artifacts/wodplace/context/ThemeContext.tsx',
    'artifacts/wodplace/hooks/useColors.ts',
    'artifacts/wodplace/lib/theme.ts',
    'artifacts/wodplace/lib/planProgress.ts',
    'scripts/src/test-theme.ts',
    'scripts/src/test-dark-contrast.ts',
    'scripts/src/dark-contrast-pairs.ts',
    'ESTADO.md',
  ];
  for (const f of permitidas) it(`${f} es PERMITIDO`, () => assert.equal(kind(f), 'permitido'));
});

describe('frontera del diseño: lo que no está en ninguna lista también se rechaza', () => {
  const fuera = [
    'artifacts/wodplace/context/AuthContext.tsx',
    'artifacts/wodplace/context/BookingContext.tsx',
    'artifacts/wodplace/context/NotificationsContext.tsx',
    'artifacts/wodplace/lib/supabase.ts',
    'artifacts/wodplace/lib/adminUnlock.ts',
    'artifacts/wodplace/lib/adminLock.ts',
    'artifacts/wodplace/lib/apiConfig.ts',
    'artifacts/wodplace/lib/navigation.ts',
    'artifacts/wodplace/constants/classSchedule.ts',
    'artifacts/wodplace/tsconfig.json',
    'tsconfig.base.json',
    '.githooks/pre-commit',
    // El propio chequeo y sus pruebas: una tarea de diseño no puede editarlos
    'scripts/src/check-design-boundary.ts',
    'scripts/src/test-design-boundary.ts',
    'scripts/src/test-admin-lock.ts',
    // Reglas e instrucciones, aunque sean .md
    'CLAUDE.md',
    'artifacts/wodplace/CLAUDE.md',
    'AGENTS.md',
    'replit.md',
  ];
  for (const f of fuera) it(`${f} queda FUERA`, () => assert.equal(kind(f), 'fuera'));
  it('ESTADO.md y otros .md sí se pueden actualizar', () => {
    assert.equal(kind('ESTADO.md'), 'permitido');
    assert.equal(kind('LANZAMIENTO.md'), 'permitido');
  });
});

describe('frontera del diseño: archivos sensibles fallan salvo aprobación explícita por archivo', () => {
  const sensibles = [
    'artifacts/wodplace/components/AdminLockPrompt.tsx',
    'artifacts/wodplace/components/PinField.tsx',
    'artifacts/wodplace/app/login.tsx',
    'artifacts/wodplace/app/login-password.tsx',
    'artifacts/wodplace/app/register.tsx',
    'artifacts/wodplace/app/forgot-password.tsx',
    'artifacts/wodplace/app/reset-password.tsx',
    'artifacts/wodplace/app/create-box.tsx',
    'artifacts/wodplace/components/JoinBoxModal.tsx',
    'artifacts/wodplace/app/admin-login.tsx',
    'artifacts/wodplace/app/admin-dashboard.tsx',
    'artifacts/wodplace/app/auth-callback.tsx',
    'artifacts/wodplace/app/platform-agreement.tsx',
    'artifacts/wodplace/app/_layout.tsx',
    'artifacts/wodplace/app/index.tsx',
    'artifacts/wodplace/app/home.tsx',
    'artifacts/wodplace/app/calendar.tsx',
    'artifacts/wodplace/app/active-contracts.tsx',
    'DECISIONES-DISENO.md',
  ];
  for (const f of sensibles) it(`${f} es SENSIBLE (falla sin aprobación)`, () => assert.equal(kind(f), 'sensible'));
  it('pasa con la ruta EXACTA aprobada', () => {
    assert.equal(kind('artifacts/wodplace/app/_layout.tsx', ['artifacts/wodplace/app/_layout.tsx']), 'permitido');
    assert.equal(kind('DECISIONES-DISENO.md', ['DECISIONES-DISENO.md']), 'permitido');
  });
  it('no pasa si se aprobó OTRO archivo', () => {
    assert.equal(kind('artifacts/wodplace/app/_layout.tsx', ['artifacts/wodplace/app/home.tsx']), 'sensible');
  });
  it('la aprobación no se extiende por prefijo ni por comodín', () => {
    assert.equal(kind('artifacts/wodplace/app/login.tsx', ['artifacts/wodplace/app/*']), 'sensible');
    assert.equal(kind('artifacts/wodplace/app/login.tsx', ['artifacts/wodplace/app']), 'sensible');
    assert.equal(kind('artifacts/wodplace/app/login-password.tsx', ['artifacts/wodplace/app/login.tsx']), 'sensible');
  });
  it('toda ruta sensible está dentro de lo permitido (si no, la lista de sensibles no haría nada)', () => {
    for (const rule of SENSITIVE) {
      const f = rule.pattern;
      assert.ok(!f.includes('*'), f);
      assert.equal(classify(f, [f]).kind, 'permitido', f);
    }
  });
  it('las listas existen y no están vacías', () => {
    assert.ok(FORBIDDEN.length >= 16 && NOT_ALLOWED.length >= 3 && ALLOWED.length >= 20 && SENSITIVE.length >= 15);
  });
});

describe('frontera del diseño: escaneo del contenido agregado', () => {
  const DEPS = ['react', 'react-native', '@expo/vector-icons', 'expo-image', 'expo-linear-gradient', '@workspace/api-client-react', '@react-native-async-storage/async-storage'];
  const scan = (file: string, ...lines: string[]) => scanAddedLines(file, lines, DEPS);
  const F = 'artifacts/wodplace/components/home/HomeView.tsx';

  describe('pasa', () => {
    const buenas = [
      "const styles = StyleSheet.create({ card: { backgroundColor: colors.card } });",
      "import { Pressable, Text, View } from 'react-native';",
      "import { Feather } from '@expo/vector-icons';",
      "import { Image } from 'expo-image';",
      "import { useColors } from '@/hooks/useColors';",
      "import { HomeView } from './HomeView';",
      "import { x } from '../../lib/theme';",
      "import assert from 'node:assert/strict';",
      "import fs from 'node:fs';",
      "const src = require('@/assets/images/home/clase-piernas.webp');",
      "import type { MyPlan } from '@workspace/api-client-react';",
      "// fetch( supabase process.env AsyncStorage dentro de un comentario no cuenta",
      " * supabase: solo documentación",
      '',
    ];
    for (const l of buenas) it(`pasa: ${l.slice(0, 70) || '(línea vacía)'}`, () => assert.deepEqual(scan(F, l), []));
    it('pasa: el contexto de tema usa AsyncStorage solo con la clave del tema', () => {
      const T = 'artifacts/wodplace/context/ThemeContext.tsx';
      assert.deepEqual(scan(T, "import AsyncStorage from '@react-native-async-storage/async-storage';"), []);
      assert.deepEqual(scan(T, 'AsyncStorage.getItem(THEME_STORAGE_KEY)'), []);
      assert.deepEqual(scan(T, 'AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {});'), []);
    });
  });

  describe('falla', () => {
    const malas: [string, string][] = [
      ["const r = await fetch('https://x.cl/api');", 'fetch'],
      ['fetch (url)', 'fetch con espacio'],
      ['const x = new XMLHttpRequest();', 'XMLHttpRequest'],
      ["const ws = new WebSocket('wss://x');", 'WebSocket'],
      ['await customFetch(`/api/x`)', 'customFetch'],
      ["import { createClient } from '@supabase/supabase-js';", 'supabase (import)'],
      ['const c = supabase.from("x")', 'supabase (uso)'],
      ["import { getMyPlans } from '@workspace/api-client-react';", 'api-client-react (import de valores)'],
      ["} from '@workspace/api-client-react';", 'api-client-react (cierre de import de varias líneas)'],
      ["import * as SecureStore from 'expo-secure-store';", 'SecureStore'],
      ["await SecureStore.getItemAsync('token')", 'SecureStore (uso)'],
      ["AsyncStorage.setItem('user', JSON.stringify(user))", 'AsyncStorage (datos de usuario)'],
      ["const k = process.env.EXPO_PUBLIC_SUPABASE_URL;", 'process.env'],
      ["const url = EXPO_PUBLIC_API_URL;", 'EXPO_PUBLIC'],
      ["eval('1+1')", 'eval'],
      ["const f = new Function('return 1')", 'new Function'],
      ["Linking.openURL('https://x.cl')", 'Linking.openURL'],
      ["await WebBrowser.openBrowserAsync(url)", 'openBrowserAsync'],
      ["import _ from 'lodash';", 'librería no declarada'],
      ["import { motion } from 'framer-motion';", 'librería no declarada'],
      ["import 'react-native-reanimated';", 'import de efecto de una librería no declarada'],
      ["const m = require('moment');", 'require de una librería no declarada'],
      ["const m = await import('moment');", 'import dinámico de una librería no declarada'],
      ["const m = await import(nombre);", 'import dinámico que no es texto fijo'],
      ["const m = require(ruta);", 'require que no es texto fijo'],
    ];
    for (const [line, label] of malas) it(`falla: ${label}`, () => assert.ok(scan(F, line).length > 0, line));
    it('falla: AsyncStorage con la clave del tema pero en OTRO archivo', () => {
      assert.ok(scan(F, 'AsyncStorage.getItem(THEME_STORAGE_KEY)').length > 0);
    });
    it('falla: AsyncStorage con datos de usuario aunque sea en el contexto de tema', () => {
      assert.ok(scan('artifacts/wodplace/context/ThemeContext.tsx', "AsyncStorage.setItem('user', x)").length > 0);
    });
    it('falla: import de tipos de la API en varias líneas no se admite (el cierre falla)', () => {
      assert.ok(scan(F, "} from '@workspace/api-client-react';").length > 0);
    });
    it('el aviso dice qué encontró', () => {
      const [first] = scan(F, "const r = await fetch('x')");
      assert.match(first!.why, /fetch/);
      assert.equal(first!.file, F);
    });
  });

  describe('nombres de paquete', () => {
    it('relativos, alias propios y módulos de Node no cuentan como librería', () => {
      assert.equal(packageOf('./x'), null);
      assert.equal(packageOf('../x'), null);
      assert.equal(packageOf('@/lib/theme'), null);
      assert.equal(packageOf('node:fs'), null);
      assert.equal(packageOf('fs'), null);
    });
    it('paquetes normales y con alcance', () => {
      assert.equal(packageOf('react-native'), 'react-native');
      assert.equal(packageOf('expo-image/build/x'), 'expo-image');
      assert.equal(packageOf('@expo/vector-icons'), '@expo/vector-icons');
      assert.equal(packageOf('@expo/vector-icons/Feather'), '@expo/vector-icons');
    });
  });
});
