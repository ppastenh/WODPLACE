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
  it('sin plan activo: "—" y "Sin plan activo" (tenga o no datos de plan)', () => {
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
  const refined = card.slice(card.indexOf('function RefinedCard('), card.indexOf('/** El diseño anterior'));
  const view = (p: ReturnType<typeof plan>) => planProgressView({ hasActivePlan: true, planLoading: false, plan: p });

  it('la oscura es la variante por defecto, HomeView la recibe de UNA constante y existe el chip de desarrollo', () => {
    assert.ok(card.includes("export const PROGRESS_VARIANT: ProgressVariant = 'oscura';"));
    assert.ok(card.includes("export type ProgressVariant = 'actual' | 'oscura' | 'clara';"));
    assert.ok(home.includes('progressVariant = PROGRESS_VARIANT'));
    assert.ok(home.includes('<MonthlyProgressCard view={planView} variant={progressVariant}'));
    const dev = readFileSync(new URL('../../artifacts/wodplace/components/home/DevHomeScreen.tsx', import.meta.url), 'utf8');
    for (const label of ['Progreso: actual', 'Progreso: oscura', 'Progreso: clara']) assert.ok(dev.includes(label), label);
  });
  it('usa tokens existentes de la tarjeta oscura (sin colores nuevos ni hex escritos a mano) y el radio de las otras tarjetas oscuras', () => {
    for (const token of ['nextClassCard', 'nextClassCardForeground', 'charcoalMuted', 'charcoalAccentLight', 'nextClassCardPressed', 'glassBackground']) {
      assert.ok(card.includes('c.' + token), token);
    }
    const hexes = (card.slice(card.indexOf('function useLook('), card.indexOf('export function MonthlyProgressCard(')).split(String.fromCharCode(10)).filter((l) => !l.trim().startsWith('//')).join(' ').match(/#[0-9A-Fa-f]{3,8}\b/g) ?? []).filter((h) => h !== '#FFFFFF');
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
