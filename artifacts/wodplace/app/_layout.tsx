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

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

configureApiClient();

const queryClient = new QueryClient();

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
        <Stack.Screen name="register" />
        <Stack.Screen name="home" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="community" />
        <Stack.Screen name="calendar" />
        <Stack.Screen name="progress" />
        <Stack.Screen name="personal-data" />
        <Stack.Screen name="box-detail" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="plan" />
        <Stack.Screen name="active-contracts" />
        <Stack.Screen name="admin-login" />
        <Stack.Screen name="admin-dashboard" />
        <Stack.Screen name="more" />
      </Stack>
      {showBottomNav ? <BottomNavBar /> : null}
    </>
  );
}

export default function RootLayout() {
  const [interLoaded, interError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [antonLoaded, antonError] = useAntonFonts({ Anton_400Regular });

  const fontsLoaded = interLoaded && antonLoaded;
  const fontError = interError || antonError;

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
