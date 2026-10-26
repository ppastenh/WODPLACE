import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AdminLockPrompt } from '@/components/AdminLockPrompt';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { useDarkColors } from '@/hooks/useDarkColors';
import { lockSupported } from '@/lib/adminLock';
import { ENTRY_TTL_MS, ENTRY_TTL_VIA_FORM_MS, grantAdminEntry } from '@/lib/adminUnlock';

type Mode = 'loading' | 'choose-target' | 'lock';
type PanelTarget = 'box' | 'super';

/**
 * Puerta del panel de administración, a la que se llega desde el ítem "Administrador"/"Coach" del menú lateral.
 *
 * F7-a2 (2026-10-25): el PIN ya no se valida en el servidor ni emite ningún token. Es un candado LOCAL de este
 * teléfono (components/AdminLockPrompt.tsx, reglas en lib/adminLockLogic.ts): no autoriza nada, solo protege el
 * panel si alguien usa el teléfono con la app abierta. Lo que el servidor decide, siempre, es la sesión de la
 * cuenta, su rol y su box. Al desbloquear se concede un permiso de entrada de un solo uso (lib/adminUnlock.ts)
 * que admin-dashboard consume al abrirse. En la web no hay candado (SecureStore no existe ahí).
 */
export default function AdminLoginScreen() {
  const colors = useDarkColors();
  const { user, adminStatus, logout } = useAuth();
  // Set only when choose-view.tsx already made the choice (super_admin
  // picking "Entrar como Super Admin") — in that case there's nothing left
  // to ask here. Absent when reached from the drawer's "Administrador" item
  // instead (e.g. a dual-role account currently in athlete view), where the
  // chooser below is still the only place that decision gets made.
  const { target: incomingTarget } = useLocalSearchParams<{ target?: string }>();

  const [mode, setMode] = useState<Mode>('loading');
  // Which panel to open (targetRef) — irrelevant to the PIN itself (one PIN per
  // account, not per panel), just carried through to /admin-dashboard.
  // En refs (no en estado) para que elegir el panel no vuelva a disparar el efecto de más abajo.
  const targetRef = useRef<PanelTarget>('box');
  const adminStatusRef = useRef(adminStatus);
  adminStatusRef.current = adminStatus;
  const enteredRef = useRef(false);

  const goToPanel = useCallback(() => {
    if (enteredRef.current) return;
    enteredRef.current = true;
    const target = targetRef.current;
    const adminStatus = adminStatusRef.current;
    if (target === 'box' && adminStatus?.box) {
      // Name is set at "Crear mi Box" time, but encargado/ubicación/contacto
      // aren't — that form comes first, before we even know if it's worth
      // waiting on approval. El permiso dura más en este camino porque la
      // persona tarda en llenar el formulario antes de llegar al panel.
      if (!adminStatus.box.detailsComplete) {
        grantAdminEntry({ ttlMs: ENTRY_TTL_VIA_FORM_MS });
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
    grantAdminEntry({ ttlMs: ENTRY_TTL_MS });
    // Query string, not the object `params` form — see admin-dashboard.tsx's
    // reasoning for why this is the more robust way to pass it here.
    router.replace(`/admin-dashboard?target=${target}` as never);
  }, []);

  const startLock = useCallback(() => {
    if (!lockSupported) {
      // Web: sin candado (decisión de Pía): el navegador es la sesión.
      goToPanel();
      return;
    }
    setMode('lock');
  }, [goToPanel]);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!adminStatus) return; // still resolving from AuthContext

    if (incomingTarget === 'super' || incomingTarget === 'box') {
      // Already decided (choose-view.tsx) — nothing to ask.
      targetRef.current = incomingTarget;
      startLock();
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
    targetRef.current = roles[0] === 'super_admin' ? 'super' : 'box';
    startLock();
  }, [user, adminStatus, incomingTarget, startLock]);

  const chooseTarget = (chosen: PanelTarget) => {
    targetRef.current = chosen;
    startLock();
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (!user) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.authBackground }]}>
      <AppHeader dark onBack={() => router.back()} />

      {mode === 'loading' ? (
        <View style={styles.center}>
          <Text style={[styles.title, { color: colors.authText }]}>Panel de administración</Text>
          <Text style={[styles.subtitle, { color: colors.authMuted }]}>Cargando…</Text>
        </View>
      ) : null}

      {mode === 'choose-target' ? (
        <View style={styles.center}>
          <Text style={[styles.title, { color: colors.authText }]}>Panel de administración</Text>
          <Text style={[styles.subtitle, { color: colors.authMuted }]}>
            Tu cuenta tiene acceso a los dos paneles. ¿Cuál quieres abrir?
          </Text>
          {/* Botones propios en vez de AppButton: ese componente siempre
              toma sus colores de useColors() (paleta clara), nunca de la
              paleta oscura de este panel (useDarkColors) -- con la
              variante "outlineDark" eso dejaba el texto casi negro sobre
              un fondo casi negro. Fondo sólido en los dos estados,
              nunca opacidad, para que el contraste no dependa de lo que
              haya detrás. */}
          <Pressable
            onPress={() => chooseTarget('box')}
            style={({ pressed }) => [
              styles.panelButton,
              { backgroundColor: pressed ? colors.primaryPressed : colors.primary },
            ]}
          >
            <Text style={[styles.panelButtonLabel, { color: colors.primaryForeground }]}>Panel de Box</Text>
          </Pressable>
          <Pressable
            onPress={() => chooseTarget('super')}
            style={({ pressed }) => [
              styles.panelButtonOutline,
              { borderColor: colors.authBorder },
              pressed && { backgroundColor: colors.secondary },
            ]}
          >
            <Text style={[styles.panelButtonLabel, { color: colors.authText }]}>Panel de Super Admin</Text>
          </Pressable>
        </View>
      ) : null}

      {mode === 'lock' && Platform.OS !== 'web' ? (
        <AdminLockPrompt userId={user.id} variant="entry" onUnlocked={goToPanel} onLogout={handleLogout} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 22, fontFamily: 'Anton_400Regular', textAlign: 'center' },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', marginBottom: 8, lineHeight: 18 },
  panelButton: {
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  panelButtonOutline: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  panelButtonLabel: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
