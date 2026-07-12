import React, { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { AppButton } from '@/components/AppButton';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = emailParam ?? '';
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  useEffect(() => {
    if (!emailParam) {
      router.replace('/login');
    }
  }, [emailParam]);

  const handleRegister = async () => {
    if (!name.trim()) {
      setError('Ingresa tu nombre completo');
      return;
    }
    if (password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(name.trim(), email, password);
      router.replace('/profile');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo salió mal. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (!emailParam) return null;

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
            Crea tu cuenta
          </Text>
        </View>

        <View style={styles.form}>
          <View
            style={[
              styles.input,
              styles.emailRow,
              { backgroundColor: colors.authInput, borderColor: colors.authBorder },
            ]}
          >
            <Text style={[styles.emailText, { color: colors.authText }]} numberOfLines={1}>
              {email}
            </Text>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text style={[styles.changeText, { color: colors.primary }]}>Cambiar</Text>
            </Pressable>
          </View>

          <TextInput
            value={name}
            onChangeText={(v) => {
              setName(v);
              if (error) setError('');
            }}
            placeholder="Nombre Completo"
            placeholderTextColor={colors.authMuted}
            style={[
              styles.input,
              { backgroundColor: colors.authInput, color: colors.authText, borderColor: colors.authBorder },
            ]}
            autoFocus
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
              onChangeText={(v) => {
                setPassword(v);
                if (error) setError('');
              }}
              placeholder="Contraseña"
              placeholderTextColor={colors.authMuted}
              secureTextEntry={!showPassword}
              style={[styles.passwordInput, { color: colors.authText }]}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={19} color={colors.authMuted} />
            </Pressable>
          </View>

          {error ? (
            <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
          ) : null}

          <AppButton
            label="Crear cuenta"
            variant="primary"
            fullWidth
            loading={loading}
            onPress={handleRegister}
            style={styles.submitButton}
          />

          <Pressable
            onPress={() =>
              Alert.alert('Términos y Condiciones', 'Función próximamente disponible.')
            }
            style={styles.termsLink}
            hitSlop={8}
          >
            <Text style={[styles.termsText, { color: colors.authMuted }]}>
              Al crear una cuenta, aceptas nuestros{' '}
              <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>
                Términos y Condiciones
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
    fontSize: 26,
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
  input: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emailText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    marginRight: 12,
  },
  changeText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
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
  termsLink: {
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 8,
  },
  termsText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 17,
  },
});
