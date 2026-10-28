import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Anton_400Regular, useFonts as useAntonFonts } from '@expo-google-fonts/anton';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { BookingProvider } from '@/context/BookingContext';
import { NotificationsProvider } from '@/context/NotificationsContext';
import { configureApiClient } from '@/lib/apiConfig';
import { BottomNavBar, isBottomNavRoute } from '@/components/BottomNavBar';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

configureApiClient();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Was unset (defaults to 0 — every mount/remount refetched
      // immediately, no caching benefit at all). A short window means
      // quickly revisiting a screen doesn't re-hit the network, while
      // data still feels fresh. Screens that need to react to a change
      // made elsewhere still `useFocusEffect(() => refetch())`.
      staleTime: 30_000,
      // React Native has no browser "window focus" event — without a
      // focusManager wired to AppState, this default is a no-op here
      // anyway, but set explicitly so it's not relying on a browser-only
      // behavior that happens not to fire.
      refetchOnWindowFocus: false,
      // S4 (auditoría de seguridad): sin esto, React Query reintenta
      // cualquier query fallida 3 veces por defecto -- incluido un 429
      // del límite general nuevo de api-server, que es exactamente lo
      // contrario de lo que ese límite pide (bajar el ritmo). Nunca
      // reintentar un 4xx (son errores del cliente, reintentar no los
      // arregla); sí reintentar una vez más un error de red/5xx real.
      retry: (failureCount, error) => {
        const status = (error as { status?: number } | null)?.status;
        if (typeof status === "number" && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      // Respeta Retry-After si el servidor lo manda (siempre en un 429
      // de express-rate-limit); si no, el backoff exponencial de por
      // defecto de React Query.
      retryDelay: (attemptIndex, error) => {
        const retryAfter = (error as { headers?: Headers } | null)?.headers?.get?.("retry-after");
        const seconds = retryAfter ? Number(retryAfter) : NaN;
        if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
        return Math.min(1000 * 2 ** attemptIndex, 30_000);
      },
    },
  },
});

function RootLayoutNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  // Keep the five primary destinations in the shared shell. Secondary flows
  // such as contracts, notifications and personal data intentionally hide it.
  const showBottomNav = !!user && isBottomNavRoute(pathname);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="login-password" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="auth-callback" />
        <Stack.Screen name="register" />
        <Stack.Screen name="home" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="community" />
        <Stack.Screen name="calendar" />
        <Stack.Screen name="rm" />
        <Stack.Screen name="personal-data" />
        <Stack.Screen name="box-detail" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="plan" />
        <Stack.Screen name="active-contracts" />
        <Stack.Screen name="admin-login" />
        <Stack.Screen name="admin-dashboard" />
      </Stack>
      {showBottomNav ? <BottomNavBar /> : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  );
}

function RootLayoutContent() {
  const { ready: themeReady } = useTheme();
  const [interLoaded, interError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [antonLoaded, antonError] = useAntonFonts({ Anton_400Regular });

  // El splash se mantiene hasta leer también la preferencia de tema, así no hay parpadeo al abrir.
  const fontsLoaded = interLoaded && antonLoaded && themeReady;
  const fontError = (interError || antonError) && themeReady;

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <AuthProvider>
                <NotificationsProvider>
                  <BookingProvider>
                    <RootLayoutNav />
                  </BookingProvider>
                </NotificationsProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
