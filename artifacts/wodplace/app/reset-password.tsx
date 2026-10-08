import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { AppButton } from '@/components/AppButton';
import { useColors } from '@/hooks/useColors';
import { supabase } from '@/lib/supabase';

const MIN_PASSWORD_LENGTH = 6;

type Phase = 'checking' | 'invalid-link' | 'form' | 'success';

/**
 * Deep-link landing for the recovery email (wodplace://reset-password).
 *
 * The app's Supabase client uses the PKCE flow (see lib/supabase.ts) — the
 * code_verifier `resetPasswordForEmail` generated lives only in THIS
 * device's storage. A recovery link opened on a different phone than the
 * one that requested it has no matching verifier, so exchangeCodeForSession
 * fails there every time, by design (not a bug to fix — see 'invalid-link'
 * below for the message this surfaces as).
 */
export default function ResetPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const [phase, setPhase] = useState<Phase>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  useEffect(() => {
    (async () => {
      if (params.error || !params.code) {
        setPhase('invalid-link');
        return;
      }
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
      setPhase(exchangeError ? 'invalid-link' : 'form');
    })();
  }, [params.code, params.error]);

  const handleSubmit = async () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      // Sign out of this one-off recovery session so the next login goes
      // through the app's normal flow (AuthContext never knew about this
      // session — it was never wired into its boot/user state).
      await supabase.auth.signOut().catch(() => {});
      setPhase('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo salió mal. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.authBackground }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + webTopInset + 48, paddingBottom: insets.bottom + webBottomInset + 32 },
        ]}
        bottomOffset={40}
      >
        <View style={styles.brand}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.logo}
            contentFit="cover"
          />
          <Text style={[styles.brandText, { color: colors.authText }]}>WODPLACE</Text>
        </View>

        {phase === 'checking' ? null : phase === 'invalid-link' ? (
          <View style={styles.messageBox}>
            <Feather name="alert-triangle" size={32} color={colors.destructive} />
            <Text style={[styles.messageTitle, { color: colors.authText }]}>
              Este enlace no funciona aquí
            </Text>
            <Text style={[styles.messageBody, { color: colors.authMuted }]}>
              El enlace para elegir una nueva contraseña solo funciona en el mismo teléfono donde
              lo pediste, y una sola vez. Si lo abriste en otro dispositivo, o ya venció, pide uno
              nuevo desde ese teléfono.
            </Text>
            <AppButton
              label="Pedir un enlace nuevo"
              variant="primary"
              fullWidth
              onPress={() => router.replace('/forgot-password')}
              style={styles.actionButton}
            />
          </View>
        ) : phase === 'success' ? (
          <View style={styles.messageBox}>
            <Feather name="check-circle" size={32} color={colors.primary} />
            <Text style={[styles.messageTitle, { color: colors.authText }]}>
              Contraseña actualizada
            </Text>
            <Text style={[styles.messageBody, { color: colors.authMuted }]}>
              Ya puedes iniciar sesión con tu contraseña nueva.
            </Text>
            <AppButton
              label="Iniciar sesión"
              variant="primary"
              fullWidth
              onPress={() => router.replace('/login')}
              style={styles.actionButton}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={[styles.headline, { color: colors.authText }]}>
              Elige una contraseña nueva
            </Text>
            <View
              style={[
                styles.input,
                { backgroundColor: colors.authInput, borderColor: colors.authBorder },
              ]}
            >
              <TextInput
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  if (error) setError('');
                }}
                placeholder="Contraseña nueva"
                placeholderTextColor={colors.authMuted}
                secureTextEntry
                style={[styles.fieldInput, { color: colors.authText }]}
                autoFocus
              />
            </View>
            <View
              style={[
                styles.input,
                { backgroundColor: colors.authInput, borderColor: colors.authBorder },
              ]}
            >
              <TextInput
                value={confirmPassword}
                onChangeText={(v) => {
                  setConfirmPassword(v);
                  if (error) setError('');
                }}
                placeholder="Confirma la contraseña"
                placeholderTextColor={colors.authMuted}
                secureTextEntry
                style={[styles.fieldInput, { color: colors.authText }]}
              />
            </View>

            {error ? (
              <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
            ) : null}

            <AppButton
              label="Guardar contraseña"
              variant="primary"
              fullWidth
              loading={loading}
              onPress={handleSubmit}
              style={styles.actionButton}
            />
          </View>
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    marginBottom: 10,
  },
  brandText: {
    fontSize: 20,
    fontFamily: 'Anton_400Regular',
    letterSpacing: 1.5,
  },
  headline: {
    fontSize: 22,
    fontFamily: 'Anton_400Regular',
    textAlign: 'center',
    marginBottom: 24,
  },
  form: {
    gap: 14,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  fieldInput: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  error: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  actionButton: {
    marginTop: 6,
  },
  messageBox: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
  },
  messageTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  messageBody: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 8,
  },
});
