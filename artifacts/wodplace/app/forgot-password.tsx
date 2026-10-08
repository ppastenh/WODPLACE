import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { AppButton } from '@/components/AppButton';
import { useColors } from '@/hooks/useColors';
import { supabase } from '@/lib/supabase';

/**
 * Always shows the same outcome regardless of whether the email belongs to
 * a real account — never reveal which emails are registered. This also
 * covers Google-only accounts gracefully: Supabase sends the recovery email
 * and lets `reset-password.tsx` add a password credential to that account
 * either way, so there's nothing to special-case here (same message for
 * everyone; the success copy just also mentions Google as an alternative).
 */
export default function ForgotPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(emailParam ?? '');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const isValidEmail = /\S+@\S+\.\S+/.test(email.trim());

  const handleSubmit = async () => {
    if (!isValidEmail) return;
    setLoading(true);
    try {
      const redirectTo = AuthSession.makeRedirectUri({ scheme: 'wodplace', path: 'reset-password' });
      await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    } catch {
      // Swallowed on purpose — the outcome shown to the user never depends
      // on whether this actually found an account or hit a network error.
      // A real send failure isn't actionable for the user here anyway.
    } finally {
      setLoading(false);
      setSent(true);
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

        <View style={styles.stepHeader}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backButton}>
            <Feather name="arrow-left" size={20} color={colors.authText} />
          </Pressable>
          <Text style={[styles.headline, styles.headlineWithBack, { color: colors.authText }]}>
            Recuperar contraseña
          </Text>
        </View>

        {sent ? (
          <View style={styles.sentBox}>
            <Feather name="mail" size={32} color={colors.primary} />
            <Text style={[styles.sentTitle, { color: colors.authText }]}>
              Si el correo existe, te enviamos un enlace
            </Text>
            <Text style={[styles.sentBody, { color: colors.authMuted }]}>
              Revisa tu bandeja de entrada (y spam). El enlace solo funciona en este mismo
              teléfono. Si te registraste con Google, puedes seguir usando ese botón para entrar.
            </Text>
            <AppButton
              label="Volver al inicio de sesión"
              variant="primary"
              fullWidth
              onPress={() => router.replace('/login')}
              style={styles.entrarButton}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={[styles.hint, { color: colors.authMuted }]}>
              Ingresa el correo de tu cuenta y te enviaremos un enlace para elegir una contraseña
              nueva.
            </Text>
            <View
              style={[
                styles.input,
                { backgroundColor: colors.authInput, borderColor: colors.authBorder },
              ]}
            >
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Correo electrónico"
                placeholderTextColor={colors.authMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={[styles.emailInput, { color: colors.authText }]}
                autoFocus
              />
            </View>
            <AppButton
              label="Enviar enlace"
              variant="primary"
              fullWidth
              disabled={!isValidEmail}
              loading={loading}
              onPress={handleSubmit}
              style={styles.entrarButton}
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
    fontSize: 24,
    fontFamily: 'Anton_400Regular',
    textAlign: 'center',
    marginBottom: 28,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    zIndex: 1,
  },
  headlineWithBack: {
    flex: 1,
    marginBottom: 0,
  },
  form: {
    gap: 14,
  },
  hint: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
    marginBottom: 4,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  emailInput: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  entrarButton: {
    marginTop: 6,
  },
  sentBox: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
  },
  sentTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  sentBody: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 8,
  },
});
