import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppButton } from '@/components/AppButton';
import { useColors } from '@/hooks/useColors';

/**
 * Shown right after auth resolves (boot, login, register, account
 * recovery — see AuthContext.getPostAuthRoute) for a super_admin account,
 * every single time — the choice is never remembered across sessions. A
 * box_admin (without super_admin) never lands here: they go straight to
 * the normal athlete app, same as before this screen existed.
 */
export default function ChooseViewScreen() {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
          <Feather name="shield" size={22} color={colors.secondaryForeground} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>¿Cómo querés entrar?</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Tu cuenta tiene acceso de Super Admin.
        </Text>

        <AppButton
          label="Entrar como Super Admin"
          variant="primary"
          fullWidth
          // Query string, not the object `params` form — admin-login.tsx
          // reads this to skip its own box/super chooser, since the choice
          // was already made right here.
          onPress={() => router.replace('/admin-login?target=super' as never)}
          style={styles.button}
        />
        <AppButton
          label="Ver como alumno"
          variant="outlineDark"
          fullWidth
          onPress={() => router.replace('/home')}
          style={styles.button}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { width: '100%', maxWidth: 360, alignItems: 'center', gap: 6 },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 20, fontFamily: 'Anton_400Regular', textAlign: 'center' },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 18,
  },
  button: { marginTop: 6, width: '100%' },
});
