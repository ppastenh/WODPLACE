import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { AppButton } from '@/components/AppButton';
import { requestAccountRecovery } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = 'email' | 'code' | 'password';

/**
 * Account recovery for a new device / cleared data. The local id (and its
 * password) live only in AsyncStorage, so there's nothing to "reset" — this
 * proves ownership of the email on file and re-adopts the existing server
 * account with a fresh local password.
 */
export default function RecoverAccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { recoverAccount, getPostAuthRoute } = useAuth();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(emailParam ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const handleRequest = async () => {
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Ingresá un email válido');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await requestAccountRecovery(email.trim());
      setStep('code');
    } catch {
      setError('No se pudo procesar la solicitud. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = () => {
    if (!/^\d{6}$/.test(code)) {
      setError('El código son 6 dígitos');
      return;
    }
    setError('');
    setStep('password');
  };

  const handleFinish = async () => {
    if (password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await recoverAccount(email.trim(), code, password);
      router.replace(getPostAuthRoute('/profile') as never);
    } catch (e) {
      // A wrong/expired code / lockout surfaces here (verify runs inside
      // recoverAccount) — show the server's message, not the HTTP prefix.
      const serverMsg = (e as { data?: { error?: string } })?.data?.error;
      setError(serverMsg ?? 'No se pudo recuperar la cuenta. Intentá de nuevo.');
      setStep('code');
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
          <Image source={require('@/assets/images/icon.png')} style={styles.logo} contentFit="cover" />
          <Text style={[styles.brandText, { color: colors.authText }]}>WODPLACE</Text>
        </View>

        <View style={styles.stepHeader}>
          <Pressable
            onPress={() => (step === 'email' ? router.back() : setStep('email'))}
            hitSlop={10}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={20} color={colors.authText} />
          </Pressable>
          <Text style={[styles.headline, { color: colors.authText }]}>Recuperar mi cuenta</Text>
        </View>

        {step === 'email' && (
          <View style={styles.form}>
            <Text style={[styles.hint, { color: colors.authMuted }]}>
              Te enviaremos un código de 6 dígitos al email de tu cuenta para que recuperes el
              acceso en este dispositivo.
            </Text>
            <TextInput
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (error) setError('');
              }}
              placeholder="Email de tu cuenta"
              placeholderTextColor={colors.authMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={[
                styles.input,
                { backgroundColor: colors.authInput, color: colors.authText, borderColor: colors.authBorder },
              ]}
              autoFocus
            />
            {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
            <AppButton
              label="Enviar código"
              variant="primary"
              fullWidth
              loading={loading}
              onPress={handleRequest}
              style={styles.submitButton}
            />
          </View>
        )}

        {step === 'code' && (
          <View style={styles.form}>
            <Text style={[styles.hint, { color: colors.authMuted }]}>
              Si ese email está registrado, te enviamos un código de 6 dígitos. Vence en 10
              minutos.
            </Text>
            <TextInput
              value={code}
              onChangeText={(v) => {
                setCode(v.replace(/\D/g, '').slice(0, 6));
                if (error) setError('');
              }}
              placeholder="000000"
              placeholderTextColor={colors.authMuted}
              keyboardType="number-pad"
              maxLength={6}
              style={[
                styles.input,
                styles.codeInput,
                { backgroundColor: colors.authInput, color: colors.authText, borderColor: colors.authBorder },
              ]}
              autoFocus
            />
            {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
            <AppButton
              label="Continuar"
              variant="primary"
              fullWidth
              onPress={handleVerify}
              style={styles.submitButton}
            />
            <Pressable onPress={handleRequest} hitSlop={8} style={styles.resendLink}>
              <Text style={[styles.resendText, { color: colors.primary }]}>Reenviar código</Text>
            </Pressable>
          </View>
        )}

        {step === 'password' && (
          <View style={styles.form}>
            <Text style={[styles.hint, { color: colors.authMuted }]}>
              Elegí una contraseña nueva para este dispositivo.
            </Text>
            <View
              style={[
                styles.input,
                styles.passwordRow,
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
                secureTextEntry={!showPassword}
                style={[styles.passwordInput, { color: colors.authText }]}
                autoFocus
              />
              <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={19} color={colors.authMuted} />
              </Pressable>
            </View>
            {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
            <AppButton
              label="Recuperar cuenta"
              variant="primary"
              fullWidth
              loading={loading}
              onPress={handleFinish}
              style={styles.submitButton}
            />
          </View>
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },
  brand: { alignItems: 'center', marginBottom: 36 },
  logo: { width: 56, height: 56, borderRadius: 16, marginBottom: 10 },
  brandText: { fontSize: 20, fontFamily: 'Anton_400Regular', letterSpacing: 1.5 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  backButton: { position: 'absolute', left: 0, zIndex: 1 },
  headline: { flex: 1, fontSize: 26, fontFamily: 'Anton_400Regular', textAlign: 'center' },
  form: { gap: 14 },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  codeInput: { fontSize: 24, letterSpacing: 8, textAlign: 'center', fontFamily: 'Inter_700Bold' },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  passwordInput: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular', paddingVertical: 12 },
  hint: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18, marginBottom: 4 },
  error: { fontSize: 13, fontFamily: 'Inter_500Medium', marginTop: -6 },
  submitButton: { marginTop: 6 },
  resendLink: { alignItems: 'center', paddingVertical: 8 },
  resendText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});
