import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { AppButton } from '@/components/AppButton';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { register, loginWithProvider } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<'email' | 'google' | 'apple' | null>(null);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const handleRegister = async () => {
    if (!name.trim()) {
      setError('Ingresa tu nombre completo');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Ingresa un email válido');
      return;
    }
    if (password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setError('');
    setLoading('email');
    try {
      await register(name.trim(), email.trim(), password);
      router.replace('/profile');
    } finally {
      setLoading(null);
    }
  };

  const handleProvider = async (provider: 'google' | 'apple') => {
    setLoading(provider);
    try {
      await loginWithProvider(provider);
      router.replace('/profile');
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.authBackground }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + webTopInset + 40, paddingBottom: insets.bottom + webBottomInset + 32 },
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

        <Text style={[styles.headline, { color: colors.authText }]}>Registrarse</Text>

        <View style={styles.form}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nombre Completo"
            placeholderTextColor={colors.authMuted}
            style={[
              styles.input,
              { backgroundColor: colors.authInput, color: colors.authText, borderColor: colors.authBorder },
            ]}
          />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={colors.authMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={[
              styles.input,
              { backgroundColor: colors.authInput, color: colors.authText, borderColor: colors.authBorder },
            ]}
          />
          <View
            style={[
              styles.input,
              styles.passwordRow,
              { backgroundColor: colors.authInput, borderColor: colors.authBorder },
            ]}
          >
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Contraseña"
              placeholderTextColor={colors.authMuted}
              secureTextEntry={!showPassword}
              style={[styles.passwordInput, { color: colors.authText }]}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={19} color={colors.authMuted} />
            </Pressable>
          </View>
          <View
            style={[
              styles.input,
              styles.passwordRow,
              { backgroundColor: colors.authInput, borderColor: colors.authBorder },
            ]}
          >
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Contraseña"
              placeholderTextColor={colors.authMuted}
              secureTextEntry={!showConfirm}
              style={[styles.passwordInput, { color: colors.authText }]}
            />
            <Pressable onPress={() => setShowConfirm((v) => !v)} hitSlop={10}>
              <Feather name={showConfirm ? 'eye-off' : 'eye'} size={19} color={colors.authMuted} />
            </Pressable>
          </View>

          {error ? (
            <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
          ) : null}

          <AppButton
            label="Crear Cuenta"
            variant="primary"
            fullWidth
            loading={loading === 'email'}
            onPress={handleRegister}
            style={styles.submitButton}
          />

          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: colors.authBorder }]} />
            <Text style={[styles.dividerText, { color: colors.authMuted }]}>O</Text>
            <View style={[styles.divider, { backgroundColor: colors.authBorder }]} />
          </View>

          <AppButton
            label="Continúa con Google"
            variant="outlineLight"
            fullWidth
            loading={loading === 'google'}
            onPress={() => handleProvider('google')}
            icon={<Ionicons name="logo-google" size={18} color={colors.authText} />}
          />
          <AppButton
            label="Continúa con Apple"
            variant="outlineLight"
            fullWidth
            loading={loading === 'apple'}
            onPress={() => handleProvider('apple')}
            icon={<Ionicons name="logo-apple" size={19} color={colors.authText} />}
            style={styles.appleButton}
          />

          <Pressable onPress={() => router.back()} style={styles.loginLink}>
            <Text style={[styles.loginText, { color: colors.authMuted }]}>
              ¿Ya tiene una cuenta?{' '}
              <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>
                Entra aquí
              </Text>
            </Text>
          </Pressable>
        </View>
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
    marginBottom: 28,
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
    fontSize: 26,
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
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    paddingVertical: 12,
  },
  error: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginTop: -6,
  },
  submitButton: {
    marginTop: 6,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 6,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  appleButton: {
    marginTop: 2,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 10,
  },
  loginText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
});
