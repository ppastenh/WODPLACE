import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useCreateAdminDashLink } from '@workspace/api-client-react';
import { AppHeader } from '@/components/AppHeader';
import { useColors } from '@/hooks/useColors';
import { getAdminToken } from '@/lib/adminSession';
import { resolveDashboardUrl } from '@/lib/dashboardUrl';

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
  const colors = useColors();
  const [token, setToken] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const startedRef = useRef(false);
  const dashboardOrigin = resolveDashboardUrl();

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
      .mutateAsync()
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
          '| redirect_to param =',
          redirectTo ?? '<none>',
        );
        setUri(res.url);
      })
      .catch((err) => {
        // Falling back to the plain dashboard URL means the admin will see
        // box-admin's normal email/password login instead of landing in
        // directly. Log why so this is diagnosable from Metro/Expo logs
        // instead of silently guessing next time it happens.
        console.warn(
          '[dash-webview] dash-link failed, falling back to manual login:',
          err?.status ?? '?',
          err?.data ?? err?.message ?? err,
        );
        setUri(`${dashboardOrigin}/`);
      });
  }, [token, dashboardOrigin, dashLink]);

  if (!token) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader onBack={() => router.replace('/profile')} />
      {!dashboardOrigin ? (
        <View style={styles.center}>
          <Feather name="alert-triangle" size={28} color={colors.mutedForeground} />
          <Text style={[styles.msg, { color: colors.foreground }]}>
            Panel no configurado
          </Text>
          <Text style={[styles.msgSub, { color: colors.mutedForeground }]}>
            Definí EXPO_PUBLIC_DASHBOARD_URL en el .env.local de la app.
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
          // --- Diagnostics: trace every URL the WebView touches. ---
          onShouldStartLoadWithRequest={(req) => {
            console.log('[dash-webview] start load →', safeUrl(req.url));
            return true;
          }}
          onLoadStart={(e) =>
            console.log('[dash-webview] loadStart →', safeUrl(e.nativeEvent.url))
          }
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
});
