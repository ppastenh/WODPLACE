import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useCreateAdminDashLink } from '@workspace/api-client-react';
import { AdminLockPrompt } from '@/components/AdminLockPrompt';
import { AppHeader } from '@/components/AppHeader';
import { CancelConfirmModal } from '@/components/CancelConfirmModal';
import { useAuth } from '@/context/AuthContext';
import { useDarkColors } from '@/hooks/useDarkColors';
import { shouldRelock } from '@/lib/adminLockLogic';
import { consumeAdminEntry, releaseAdminEntry } from '@/lib/adminUnlock';
import { resolveDashboardUrl, resolveSuperAdminUrl } from '@/lib/dashboardUrl';

/**
 * Post-candado admin screen. Shows the full box-admin dashboard inside a WebView.
 *
 * F7-a2 (2026-10-25): se entra solo con el permiso de un solo uso que concede el candado local (lib/adminUnlock.ts);
 * sin permiso (enlace profundo, botón "atrás", otra pantalla) se vuelve a /admin-login. Si la app vuelve de segundo
 * plano tras 2 minutos o más, el candado se pone ENCIMA del panel, que queda detrás sin perder su estado.
 *
 * On open it asks api-server for a one-time Supabase magic link
 * (`POST /admin/dash-link`) so the admin lands logged in, without a second
 * login. If that can't be resolved (no linked Supabase account, misconfig,
 * network error) it falls back to the plain dashboard URL, which just shows
 * box-admin's normal email/password login — the same screen a desktop user
 * sees.
 */

/**
 * Messages box-admin posts up via `window.ReactNativeWebView.postMessage`
 * (see box-admin's `src/lib/rnBridge.ts` for the contract, kept in sync
 * with this handler):
 *   - `copy-to-clipboard` — box-admin can't rely on `navigator.clipboard`
 *     inside this WebView (WKWebView and Android's embedded WebView don't
 *     reliably implement it), so it posts the text here and we copy it on
 *     its behalf using the app's real clipboard access.
 *   - `admin-alerts-count` — the admin notification bell now lives in this
 *     screen's native header (see below) instead of box-admin's own header;
 *     this is how it learns the current count.
 *   - `open-member-profile` — box-admin's "Ver perfil" hands off to this
 *     screen's own public profile (the same one Comunidad opens) instead of
 *     showing its own page, since there's a real app to jump to here.
 */
function createWebViewMessageHandler(onAlertsCount: (count: number) => void) {
  return (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.type === 'copy-to-clipboard' && typeof data.text === 'string') {
        Clipboard.setStringAsync(data.text);
      } else if (data?.type === 'admin-alerts-count' && typeof data.count === 'number') {
        onAlertsCount(data.count);
      } else if (data?.type === 'open-member-profile' && typeof data.userId === 'string') {
        router.push({
          pathname: '/member/[id]',
          params: { id: data.userId, name: typeof data.name === 'string' ? data.name : undefined },
        });
      }
    } catch {
      // Not a message we understand — ignore.
    }
  };
}

/**
 * The reverse direction has no message channel — `injectJavaScript` runs
 * this script inside the WebView, calling the global box-admin's
 * `NotificationsBell.tsx` registers to open its drawer. The trailing
 * `true;` is required by the WebView on iOS.
 */
const OPEN_ADMIN_NOTIFICATIONS_SCRIPT =
  'window.__wodplaceOpenNotifications && window.__wodplaceOpenNotifications(); true;';

/** Strip query/hash so we never print the one-time token / access_token. */
function safeUrl(raw: string | undefined | null): string {
  if (!raw) return `<${raw === '' ? 'empty' : String(raw)}>`;
  try {
    const u = new URL(raw);
    return `${u.origin}${u.pathname}`;
  } catch {
    return `<unparseable: ${raw.slice(0, 40)}>`;
  }
}

/**
 * Only two destinations ever need to load INSIDE this WebView:
 *   - the dashboard itself (`dashboardOrigin` — box-admin or super-admin;
 *     already env-driven, so this also covers LAN dev URLs, not just prod)
 *   - Supabase's own `/auth/v1/verify` hop, which is how the one-time
 *     dash-link logs the admin in before redirecting back to the dashboard
 * Everything else (signed contract PDFs on the SAME Supabase project at
 * `/storage/v1/object/sign/...`, any outbound link box-admin opens) must
 * open in the phone's own browser via `Linking`, never load here and never
 * be silently swallowed.
 */
function isAllowedInWebView(rawUrl: string, dashboardOrigin: string | null): boolean {
  if (!dashboardOrigin) return false;
  try {
    const url = new URL(rawUrl);
    if (url.origin === dashboardOrigin) return true;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && url.origin === new URL(supabaseUrl).origin) {
      return url.pathname.startsWith('/auth/v1/verify');
    }
    return false;
  } catch {
    return false;
  }
}

export default function AdminDashboardScreen() {
  const colors = useDarkColors();
  const { adminStatus, user, logout } = useAuth();
  // 'box' (default) preserves every existing box_admin behavior unchanged;
  // 'super' comes from admin-login.tsx's target chooser/auto-pick.
  const { target: targetParam } = useLocalSearchParams<{ target?: string }>();
  const target: 'box' | 'super' = targetParam === 'super' ? 'super' : 'box';
  const isSuperAdmin = !!adminStatus?.roles.includes('super_admin');

  // true cuando el candado concedió el permiso de entrada (se gasta al abrir esta pantalla).
  const [entered, setEntered] = useState(false);
  // El candado encima del panel tras volver de 2 minutos o más en segundo plano.
  const [relock, setRelock] = useState(false);
  const backgroundedAtRef = useRef<number | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [alertCount, setAlertCount] = useState(0);
  // Exiting this screen means going through /admin-login (and the PIN) again
  // next time — the entry permit is single-use and released on unmount — so it's gated behind a
  // confirmation instead of a bare tap, and its header icon is deliberately
  // not the usual back arrow (box-admin's own internal "Volver" links sit
  // right below it and use that same arrow-left look for a much cheaper,
  // in-panel action).
  const [confirmExit, setConfirmExit] = useState(false);
  // Tracks which target the current `uri` was fetched for (not just
  // whether *a* fetch happened) — if this screen instance ever gets reused
  // for a different target instead of a fresh mount, a stale link for the
  // wrong panel must not stick around unrefreshed.
  const startedForRef = useRef<'box' | 'super' | null>(null);
  const webViewRef = useRef<WebView>(null);
  const dashboardOrigin = target === 'super' ? resolveSuperAdminUrl() : resolveDashboardUrl();
  const handleWebViewMessage = useRef(createWebViewMessageHandler(setAlertCount)).current;

  // dash-link se decide en el servidor por la sesión de la cuenta y su rol (F2b): no lleva token ni cabecera.
  const dashLink = useCreateAdminDashLink();

  const enteredOnceRef = useRef(false);
  useEffect(() => {
    if (!enteredOnceRef.current) {
      if (!consumeAdminEntry()) {
        router.replace('/admin-login');
        return;
      }
      enteredOnceRef.current = true;
      setEntered(true);
    }
    // Al salir de la pantalla no queda ningún permiso: volver a entrar pasa otra vez por el candado.
    return () => releaseAdminEntry();
  }, []);

  // Cambio entre apps / segundo plano: tras 2 minutos o más, el candado vuelve a taparlo todo.
  useEffect(() => {
    if (!entered || Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundedAtRef.current = Date.now();
      } else if (state === 'active') {
        const since = backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        if (since !== null && shouldRelock(since, Date.now())) setRelock(true);
      }
    });
    return () => sub.remove();
  }, [entered]);

  useEffect(() => {
    if (!entered || !dashboardOrigin || startedForRef.current === target) return;
    startedForRef.current = target;
    setUri(null); // clear any link fetched for a previous target first
    dashLink
      .mutateAsync({ data: { target } })
      .then((res) => {
        let redirectTo: string | null = null;
        try {
          redirectTo = new URL(res.url).searchParams.get('redirect_to');
        } catch {
          // ignore
        }
        if (__DEV__) {
          console.log(
            '[dash-webview] got dash-link →',
            safeUrl(res.url),
            '| target =',
            target,
            '| redirect_to param =',
            redirectTo ?? '<none>',
          );
        }
        setUri(res.url);
      })
      .catch((err) => {
        // Falling back to the plain dashboard URL means the admin will see
        // that panel's normal email/password login instead of landing in
        // directly. Log why so this is diagnosable from Metro/Expo logs
        // instead of silently guessing next time it happens.
        if (__DEV__) {
          console.warn(
            '[dash-webview] dash-link failed, falling back to manual login:',
            err?.status ?? '?',
            err?.data ?? err?.message ?? err,
          );
        }
        setUri(`${dashboardOrigin}/`);
      });
  }, [entered, dashboardOrigin, target, dashLink]);

  const viewAsAthlete = () => {
    router.replace('/home');
  };

  if (!entered) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        onBack={() => setConfirmExit(true)}
        backIcon="x"
        dark
        adminAlertCount={alertCount}
        onPressAdminAlerts={() => webViewRef.current?.injectJavaScript(OPEN_ADMIN_NOTIFICATIONS_SCRIPT)}
        rightExtra={
          // Only super_admin gets a way back to the athlete view — a
          // box_admin's entry point never changes (see AuthContext's
          // getPostAuthRoute), so there's nothing to switch back from.
          isSuperAdmin ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ver como alumno"
              onPress={viewAsAthlete}
              hitSlop={12}
              style={({ pressed }) => [styles.viewToggle, pressed && styles.viewTogglePressed]}
            >
              <Feather name="user" size={20} color={colors.foreground} />
            </Pressable>
          ) : null
        }
      />
      {!dashboardOrigin ? (
        <View style={styles.center}>
          <Feather name="alert-triangle" size={28} color={colors.mutedForeground} />
          <Text style={[styles.msg, { color: colors.foreground }]}>
            Panel no configurado
          </Text>
          <Text style={[styles.msgSub, { color: colors.mutedForeground }]}>
            Define {target === 'super' ? 'EXPO_PUBLIC_SUPERADMIN_URL' : 'EXPO_PUBLIC_DASHBOARD_URL'} en
            el .env.local de la app.
          </Text>
        </View>
      ) : !uri ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.msgSub, { color: colors.mutedForeground }]}>
            Abriendo el panel…
          </Text>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{ uri }}
          style={{ flex: 1, backgroundColor: colors.background }}
          startInLoadingState
          renderLoading={() => (
            <View
              style={[
                styles.center,
                styles.loadingOverlay,
                { backgroundColor: colors.background },
              ]}
            >
              <ActivityIndicator color={colors.primary} />
            </View>
          )}
          // Keep the box-admin session between opens so the magic link is
          // only needed the first time (or after it expires).
          incognito={false}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled={false}
          domStorageEnabled
          originWhitelist={['*']}
          onMessage={handleWebViewMessage}
          // Only the dashboard itself and Supabase's /auth/v1/verify hop may
          // load inside this WebView (see isAllowedInWebView). Everything
          // else — signed contract PDFs, any outbound link — opens in the
          // phone's own browser via Linking instead of being blocked in
          // silence.
          onShouldStartLoadWithRequest={(req) => {
            if (__DEV__) console.log('[dash-webview] start load →', safeUrl(req.url));
            if (isAllowedInWebView(req.url, dashboardOrigin)) return true;
            Linking.openURL(req.url).catch((err) => {
              if (__DEV__) console.warn('[dash-webview] Linking.openURL failed', err);
            });
            return false;
          }}
          onLoadStart={(e) => {
            // A fresh navigation means box-admin hasn't posted a count yet
            // for this page — don't keep showing the previous one's.
            setAlertCount(0);
            if (__DEV__) console.log('[dash-webview] loadStart →', safeUrl(e.nativeEvent.url));
          }}
          onNavigationStateChange={(nav: WebViewNavigation) => {
            if (__DEV__) {
              console.log('[dash-webview] nav →', safeUrl(nav.url), '| loading:', nav.loading);
            }
          }}
          onLoadEnd={(e) => {
            if (__DEV__) console.log('[dash-webview] loadEnd →', safeUrl(e.nativeEvent.url));
          }}
          onError={(e) => {
            if (__DEV__) {
              console.warn('[dash-webview] ERROR', {
                url: safeUrl(e.nativeEvent.url),
                code: e.nativeEvent.code,
                domain: (e.nativeEvent as any).domain,
                description: e.nativeEvent.description,
              });
            }
          }}
          onHttpError={(e) => {
            if (__DEV__) {
              console.warn('[dash-webview] HTTP ERROR', {
                url: safeUrl(e.nativeEvent.url),
                status: e.nativeEvent.statusCode,
              });
            }
          }}
        />
      )}
      <CancelConfirmModal
        visible={confirmExit}
        onClose={() => setConfirmExit(false)}
        onConfirm={() => {
          setConfirmExit(false);
          router.replace('/profile');
        }}
        title="¿Salir del panel de administrador?"
        subtitle="Vas a necesitar ingresar el PIN nuevamente para volver a entrar."
        confirmLabel="Salir"
        cancelLabel="Seguir aquí"
      />
      {relock && user ? (
        <View style={styles.relockOverlay}>
          <AdminLockPrompt
            userId={user.id}
            variant="relock"
            onUnlocked={() => setRelock(false)}
            onLogout={async () => {
              await logout();
              router.replace('/login');
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  loadingOverlay: { ...StyleSheet.absoluteFill },
  // Tapa TODO (también el encabezado) y deja el panel montado debajo, con su estado.
  relockOverlay: { ...StyleSheet.absoluteFill, zIndex: 100, elevation: 100 },
  msg: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  msgSub: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  viewToggle: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  viewTogglePressed: { opacity: 0.6 },
});
