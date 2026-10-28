import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppButton } from '@/components/AppButton';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { PinField } from '@/components/PinField';
import { useDarkColors } from '@/hooks/useDarkColors';
import { getAdminLock, getDeviceSecurity } from '@/lib/adminLock';
import { formatWait, PIN_LENGTH, type CreatePinResult, type DeviceSecurity } from '@/lib/adminLockLogic';

/**
 * Candado local del panel de administración (F7-a2). Pantallas y textos exactos: PLAN-F2-F7.md, sección
 * "F7-a (versión final)". Las reglas viven en lib/adminLockLogic.ts; esto solo las muestra.
 *
 * Se usa en dos lugares: al entrar al panel desde el menú (variant "entry", dentro de admin-login) y encima del
 * panel cuando la app vuelve de segundo plano tras 2 minutos (variant "relock", dentro de admin-dashboard, con el
 * panel detrás sin perder su estado).
 */

type Mode = 'loading' | 'create' | 'enter' | 'wait' | 'bio-offer' | 'forgot' | 'unreadable';

type Props = {
  userId: string;
  variant: 'entry' | 'relock';
  /** El PIN (o la huella, o la creación del PIN) salió bien: se concede el permiso de entrada. */
  onUnlocked: () => void;
  /** "Olvidé mi PIN" -> cerrar sesión (esto borra el candado de la cuenta). */
  onLogout: () => Promise<void>;
};

const CREATE_ERRORS: Partial<Record<CreatePinResult['status'], string>> = {
  'invalid-format': `El PIN debe tener ${PIN_LENGTH} dígitos.`,
  'weak-pin': 'Elige un PIN menos fácil de adivinar.',
  'storage-error': 'No se pudo guardar el PIN en este teléfono. Reintenta.',
  'device-auth-cancelled':
    'Cancelaste la verificación. Para guardar tu PIN debes confirmar que eres tú con tu huella, tu rostro o el desbloqueo de este teléfono.',
  'device-auth-failed': 'No pudimos confirmar que eres tú. Reintenta.',
  'device-auth-lockout': 'Hiciste demasiados intentos. Usa el desbloqueo de tu teléfono o vuelve a intentarlo en un rato.',
  'device-auth-unavailable': 'Este teléfono no puede verificar tu identidad ahora. Reintenta más tarde.',
};

const WEAK_PHONE_WARNING =
  'Este teléfono no tiene bloqueo de pantalla, así que no podemos confirmar que eres tú. El candado es débil: quien use tu teléfono podría crear su propio PIN. Te recomendamos activar un bloqueo de pantalla en los ajustes del teléfono.';

export function AdminLockPrompt({ userId, variant, onUnlocked, onLogout }: Props) {
  const colors = useDarkColors();
  const lock = getAdminLock(userId);

  const [mode, setMode] = useState<Mode>('loading');
  const [bio, setBio] = useState(false);
  const [security, setSecurity] = useState<DeviceSecurity>('secret');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [waitEnd, setWaitEnd] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [forgotBack, setForgotBack] = useState<'enter' | 'wait' | 'unreadable'>('enter');
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const loadStatus = useCallback(async () => {
    setMode('loading');
    setError('');
    setPin('');
    setPinConfirm('');
    const [status, sec] = await Promise.all([lock.status(), getDeviceSecurity().catch(() => 'secret' as DeviceSecurity)]);
    if (!mounted.current) return;
    setSecurity(sec);
    if (status.state === 'no-pin') return setMode('create');
    if (status.state === 'unreadable') return setMode('unreadable');
    setBio(status.bio);
    const remaining = await lock.remainingWaitMs();
    if (!mounted.current) return;
    if (remaining > 0) {
      setWaitEnd(Date.now() + remaining);
      setMode('wait');
    } else {
      setMode('enter');
    }
  }, [lock]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  // Cuenta regresiva de la espera; al terminar vuelve a pedir el PIN.
  useEffect(() => {
    if (mode !== 'wait' || !waitEnd) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNowMs(t);
      if (t >= waitEnd) {
        setWaitEnd(null);
        setPin('');
        setError('');
        setMode('enter');
      }
    }, 1000);
    return () => clearInterval(id);
  }, [mode, waitEnd]);

  const submitCreate = async () => {
    if (pin.length !== PIN_LENGTH) return setError(`El PIN debe tener ${PIN_LENGTH} dígitos.`);
    if (pin !== pinConfirm) return setError('Los PIN no coinciden.');
    setBusy(true);
    setError('');
    try {
      const res = await lock.createPin(pin);
      if (!mounted.current) return;
      if (res.status === 'ok') {
        setPin('');
        setPinConfirm('');
        const sec = await getDeviceSecurity().catch(() => 'secret' as DeviceSecurity);
        if (sec === 'biometric') {
          setMode('bio-offer');
        } else {
          onUnlocked();
        }
        return;
      }
      if (res.status === 'exists') return void loadStatus();
      setError(CREATE_ERRORS[res.status] ?? 'No se pudo guardar el PIN en este teléfono. Reintenta.');
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const submitEnter = async () => {
    if (pin.length !== PIN_LENGTH) return setError(`El PIN debe tener ${PIN_LENGTH} dígitos.`);
    setBusy(true);
    setError('');
    try {
      const res = await lock.tryPin(pin);
      if (!mounted.current) return;
      setPin('');
      switch (res.status) {
        case 'ok':
          return onUnlocked();
        case 'wrong':
          return setError(
            `PIN incorrecto. Te ${res.attemptsLeft === 1 ? 'queda' : 'quedan'} ${res.attemptsLeft} ` +
              `intento${res.attemptsLeft === 1 ? '' : 's'} antes de una espera.`,
          );
        case 'wait':
          setWaitEnd(Date.now() + res.remainingMs);
          return setMode('wait');
        case 'unreadable':
          return setMode('unreadable');
        case 'no-pin':
          return setMode('create');
        case 'invalid-format':
          return setError(`El PIN debe tener ${PIN_LENGTH} dígitos.`);
        default:
          return setError('No se pudo verificar el PIN. Reintenta.');
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const submitBiometric = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await lock.tryBiometric();
      if (!mounted.current) return;
      if (res.status === 'ok') return onUnlocked();
      if (res.status === 'cancelled') return; // eligió usar el PIN
      setError('No se pudo usar la huella o el rostro. Ingresa tu PIN.');
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const activateBiometric = async () => {
    setBusy(true);
    try {
      await lock.setBiometric(true); // si se cancela o falla, simplemente queda sin atajo
    } finally {
      if (mounted.current) setBusy(false);
      onUnlocked();
    }
  };

  const confirmLogout = async () => {
    setBusy(true);
    try {
      await onLogout();
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const openForgot = () => {
    setForgotBack(mode === 'wait' ? 'wait' : mode === 'unreadable' ? 'unreadable' : 'enter');
    setError('');
    setMode('forgot');
  };

  const title =
    mode === 'create' ? 'Crea tu PIN del panel'
    : mode === 'bio-offer' ? 'Acceso rápido'
    : mode === 'forgot' ? '¿Olvidaste tu PIN?'
    : mode === 'unreadable' ? 'No pudimos leer tu PIN'
    : variant === 'relock' ? 'Panel bloqueado'
    : 'Ingresa tu PIN';

  const subtitle =
    mode === 'enter' || mode === 'wait' || mode === 'loading'
      ? variant === 'relock' ? 'Ingresa tu PIN para continuar.' : 'Panel de administración'
      : null;

  const pinChange = (set: (v: string) => void) => (v: string) => {
    set(v);
    if (error) setError('');
  };

  const bioLink = bio ? (
    <Pressable onPress={submitBiometric} disabled={busy} style={styles.linkRow} hitSlop={8}>
      <Feather name="unlock" size={14} color={colors.primary} />
      <Text style={[styles.link, { color: colors.primary }]}>Usar huella o rostro</Text>
    </Pressable>
  ) : null;

  const forgotLink = (
    <Pressable onPress={openForgot} hitSlop={8} style={styles.linkRow}>
      <Text style={[styles.link, { color: colors.authMuted }]}>Olvidé mi PIN</Text>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.authBackground }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[styles.scrollContent, (mode === 'create' || mode === 'enter') && styles.scrollContentTop]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: colors.authText }]}>{mode === 'loading' ? 'Panel de administración' : title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.authMuted }]}>{mode === 'loading' ? 'Cargando…' : subtitle}</Text> : null}

        {mode === 'create' ? (
          <>
            <Text style={[styles.subtitle, { color: colors.authMuted }]}>
              Es un candado de este teléfono: protege el panel si alguien usa tu teléfono con la app abierta. No reemplaza tu contraseña.
            </Text>
            {security === 'none' ? (
              <Text style={[styles.warning, { color: colors.authText, borderColor: colors.authBorder, backgroundColor: colors.authInput }]}>
                {WEAK_PHONE_WARNING}
              </Text>
            ) : null}
            <Text style={[styles.label, { color: colors.authMuted }]}>Elige un PIN de {PIN_LENGTH} dígitos</Text>
            <PinField value={pin} onChangeText={pinChange(setPin)} length={PIN_LENGTH} autoFocus />
            <Text style={[styles.label, { color: colors.authMuted }]}>Repite tu PIN</Text>
            <PinField value={pinConfirm} onChangeText={pinChange(setPinConfirm)} length={PIN_LENGTH} />
            {error ? <Text style={[styles.error, { color: colors.destructiveTextSmall }]}>{error}</Text> : null}
            <AppButton label="Guardar PIN" variant="primary" palette="dark" fullWidth loading={busy} onPress={submitCreate} style={styles.button} />
          </>
        ) : null}

        {mode === 'bio-offer' ? (
          <>
            <Text style={[styles.subtitle, { color: colors.authMuted }]}>¿Quieres entrar con tu huella o tu rostro?</Text>
            <AppButton label="Activar" variant="primary" palette="dark" fullWidth loading={busy} onPress={activateBiometric} style={styles.button} />
            <Pressable onPress={onUnlocked} disabled={busy} hitSlop={8} style={styles.linkRow}>
              <Text style={[styles.link, { color: colors.authMuted }]}>Ahora no</Text>
            </Pressable>
          </>
        ) : null}

        {mode === 'enter' ? (
          <>
            <PinField value={pin} onChangeText={pinChange(setPin)} length={PIN_LENGTH} autoFocus onSubmitEditing={submitEnter} />
            {error ? <Text style={[styles.error, { color: colors.destructiveTextSmall }]}>{error}</Text> : null}
            <AppButton label="Entrar" variant="primary" palette="dark" fullWidth loading={busy} onPress={submitEnter} style={styles.button} />
            {bioLink}
            {forgotLink}
          </>
        ) : null}

        {mode === 'wait' ? (
          <>
            <Text style={[styles.subtitle, { color: colors.authMuted }]}>
              Demasiados intentos. Vuelve a intentar en{' '}
              <Text style={{ color: colors.authText, fontFamily: 'Inter_600SemiBold' }}>{formatWait((waitEnd ?? nowMs) - nowMs)}</Text>.
            </Text>
            {error ? <Text style={[styles.error, { color: colors.destructiveTextSmall }]}>{error}</Text> : null}
            {bioLink}
            {forgotLink}
          </>
        ) : null}

        {mode === 'unreadable' ? (
          <>
            <Text style={[styles.subtitle, { color: colors.authMuted }]}>No pudimos leer el PIN guardado en este teléfono.</Text>
            <AppButton label="Reintentar" variant="primary" palette="dark" fullWidth onPress={loadStatus} style={styles.button} />
            {forgotLink}
          </>
        ) : null}

        {mode === 'forgot' ? (
          <>
            <Text style={[styles.subtitle, { color: colors.authMuted }]}>
              Para crear uno nuevo debes cerrar sesión, volver a entrar y confirmar que eres tú con el desbloqueo de tu teléfono. Al cerrar sesión se borra el PIN de este teléfono.
            </Text>
            <AppButton label="Cerrar sesión" variant="primary" palette="dark" fullWidth loading={busy} onPress={confirmLogout} style={styles.button} />
            <Pressable onPress={() => setMode(forgotBack)} disabled={busy} hitSlop={8} style={styles.linkRow}>
              <Text style={[styles.link, { color: colors.authMuted }]}>Cancelar</Text>
            </Pressable>
          </>
        ) : null}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 12 },
  scrollContentTop: { justifyContent: 'flex-start', paddingTop: 48, paddingBottom: 48 },
  title: { fontSize: 22, fontFamily: 'Anton_400Regular', textAlign: 'center' },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', marginBottom: 8, lineHeight: 18 },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  warning: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 17,
    textAlign: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  error: { fontSize: 13, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  button: { marginTop: 6 },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  link: { fontSize: 13, fontFamily: 'Inter_500Medium' },
});
