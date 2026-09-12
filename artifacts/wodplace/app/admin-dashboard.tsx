import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useCreateAdminDashLink } from '@workspace/api-client-react';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { useDarkColors } from '@/hooks/useDarkColors';
import { getAdminToken } from '@/lib/adminSession';
import { resolveDashboardUrl, resolveSuperAdminUrl } from '@/lib/dashboardUrl';

/**
 * Post-PIN admin screen. Shows the full box-admin dashboard inside a WebView.
 *
 * On open it asks api-server for a one-time Supabase magic link
 * (`POST /admin/dash-link`) so the admin lands logged in, without a second
 * login. If that can't be resolved (no linked Supabase account, misconfig,
 * network error) it falls back to the plain dashboard URL, which just shows
 * box-admin's normal email/password login — the same screen a desktop user
 * sees.
 *
 * The reduced native tools that used to live here (box name, contract
 * acceptances, moderation reports) moved to `/more`.
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

export default function AdminDashboardScreen() {
  const colors = useDarkColors();
  const { adminStatus, setAdminViewMode } = useAuth();
  // 'box' (default) preserves every existing box_admin behavior unchanged;
  // 'super' comes from admin-login.tsx's target chooser/auto-pick.
  const { target: targetParam } = useLocalSearchParams<{ target?: string }>();
  const target: 'box' | 'super' = targetParam === 'super' ? 'super' : 'box';
  const isSuperAdmin = !!adminStatus?.roles.includes('super_admin');

  const [token, setToken] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [alertCount, setAlertCount] = useState(0);
  const startedRef = useRef(false);
  const webViewRef = useRef<WebView>(null);
  const dashboardOrigin = target === 'super' ? resolveSuperAdminUrl() : resolveDashboardUrl();
  const handleWebViewMessage = useRef(createWebViewMessageHandler(setAlertCount)).current;

  const dashLink = useCreateAdminDashLink({
    request: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  });

  useEffect(() => {
    const stored = getAdminToken();
    if (!stored) {
      router.replace('/admin-login');
      return;
    }
    setToken(stored);
  }, []);

  useEffect(() => {
    if (!token || !dashboardOrigin || startedRef.current) return;
    startedRef.current = true;
    dashLink
      .mutateAsync({ data: { target } })
      .then((res) => {
        let redirectTo: string | null = null;
        try {
          redirectTo = new URL(res.url).searchParams.get('redirect_to');
        } catch {
          // ignore
        }
        console.log(
          '[dash-webview] got dash-link →',
          safeUrl(res.url),
          '| target =',
          target,
          '| redirect_to param =',
          redirectTo ?? '<none>',
        );
        setUri(res.url);
      })
      .catch((err) => {
        // Falling back to the plain dashboard URL means the admin will see
        // that panel's normal email/password login instead of landing in
        // directly. Log why so this is diagnosable from Metro/Expo logs
        // instead of silently guessing next time it happens.
        console.warn(
          '[dash-webview] dash-link failed, falling back to manual login:',
          err?.status ?? '?',
          err?.data ?? err?.message ?? err,
        );
        setUri(`${dashboardOrigin}/`);
      });
  }, [token, dashboardOrigin, target, dashLink]);

  const viewAsAthlete = () => {
    setAdminViewMode('athlete');
    router.replace('/home');
  };

  if (!token) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        onBack={() => router.replace('/profile')}
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
            Definí {target === 'super' ? 'EXPO_PUBLIC_SUPERADMIN_URL' : 'EXPO_PUBLIC_DASHBOARD_URL'} en
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
          domStorageEnabled
          originWhitelist={['*']}
          onMessage={handleWebViewMessage}
          // --- Diagnostics: trace every URL the WebView touches. ---
          onShouldStartLoadWithRequest={(req) => {
            console.log('[dash-webview] start load →', safeUrl(req.url));
            return true;
          }}
          onLoadStart={(e) => {
            // A fresh navigation means box-admin hasn't posted a count yet
            // for this page — don't keep showing the previous one's.
            setAlertCount(0);
            console.log('[dash-webview] loadStart →', safeUrl(e.nativeEvent.url));
          }}
          onNavigationStateChange={(nav) =>
            console.log(
              '[dash-webview] nav →',
              safeUrl(nav.url),
              '| loading:',
              nav.loading,
            )
          }
          onLoadEnd={(e) =>
            console.log('[dash-webview] loadEnd →', safeUrl(e.nativeEvent.url))
          }
          onError={(e) =>
            console.warn('[dash-webview] ERROR', {
              url: safeUrl(e.nativeEvent.url),
              code: e.nativeEvent.code,
              domain: (e.nativeEvent as any).domain,
              description: e.nativeEvent.description,
            })
          }
          onHttpError={(e) =>
            console.warn('[dash-webview] HTTP ERROR', {
              url: safeUrl(e.nativeEvent.url),
              status: e.nativeEvent.statusCode,
            })
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  loadingOverlay: { ...StyleSheet.absoluteFill },
  msg: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  msgSub: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  viewToggle: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  viewTogglePressed: { opacity: 0.6 },
});
