import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { Feather } from '@expo/vector-icons';
import {
  createAdminSession,
  getAdminPinStatus,
  setupAdminPin,
  verifyAdminPin,
} from '@workspace/api-client-react';
import { AppButton } from '@/components/AppButton';
import { AppHeader } from '@/components/AppHeader';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { PinField } from '@/components/PinField';
import { useAuth } from '@/context/AuthContext';
import { useDarkColors } from '@/hooks/useDarkColors';
import { setAdminToken } from '@/lib/adminSession';

type Mode = 'loading' | 'choose-target' | 'error' | 'setup' | 'verify' | 'locked' | 'password';
type PasswordPurpose = 'forgot' | 'unlock';
type PanelTarget = 'box' | 'super';

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Gate for the owner-only admin dashboard, reached from the side drawer's
 * "Administrador" item. Replaces the old shared access code: each account has
 * its own PIN (hashed server-side), with a 5-try / 15-minute lockout, optional
 * biometric unlock, and password-based recovery. On success it stores a
 * short-lived session token and continues to /admin-dashboard.
 */
export default function AdminLoginScreen() {
  const colors = useDarkColors();
  const { user, adminStatus, verifyPassword } = useAuth();
  // Set only when choose-view.tsx already made the choice (super_admin
  // picking "Entrar como Super Admin") — in that case there's nothing left
  // to ask here. Absent when reached from the drawer's "Administrador" item
  // instead (e.g. a dual-role account currently in athlete view), where the
  // chooser below is still the only place that decision gets made.
  const { target: incomingTarget } = useLocalSearchParams<{ target?: string }>();

  const [mode, setMode] = useState<Mode>('loading');
  // Which panel to open — irrelevant to the PIN itself (one PIN per
  // account, not per panel), just carried through to /admin-dashboard.
  // Defaults to 'box'; resolved for real once adminStatus.roles is known
  // (see the effect below) before the PIN flow starts.
  const [target, setTarget] = useState<PanelTarget>('box');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordPurpose, setPasswordPurpose] = useState<PasswordPurpose>('forgot');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const userId = user?.id ?? null;

  const loadStatus = useCallback(async () => {
    if (!userId) return;
    setMode('loading');
    setError('');
    try {
      const status = await getAdminPinStatus({ userId });
      if (!status.hasPin) {
        setMode('setup');
      } else if (status.lockedUntil && Date.parse(status.lockedUntil) > Date.now()) {
        setLockedUntil(Date.parse(status.lockedUntil));
        setMode('locked');
      } else {
        setMode('verify');
      }
    } catch {
      setMode('error');
    }
  }, [userId]);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!adminStatus) return; // still resolving from AuthContext

    if (incomingTarget === 'super' || incomingTarget === 'box') {
      // Already decided (choose-view.tsx) — nothing to ask.
      setTarget(incomingTarget);
      void loadStatus();
      return;
    }

    const roles = adminStatus.roles;
    if (roles.length > 1) {
      // Holds both roles (the platform owner in her own box) and arrived
      // without a pre-made choice (e.g. the drawer's "Administrador" item
      // while in athlete view) — ask which panel before the PIN.
      setMode('choose-target');
      return;
    }
    setTarget(roles[0] === 'super_admin' ? 'super' : 'box');
    void loadStatus();
  }, [user, adminStatus, incomingTarget, loadStatus]);

  const chooseTarget = (chosen: PanelTarget) => {
    setTarget(chosen);
    void loadStatus();
  };

  useEffect(() => {
    if (Platform.OS === 'web') return;
    (async () => {
      try {
        const [hasHw, enrolled] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
        ]);
        setBioAvailable(hasHw && enrolled);
      } catch {
        setBioAvailable(false);
      }
    })();
  }, []);

  // Countdown while locked; drop back to PIN entry when it expires.
  useEffect(() => {
    if (mode !== 'locked' || !lockedUntil) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNowMs(t);
      if (t >= lockedUntil) {
        setLockedUntil(null);
        setPin('');
        setError('');
        setMode('verify');
      }
    }, 1000);
    return () => clearInterval(id);
  }, [mode, lockedUntil]);

  const goToPanel = (token: string) => {
    setAdminToken(token);
    if (target === 'box' && adminStatus?.box) {
      // Name is set at "Crear mi Box" time, but encargado/ubicación/contacto
      // aren't — that form comes first, before we even know if it's worth
      // waiting on approval.
      if (!adminStatus.box.detailsComplete) {
        router.replace('/box-details' as never);
        return;
      }
      // Details are in, but a super_admin hasn't approved (or rejected /
      // suspended) it yet — no access to the panel until then.
      if (adminStatus.box.status !== 'activo') {
        router.replace('/box-waiting' as never);
        return;
      }
    }
    // Query string, not the object `params` form — see admin-dashboard.tsx's
    // reasoning for why this is the more robust way to pass it here.
    router.replace(`/admin-dashboard?target=${target}` as never);
  };

  const submitSetup = async () => {
    if (!userId) return;
    if (!/^\d{4,6}$/.test(pin)) {
      setError('El PIN debe tener entre 4 y 6 dígitos.');
      return;
    }
    if (pin !== pinConfirm) {
      setError('Los PIN no coinciden.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await setupAdminPin({ userId, pin });
      goToPanel(result.token);
    } catch {
      setError('No se pudo guardar el PIN. Reintenta.');
    } finally {
      setBusy(false);
    }
  };

  const submitVerify = async () => {
    if (!userId || pin.length < 4) return;
    setBusy(true);
    setError('');
    try {
      const result = await verifyAdminPin({ userId, pin });
      if (result.ok && result.token) {
        goToPanel(result.token);
        return;
      }
      if (result.lockedUntil) {
        setLockedUntil(Date.parse(result.lockedUntil));
        setPin('');
        setMode('locked');
        return;
      }
      setPin('');
      setError(
        `PIN incorrecto. Te ${result.remainingAttempts === 1 ? 'queda' : 'quedan'} ` +
          `${result.remainingAttempts} intento${result.remainingAttempts === 1 ? '' : 's'}.`,
      );
    } catch {
      setError('No se pudo verificar el PIN. Reintenta.');
    } finally {
      setBusy(false);
    }
  };

  const submitBiometric = async () => {
    if (!userId) return;
    setBusy(true);
    setError('');
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloquear panel de administración',
        cancelLabel: 'Usar PIN',
      });
      if (!res.success) return;
      const result = await createAdminSession({ userId });
      goToPanel(result.token);
    } catch {
      setError('No se pudo usar la biometría. Ingresa tu PIN.');
    } finally {
      setBusy(false);
    }
  };

  const openPassword = (purpose: PasswordPurpose) => {
    setPasswordPurpose(purpose);
    setPassword('');
    setError('');
    setMode('password');
  };

  const submitPassword = async () => {
    if (!userId || password.length < 4) return;
    setBusy(true);
    setError('');
    try {
      const ok = await verifyPassword(password);
      if (!ok) {
        setError('Contraseña incorrecta.');
        return;
      }
      if (passwordPurpose === 'forgot') {
        setPin('');
        setPinConfirm('');
        setPassword('');
        setMode('setup');
      } else {
        const result = await createAdminSession({ userId });
        goToPanel(result.token);
      }
    } catch {
      setError('No se pudo validar la contraseña. Reintenta.');
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  const passwordInput = (
    <View
      style={[
        styles.input,
        styles.passwordRow,
        { backgroundColor: colors.authInput, borderColor: colors.authBorder },
      ]}
    >
      <TextInput
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (error) setError('');
        }}
        placeholder="Contraseña de tu cuenta"
        placeholderTextColor={colors.authMuted}
        secureTextEntry={!showPassword}
        autoFocus
        onSubmitEditing={submitPassword}
        style={[styles.passwordInput, { color: colors.authText }]}
      />
      <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
        <Feather name={showPassword ? 'eye-off' : 'eye'} size={19} color={colors.authMuted} />
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.authBackground }]}>
      <AppHeader dark onBack={() => router.back()} />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          // Centering fights the keyboard-avoiding scroll on the modes with
          // text inputs — the confirm-PIN field and the save button could
          // end up hidden behind the keyboard. Top-aligned instead for
          // those; the short, input-less modes keep the centered look.
          (mode === 'setup' || mode === 'verify' || mode === 'password') && styles.scrollContentTop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.authText }]}>Panel de administración</Text>

        {mode === 'loading' ? (
          <Text style={[styles.subtitle, { color: colors.authMuted }]}>Cargando…</Text>
        ) : null}

        {mode === 'choose-target' ? (
          <>
            <Text style={[styles.subtitle, { color: colors.authMuted }]}>
              Tu cuenta tiene acceso a los dos paneles. ¿Cuál querés abrir?
            </Text>
            <AppButton
              label="Panel de Box"
              variant="primary"
              fullWidth
              onPress={() => chooseTarget('box')}
              style={styles.button}
            />
            <AppButton
              label="Panel de Super Admin"
              variant="outlineDark"
              fullWidth
              onPress={() => chooseTarget('super')}
              style={styles.button}
            />
          </>
        ) : null}

        {mode === 'error' ? (
          <>
            <Text style={[styles.subtitle, { color: colors.authMuted }]}>
              No se pudo cargar el estado del PIN.
            </Text>
            <AppButton label="Reintentar" variant="primary" fullWidth onPress={loadStatus} style={styles.button} />
          </>
        ) : null}

        {mode === 'setup' ? (
          <>
            <Text style={[styles.subtitle, { color: colors.authMuted }]}>
              Crea un PIN de 4 a 6 dígitos para entrar al panel.
            </Text>
            <Text style={[styles.label, { color: colors.authMuted }]}>Nuevo PIN</Text>
            <PinField value={pin} onChangeText={(v) => { setPin(v); if (error) setError(''); }} autoFocus />
            <Text style={[styles.label, { color: colors.authMuted }]}>Confirma el PIN</Text>
            <PinField value={pinConfirm} onChangeText={(v) => { setPinConfirm(v); if (error) setError(''); }} />
            {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
            <AppButton
              label="Guardar PIN"
              variant="primary"
              fullWidth
              loading={busy}
              onPress={submitSetup}
              style={styles.button}
            />
          </>
        ) : null}

        {mode === 'verify' ? (
          <>
            <Text style={[styles.subtitle, { color: colors.authMuted }]}>Ingresa tu PIN.</Text>
            <PinField
              value={pin}
              onChangeText={(v) => { setPin(v); if (error) setError(''); }}
              autoFocus
              onSubmitEditing={submitVerify}
            />
            {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
            <AppButton
              label="Entrar"
              variant="primary"
              fullWidth
              loading={busy}
              onPress={submitVerify}
              style={styles.button}
            />
            {bioAvailable ? (
              <Pressable onPress={submitBiometric} disabled={busy} style={styles.linkRow} hitSlop={8}>
                <Feather name="unlock" size={14} color={colors.primary} />
                <Text style={[styles.link, { color: colors.primary }]}>Usar Face ID / huella</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => openPassword('forgot')} hitSlop={8} style={styles.linkRow}>
              <Text style={[styles.link, { color: colors.authMuted }]}>Olvidé mi PIN</Text>
            </Pressable>
          </>
        ) : null}

        {mode === 'locked' ? (
          <>
            <Text style={[styles.subtitle, { color: colors.authMuted }]}>
              Demasiados intentos. Vuelve a intentar en{' '}
              <Text style={{ color: colors.authText, fontFamily: 'Inter_600SemiBold' }}>
                {formatRemaining((lockedUntil ?? nowMs) - nowMs)}
              </Text>
              .
            </Text>
            <AppButton
              label="Ingresar con mi contraseña"
              variant="primary"
              fullWidth
              onPress={() => openPassword('unlock')}
              style={styles.button}
            />
            <Pressable onPress={() => openPassword('forgot')} hitSlop={8} style={styles.linkRow}>
              <Text style={[styles.link, { color: colors.authMuted }]}>Olvidé mi PIN</Text>
            </Pressable>
          </>
        ) : null}

        {mode === 'password' ? (
          <>
            <Text style={[styles.subtitle, { color: colors.authMuted }]}>
              {passwordPurpose === 'forgot'
                ? 'Confirma tu contraseña para crear un PIN nuevo.'
                : 'Confirma tu contraseña para entrar al panel.'}
            </Text>
            {passwordInput}
            {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
            <AppButton
              label={passwordPurpose === 'forgot' ? 'Continuar' : 'Entrar'}
              variant="primary"
              fullWidth
              loading={busy}
              onPress={submitPassword}
              style={styles.button}
            />
            <Pressable
              onPress={() => {
                setError('');
                setMode(lockedUntil && lockedUntil > Date.now() ? 'locked' : 'verify');
              }}
              hitSlop={8}
              style={styles.linkRow}
            >
              <Text style={[styles.link, { color: colors.authMuted }]}>Volver</Text>
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
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 18,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    paddingVertical: 12,
  },
  error: { fontSize: 13, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  button: { marginTop: 6 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  link: { fontSize: 13, fontFamily: 'Inter_500Medium' },
});
