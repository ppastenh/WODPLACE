/**
 * Pruebas automáticas de la lógica de Inicio (corredor integrado de Node, sin dependencias de prueba):
 *  - tarjeta de próxima clase: estado (cargando / con reserva / invitación) y línea del coach;
 *  - contraste de los textos de la tarjeta sobre su fondo en reposo y presionado (tokens de constants/colors.ts).
 *
 * Corre con: pnpm --filter @workspace/scripts test:home-logic
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import colorsModule from '../../artifacts/wodplace/constants/colors';
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
  it('la franja izquierda es decorativa (dentro de layers, sin Text), de 4 dp, y solo la lleva el estado sin reserva por defecto', () => {
    assert.match(source, /const STRIPE_W = 4;/);
    assert.ok(source.includes("stripe: { position: 'absolute', top: 0, left: 0, bottom: 0, width: STRIPE_W }"));
    const layers = source.slice(source.indexOf('<View pointerEvents="none" style={styles.layers}>'), source.indexOf('{children}'));
    assert.ok(layers.includes('styles.stripe'), 'la franja va dentro de las capas decorativas (recorte redondeado, sin pointerEvents en Text)');
    assert.ok(source.includes('<Frame pressed={pressed} texture={look.texture} stripe={copper}>'), 'sin reserva: franja');
    assert.ok(source.includes("stripe={look.stripe === 'both' ? copper : null}"), 'con reserva: solo si el chip de desarrollo lo pide');
    assert.ok(!source.includes('<Frame pressed={false} texture={look.texture} stripe'), 'el esqueleto no lleva franja');
  });
  it('las barras // son decorativas (View pointerEvents none, ocultas), de extremos rectos, y salen por defecto', () => {
    const bars = source.slice(source.indexOf('function Bars('), source.indexOf('function Arrow('));
    assert.ok(bars.includes('<View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={styles.bars}>'));
    assert.ok(bars.includes('strokeLinecap="butt"'));
    assert.ok(!/<Text/.test(bars));
    assert.ok(source.includes('look.bars !== false'), 'por defecto sí');
    assert.match(source, /const BARS_STROKE = 2.5;/);
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
    for (const name of ['NextClassCard.tsx', 'HomeView.tsx', 'DevHomeScreen.tsx']) {
      const text = readFileSync(new URL(`../../artifacts/wodplace/components/home/${name}`, import.meta.url), 'utf8');
      for (const m of text.matchAll(/require\('@\/assets\/images\/home\/([^']+)'\)/g)) {
        const file = m[1]!;
        assert.doesNotMatch(file, /^(banner-|textura)/, `${name} pide ${file}, que está excluida del repositorio`);
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

describe('splitHighlight (resaltado final de la frase, variante C)', () => {
  const whole = (f: string) => {
    const r = splitHighlight(f);
    assert.equal(r.lead + r.mark + r.tail, f.trim(), 'lead + mark + tail reconstruye la frase');
    return r;
  };
  it('las 5 frases reales: resalta la cláusula final o las últimas palabras', () => {
    assert.equal(whole('La constancia de hoy construye la fuerza de mañana.').mark, 'fuerza de mañana');
    assert.equal(whole('Cada repetición cuenta cuando eliges seguir avanzando.').mark, 'seguir avanzando');
    assert.equal(whole('Entrenar también es una forma de cuidar tu mente.').mark, 'cuidar tu mente');
    assert.equal(whole('No necesitas hacerlo perfecto; necesitas volver a intentarlo.').mark, 'necesitas volver a intentarlo');
    assert.equal(whole('Tu progreso se mide en disciplina, no en comparación.').mark, 'no en comparación');
  });
  it('la puntuación final queda fuera del resaltado', () => {
    assert.equal(whole('Tu progreso se mide en disciplina, no en comparación.').tail, '.');
    assert.equal(whole('¿Listo para entrenar hoy con todo tu corazón?').tail, '?');
    assert.equal(whole('Sigue adelante...').tail, '...');
  });
  it('1 a 3 palabras: sin resaltado', () => {
    for (const f of ['Vamos', 'Hoy sí', 'Una pausa, final', '¡Vamos equipo!']) assert.equal(whole(f).mark, '', f);
  });
  it('sin puntuación: las últimas palabras (≈ 30 %), sin cortar palabras', () => {
    const r = whole('sin puntuacion alguna en esta frase de ejemplo para probar');
    assert.equal(r.mark, 'ejemplo para probar');
    assert.equal(whole('uno dos tres cuatro').mark, 'tres cuatro');
  });
  it('con signos ¿ ¡ « »: no cuentan como palabras ni se cortan', () => {
    assert.equal(whole('¿Listo para entrenar hoy con todo tu corazón?').mark, 'tu corazón');
    assert.equal(whole('¡Hoy es un gran día para volver a empezar!').mark, 'volver a empezar');
  });
  it('dos pausas: se resalta la última cláusula que cumpla (2 a 6 palabras)', () => {
    assert.equal(whole('Primero llegas, después te mueves; luego sigues, y al final celebras lo logrado').mark, 'y al final celebras lo logrado');
  });
  it('raya como pausa', () => {
    assert.equal(whole('Hoy no es el día de rendirte — mañana te lo agradecerás mucho').mark, 'mañana te lo agradecerás mucho');
  });
  it('frase muy larga: nunca más de la mitad y como máximo 4 palabras si no hay pausa útil', () => {
    const f = 'Cada mañana que llegas al box y eliges entrenar aunque no tengas ganas, estás construyendo una versión más fuerte, más paciente y más constante de ti, y eso vale más que cualquier marca.';
    const r = whole(f);
    assert.equal(r.mark, 'más que cualquier marca');
    assert.ok(r.mark.split(' ').length <= f.split(' ').length / 2);
  });
  it('si la cláusula final es muy larga (más de 6 palabras) no se usa la pausa', () => {
    assert.equal(whole('Aunque cueste, sigue adelante cada día con todas tus ganas').mark, 'todas tus ganas');
  });
});

describe('tarjeta de frases del día (DailyQuoteCard.tsx)', () => {
  const quote = readFileSync(new URL('../../artifacts/wodplace/components/home/DailyQuoteCard.tsx', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../../artifacts/wodplace/components/home/HomeView.tsx', import.meta.url), 'utf8');
  const nuevas = quote.slice(quote.indexOf('function NewQuote('), quote.indexOf('const styles = StyleSheet.create'));
  const actual = quote.slice(quote.indexOf('function ActualQuote('), quote.indexOf('/** Siluetas de montañas'));
  it('por defecto sigue la variante actual y HomeView la recibe de UNA constante', () => {
    assert.match(quote, /export const QUOTE_VARIANT: QuoteVariant = 'actual';/);
    assert.ok(home.includes('quoteLook = QUOTE_LOOK'));
    assert.ok(home.includes('<DailyQuoteCard quote={quote} onShare={events.onShareQuote} look={quoteLook} />'));
  });
  it('el botón de compartir sigue llamando a su evento en todas las variantes', () => {
    assert.ok(actual.includes('onPress={onShare}'));
    assert.ok(nuevas.includes('onPress={onShare}'));
    assert.ok(nuevas.includes('accessibilityLabel="Compartir frase"'));
  });
  it('la flecha ya no existe en las variantes nuevas (solo la actual conserva su chevron)', () => {
    assert.ok(!nuevas.includes('chevron'));
    assert.ok(actual.includes('chevron-right'));
  });
  it('el botón de compartir tiene 48 × 48 dp y el presionado es de color sólido', () => {
    assert.match(quote, /const SHARE_AREA = 48;/);
    assert.ok(nuevas.includes('pressed && { backgroundColor: pressedBg }'));
    for (const line of quote.split(String.fromCharCode(10))) assert.ok(!(/pressed/i.test(line) && /opacity/i.test(line)), line);
  });
  it('los adornos (montañas, líneas, comillas, separador) van en Views con pointerEvents none y ocultos; ningún Text lleva pointerEvents', () => {
    assert.ok(nuevas.includes('<View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={styles.layers}>'));
    assert.ok(nuevas.includes('style={styles.marksWrap}'));
    assert.ok((nuevas.match(/pointerEvents="none"/g) ?? []).length >= 3);
    assert.doesNotMatch(quote, /<Text[^>]*pointerEvents=/);
  });
  it('el resaltado es un Text anidado en el cobre oscuro quoteCopperText, solo en la editorial', () => {
    assert.ok(nuevas.includes('<Text style={{ color: colors.quoteCopperText }}>{parts.mark}</Text>'));
    assert.ok(nuevas.includes("editorial && look.highlight ? splitHighlight(quote) : null"));
  });
  it('la fuente editorial sale de una sola constante y la itálica de Inter se carga desde el componente', () => {
    assert.ok(quote.includes("export const EDITORIAL_FONT: string = Platform.select({ android: 'serif', default: 'Georgia' });"));
    assert.ok(quote.includes("from '@expo-google-fonts/inter/500Medium_Italic'"));
    assert.ok(quote.includes("from 'expo-font'"));
  });
});
