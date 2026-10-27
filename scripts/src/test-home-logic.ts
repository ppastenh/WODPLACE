/**
 * Pruebas automáticas de la lógica de Inicio (corredor integrado de Node, sin dependencias de prueba):
 *  - tarjeta de próxima clase: estado (cargando / con reserva / invitación) y línea del coach;
 *  - contraste de los textos de la tarjeta sobre su fondo en reposo y presionado (tokens de constants/colors.ts).
 *
 * Corre con: pnpm --filter @workspace/scripts test:home-logic
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import colorsModule from '../../artifacts/wodplace/constants/colors';
import { NO_COACH_LABEL, coachLine, nextClassCardState } from '../../artifacts/wodplace/lib/nextClassCard';
import { planProgressView } from '../../artifacts/wodplace/lib/planProgress';

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

describe('"Clases del plan": sin plan, plan ilimitado y plan por clases', () => {
  it('sin plan activo: "—" y "Sin plan activo" (tenga o no datos de plan)', () => {
    assert.deepEqual(planProgressView({ hasActivePlan: false, planLoading: false, plan: null }), { kind: 'none' });
    assert.deepEqual(
      planProgressView({ hasActivePlan: false, planLoading: false, plan: { classesPerPeriod: 8, classesUsedInPeriod: 3 } }),
      { kind: 'none' },
    );
  });

  it('plan activo sin clases por período (ilimitado): "Plan ilimitado", sin barra', () => {
    assert.deepEqual(
      planProgressView({ hasActivePlan: true, planLoading: false, plan: { classesPerPeriod: null, classesUsedInPeriod: null } }),
      { kind: 'unlimited' },
    );
    // aunque el servidor mande un conteo, un plan ilimitado no tiene tope contra el cual mostrar una barra
    assert.deepEqual(
      planProgressView({ hasActivePlan: true, planLoading: false, plan: { classesPerPeriod: null, classesUsedInPeriod: 5 } }),
      { kind: 'unlimited' },
    );
  });

  it('plan con clases por período: N / M con la barra', () => {
    assert.deepEqual(
      planProgressView({ hasActivePlan: true, planLoading: false, plan: { classesPerPeriod: 8, classesUsedInPeriod: 3 } }),
      { kind: 'classes', used: 3, total: 8, ratio: 0.375 },
    );
    assert.deepEqual(
      planProgressView({ hasActivePlan: true, planLoading: false, plan: { classesPerPeriod: 8, classesUsedInPeriod: 0 } }),
      { kind: 'classes', used: 0, total: 8, ratio: 0 },
    );
  });

  it('la barra nunca pasa de lleno (más clases usadas que el tope)', () => {
    const v = planProgressView({ hasActivePlan: true, planLoading: false, plan: { classesPerPeriod: 8, classesUsedInPeriod: 11 } });
    assert.deepEqual(v, { kind: 'classes', used: 11, total: 8, ratio: 1 });
  });

  it('plan por clases cuyo período aún no empieza (sin pago registrado): muestra el tope y la barra vacía', () => {
    assert.deepEqual(
      planProgressView({ hasActivePlan: true, planLoading: false, plan: { classesPerPeriod: 8, classesUsedInPeriod: null } }),
      { kind: 'classes', used: null, total: 8, ratio: 0 },
    );
  });

  it('mientras llegan los datos del plan no dice "Sin plan activo" por error', () => {
    assert.deepEqual(planProgressView({ hasActivePlan: true, planLoading: true, plan: null }), { kind: 'loading' });
    assert.deepEqual(planProgressView({ hasActivePlan: true, planLoading: false, plan: null }), { kind: 'none' });
  });
});
