/**
 * Pruebas automáticas del candado local del panel (F7-a1): lógica pura de
 * artifacts/wodplace/lib/adminLockLogic.ts. Sin dependencias de prueba: usa el corredor integrado de Node
 * (node:test + node:assert). Todo lo externo (almacenamiento, reloj, azar, hash y verificación del dispositivo)
 * son versiones falsas; un "reinicio" de la app se simula creando de nuevo el candado sobre el MISMO almacenamiento.
 *
 * Corre con: pnpm --filter @workspace/scripts test:admin-lock
 */
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { describe, it } from 'node:test';

import {
  BACKGROUND_RELOCK_MS,
  WAIT_LADDER_MS,
  createAdminLock,
  formatWait,
  isWeakPin,
  safeEqual,
  shouldRelock,
  waitForFailures,
  type DeviceAuthResult,
  type DeviceSecurity,
  type LockDeps,
} from '../../artifacts/wodplace/lib/adminLockLogic';
import {
  ENTRY_TTL_MS,
  ENTRY_TTL_VIA_FORM_MS,
  consumeAdminEntry,
  grantAdminEntry,
  isAdminEntryActive,
  releaseAdminEntry,
} from '../../artifacts/wodplace/lib/adminUnlock';

const GOOD = '482915';
const OTHER = '739150';

class FakeStore {
  raw: string | null = null;
  writes = 0;
  failRead = false;
  failWrite = false;
  failRemove = false;
  async read() {
    if (this.failRead) throw new Error('lectura');
    return this.raw;
  }
  async write(raw: string) {
    if (this.failWrite) throw new Error('escritura');
    this.writes++;
    this.raw = raw;
  }
  async remove() {
    if (this.failRemove) throw new Error('borrado');
    this.raw = null;
  }
}

function rig(opts: { security?: DeviceSecurity } = {}) {
  const store = new FakeStore();
  const clock = { t: 1_000_000 };
  const dev = {
    security: (opts.security ?? 'secret') as DeviceSecurity,
    securityThrows: false,
    deviceAuth: { ok: true } as DeviceAuthResult,
    bioAuth: { ok: true } as DeviceAuthResult,
    deviceAuthCalls: 0,
    bioAuthCalls: 0,
    shaThrows: false,
  };
  const deps: LockDeps = {
    store,
    now: () => clock.t,
    randomHex: async (n) => randomBytes(n).toString('hex'),
    sha256Hex: async (s) => {
      if (dev.shaThrows) throw new Error('hash');
      return createHash('sha256').update(s).digest('hex');
    },
    deviceSecurity: async () => {
      if (dev.securityThrows) throw new Error('seguridad');
      return dev.security;
    },
    authenticateDevice: async () => {
      dev.deviceAuthCalls++;
      return dev.deviceAuth;
    },
    authenticateBiometric: async () => {
      dev.bioAuthCalls++;
      return dev.bioAuth;
    },
    hashIterations: 20,
  };
  return { store, clock, dev, deps, lock: createAdminLock(deps) };
}

const record = (store: FakeStore) => JSON.parse(store.raw as string);

describe('crear el PIN exige la verificación del dispositivo', () => {
  it('con bloqueo de pantalla: pide la verificación y recién entonces guarda', async () => {
    const r = rig({ security: 'secret' });
    const res = await r.lock.createPin(GOOD);
    assert.deepEqual(res, { status: 'ok', weak: false });
    assert.equal(r.dev.deviceAuthCalls, 1);
    assert.equal(record(r.store).weak, false);
  });

  for (const [reason, status] of [
    ['cancelled', 'device-auth-cancelled'],
    ['failed', 'device-auth-failed'],
    ['lockout', 'device-auth-lockout'],
    ['unavailable', 'device-auth-unavailable'],
  ] as const) {
    it(`si la verificación sale "${reason}": no guarda nada`, async () => {
      const r = rig({ security: 'biometric' });
      r.dev.deviceAuth = { ok: false, reason };
      assert.deepEqual(await r.lock.createPin(GOOD), { status });
      assert.equal(r.store.raw, null);
      assert.equal(r.store.writes, 0);
      assert.deepEqual(await r.lock.status(), { state: 'no-pin' });
    });
  }

  it('sin bloqueo de pantalla: se permite, sin pedir verificación, y queda marcado como débil', async () => {
    const r = rig({ security: 'none' });
    assert.deepEqual(await r.lock.createPin(GOOD), { status: 'ok', weak: true });
    assert.equal(r.dev.deviceAuthCalls, 0);
    assert.equal(record(r.store).weak, true);
  });

  it('si no se puede saber el nivel de seguridad del teléfono: falla hacia lo seguro (no lo trata como "sin bloqueo")', async () => {
    const r = rig();
    r.dev.securityThrows = true;
    assert.deepEqual(await r.lock.createPin(GOOD), { status: 'device-auth-unavailable' });
    assert.equal(r.store.writes, 0);
  });

  it('cada creación pide SU verificación (no queda un permiso reutilizable)', async () => {
    const r = rig();
    await r.lock.createPin(GOOD);
    assert.equal(await r.lock.clear(), true); // cerrar sesión
    await r.lock.createPin(OTHER);
    assert.equal(r.dev.deviceAuthCalls, 2);
  });

  it('se niega si ya hay un registro (legible o no) y no pide verificación', async () => {
    const r = rig();
    await r.lock.createPin(GOOD);
    assert.deepEqual(await r.lock.createPin(OTHER), { status: 'exists' });
    r.store.raw = 'basura';
    assert.deepEqual(await r.lock.createPin(OTHER), { status: 'exists' });
    assert.equal(r.dev.deviceAuthCalls, 1);
  });

  it('PIN mal formado o débil: se rechaza SIN pedir la verificación', async () => {
    const r = rig();
    assert.deepEqual(await r.lock.createPin('12345'), { status: 'invalid-format' });
    assert.deepEqual(await r.lock.createPin('12ab56'), { status: 'invalid-format' });
    assert.deepEqual(await r.lock.createPin('123456'), { status: 'weak-pin' });
    assert.equal(r.dev.deviceAuthCalls, 0);
    assert.equal(r.store.writes, 0);
  });

  it('si el almacenamiento falla al guardar: storage-error y nada queda a medias', async () => {
    const r = rig();
    r.store.failWrite = true;
    assert.deepEqual(await r.lock.createPin(GOOD), { status: 'storage-error' });
    assert.equal(r.store.raw, null);
  });

  it('la sal es distinta por cuenta: el mismo PIN no da el mismo hash', async () => {
    const a = rig();
    const b = rig();
    await a.lock.createPin(GOOD);
    await b.lock.createPin(GOOD);
    assert.notEqual(record(a.store).salt, record(b.store).salt);
    assert.notEqual(record(a.store).hash, record(b.store).hash);
  });
});

describe('fuerza del PIN', () => {
  for (const pin of ['000000', '111111', '123456', '234567', '654321', '098765', '890123', '901234', '121212', '123123', '112112', '545454']) {
    it(`rechaza ${pin}`, () => assert.equal(isWeakPin(pin), true));
  }
  for (const pin of ['135790', '482915', '739150', '102938', '246810', '112233']) {
    it(`acepta ${pin}`, () => assert.equal(isWeakPin(pin), false));
  }
});

describe('errores, esperas y contador', () => {
  async function ready() {
    const r = rig();
    await r.lock.createPin(GOOD);
    return r;
  }

  it('un PIN correcto entra', async () => {
    const r = await ready();
    assert.deepEqual(await r.lock.tryPin(GOOD), { status: 'ok' });
  });

  it('los 4 primeros errores avisan cuántos intentos quedan', async () => {
    const r = await ready();
    const res = [];
    for (let i = 0; i < 4; i++) res.push(await r.lock.tryPin(OTHER));
    assert.deepEqual(res, [
      { status: 'wrong', attemptsLeft: 4 },
      { status: 'wrong', attemptsLeft: 3 },
      { status: 'wrong', attemptsLeft: 2 },
      { status: 'wrong', attemptsLeft: 1 },
    ]);
  });

  it('escalera: 5.º error 30 s, 6.º 1 min, 7.º 5 min, 8.º 15 min, 9.º y siguientes 30 min (tope)', async () => {
    const r = await ready();
    const esperados = [30_000, 60_000, 300_000, 900_000, 1_800_000, 1_800_000, 1_800_000];
    for (let i = 0; i < 4; i++) await r.lock.tryPin(OTHER);
    for (const esperado of esperados) {
      const res = await r.lock.tryPin(OTHER);
      assert.deepEqual(res, { status: 'wait', remainingMs: esperado });
      r.clock.t += esperado + 1; // pasa la espera
    }
    assert.deepEqual([...WAIT_LADDER_MS], [30_000, 60_000, 300_000, 900_000, 1_800_000]);
    assert.equal(waitForFailures(4), 0);
    assert.equal(waitForFailures(5), 30_000);
    assert.equal(waitForFailures(40), 1_800_000);
  });

  it('durante la espera no se prueba el PIN ni se gasta un intento (ni siquiera con el PIN correcto)', async () => {
    const r = await ready();
    for (let i = 0; i < 5; i++) await r.lock.tryPin(OTHER);
    const antes = record(r.store).failed;
    r.clock.t += 10_000;
    assert.deepEqual(await r.lock.tryPin(GOOD), { status: 'wait', remainingMs: 20_000 });
    assert.equal(record(r.store).failed, antes);
    assert.equal(await r.lock.remainingWaitMs(), 20_000);
  });

  it('un PIN correcto después de la espera entra y reinicia todo', async () => {
    const r = await ready();
    for (let i = 0; i < 6; i++) {
      await r.lock.tryPin(OTHER);
      r.clock.t += 2_000_000;
    }
    assert.deepEqual(await r.lock.tryPin(GOOD), { status: 'ok' });
    assert.equal(record(r.store).failed, 0);
    assert.equal(record(r.store).notBefore, 0);
    assert.deepEqual(await r.lock.tryPin(OTHER), { status: 'wrong', attemptsLeft: 4 });
  });

  it('el contador sobrevive a un reinicio de la app (otro candado sobre el mismo almacenamiento)', async () => {
    const r = await ready();
    for (let i = 0; i < 5; i++) await r.lock.tryPin(OTHER);
    const reiniciado = createAdminLock(r.deps); // proceso nuevo, mismo almacenamiento
    assert.deepEqual(await reiniciado.tryPin(GOOD), { status: 'wait', remainingMs: 30_000 });
  });

  it('el intento se suma ANTES de comparar: si el proceso muere al comparar, el intento ya cuenta', async () => {
    const r = await ready();
    r.dev.shaThrows = true; // simula morir/fallar justo al comparar
    assert.deepEqual(await r.lock.tryPin(OTHER), { status: 'error' });
    r.dev.shaThrows = false;
    assert.equal(record(r.store).failed, 1);
    assert.deepEqual(await r.lock.tryPin(OTHER), { status: 'wrong', attemptsLeft: 3 });
  });

  it('si no se puede guardar el intento, no se compara (no hay intentos gratis)', async () => {
    const r = await ready();
    r.store.failWrite = true;
    assert.deepEqual(await r.lock.tryPin(GOOD), { status: 'storage-error' });
    r.store.failWrite = false;
    assert.equal(record(r.store).failed, 0);
  });

  it('intentos simultáneos se atienden en cola: ninguno se pierde', async () => {
    const r = await ready();
    const res = await Promise.all([r.lock.tryPin(OTHER), r.lock.tryPin(OTHER), r.lock.tryPin(OTHER), r.lock.tryPin(OTHER), r.lock.tryPin(OTHER)]);
    assert.deepEqual(res.map((x) => x.status), ['wrong', 'wrong', 'wrong', 'wrong', 'wait']);
    assert.deepEqual(res.slice(0, 4).map((x) => (x.status === 'wrong' ? x.attemptsLeft : -1)), [4, 3, 2, 1]);
    assert.equal(record(r.store).failed, 5);
  });

  it('un PIN con formato inválido no gasta intento', async () => {
    const r = await ready();
    assert.deepEqual(await r.lock.tryPin('123'), { status: 'invalid-format' });
    assert.equal(record(r.store).failed, 0);
  });
});

describe('reloj', () => {
  it('retroceder el reloj NO acorta la espera; al volver a la hora real, sigue', async () => {
    const r = rig();
    await r.lock.createPin(GOOD);
    for (let i = 0; i < 5; i++) await r.lock.tryPin(OTHER); // espera de 30 s desde t0
    const t0 = r.clock.t;
    r.clock.t = t0 - 3_600_000; // alguien atrasa el reloj 1 hora
    assert.deepEqual(await r.lock.tryPin(GOOD), { status: 'wait', remainingMs: 30_000 });
    r.clock.t = t0 + 10_000;
    assert.equal(await r.lock.remainingWaitMs(), 20_000);
    r.clock.t = t0 + 31_000;
    assert.equal(await r.lock.remainingWaitMs(), 0);
    assert.deepEqual(await r.lock.tryPin(GOOD), { status: 'ok' });
  });

  it('avanzar el reloj sí termina la espera (no se puede evitar sin servidor)', async () => {
    const r = rig();
    await r.lock.createPin(GOOD);
    for (let i = 0; i < 5; i++) await r.lock.tryPin(OTHER);
    r.clock.t += 31_000;
    assert.deepEqual(await r.lock.tryPin(GOOD), { status: 'ok' });
  });

  it('bloqueo por segundo plano: antes del límite no, en el límite sí, con el reloj atrás sí', () => {
    assert.equal(shouldRelock(1000, 1000 + BACKGROUND_RELOCK_MS - 1), false);
    assert.equal(shouldRelock(1000, 1000 + BACKGROUND_RELOCK_MS), true);
    assert.equal(shouldRelock(1000, 500), true);
    assert.equal(BACKGROUND_RELOCK_MS, 120_000);
  });

  it('formatWait', () => {
    assert.equal(formatWait(30_000), '0:30');
    assert.equal(formatWait(61_000), '1:01');
    assert.equal(formatWait(1_800_000), '30:00');
    assert.equal(formatWait(-5), '0:00');
  });
});

describe('registro dañado, ilegible o de otra versión', () => {
  const malos: Array<[string, string]> = [
    ['basura', 'esto no es json'],
    ['JSON que no es objeto', '42'],
    ['versión desconocida', JSON.stringify({ v: 2, salt: 'a', hash: 'b', iterations: 1, failed: 0, notBefore: 0, highWater: 0, bio: false, weak: false })],
    ['falta un campo', JSON.stringify({ v: 1, salt: 'a', hash: 'b', iterations: 1, failed: 0, notBefore: 0, highWater: 0, bio: false })],
    ['campo con tipo inválido', JSON.stringify({ v: 1, salt: 'a', hash: 'b', iterations: 1, failed: -1, notBefore: 0, highWater: 0, bio: false, weak: false })],
  ];
  for (const [nombre, raw] of malos) {
    it(`${nombre}: ilegible, sin modificar nada y NO se ofrece crear uno nuevo encima`, async () => {
      const r = rig();
      r.store.raw = raw;
      assert.deepEqual(await r.lock.status(), { state: 'unreadable' });
      assert.deepEqual(await r.lock.tryPin(GOOD), { status: 'unreadable' });
      assert.deepEqual(await r.lock.createPin(GOOD), { status: 'exists' });
      assert.deepEqual(await r.lock.tryBiometric(), { status: 'unreadable' });
      assert.equal(r.store.raw, raw);
      assert.equal(r.store.writes, 0);
    });
  }

  it('si el almacenamiento no se puede leer: ilegible (no "sin PIN")', async () => {
    const r = rig();
    await r.lock.createPin(GOOD);
    r.store.failRead = true;
    assert.deepEqual(await r.lock.status(), { state: 'unreadable' });
    assert.deepEqual(await r.lock.createPin(OTHER), { status: 'exists' });
  });

  it('borrar (cerrar sesión) deja crear uno nuevo; si el borrado falla lo dice', async () => {
    const r = rig();
    r.store.raw = 'basura';
    r.store.failRemove = true;
    assert.equal(await r.lock.clear(), false);
    r.store.failRemove = false;
    assert.equal(await r.lock.clear(), true);
    assert.deepEqual(await r.lock.createPin(GOOD), { status: 'ok', weak: false });
  });

  it('cuentas distintas no se mezclan: borrar una no toca la otra', async () => {
    const a = rig();
    const b = rig();
    await a.lock.createPin(GOOD);
    await b.lock.createPin(OTHER);
    await a.lock.clear();
    assert.deepEqual(await a.lock.status(), { state: 'no-pin' });
    assert.deepEqual(await b.lock.tryPin(OTHER), { status: 'ok' });
    assert.deepEqual(await b.lock.tryPin(GOOD), { status: 'wrong', attemptsLeft: 4 });
  });

  it('sin PIN: tryPin avisa "no-pin"', async () => {
    const r = rig();
    assert.deepEqual(await r.lock.tryPin(GOOD), { status: 'no-pin' });
  });
});

describe('atajo de huella o rostro', () => {
  async function ready(security: DeviceSecurity = 'biometric') {
    const r = rig({ security });
    await r.lock.createPin(GOOD);
    return r;
  }

  it('no se puede activar sin biometría en el teléfono', async () => {
    const r = await ready('secret');
    assert.deepEqual(await r.lock.setBiometric(true), { status: 'not-available' });
    assert.deepEqual(await r.lock.status(), { state: 'ready', bio: false, weak: false });
  });

  it('activarlo exige una verificación biométrica; si se cancela, no se activa', async () => {
    const r = await ready();
    r.dev.bioAuth = { ok: false, reason: 'cancelled' };
    assert.deepEqual(await r.lock.setBiometric(true), { status: 'cancelled' });
    assert.deepEqual(await r.lock.status(), { state: 'ready', bio: false, weak: false });
    r.dev.bioAuth = { ok: true };
    assert.deepEqual(await r.lock.setBiometric(true), { status: 'ok' });
    assert.deepEqual(await r.lock.status(), { state: 'ready', bio: true, weak: false });
  });

  it('entrar con la huella usa SOLO biometría (nunca la credencial del teléfono) y no toca el contador', async () => {
    const r = await ready();
    await r.lock.setBiometric(true);
    await r.lock.tryPin(OTHER);
    await r.lock.tryPin(OTHER);
    const antes = record(r.store).failed;
    const credencialesAntes = r.dev.deviceAuthCalls;
    assert.deepEqual(await r.lock.tryBiometric(), { status: 'ok' });
    assert.equal(r.dev.deviceAuthCalls, credencialesAntes);
    assert.ok(r.dev.bioAuthCalls >= 2);
    assert.equal(record(r.store).failed, antes);
  });

  it('desactivado, o sin biometría en el teléfono: no se ofrece', async () => {
    const r = await ready();
    assert.deepEqual(await r.lock.tryBiometric(), { status: 'not-enabled' });
    await r.lock.setBiometric(true);
    r.dev.security = 'secret'; // se quitó la huella del teléfono
    assert.deepEqual(await r.lock.tryBiometric(), { status: 'not-available' });
  });

  it('huella cancelada o fallida: no entra', async () => {
    const r = await ready();
    await r.lock.setBiometric(true);
    r.dev.bioAuth = { ok: false, reason: 'failed' };
    assert.deepEqual(await r.lock.tryBiometric(), { status: 'failed' });
  });

  it('desactivarla no pide verificación', async () => {
    const r = await ready();
    await r.lock.setBiometric(true);
    const llamadas = r.dev.bioAuthCalls;
    assert.deepEqual(await r.lock.setBiometric(false), { status: 'ok' });
    assert.equal(r.dev.bioAuthCalls, llamadas);
  });
});

describe('utilidades', () => {
  it('safeEqual compara igual que ===, también con largos distintos', () => {
    assert.equal(safeEqual('abc', 'abc'), true);
    assert.equal(safeEqual('abc', 'abd'), false);
    assert.equal(safeEqual('abc', 'abcd'), false);
    assert.equal(safeEqual('', ''), true);
  });
});

describe('permiso de entrada al panel (un solo uso, solo en memoria)', () => {
  it('sin permiso (enlace profundo, botón "atrás", otra pantalla): no abre', () => {
    releaseAdminEntry();
    assert.equal(consumeAdminEntry(), false);
    assert.equal(isAdminEntryActive(), false);
  });

  it('con el permiso del candado abre UNA vez; la segunda no', () => {
    releaseAdminEntry();
    grantAdminEntry({ now: 1000 });
    assert.equal(consumeAdminEntry(1500), true);
    assert.equal(isAdminEntryActive(), true);
    assert.equal(consumeAdminEntry(1600), false);
  });

  it('al salir de la pantalla no queda nada: volver a entrar pide el candado otra vez', () => {
    releaseAdminEntry();
    grantAdminEntry({ now: 1000 });
    consumeAdminEntry(1100);
    releaseAdminEntry(); // desmontar admin-dashboard / cerrar sesión
    assert.equal(isAdminEntryActive(), false);
    assert.equal(consumeAdminEntry(1200), false);
  });

  it('vence a los 60 s y un permiso vencido se descarta (no queda para después)', () => {
    releaseAdminEntry();
    grantAdminEntry({ now: 1000 });
    assert.equal(consumeAdminEntry(1000 + ENTRY_TTL_MS + 1), false);
    assert.equal(consumeAdminEntry(1500), false);
  });

  it('justo dentro de la vigencia sí vale', () => {
    releaseAdminEntry();
    grantAdminEntry({ now: 1000 });
    assert.equal(consumeAdminEntry(1000 + ENTRY_TTL_MS), true);
  });

  it('el camino por "Datos del Box" tiene vigencia larga (20 minutos) y no más', () => {
    releaseAdminEntry();
    grantAdminEntry({ ttlMs: ENTRY_TTL_VIA_FORM_MS, now: 1000 });
    assert.equal(consumeAdminEntry(1000 + 19 * 60_000), true);
    releaseAdminEntry();
    grantAdminEntry({ ttlMs: ENTRY_TTL_VIA_FORM_MS, now: 1000 });
    assert.equal(consumeAdminEntry(1000 + 21 * 60_000), false);
  });

  it('con el reloj atrasado el permiso no vale', () => {
    releaseAdminEntry();
    grantAdminEntry({ now: 5000 });
    assert.equal(consumeAdminEntry(4000), false);
  });

  it('conceder de nuevo reemplaza al anterior (no se acumulan permisos)', () => {
    releaseAdminEntry();
    grantAdminEntry({ now: 1000 });
    grantAdminEntry({ now: 2000 });
    assert.equal(consumeAdminEntry(2100), true);
    assert.equal(consumeAdminEntry(2200), false);
  });
});
