import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

/**
 * Fase 5 (Google real login) — the redirect target Google/Supabase send the
 * browser back to. Deliberately does nothing on its own: no auth checks, no
 * navigation. Before this existed, the redirect had no explicit path
 * (`wodplace://`/`exp://host:port` with nothing after it), which expo-router
 * treated as an incoming deep link to the app's ROOT — racing its own
 * navigation against `WebBrowser.openAuthSessionAsync`'s handling of that
 * exact same URL inside loginWithGoogle(), sometimes interrupting it
 * mid-flight. Landing here instead is inert, so whichever `router.replace(...)`
 * loginWithGoogle() ends up calling (once it actually finishes) simply
 * replaces this screen — nothing here competes with it.
 */
export default function AuthCallbackScreen() {
  const colors = useColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
