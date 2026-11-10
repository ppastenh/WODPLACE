/**
 * Pruebas automáticas de la lógica de Inicio (corredor integrado de Node, sin dependencias de prueba):
 *  - tarjeta de próxima clase: estado (cargando / con reserva / invitación) y línea del coach;
 *  - contraste de los textos de la tarjeta sobre su fondo en reposo y presionado (tokens de constants/colors.ts).
 *
 * Corre con: pnpm --filter @workspace/scripts test:home-logic
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import colorsModule from '../../artifacts/wodplace/constants/colors';
import { readLayout, readLines } from '../../artifacts/wodplace/components/home/layoutEvents';
import { monthlyProgressA11yLabel, monthlyProgressBarValue } from '../../artifacts/wodplace/components/home/monthlyProgressText';
import { progressColors, progressMeasure, progressPasses } from '../../artifacts/wodplace/components/home/progressColors';
import { levelStreakColors, levelStreakMeasure, levelStreakPasses } from '../../artifacts/wodplace/components/home/levelStreakColors';
import {
  COMPACT_SCALE,
  LEVEL_DETAIL,
  NO_RANK_LABEL,
  SKILL_LEVEL_LABELS,
  STREAK_DOTS,
  STREAK_NO_DATA,
  levelA11yLabel,
  levelText,
  levelView,
  rankFontSize,
  streakA11yLabel,
  streakStatusFrom,
  streakSuffix,
  streakView,
} from '../../artifacts/wodplace/components/home/levelStreakModel';
import { splitHighlight } from '../../artifacts/wodplace/components/home/splitHighlight';
import { NO_COACH_LABEL, coachLine, nextClassA11yLabel, nextClassCardState } from '../../artifacts/wodplace/lib/nextClassCard';
import { monthlyCardParts, planProgressView, reservedLine, unlimitedLegend } from '../../artifacts/wodplace/lib/planProgress';
import {
  classesRemainingInPeriod,
  periodWindow,
  summarizePeriodClasses,
  type PeriodBooking,
} from '../../artifacts/api-server/src/lib/planPeriodStats';

// tsx entrega el export por defecto de un módulo sin "type" a veces envuelto en otro `default`.
const colors = ((colorsModule as { default?: typeof colorsModule }).default ?? colorsModule) as typeof colorsModule;
const light = colors.light;

function luminance(hex: string): number {
  const c = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('barra superior de Inicio (HomeView.tsx): el botón de menú recibe el toque', () => {
  // Comprobación ESTÁTICA del código (no dibuja nada): habría detectado el error de octubre, cuando el logo, que ocupa todo el ancho de la
  // barra, se dibujaba encima del botón de menú con pointerEvents puesto en un <Text> (Android solo lo respeta en View) y el menú no abría.
  const source = readFileSync(new URL('../../artifacts/wodplace/components/home/HomeView.tsx', import.meta.url), 'utf8');
  it('el botón de menú llama a events.onMenu y la campana a events.onBell', () => {
    assert.match(source, /<BarButton[^>]*icon="menu"[^>]*onPress=\{events\.onMenu\}/);
    assert.match(source, /<BarButton\s+icon="bell"[\s\S]*?onPress=\{events\.onBell\}/);
  });
  it('el botón de menú declara su estado expandido para lectores de pantalla', () => {
    assert.match(source, /<BarButton[^>]*icon="menu"[^>]*expanded=\{menuOpen\}/);
    assert.match(source, /accessibilityState=\{expanded === undefined \? undefined : \{ expanded \}\}/);
  });
  it('ningún <Text> usa pointerEvents (Android lo ignora): el logo va dentro de un View con pointerEvents="none"', () => {
    assert.doesNotMatch(source, /<Text[^>]*pointerEvents=/);
    assert.match(source, /<View pointerEvents="none" style=\{styles\.logoWrap\}>/);
  });
});

describe('tarjeta de próxima clase (NextClassCard.tsx): el toque llega a la tarjeta entera', () => {
  // Comprobación ESTÁTICA del código (no dibuja nada), por la lección del logo de la barra superior: las capas decorativas no deben quitarle
  // el toque a la tarjeta ni ponerse pointerEvents en un <Text> (Android lo ignora).
  const source = readFileSync(new URL('../../artifacts/wodplace/components/home/NextClassCard.tsx', import.meta.url), 'utf8');
  it('la textura y el velo van en un View con pointerEvents="none"', () => {
    assert.match(source, /<View pointerEvents="none" style=\{styles\.layers\}>/);
  });
  it('la flecha decorativa y el contenido van en Views con pointerEvents="none" y ocultos a los lectores de pantalla', () => {
    assert.match(source, /<View pointerEvents="none" importantForAccessibility="no-hide-descendants" style=\{styles\.arrowWrap\}>/);
    assert.ok((source.match(/<View pointerEvents="none"/g) ?? []).length >= 4);
    assert.match(source, /importantForAccessibility="no-hide-descendants"/);
  });
  it('ningún <Text> usa pointerEvents y no hay otro botón dentro de la tarjeta', () => {
    assert.doesNotMatch(source, /<Text[^>]*pointerEvents=/);
    assert.equal((source.match(/<Pressable/g) ?? []).length, 2, 'una sola tarjeta-botón por estado (invitación y con reserva)');
    assert.equal((source.match(/<\/Pressable>/g) ?? []).length, 2);
  });
  it('la etiqueta de accesibilidad es una sola (nextClassA11yLabel) y la invitación conserva la suya', () => {
    assert.match(source, /accessibilityLabel=\{nextClassA11yLabel\(nextBooked\.type, spoken\)\}/);
    assert.match(source, /accessibilityLabel="Ir al Calendario para reservar una clase"/);
  });
  it('el estado presionado es sólido: ninguna línea mezcla "pressed" con opacity', () => {
    for (const line of source.split('\n')) assert.ok(!(/pressed/i.test(line) && /opacity/i.test(line)), line);
  });
  it('la tarjeta sin reserva no lleva franja ni barras (solo título y flecha)', () => {
    assert.ok(!/stripe|STRIPE|Bars|BARS|bars/.test(source));
  });
  it('el título sin reserva es de 21 sp (antes 26) con la misma fuente Anton', () => {
    assert.match(source, /const INVITE_NAME_SIZE = 21;/);
    assert.match(source, /inviteName: { fontSize: INVITE_NAME_SIZE, lineHeight: INVITE_NAME_LINE }/);
  });
  it('la textura por defecto sale de una sola constante y es la pizarra elegida (home-card-pizarra.jpg)', () => {
    assert.match(source, /export const NEXT_CLASS_TEXTURE: NextClassTexture = \{[\s\S]*?home-card-pizarra\.jpg/);
    assert.match(source, /texture: NEXT_CLASS_TEXTURE/);
  });
  it('ningún archivo de components/home pide imágenes que git no rastrea (banner-* y textura* están excluidas) y todas existen', () => {
    for (const name of ['NextClassCard.tsx', 'HomeView.tsx', 'DevHomeScreen.tsx', 'DailyQuoteCard.tsx']) {
      const text = readFileSync(new URL(`../../artifacts/wodplace/components/home/${name}`, import.meta.url), 'utf8');
      for (const m of text.matchAll(/require\('@\/assets\/images\/home\/([^']+)'\)/g)) {
        const file = m[1]!;
        assert.doesNotMatch(file, /^(banner-|textura|paisaje|prueba-fondos)/, `${name} pide ${file}, que está excluida del repositorio`);
        assert.ok(existsSync(new URL(`../../artifacts/wodplace/assets/images/home/${file}`, import.meta.url)), `${name}: falta ${file}`);
      }
    }
  });
  it('la duración y el nivel van en la misma fila y la tarjeta es un rectángulo bajo (alto mínimo de 124 dp)', () => {
    assert.match(source, /metaRow: \{ flexDirection: 'row'/);
    assert.match(source, /const CARD_MIN_H = 124;/);
  });
});

describe('tarjeta de próxima clase: estado', () => {
  it('cargando: esqueleto, nunca la invitación (aunque todavía no se sepa si hay reserva)', () => {
    assert.equal(nextClassCardState({ isLoading: true, hasUpcomingBooking: false }), 'loading');
    assert.equal(nextClassCardState({ isLoading: true, hasUpcomingBooking: true }), 'loading');
  });
  it('terminó de cargar y hay una reserva próxima: "Tu próxima clase"', () => {
    assert.equal(nextClassCardState({ isLoading: false, hasUpcomingBooking: true }), 'booked');
  });
  it('terminó de cargar y no hay reserva (haya clases, no haya o haya fallado la carga): invitación', () => {
    assert.equal(nextClassCardState({ isLoading: false, hasUpcomingBooking: false }), 'invite');
  });
});

describe('tarjeta de próxima clase: etiqueta de accesibilidad (una sola, la tarjeta es el único botón)', () => {
  it('dice la clase, la fecha y hora, y a dónde lleva', () => {
    assert.equal(nextClassA11yLabel('CrossFit', 'mar 28 oct, 07:00 AM'), 'Tu próxima clase: CrossFit, mar 28 oct, 07:00 AM. Ir al Calendario');
  });
  it('no deja espacios sobrantes', () => {
    assert.equal(nextClassA11yLabel(' Open Gym ', ' vie 7 nov, 06:30 PM '), 'Tu próxima clase: Open Gym, vie 7 nov, 06:30 PM. Ir al Calendario');
  });
});

describe('tarjeta de próxima clase: línea del coach', () => {
  it('con coach: "Coach {nombre}" con la palabra una sola vez', () => {
    assert.equal(coachLine('Juan Pérez'), 'Coach Juan Pérez');
    assert.equal(coachLine('  Juan Pérez  '), 'Coach Juan Pérez');
  });
  it('si el nombre ya empieza con "Coach", no se repite', () => {
    assert.equal(coachLine('Coach Juan'), 'Coach Juan');
    assert.equal(coachLine('coach Juan'), 'coach Juan');
  });
  it('sin coach asignado, vacío o nulo: la línea se oculta', () => {
    assert.equal(coachLine(NO_COACH_LABEL), null);
    assert.equal(coachLine('Sin coach asignado'), null);
    assert.equal(coachLine(''), null);
    assert.equal(coachLine('   '), null);
    assert.equal(coachLine(null), null);
    assert.equal(coachLine(undefined), null);
  });
  it('una palabra que solo empieza parecido a "coach" no cuenta como prefijo', () => {
    assert.equal(coachLine('Coachella'), 'Coach Coachella');
  });
});

describe('tarjeta de próxima clase: colores y contraste (mínimo 4,5:1)', () => {
  it('el presionado es un color sólido existente (mismo valor que adminActionPressed), no opacidad', () => {
    assert.equal(light.navFloatingPressed, light.adminActionPressed);
    assert.equal(light.navFloatingPressed, '#2E2F35');
  });
  it('el título (navFloatingForeground) cumple en reposo y presionado', () => {
    assert.ok(contrast(light.navFloatingForeground, light.navFloating) >= 4.5);
    assert.ok(contrast(light.navFloatingForeground, light.navFloatingPressed) >= 4.5);
  });
  it('la meta (coach, duración y nivel) con el token claro "inactive" cumple en reposo y presionado', () => {
    assert.ok(contrast(light.inactive, light.navFloating) >= 4.5, 'reposo');
    assert.ok(contrast(light.inactive, light.navFloatingPressed) >= 4.5, 'presionado');
  });
  it('el token anterior de la meta (navInactive) NO cumplía: por eso se cambió', () => {
    assert.ok(contrast(light.navInactive, light.navFloating) < 4.5);
    assert.ok(contrast(light.navInactive, light.navFloatingPressed) < 4.5);
  });
});

// ─── Período del plan: realizadas y reservadas (servidor) ────────────────────────────────────────────────────────────
// Hora fija de referencia: 2026-10-27 13:00 UTC = 10:00 en Chile (horario de verano, UTC-3).
const AHORA = new Date('2026-10-27T13:00:00Z');
const VENTANA = periodWindow('2026-11-26', 30); // 2026-10-27 hasta 2026-11-25 (el 26 ya es el próximo período)
const reserva = (sessionDate: string, startTime: string, durationMinutes = 60, status = 'inscrito'): PeriodBooking => ({
  status,
  sessionDate,
  startTime,
  durationMinutes,
});

describe('período del plan: ventana', () => {
  it('es next_payment_at menos duration_days; incluye el primer día y NO el día del próximo pago', () => {
    assert.deepEqual(VENTANA, { start: '2026-10-27', endExclusive: '2026-11-26' });
  });
  it('cruza el fin de año sin errores', () => {
    assert.deepEqual(periodWindow('2027-01-10', 30), { start: '2026-12-11', endExclusive: '2027-01-10' });
  });
});

describe('período del plan: clases realizadas y reservadas', () => {
  it('sin reservas: 0 y 0', () => {
    assert.deepEqual(summarizePeriodClasses([], VENTANA, AHORA), { completed: 0, reserved: 0 });
  });
  it('solo realizadas (clases del período que ya terminaron)', () => {
    const r = [reserva('2026-10-27', '07:00'), reserva('2026-10-27', '08:00')]; // terminan 08:00 y 09:00, ya pasaron
    assert.deepEqual(summarizePeriodClasses(r, VENTANA, AHORA), { completed: 2, reserved: 0 });
  });
  it('solo próximas: son reservadas, no realizadas', () => {
    const r = [reserva('2026-10-28', '07:00'), reserva('2026-11-02', '19:00')];
    assert.deepEqual(summarizePeriodClasses(r, VENTANA, AHORA), { completed: 0, reserved: 2 });
  });
  it('mezcla: realizadas y reservadas por separado', () => {
    const r = [reserva('2026-10-27', '07:00'), reserva('2026-10-27', '18:00'), reserva('2026-10-29', '07:00')];
    assert.deepEqual(summarizePeriodClasses(r, VENTANA, AHORA), { completed: 1, reserved: 2 });
  });
  it('una reserva cancelada o en lista de espera no cuenta como ninguna de las dos', () => {
    const r = [reserva('2026-10-27', '07:00', 60, 'cancelado'), reserva('2026-10-28', '07:00', 60, 'lista_espera'), reserva('2026-10-28', '08:00')];
    assert.deepEqual(summarizePeriodClasses(r, VENTANA, AHORA), { completed: 0, reserved: 1 });
  });
  it('inicio de período: la clase del primer día cuenta; la del día anterior no', () => {
    const r = [reserva('2026-10-27', '07:00'), reserva('2026-10-26', '07:00')];
    assert.deepEqual(summarizePeriodClasses(r, VENTANA, AHORA), { completed: 1, reserved: 0 });
  });
  it('fin de período: la clase del último día cuenta; la del día del próximo pago no', () => {
    const r = [reserva('2026-11-25', '19:00'), reserva('2026-11-26', '07:00')];
    assert.deepEqual(summarizePeriodClasses(r, VENTANA, AHORA), { completed: 0, reserved: 1 });
  });
  it('una reserva que termina justo ahora ya es realizada; un minuto antes, todavía reservada', () => {
    // Clase 09:00 de 60 min termina 10:00 = "ahora" -> realizada.
    assert.deepEqual(summarizePeriodClasses([reserva('2026-10-27', '09:00')], VENTANA, AHORA), { completed: 1, reserved: 0 });
    // Clase 09:01 de 60 min termina 10:01 -> aún no.
    assert.deepEqual(summarizePeriodClasses([reserva('2026-10-27', '09:01')], VENTANA, AHORA), { completed: 0, reserved: 1 });
    // Con la hora de Chile un minuto antes (09:59), la de 09:00 todavía no terminó.
    assert.deepEqual(summarizePeriodClasses([reserva('2026-10-27', '09:00')], VENTANA, new Date('2026-10-27T12:59:00Z')), { completed: 0, reserved: 1 });
  });
  it('usa la hora de CHILE y no la de UTC: a las 22:30 de Chile (01:30 UTC del día siguiente) la clase de las 20:00 ya pasó', () => {
    const noche = new Date('2026-10-28T01:30:00Z'); // 27-oct 22:30 en Chile
    assert.deepEqual(summarizePeriodClasses([reserva('2026-10-27', '20:00')], VENTANA, noche), { completed: 1, reserved: 0 });
  });
  it('el hora de inicio con segundos (HH:MM:SS) se entiende igual', () => {
    assert.deepEqual(summarizePeriodClasses([reserva('2026-10-27', '07:00:00')], VENTANA, AHORA), { completed: 1, reserved: 0 });
  });
});

describe('aviso "Te quedan N clases este período": una reserva gasta cupo', () => {
  it('cuenta realizadas MÁS reservadas', () => {
    assert.equal(classesRemainingInPeriod(8, 5, 2), 1); // "Te queda 1 clase"
    assert.equal(classesRemainingInPeriod(8, 4, 0), 4);
    assert.equal(classesRemainingInPeriod(8, 0, 3), 5); // solo reservadas también gastan cupo
  });
  it('nunca baja de 0', () => {
    assert.equal(classesRemainingInPeriod(8, 7, 4), 0);
  });
});

// ─── Tarjeta "Clases del plan" ─────────────────────────────────────────────────────────────────────────────────────────
const plan = (classesPerPeriod: number | null, completed: number | null, reserved: number | null, durationDays = 30) => ({
  classesPerPeriod,
  classesCompletedInPeriod: completed,
  classesReservedInPeriod: reserved,
  durationDays,
});

describe('"Clases del plan": sin plan, plan ilimitado y plan por clases', () => {
  it('sin plan activo (tenga o no datos de plan)', () => {
    assert.deepEqual(planProgressView({ hasActivePlan: false, planLoading: false, plan: null }), { kind: 'none' });
    assert.deepEqual(planProgressView({ hasActivePlan: false, planLoading: false, plan: plan(8, 3, 1) }), { kind: 'none' });
  });

  it('plan ilimitado: solo el número, leyenda "clases realizadas este mes" y el chip "Plan ilimitado"; sin total', () => {
    assert.deepEqual(planProgressView({ hasActivePlan: true, planLoading: false, plan: plan(null, 5, 0) }), {
      kind: 'unlimited',
      completed: 5,
      reservedLine: null,
      legend: 'clases realizadas este mes',
      chip: 'Plan ilimitado',
    });
  });

  it('plan ilimitado con clases próximas: agrega "1 reservada" / "N reservadas"', () => {
    const uno = planProgressView({ hasActivePlan: true, planLoading: false, plan: plan(null, 0, 1) });
    assert.equal(uno.kind === 'unlimited' ? uno.reservedLine : 'x', '1 reservada');
    const tres = planProgressView({ hasActivePlan: true, planLoading: false, plan: plan(null, 2, 3) });
    assert.equal(tres.kind === 'unlimited' ? tres.reservedLine : 'x', '3 reservadas');
  });

  it('plan ilimitado que NO dura un mes: la leyenda dice "este período"', () => {
    const v = planProgressView({ hasActivePlan: true, planLoading: false, plan: plan(null, 2, 0, 7) });
    assert.equal(v.kind === 'unlimited' ? v.legend : 'x', 'clases realizadas este período');
    assert.equal(unlimitedLegend(28), 'clases realizadas este mes');
    assert.equal(unlimitedLegend(31), 'clases realizadas este mes');
    assert.equal(unlimitedLegend(27), 'clases realizadas este período');
    assert.equal(unlimitedLegend(90), 'clases realizadas este período');
  });

  it('plan por cantidad: "N / M", barra llena según las REALIZADAS y leyenda "realizadas este período"', () => {
    assert.deepEqual(planProgressView({ hasActivePlan: true, planLoading: false, plan: plan(8, 3, 2) }), {
      kind: 'classes',
      completed: 3,
      total: 8,
      ratio: 0.375, // las 2 reservadas NO llenan la barra
      reservedLine: '2 reservadas',
      legend: 'realizadas este período',
    });
  });

  it('plan por cantidad sin reservas: sin línea chica; con 0 realizadas, barra vacía', () => {
    const v = planProgressView({ hasActivePlan: true, planLoading: false, plan: plan(8, 0, 0) });
    assert.deepEqual(v, { kind: 'classes', completed: 0, total: 8, ratio: 0, reservedLine: null, legend: 'realizadas este período' });
  });

  it('la barra nunca pasa de llena (más realizadas que el tope)', () => {
    const v = planProgressView({ hasActivePlan: true, planLoading: false, plan: plan(8, 11, 0) });
    assert.equal(v.kind === 'classes' ? v.ratio : -1, 1);
  });

  it('período que aún no empieza (sin pago registrado): muestra "—" en vez de un número inventado', () => {
    const v = planProgressView({ hasActivePlan: true, planLoading: false, plan: plan(8, null, null) });
    assert.equal(v.kind === 'classes' ? v.completed : 'x', null);
    assert.equal(v.kind === 'classes' ? v.ratio : -1, 0);
    const u = planProgressView({ hasActivePlan: true, planLoading: false, plan: plan(null, null, null) });
    assert.equal(u.kind === 'unlimited' ? u.completed : 'x', null);
  });

  it('mientras llegan los datos del plan no dice "Sin plan activo" por error', () => {
    assert.deepEqual(planProgressView({ hasActivePlan: true, planLoading: true, plan: null }), { kind: 'loading' });
    assert.deepEqual(planProgressView({ hasActivePlan: true, planLoading: false, plan: null }), { kind: 'none' });
  });

  it('la línea de reservadas: singular, plural y ausencia', () => {
    assert.equal(reservedLine(1), '1 reservada');
    assert.equal(reservedLine(2), '2 reservadas');
    assert.equal(reservedLine(0), null);
    assert.equal(reservedLine(null), null);
  });
});

describe('"Clases del plan": colores (solo tokens existentes) y contraste (mínimo 4,5:1)', () => {
  it('chip "Plan ilimitado": accentForeground sobre accent', () => {
    assert.ok(contrast(light.accentForeground, light.accent) >= 4.5, String(contrast(light.accentForeground, light.accent)));
  });
  it('leyenda y línea de reservadas (navInactive) sobre la tarjeta blanca (card)', () => {
    assert.ok(contrast(light.navInactive, light.card) >= 4.5, String(contrast(light.navInactive, light.card)));
  });
  it('número principal (foreground) sobre la tarjeta (card)', () => {
    assert.ok(contrast(light.foreground, light.card) >= 4.5);
  });
});

describe('Tarjeta ancha "Progreso mensual": número, barra y "reservadas" por tipo de plan', () => {
  const vista = (p: ReturnType<typeof plan>) => monthlyCardParts(planProgressView({ hasActivePlan: true, planLoading: false, plan: p }));

  it('plan por cantidad: "N" + " / M clases", con barra y "reservadas" arriba a la derecha', () => {
    const v = vista(plan(8, 3, 2))!;
    assert.equal(v.value, '3');
    assert.equal(v.totalSuffix, ' / 8 clases');
    assert.equal(v.showBar, true);
    assert.equal(v.ratio, 3 / 8);
    assert.equal(v.legend, 'realizadas este período');
    assert.equal(v.topRightReserved, '2 reservadas');
    assert.equal(v.chip, null);
  });
  it('plan por cantidad sin próximas: no hay línea de reservadas', () => {
    assert.equal(vista(plan(8, 3, 0))!.topRightReserved, null);
  });
  it('plan ilimitado: SOLO el número (sin total ni barra), con chip y leyenda del mes', () => {
    const v = vista(plan(null, 0, 1))!;
    assert.equal(v.value, '0');
    assert.equal(v.totalSuffix, null);
    assert.equal(v.showBar, false);
    assert.equal(v.legend, 'clases realizadas este mes');
    assert.equal(v.chip, 'Plan ilimitado');
    assert.equal(v.topRightReserved, null);
    assert.equal(v.chipReserved, '1 reservada');
  });
  it('plan ilimitado sin próximas: el chip queda solo, sin "reservadas"', () => {
    assert.equal(vista(plan(null, 5, 0))!.chipReserved, null);
  });
  it('sin dato todavía: el número es "—" en ambos tipos', () => {
    assert.equal(vista(plan(8, null, null))!.value, '—');
    assert.equal(vista(plan(null, null, null))!.value, '—');
  });
  it('sin plan y cargando: no hay tarjeta ancha (compacta o esqueleto)', () => {
    assert.equal(monthlyCardParts({ kind: 'none' }), null);
    assert.equal(monthlyCardParts({ kind: 'loading' }), null);
  });
});

describe('Tarjeta "Progreso mensual" (MonthlyProgressCard.tsx, decisión (v))', () => {
  const card = readFileSync(new URL('../../artifacts/wodplace/components/home/MonthlyProgressCard.tsx', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../../artifacts/wodplace/components/home/HomeView.tsx', import.meta.url), 'utf8');
  const refined = card.slice(card.indexOf('export function MonthlyProgressCard('), card.indexOf('type Parameter0'));
  const view = (p: ReturnType<typeof plan>) => planProgressView({ hasActivePlan: true, planLoading: false, plan: p });

  it('es UNA sola versión: sin variantes, sin chips de variante ni de cobre, sin línea de depuración, y HomeView solo pasa la letra simulada', () => {
    assert.ok(!/ProgressVariant|PROGRESS_VARIANT|variant\b|ActualCard|PROGRESS_COPPER|CopperChoice|copperLook|CopperDebug/.test(card), 'restos de variantes en la tarjeta');
    assert.ok(home.includes('<MonthlyProgressCard view={planView} fontScale={progressFontScale} />'));
    assert.ok(!/progressVariant|progressCopper|ProgressVariant|PROGRESS_VARIANT|CopperChoice/.test(home), 'restos de variantes en HomeView');
    const dev = readFileSync(new URL('../../artifacts/wodplace/components/home/DevHomeScreen.tsx', import.meta.url), 'utf8');
    for (const label of ['Progreso: actual', 'Progreso: oscura', 'Progreso: clara', 'Progreso: cobre', 'Cobre: medio', 'Cobre: oscuro', 'Cobre: claro #C79A6B', 'Letra: oscura', 'Letra: clara']) assert.ok(!dev.includes(label), 'chip retirado: ' + label);
    assert.ok(dev.includes('Progreso, letra simulada: 1,3'), 'la letra simulada se mantiene');
    for (const gone of ['copperLook.ts', 'copperDebugText.ts', 'CopperDebugLine.tsx']) assert.ok(!existsSync(new URL('../../artifacts/wodplace/components/home/' + gone, import.meta.url)), gone + ' ya no existe');
  });
  it('los estados de prueba de la tarjeta siguen en la pantalla de desarrollo (por cantidad, ilimitado, sin plan, cargando, 0, completo, sobrepasado, 30 clases)', () => {
    const states = readFileSync(new URL('../../artifacts/wodplace/components/home/devHomeStates.ts', import.meta.url), 'utf8');
    for (const label of ['Sin plan', 'Cargando plan', 'Plan por cantidad', 'Plan ilimitado', '0 realizadas', 'completo', 'sobre el total', 'total de 30 clases']) assert.ok(states.includes(label), label);
  });
  it('usa solo tokens existentes (cobre claro, carbón, crema; sin hex escritos a mano en la tarjeta ni en progressColors.ts) y el radio de las otras tarjetas oscuras', () => {
    const colorsSrc = readFileSync(new URL('../../artifacts/wodplace/components/home/progressColors.ts', import.meta.url), 'utf8');
    for (const token of ['charcoalAccentLight', 'charcoal', 'nextClassCardForeground']) assert.ok(colorsSrc.includes('p.' + token), token);
    const code = (src: string) => src.split(String.fromCharCode(10)).filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*')).join(' ');
    assert.deepEqual(code(colorsSrc).match(/#[0-9A-Fa-f]{3,8}\b/g) ?? [], [], 'colores escritos a mano en progressColors.ts');
    const hexes = (code(refined).match(/#[0-9A-Fa-f]{3,8}\b/g) ?? []).filter((h) => h !== '#FFFFFF');
    assert.deepEqual(hexes, [], 'colores escritos a mano en la tarjeta');
    assert.ok(card.includes('borderRadius: RADIUS.xl'));
  });
  it('la barra mide 8 dp con extremos redondeados, es progressbar con valor y la tarjeta es UN grupo accesible; los adornos se ocultan', () => {
    assert.ok(card.includes('const BAR_H = 8;'));
    assert.ok(card.includes('borderRadius: BAR_H / 2'));
    assert.ok(card.includes('accessibilityRole="progressbar"'));
    assert.ok(card.includes('accessibilityValue={bar}'));
    assert.ok(refined.includes('accessible accessibilityLabel={label}'));
    assert.ok(refined.includes('importantForAccessibility="no-hide-descendants"'));
    assert.ok(!/onPress|Pressable/.test(refined), 'la tarjeta no tiene interacción');
  });
  it('estado presionado inexistente y sin opacidad en la tarjeta nueva', () => {
    for (const line of refined.split(String.fromCharCode(10))) assert.ok(!/opacity/i.test(line.replace(/shadowOpacity/g, '')), line);
  });
  it('el alto medido es solo de desarrollo y el evento se lee de forma sincrónica con readLayout', () => {
    assert.ok(refined.includes('const onCardLayout = __DEV__'));
    assert.ok(refined.includes('const m = readLayout(e);'));
    assert.ok(refined.includes('if (!m) return;'));
    assert.ok(refined.includes('{devBadge}'));
    assert.ok(refined.includes('const devBadge = __DEV__ ?'));
    assert.ok(!/e\.nativeEvent/.test(card));
  });
  it('los textos de la tarjeta respetan la letra del sistema (tope 1,3) y no se cortan con "…"', () => {
    assert.ok(!/numberOfLines|ellipsizeMode/.test(refined));
    assert.ok(card.includes('const MAX_MULT = 1.3;'));
    assert.equal((refined.match(/<Text/g) ?? []).length, (refined.match(/maxFontSizeMultiplier=\{MAX_MULT\}/g) ?? []).length + 2, 'todos los Text, salvo el "/ M clases" anidado y la etiqueta de desarrollo, llevan el tope');
  });

  it('frase para lectores de pantalla: por cantidad', () => {
    assert.equal(monthlyProgressA11yLabel(view(plan(12, 4, 1))), 'Progreso mensual: 4 de 12 clases realizadas, 1 reservada');
    assert.equal(monthlyProgressA11yLabel(view(plan(12, 4, 0))), 'Progreso mensual: 4 de 12 clases realizadas');
    assert.equal(monthlyProgressA11yLabel(view(plan(12, 0, 3))), 'Progreso mensual: 0 de 12 clases realizadas, 3 reservadas');
    assert.equal(monthlyProgressA11yLabel(view(plan(8, 1, 0))), 'Progreso mensual: 1 de 8 clases realizadas');
    assert.equal(monthlyProgressA11yLabel(view(plan(8, null, null))), 'Progreso mensual: aún sin dato de clases realizadas, de 8 clases');
  });
  it('frase para lectores de pantalla: ilimitado', () => {
    assert.equal(monthlyProgressA11yLabel(view(plan(null, 4, 1))), 'Plan ilimitado: 4 clases realizadas este mes, 1 reservada');
    assert.equal(monthlyProgressA11yLabel(view(plan(null, 1, 0))), 'Plan ilimitado: 1 clase realizada este mes');
    assert.equal(monthlyProgressA11yLabel(view(plan(null, 4, 0, 90))), 'Plan ilimitado: 4 clases realizadas este período');
    assert.equal(monthlyProgressA11yLabel(view(plan(null, null, 2))), 'Plan ilimitado: aún sin dato de clases realizadas, 2 reservadas');
  });
  it('sin plan y cargando no tienen frase de plan', () => {
    assert.equal(monthlyProgressA11yLabel({ kind: 'none' }), null);
    assert.equal(monthlyProgressA11yLabel({ kind: 'loading' }), null);
  });
  it('valor de la barra: mínimo 0, máximo el total, ahora = realizadas y NUNCA más que el total', () => {
    assert.deepEqual(monthlyProgressBarValue(view(plan(12, 4, 1))), { min: 0, max: 12, now: 4 });
    assert.deepEqual(monthlyProgressBarValue(view(plan(8, 0, 0))), { min: 0, max: 8, now: 0 });
    assert.deepEqual(monthlyProgressBarValue(view(plan(8, 8, 0))), { min: 0, max: 8, now: 8 });
    assert.deepEqual(monthlyProgressBarValue(view(plan(8, 11, 3))), { min: 0, max: 8, now: 8 });
    assert.deepEqual(monthlyProgressBarValue(view(plan(8, null, null))), { min: 0, max: 8, now: 0 });
    assert.equal(monthlyProgressBarValue(view(plan(null, 4, 0))), null);
  });
  it('la barra llena según las realizadas, con tope de 100 % (la lógica de planProgress no cambió)', () => {
    assert.equal(monthlyCardParts(view(plan(8, 0, 0)))!.ratio, 0);
    assert.equal(monthlyCardParts(view(plan(8, 8, 0)))!.ratio, 1);
    assert.equal(monthlyCardParts(view(plan(8, 11, 3)))!.ratio, 1);
    assert.equal(monthlyCardParts(view(plan(8, 11, 3)))!.topRightReserved, '3 reservadas');
    assert.equal(monthlyCardParts(view(plan(30, 24, 2)))!.totalSuffix, ' / 30 clases');
  });
});

describe('splitHighlight (resaltado final de la frase, opción C)', () => {
  const run = (f: string) => splitHighlight(f);
  const shown = (f: string) => {
    const r = run(f);
    return r.lead + r.mark + r.tail;
  };
  it('las 5 frases reales: resalta la cláusula final o las últimas palabras', () => {
    assert.equal(run('La constancia de hoy construye la fuerza de mañana.').mark, 'fuerza de mañana');
    assert.equal(run('Cada repetición cuenta cuando eliges seguir avanzando.').mark, 'seguir avanzando');
    assert.equal(run('Entrenar también es una forma de cuidar tu mente.').mark, 'cuidar tu mente');
    assert.equal(run('No necesitas hacerlo perfecto; necesitas volver a intentarlo.').mark, 'necesitas volver a intentarlo');
    assert.equal(run('Tu progreso se mide en disciplina, no en comparación.').mark, 'no en comparación');
  });
  it('sin marcado manual, lead + mark + tail es la frase tal cual', () => {
    for (const f of ['La constancia de hoy construye la fuerza de mañana.', '¿Listo para entrenar hoy con todo tu corazón?', 'Hoy lo logras']) {
      assert.equal(shown(f), f);
    }
  });
  it('la puntuación final queda fuera del resaltado', () => {
    assert.equal(run('Tu progreso se mide en disciplina, no en comparación.').tail, '.');
    assert.equal(run('¿Listo para entrenar hoy con todo tu corazón?').tail, '?');
  });
  it('(d) 1 a 3 palabras: sin resaltado', () => {
    for (const f of ['Vamos', 'Hoy sí', 'Hoy lo logras', '¡Vamos equipo!']) assert.equal(run(f).mark, '', f);
  });
  it('(a) no empieza con una palabra de relleno: se corre a la primera con contenido', () => {
    const r = run('Primero llegas, después te mueves; luego sigues, y al final celebras lo logrado');
    assert.equal(r.mark, 'final celebras lo logrado');
    assert.ok(r.reason.includes('corrida'));
  });
  it('nunca termina en una palabra de relleno: no se resalta nada', () => {
    assert.equal(run('Esto es justo lo que hemos venido a buscar con').mark, '');
    assert.equal(run('Nadie te regala el esfuerzo que haces por').mark, '');
  });
  it('(b)(c) largo mínimo: sin 2 palabras de contenido y 8 letras (o 1 de 6 tras pausa) no se resalta nada', () => {
    assert.equal(run('Respira y vuelve a empezar').mark, '');
    assert.equal(run('Hoy toca esforzarse más, para la meta').mark, '');
    assert.equal(run('Entrena con ganas, siempre').mark, '');
  });
  it('sin puntuación y con signos ¿ ¡ « »', () => {
    assert.equal(run('sin puntuacion alguna en esta frase de ejemplo para probar').mark, 'ejemplo para probar');
    assert.equal(run('¡Hoy es un gran día para volver a empezar!').mark, 'volver a empezar');
    assert.equal(run('«Cada día cuenta», dice el entrenador al llegar la mañana').mark, 'llegar la mañana');
  });
  it('frase muy larga: como máximo 4 palabras y nunca más de la mitad', () => {
    const f = 'Cada mañana que llegas al box y eliges entrenar aunque no tengas ganas, estás construyendo una versión más fuerte, más paciente y más constante de ti, y eso vale más que cualquier marca.';
    const r = run(f);
    assert.equal(r.mark, 'más que cualquier marca');
    assert.ok(r.mark.split(' ').length <= f.split(' ').length / 2);
  });
  it('(e) marcado manual *así*: se resalta exactamente ese fragmento y se quitan los asteriscos', () => {
    const r = run('Tu constancia es *tu mejor entrenamiento* siempre.');
    assert.deepEqual([r.lead, r.mark, r.tail], ['Tu constancia es ', 'tu mejor entrenamiento', ' siempre.']);
    assert.ok(!shown('Tu constancia es *tu mejor entrenamiento* siempre.').includes('*'));
  });
  it('(e) el marcado manual tiene prioridad (también en frases de 3 palabras o con relleno)', () => {
    assert.equal(run('Sigue *con todo*').mark, 'con todo');
    assert.equal(run('*Respira hondo* y sigue adelante con calma.').lead, '');
  });
  it('(e) "~" al comienzo: sin resaltado y sin la marca', () => {
    const r = run('~La constancia de hoy construye la fuerza de mañana.');
    assert.equal(r.mark, '');
    assert.equal(r.lead + r.tail, 'La constancia de hoy construye la fuerza de mañana.');
  });
  it('(e) asteriscos mal cerrados o vacíos: nunca se muestran y se aplican las reglas automáticas', () => {
    for (const f of ['Tu constancia es *tu mejor entrenamiento siempre.', 'Tu constancia ** es tu mejor entrenamiento siempre.']) {
      assert.ok(!shown(f).includes('*'), f);
      assert.equal(run(f).mark, 'entrenamiento siempre');
    }
  });
  it('con una cifra cuenta como palabra de contenido', () => {
    assert.equal(run('Hazlo todos los días durante 30 minutos').mark, '30 minutos');
  });
});

describe('tarjeta de frases del día (DailyQuoteCard.tsx)', () => {
  const quote = readFileSync(new URL('../../artifacts/wodplace/components/home/DailyQuoteCard.tsx', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../../artifacts/wodplace/components/home/HomeView.tsx', import.meta.url), 'utf8');
  const editorial = quote.slice(quote.indexOf('function EditorialQuote('), quote.indexOf('const styles = StyleSheet.create'));
  const actual = quote.slice(quote.indexOf('function ActualQuote('), quote.indexOf('/** Siluetas de montañas'));
  it('la editorial (C) es la variante por defecto y HomeView la recibe de UNA constante', () => {
    assert.ok(quote.includes("export const QUOTE_VARIANT: QuoteVariant = 'editorialCream';"));
    assert.ok(home.includes('quoteLook = QUOTE_LOOK'));
    assert.ok(home.includes('<DailyQuoteCard quote={quote} onShare={events.onShareQuote} look={quoteLook} />'));
  });
  it('las variantes A y B y la itálica de Inter se retiraron', () => {
    assert.ok(!/minimalCream|minimalDark|Inter_500Medium_Italic|expo-font|quoteDark/.test(quote));
    assert.ok(quote.includes("export type QuoteVariant = 'actual' | 'editorialCream';"));
  });
  it('el botón de compartir sigue llamando a su evento, tiene 48 × 48 dp y su presionado es de color sólido', () => {
    assert.ok(actual.includes('onPress={onShare}'));
    assert.ok(editorial.includes('onPress={onShare}'));
    assert.ok(editorial.includes('accessibilityLabel="Compartir frase"'));
    assert.match(quote, /const SHARE_AREA = 48;/);
    assert.ok(editorial.includes('pressed && { backgroundColor: colors.nextClassCardPressed }'), 'círculo SÓLIDO solo al presionar');
    assert.ok(!editorial.includes('glassBackground'), 'sin disco visible en reposo');
    assert.ok(editorial.includes('size={SHARE_ICON} color={cream}'), 'ícono crema del mismo tamaño');
    for (const line of quote.split(String.fromCharCode(10))) assert.ok(!(/pressed/i.test(line) && /opacity/i.test(line)), line);
  });
  it('la flecha ya no existe en la editorial (solo la actual conserva su chevron)', () => {
    assert.ok(!editorial.includes('chevron'));
    assert.ok(actual.includes('chevron-right'));
  });
  it('los adornos (montañas, comillas) van en Views con pointerEvents none y ocultos; ningún Text lleva pointerEvents', () => {
    assert.ok(editorial.includes("pointerEvents: 'none', importantForAccessibility: 'no-hide-descendants', accessibilityElementsHidden: true"));
    assert.ok((editorial.match(/\{\.\.\.hidden\}/g) ?? []).length >= 3, 'capas, comilla de apertura y de cierre');
    assert.doesNotMatch(quote, /<Text[^>]*pointerEvents=/);
  });
  it('tamaño: 113 dp como mínimo (3 líneas de 27 + 2 × 15 + 2 de borde), igual para las frases cortas y medianas, que se centran; sin texto fantasma; solo crece, sin "…"', () => {
    assert.match(quote, /export const EDITORIAL_MIN_LINES = 3;/);
    assert.match(quote, /const PAD_V = 15;/);
    assert.match(quote, /const TEXT_LINE = 27;/);
    assert.ok(quote.includes('export const EDITORIAL_MIN_H = EDITORIAL_MIN_LINES * TEXT_LINE + 2 * PAD_V + 2;')); // 3 × 27 + 30 + 2 = 113
    assert.ok(quote.includes("minHeight: EDITORIAL_MIN_H, justifyContent: 'center'"));
    assert.ok(quote.includes("textSlot: { justifyContent: 'center' }"));
    assert.ok(!/ghost|Ghost|fantasma|LONGEST_REAL_QUOTE|FIXED_HEIGHT/.test(quote), 'el texto fantasma se retiró');
    assert.ok(!editorial.includes('numberOfLines'), 'nunca se corta con "…"');
    assert.match(quote, /export const EDITORIAL_MAX_H = 214;/);
  });
  it('el tope de crecimiento de la letra sale de una sola constante y se usa en el texto', () => {
    assert.match(quote, /export const QUOTE_MAX_FONT_MULT = 1\.3;/);
    assert.ok(editorial.includes('maxFontSizeMultiplier={QUOTE_MAX_FONT_MULT}'));
  });
  it('el texto de depuración con el alto medido solo existe en __DEV__', () => {
    assert.ok(editorial.includes('{__DEV__ ? ('));
    assert.ok(editorial.includes('Alto: '));
  });
  it('el resaltado por defecto es TEXTO COBRE claro (excepción aceptada al contraste); el marcador (con texto oscuro) y el subrayado quedan para comparar, medidos por línea y dibujado DEBAJO del texto; sin marcas manuales en el texto mostrado', () => {
    assert.ok(quote.includes("const style = look.highlightStyle ?? 'cobre';"));
    assert.ok(editorial.includes('color: colors.charcoalAccentLight,'), 'texto cobre claro');
    assert.ok(editorial.includes('__DEV__ && look.highlightShadow'), 'la sombra del resaltado solo existe en desarrollo');
    assert.ok(editorial.includes('textShadowRadius: 3'));
    assert.ok(editorial.includes('backgroundColor: colors.charcoalAccentLight'));
    assert.ok(editorial.includes('{ color: colors.charcoal }'), 'texto oscuro sobre el marcador');
    assert.match(quote, /const MARKER_PAD_H = 4;/);
    assert.match(quote, /const MARKER_PAD_V = 2;/);
    assert.match(quote, /const MARKER_R = 4;/);
    assert.ok(editorial.includes('onTextLayout'));
    assert.ok(editorial.includes('styles.marker'));
    assert.ok(!/<Text[^>]*backgroundColor/.test(editorial), 'nunca backgroundColor en un Text');
    assert.ok(quote.includes('displayText(quote)'));
    assert.match(quote, /export type QuoteHighlight = 'marcador' \| 'cobre' \| 'subrayado';/);
  });
  it('el fondo es la foto en grises con un velo oscuro UNIFORME del 62 % (una constante, sin degradado) y texto crema', () => {
    assert.ok(quote.includes("require('@/assets/images/home/home-fondo-frase.jpg')"));
    assert.match(quote, /export const QUOTE_VEIL = 0\.62;/);
    assert.ok(editorial.includes('opacity: QUOTE_VEIL'));
    assert.ok(!/LinearGradient/.test(editorial), 'ningún degradado en la editorial');
    assert.ok(editorial.includes('colors.nextClassCardForeground'));
  });
  it('las dos comillas llevan el MISMO color y la MISMA opacidad', () => {
    assert.match(quote, /const QUOTE_MARK_OPACITY = 0\.5;/);
    assert.ok(editorial.includes('const markColor = colors.charcoalAccentLight;'));
    assert.equal((editorial.match(/opacity: QUOTE_MARK_OPACITY/g) ?? []).length, 2);
    assert.equal((editorial.match(/color=\{markColor\}/g) ?? []).length, 2);
  });
  it('la fuente editorial sale de una sola constante', () => {
    assert.ok(quote.includes("export const EDITORIAL_FONT: string = Platform.select({ android: 'serif', default: 'Georgia' });"));
    assert.ok(quote.includes('fontFamily: EDITORIAL_FONT'));
  });
  it('solo hay comillas dobles dibujadas con react-native-svg (apertura de 30 dp y cierre de 18 dp); el glifo y la comilla simple se retiraron', () => {
    assert.ok(!quote.includes('QuoteMark'));
    assert.ok(!quote.includes('styles.glyph'));
    assert.ok(quote.includes('function DrawnMark('));
    assert.ok(quote.includes("from 'react-native-svg'"));
    assert.match(quote, /const MARK_OPEN_H = 30;/);
    assert.match(quote, /const MARK_CLOSE_H = 18;/);
  });
});

describe('eventos de layout (onLayout / onTextLayout): se leen de forma sincrónica', () => {
  // Bug real (pedido 21, commit efa7b8c): setWidths((w) => ({ ...w, k: e.nativeEvent.layout.width })) leía el evento DENTRO del callback del setState, que
  // React ejecuta después de liberar el evento sintético: "This synthetic event is reused..." y "Cannot read property 'layout' of null" (solo en nativo).
  const findDeferredEventReads = (source: string): string[] => {
    const found: string[] = [];
    for (const line of source.split('\n')) {
      const at = line.indexOf('nativeEvent');
      if (at < 0) continue;
      const arrows = [...line.matchAll(/=>/g)].map((m) => m.index ?? 0);
      if (arrows.length >= 2 && arrows[1]! < at) found.push('segunda función dentro de la línea: ' + line.trim());
    }
    if (/(setTimeout|requestAnimationFrame|queueMicrotask|\.then)\s*\([\s\S]{0,300}?nativeEvent/.test(source)) found.push('nativeEvent dentro de setTimeout, requestAnimationFrame o una promesa');
    if (/set[A-Z]\w*\(\s*\(?\w*\)?\s*=>[\s\S]{0,200}?nativeEvent/.test(source)) found.push('nativeEvent dentro del callback de un setState');
    return found;
  };
  const walk = (dir: URL): URL[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
      d.isDirectory() ? (d.name === 'node_modules' ? [] : walk(new URL(d.name + '/', dir))) : /\.tsx?$/.test(d.name) ? [new URL(d.name, dir)] : [],
    );
  it('la prueba detecta el código con el bug (lectura diferida dentro de un setState con función)', () => {
    const buggy = "<Text onLayout={(e) => setWidths((w) => ({ ...w, a: e.nativeEvent.layout.width }))} />";
    assert.ok(findDeferredEventReads(buggy).length > 0);
    assert.ok(findDeferredEventReads("setTimeout(() => { setW(e.nativeEvent.layout.width); }, 0);").length > 0);
    assert.ok(findDeferredEventReads("const x = async (e) => { await p.then(() => e.nativeEvent.layout); }").length > 0);
    const ok = "<View onLayout={(e) => setW(e.nativeEvent.layout.width)} />";
    assert.deepEqual(findDeferredEventReads(ok), []);
  });
  it('ningún archivo de app/, components/ y context/ lee nativeEvent de forma diferida', () => {
    const root = new URL('../../artifacts/wodplace/', import.meta.url);
    for (const folder of ['app/', 'components/', 'context/']) {
      for (const file of walk(new URL(folder, root))) {
        const bad = findDeferredEventReads(readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
        assert.deepEqual(bad, [], file.pathname);
      }
    }
  });
  it('en components/home solo layoutEvents.ts toca nativeEvent: los manejadores copian los números con readLayout / readLines al comienzo', () => {
    const dir = new URL('../../artifacts/wodplace/components/home/', import.meta.url);
    for (const name of readdirSync(dir).filter((f) => /\.tsx?$/.test(f) && f !== 'layoutEvents.ts')) {
      const text = readFileSync(new URL(name, dir), 'utf8');
      assert.ok(!/e\.nativeEvent|event\.nativeEvent/.test(text), name + ' lee nativeEvent directamente: usa readLayout o readLines');
    }
    const card = readFileSync(new URL('DailyQuoteCard.tsx', dir), 'utf8');
    assert.ok(card.includes('const m = readLayout(e);'));
    assert.ok(card.includes('const next = readLines(e);'));
  });
  it('con un evento ya liberado, nulo o incompleto, readLayout y readLines devuelven null y NO lanzan', () => {
    for (const e of [null, undefined, {}, { nativeEvent: null }, { nativeEvent: {} }, { nativeEvent: { layout: null } }, { nativeEvent: { layout: { width: 10 } } }]) {
      assert.equal(readLayout(e), null);
    }
    for (const e of [null, undefined, {}, { nativeEvent: null }, { nativeEvent: { lines: null } }]) assert.equal(readLines(e), null);
  });
  it('con un evento válido copian los números', () => {
    assert.deepEqual(readLayout({ nativeEvent: { layout: { width: 320.5, height: 113 } } }), { width: 320.5, height: 113 });
    assert.deepEqual(readLines({ nativeEvent: { lines: [{ x: 1, y: 2, width: 3, height: 4, text: 'a' }] } }), [{ x: 1, y: 2, w: 3, h: 4, text: 'a' }]);
  });
  it('un evento que se anula después de leerlo no afecta lo ya copiado (simula la liberación del evento sintético)', () => {
    const ev: { nativeEvent: { layout: { width: number; height: number } } | null } = { nativeEvent: { layout: { width: 200, height: 50 } } };
    const m = readLayout(ev); // lectura sincrónica al comienzo
    ev.nativeEvent = null; // React libera el evento
    const later = () => m?.width; // el callback diferido usa el número copiado
    assert.equal(later(), 200);
    assert.equal(readLayout(ev), null);
  });
});

describe('Tarjeta "Progreso mensual": cobre claro con letra oscura (progressColors.ts, enmienda de la decisión (v))', () => {
  const colors = progressColors(light);
  const m = progressMeasure(colors);
  const r = (n: number) => Math.round(n * 100) / 100;

  it('la combinación activa cumple los mínimos: 4,5:1 texto (número, "Sin plan activo", título, leyenda, cápsula) y 3:1 gráficos (barra contra pista y contra el cobre, cápsula contra el cobre)', () => {
    assert.ok(progressPasses(m), JSON.stringify(m));
  });
  it('colores: fondo cobre claro #C79A6B (charcoalAccentLight), letra carbón (charcoal), cápsula de carbón con texto crema', () => {
    assert.equal(colors.background, light.charcoalAccentLight);
    assert.equal(colors.ink, light.charcoal);
    assert.equal(colors.fill, light.charcoal);
    assert.equal(colors.capsuleBg, light.charcoal);
    assert.equal(colors.capsuleText, light.nextClassCardForeground);
  });
  it('contrastes finales (números exactos)', () => {
    assert.equal(r(m.largeText), 7.56); // número y "Sin plan activo"
    assert.equal(r(m.smallText), 6.05); // título, total, leyenda, reservadas
    assert.equal(r(m.fillVsTrack), 4.69); // barra contra su pista
    assert.equal(r(m.fillVsCard), 7.56); // barra contra el cobre
    assert.equal(r(m.capsuleText), 17.08); // crema sobre carbón
    assert.equal(r(m.capsuleVsCard), 7.56); // cápsula contra el cobre
  });
  it('la tarjeta no gana interacción ni estado presionado', () => {
    const card = readFileSync(new URL('../../artifacts/wodplace/components/home/MonthlyProgressCard.tsx', import.meta.url), 'utf8');
    assert.ok(!/onPress|Pressable|pressed/i.test(card));
  });
});

describe('Tarjeta "Progreso mensual": estado sin plan (decisión (v), pedido 24)', () => {
  const card = readFileSync(new URL('../../artifacts/wodplace/components/home/MonthlyProgressCard.tsx', import.meta.url), 'utf8');
  const refined = card.slice(card.indexOf('export function MonthlyProgressCard('), card.indexOf('type Parameter0'));
  const none = refined.slice(refined.indexOf("if (view.kind === 'none' || !monthly) {"), refined.indexOf('const label = monthlyProgressA11yLabel'));

  it('el estado lo decide una función pura: cargando, sin plan, por cantidad o ilimitado (y cargando NUNCA es "sin plan")', () => {
    assert.equal(planProgressView({ hasActivePlan: true, planLoading: true, plan: null }).kind, 'loading');
    assert.equal(planProgressView({ hasActivePlan: true, planLoading: false, plan: null }).kind, 'none');
    assert.equal(planProgressView({ hasActivePlan: false, planLoading: false, plan: null }).kind, 'none');
    assert.equal(planProgressView({ hasActivePlan: true, planLoading: false, plan: plan(8, 3, 1) }).kind, 'classes');
    assert.equal(planProgressView({ hasActivePlan: true, planLoading: false, plan: plan(null, 3, 1) }).kind, 'unlimited');
    // con datos del plan ya llegados, "cargando" no cambia el resultado; sin datos y cargando, nunca "sin plan"
    assert.equal(planProgressView({ hasActivePlan: true, planLoading: true, plan: plan(8, 3, 1) }).kind, 'classes');
  });
  it('el esqueleto de cargando no dice "Sin plan activo" (ni la tarjeta con plan)', () => {
    const loading = refined.slice(refined.indexOf("if (view.kind === 'loading') {"), refined.indexOf("if (view.kind === 'none'"));
    assert.ok(loading.length > 100);
    assert.ok(!/Sin plan activo/.test(loading));
    assert.ok(!/Sin plan activo/.test(refined.slice(refined.indexOf('const label = monthlyProgressA11yLabel'))));
  });
  it('sin plan: título arriba, "Sin plan activo" centrado de 16 sp y peso medio, sin barra, pista, guion, reservadas ni cápsula', () => {
    assert.ok(none.includes('Progreso mensual') && none.includes('Sin plan activo'));
    assert.ok(card.includes('const NONE_SIZE = 16;'));
    assert.ok(card.includes("noneText: { fontFamily: 'Inter_500Medium', textAlign: 'center' }"));
    assert.ok(card.includes("noneMessage: { marginTop: SPACING.xs, alignItems: 'center', justifyContent: 'center' }"));
    for (const banned of ['progressbar', 'styles.track', 'styles.fill', 'styles.capsule', 'reserved', '—', 'Skeleton', 'accessibilityValue']) assert.ok(!none.includes(banned), banned);
  });
  it('sin plan: un solo grupo accesible con la frase "Progreso mensual: sin plan activo" y tope de letra 1,3 sin "…"', () => {
    assert.ok(none.includes('accessible accessibilityLabel="Progreso mensual: sin plan activo"'));
    assert.ok(none.includes('importantForAccessibility="no-hide-descendants"'));
    assert.ok(!/numberOfLines|ellipsizeMode/.test(none));
    assert.equal((none.match(/<Text/g) ?? []).length, (none.match(/maxFontSizeMultiplier=\{MAX_MULT\}/g) ?? []).length);
  });
  it('alto: relleno de 12 arriba y abajo + título + hueco de 2 + mensaje de 24 dp (≈ 64 dp con letra 1,0; antes 70) y crece con la letra, nunca queda más alto que antes', () => {
    const SMALL = 12, GAP = 2, MSG = 24, PADV = 12;
    const height = (fs: number) => PADV * 2 + Math.round(SMALL * 1.2 * fs) + GAP + Math.max(MSG * fs, Math.round(16 * 1.2 * fs));
    const before = (fs: number) => 12 * 2 + Math.round(12 * 1.2 * fs) + 8 + Math.round(26 * fs); // sin plan de antes (70 / 75 / 83 medidos)
    for (const fs of [1, 1.1, 1.3]) assert.ok(height(fs) <= before(fs), `letra ${fs}: ${height(fs)} <= ${before(fs)}`);
    assert.ok(card.includes('const NONE_MESSAGE_MIN_H = 24;') && card.includes('{ paddingVertical: SPACING.lg }'));
  });
});

// ───────────── Recuadros "Tu nivel" y "Racha de constancia" (decisión (w), opción E en grafito, pedido 26) ─────────────
describe('Recuadros "Tu nivel" y "Racha de constancia": estado de la racha (función pura: cargando, error, vacío, con racha)', () => {
  it('cargando: esqueleto, NUNCA "0 / Empieza hoy" (sin estado explícito, null = cargando, como antes)', () => {
    assert.deepEqual(streakView(null), { kind: 'loading' });
    assert.deepEqual(streakView(null, 'loading'), { kind: 'loading' });
    assert.equal(streakA11yLabel(streakView(null)), 'Racha de constancia: cargando');
  });
  it('error: guion, ni esqueleto ni "Empieza hoy", y la frase "sin datos"', () => {
    const v = streakView(null, 'error');
    assert.deepEqual(v, { kind: 'error' });
    assert.equal(streakA11yLabel(v), 'Racha de constancia: sin datos');
    assert.equal(STREAK_NO_DATA, '—');
    assert.notEqual(v.kind, 'loading');
    assert.notEqual(v.kind, 'empty');
  });
  it('racha 0, vacía o no válida: estado vacío ("Empieza hoy"), 0 indicadores pintados', () => {
    for (const stats of [{ currentStreakDays: 0 }, {}, { currentStreakDays: null }, { currentStreakDays: -3 }, { currentStreakDays: Number.NaN }]) {
      assert.deepEqual(streakView(stats), { kind: 'empty' });
      assert.deepEqual(streakView(stats, 'ready'), { kind: 'empty' });
    }
    assert.equal(streakA11yLabel({ kind: 'empty' }), 'Racha de constancia: empieza hoy');
  });
  it('con racha: los primeros N indicadores pintados, N = min(días, 7); con 7 o más, los siete llenos y el número real', () => {
    assert.deepEqual(streakView({ currentStreakDays: 1 }), { kind: 'streak', days: 1, filled: 1 });
    assert.deepEqual(streakView({ currentStreakDays: 3 }, 'ready'), { kind: 'streak', days: 3, filled: 3 });
    assert.deepEqual(streakView({ currentStreakDays: 7 }), { kind: 'streak', days: 7, filled: 7 });
    assert.deepEqual(streakView({ currentStreakDays: 12 }), { kind: 'streak', days: 12, filled: 7 });
    assert.deepEqual(streakView({ currentStreakDays: 128 }), { kind: 'streak', days: 128, filled: STREAK_DOTS });
    assert.equal(STREAK_DOTS, 7);
  });
  it('el estado explícito manda sobre los datos (un error no se confunde con "Empieza hoy")', () => {
    assert.deepEqual(streakView({ currentStreakDays: 5 }, 'error'), { kind: 'error' });
    assert.deepEqual(streakView({ currentStreakDays: 5 }, 'loading'), { kind: 'loading' });
  });
  it('textos: "1 día seguido" / "N días seguidos" y la frase para lectores de pantalla (los siete indicadores no se leen sueltos)', () => {
    assert.equal(streakSuffix(1), 'día seguido');
    assert.equal(streakSuffix(3), 'días seguidos');
    assert.equal(streakA11yLabel(streakView({ currentStreakDays: 3 })), 'Racha de constancia: 3 días seguidos');
    assert.equal(streakA11yLabel(streakView({ currentStreakDays: 1 })), 'Racha de constancia: 1 día seguido');
    assert.equal(streakA11yLabel(streakView({ currentStreakDays: 128 })), 'Racha de constancia: 128 días seguidos');
  });
  it('streakStatusFrom (lo que app/home.tsx ya sabe de la consulta): con datos = lista (aunque un refresco falle), sin datos y con error = error, sin datos ni error = cargando', () => {
    assert.equal(streakStatusFrom({ data: undefined, isError: false }), 'loading');
    assert.equal(streakStatusFrom({ data: undefined, isError: true }), 'error');
    assert.equal(streakStatusFrom({ data: { stats: {} }, isError: false }), 'ready');
    assert.equal(streakStatusFrom({ data: { stats: {} }, isError: true }), 'ready');
    // Los tres estados, de punta a punta: con error de red la tarjeta muestra el estado error y no se queda en el esqueleto.
    assert.equal(streakView(null, streakStatusFrom({ data: undefined, isError: true })).kind, 'error');
    assert.equal(streakView(null, streakStatusFrom({ data: undefined, isError: false })).kind, 'loading');
    assert.equal(streakView({ currentStreakDays: 4 }, streakStatusFrom({ data: { stats: {} }, isError: false })).kind, 'streak');
  });
});

describe('Recuadros "Tu nivel" y "Racha de constancia": rango', () => {
  it('los 6 valores y su texto exacto (el más largo es "Beginner")', () => {
    assert.deepEqual(SKILL_LEVEL_LABELS, { beginner: 'Beginner', rookie: 'Rookie', scaled: 'Scaled', master: 'Master', rx: 'RX', elite: 'Elite' });
    assert.equal(Math.max(...Object.values(SKILL_LEVEL_LABELS).map((l) => l.length)), 'Beginner'.length);
  });
  it('valores conocidos, desconocidos tal cual y vacío = "Sin rango"', () => {
    assert.equal(levelText(levelView('rx')), 'RX');
    assert.equal(levelText(levelView('experto')), 'experto');
    assert.equal(levelText(levelView('')), NO_RANK_LABEL);
    assert.equal(levelText(levelView(undefined)), NO_RANK_LABEL);
  });
  it('frase accesible: "Tu nivel: Beginner. Sigue avanzando"', () => {
    assert.equal(levelA11yLabel(levelView('beginner')), 'Tu nivel: Beginner. Sigue avanzando');
    assert.equal(LEVEL_DETAIL, 'Sigue avanzando');
  });
  it('tamaño por tramos según el largo (sin adjustsFontSizeToFit): hasta 6 letras completo (22), 7 a 9 un tramo menos (18), 10 o más otro (15)', () => {
    for (const l of ['RX', 'Elite', 'Rookie', 'Scaled', 'Master']) assert.equal(rankFontSize(l, 22), 22, l);
    assert.equal(rankFontSize('Beginner', 22), 18);
    assert.equal(rankFontSize(NO_RANK_LABEL, 22), 18);
    assert.equal(rankFontSize('Experimentado', 22), 15);
  });
  it('la copia de SKILL_LEVEL_LABELS salió de HomeView (que ya no la declara) y el componente nuevo no importa valores de la librería de la API', () => {
    const home = readFileSync(new URL('../../artifacts/wodplace/components/home/HomeView.tsx', import.meta.url), 'utf8');
    assert.ok(!home.includes('SKILL_LEVEL_LABELS'));
    const model = readFileSync(new URL('../../artifacts/wodplace/components/home/levelStreakModel.ts', import.meta.url), 'utf8');
    assert.ok(model.includes('DEBE MANTENERSE IGUAL'));
    for (const f of ['levelStreakModel.ts', 'LevelStreakCards.tsx', 'levelStreakColors.ts']) {
      const src = readFileSync(new URL('../../artifacts/wodplace/components/home/' + f, import.meta.url), 'utf8');
      assert.ok(!new RegExp('^import (?!type)[^\\n]*' + '@workspace/' + ['api', 'client', 'react'].join('-'), 'm').test(src), f + ' importa valores de la API');
    }
  });
});

describe('Recuadros "Tu nivel" y "Racha de constancia": colores y contraste (grafito: crema, gris cálido, cobre)', () => {
  const r = (n: number) => Math.round(n * 100) / 100;
  const g = levelStreakColors(light);
  const m = levelStreakMeasure(g);

  it('cumple los mínimos (4,5:1 texto y 3:1 gráficos) y son tokens existentes', () => {
    assert.ok(levelStreakPasses(m), JSON.stringify(m));
    assert.equal(g.background, light.nextClassCard);
    assert.equal(g.primary, light.nextClassCardForeground);
    assert.equal(g.secondary, light.charcoalMuted);
    assert.equal(g.badgeBorder, light.charcoalAccent);
    assert.equal(g.icon, light.charcoalAccent);
    assert.equal(g.dotFilled, light.charcoalAccent);
    assert.equal(g.dotOutline, light.charcoalMuted);
  });
  it('números exactos: crema/grafito 15,65; gris cálido/grafito 6,59; cobre de la insignia y de los completados 5,34; contorno de los pendientes 6,59', () => {
    assert.equal(r(m.primaryText), 15.65);
    assert.equal(r(m.secondaryText), 6.59);
    assert.equal(r(m.badgeBorder), 5.34);
    assert.equal(r(m.dotFilled), 5.34);
    assert.equal(r(m.dotOutline), 6.59);
    assert.ok(m.badgeBorder >= 3 && m.dotOutline >= 3, 'cobre de la insignia y contorno de los pendientes >= 3:1');
  });
  it('el ícono de cobre sobre el relleno de carbón de la insignia pasa 3:1', () => {
    assert.ok(m.iconVsBadge >= 3, String(m.iconVsBadge));
  });
  it('el presionado es un color SÓLIDO (sin opacidad) y los textos siguen sobre 4,5:1', () => {
    assert.equal(g.pressed, light.nextClassCardPressed);
    assert.match(g.pressed, /^#[0-9a-f]{6}$/i);
    assert.ok(m.primaryPressed >= 4.5 && m.secondaryPressed >= 4.5);
  });
});

describe('Recuadros "Tu nivel" y "Racha de constancia" (LevelStreakCards.tsx): un solo diseño, toques, accesibilidad y sin código muerto', () => {
  const src = readFileSync(new URL('../../artifacts/wodplace/components/home/LevelStreakCards.tsx', import.meta.url), 'utf8');
  const colorsSrc = readFileSync(new URL('../../artifacts/wodplace/components/home/levelStreakColors.ts', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../../artifacts/wodplace/components/home/HomeView.tsx', import.meta.url), 'utf8');
  const dev = readFileSync(new URL('../../artifacts/wodplace/components/home/DevHomeScreen.tsx', import.meta.url), 'utf8');

  it('E grafito con Anton es el ÚNICO diseño: no quedan el diseño anterior, la opción C, el tratamiento cobre, Inter Bold ni los chips de diseño/tratamiento/tipografía', () => {
    for (const word of ['ActualCards', 'UnifiedCard', 'CircleIcon', "'cobre'", 'Tone', 'valueFont', 'ValueFont', 'Inter_700Bold', 'LEVEL_STREAK_LOOK', 'LevelStreakLook']) {
      assert.ok(!src.includes(word) && !colorsSrc.includes(word), 'queda: ' + word);
      if (word !== "'cobre'" && word !== 'Inter_700Bold') assert.ok(!dev.includes(word) && !home.includes(word), 'queda fuera del componente: ' + word);
    }
    for (const chip of ['Nivel y racha: diseño', 'Nivel y racha: tratamiento', 'Nivel y racha: tipografía', 'Tipografía: Inter Bold']) assert.ok(!dev.includes(chip), 'queda el chip: ' + chip);
    assert.ok(!home.includes('twoColumnRow') && !home.includes('statsCard:'), 'estilos del diseño anterior sin uso');
    assert.ok(src.includes("fontFamily: 'Anton_400Regular'"));
  });
  it('se conservan en desarrollo los chips de ancho y de letra simulados, y los estados de rango y de racha (incluidos cargando y error)', () => {
    assert.ok(dev.includes('Nivel y racha, ancho: 320') && dev.includes('Nivel y racha, letra simulada: 1,3'));
    const states = readFileSync(new URL('../../artifacts/wodplace/components/home/devHomeStates.ts', import.meta.url), 'utf8');
    for (const label of ['Racha 0', 'Racha 1', 'Racha 3', 'Racha 7', 'Racha 12', 'Racha 100', 'Racha 128', 'Cargando racha', 'Error en la racha', 'Sin rango']) assert.ok(states.includes(`'${label}'`), label);
    assert.ok(states.includes("d.streakStatus = 'error'") && states.includes("d.streakStatus = 'loading'"));
  });
  it('sin código muerto: cada función y constante del componente se usa, y cada color de levelStreakColors se lee en el componente', () => {
    const decls = [...src.matchAll(/^(?:export )?(?:function|const) (\w+)/gm)].map((x) => x[1]);
    assert.ok(decls.length >= 10);
    for (const name of decls.filter((d) => d !== 'LevelStreakCards')) assert.ok((src.match(new RegExp('\\b' + name + '\\b', 'g')) ?? []).length >= 2, 'sin uso: ' + name);
    const fields = [...colorsSrc.slice(colorsSrc.indexOf('export type LevelStreakColors'), colorsSrc.indexOf('export function levelStreakColors')).matchAll(/^  (\w+): string;/gm)].map((x) => x[1]);
    assert.ok(fields.length >= 10);
    for (const f of fields) assert.ok(new RegExp('\\bc\\.' + f + '\\b').test(src), 'color sin uso: ' + f);
  });
  it('HomeView solo delega: pasa el rango, los datos, el estado de la consulta y el toque de "Tu nivel"', () => {
    assert.ok(home.includes('<LevelStreakCards'));
    assert.ok(home.includes('streakStatus={streakStatus}'));
    assert.ok(home.includes('onOpenProfile={() => events.onOpenProfile()}'));
    assert.ok(!/^\s*Racha de constancia\s*$/m.test(home), 'el recuadro ya no está duplicado en HomeView');
  });
  it('"Tu nivel" es un botón con presionado SÓLIDO, su frase y la flecha discreta; "Racha de constancia" NO es un botón (sin onPress, sin rol de botón, sin presionado)', () => {
    assert.equal((src.match(/accessibilityRole="button"/g) ?? []).length, 1);
    assert.equal((src.match(/<Pressable/g) ?? []).length, 1);
    assert.ok(src.includes('accessibilityLabel={levelA11yLabel(level)}'));
    assert.ok(src.includes('onPress={onOpenProfile}'));
    assert.ok(src.includes('accessible accessibilityLabel={streakA11yLabel(streak)}'));
    assert.ok(/pressed \? c\.pressed/.test(src));
    assert.ok(src.includes('name="chevron-right"'));
    assert.ok(!/opacity/.test(src.replace(/shadowOpacity/g, '')), 'sin opacidad (ni para el presionado)');
  });
  it('insignias, esquinas, flecha y los siete indicadores: ocultos a lectores de pantalla y en contenedores con pointerEvents="none" (nunca en un Text)', () => {
    assert.ok(src.includes('function ShieldBadge') && src.includes('function CornerDetails') && src.includes('function StreakDots'));
    assert.ok((src.match(/pointerEvents="none"/g) ?? []).length >= 5);
    assert.ok(!/<Text[^>]*pointerEvents/.test(src), 'pointerEvents en un Text');
    assert.ok((src.match(/importantForAccessibility="no-hide-descendants"/g) ?? []).length >= 7);
  });
  it('la insignia se dibuja con react-native-svg (Path); el rango no usa adjustsFontSizeToFit y se corta sin "…"', () => {
    assert.ok(src.includes("import Svg, { Path } from 'react-native-svg';"));
    assert.ok(!/^\s*adjustsFontSizeToFit/m.test(src), 'el rango usa adjustsFontSizeToFit');
    assert.ok(src.includes('rankFontSize(text, VALUE)'));
    assert.ok(src.includes('numberOfLines={1}') && src.includes('ellipsizeMode="clip"'));
  });
  it('estado error: guion con los siete indicadores vacíos, sin "Empieza hoy" ni esqueleto', () => {
    const value = src.slice(src.indexOf('function StreakValue'), src.indexOf('/** Siete indicadores'));
    assert.ok(value.indexOf("streak.kind === 'error'") > value.indexOf("streak.kind === 'loading'"));
    assert.ok(value.includes('STREAK_NO_DATA'));
    assert.ok(src.includes("const filled = streak.kind === 'streak' ? streak.filled : 0;"));
    assert.ok(src.includes('Racha de constancia\n'));
  });
  it('modo compacto con letra grande (insignia chica, etiqueta bajo la insignia, "días seguidos" en su línea) desde la letra efectiva 1,15', () => {
    assert.equal(COMPACT_SCALE, 1.15);
    assert.ok(src.includes('fs * Math.min(systemScale, MAX_MULT) > COMPACT_SCALE'));
    assert.ok(src.includes('SHIELD_COMPACT'));
  });
  it('el texto chico mide 12 sp (mínimo de Inicio: 11) y no hay hex escritos a mano salvo la etiqueta de desarrollo', () => {
    assert.ok(src.includes('const LABEL = FONT_SIZE.sm;'));
    const code = src.split(String.fromCharCode(10)).filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*'));
    const hexes = (code.join(' ').match(/#[0-9A-Fa-f]{3,8}\b/g) ?? []).filter((h) => h !== '#FFFFFF');
    assert.deepEqual(hexes, []);
  });
  it('la lectura del alto usa readLayout (sincrónica) y solo en desarrollo', () => {
    assert.ok(src.includes("import { readLayout } from '@/components/home/layoutEvents';"));
    assert.ok(src.includes('__DEV__'));
    assert.ok(src.indexOf('readLayout(e)') < src.indexOf('setBoxH(height)'));
  });
});
