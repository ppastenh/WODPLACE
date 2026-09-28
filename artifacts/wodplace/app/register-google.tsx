import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { AppButton } from '@/components/AppButton';
import { BirthdateModal } from '@/components/BirthdateModal';
import { PhoneModal } from '@/components/PhoneModal';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { formatLongDate } from '@/lib/dateUtils';

/**
 * Fase 5 (Google real login) — the one-time "complete your profile" step
 * for a first-time Google sign-in. Google already gave us a verified name
 * and email (passed in as params by login.tsx's loginWithGoogle() result),
 * so this only collects what Google can't: birthdate and phone, same as
 * the email/password register() flow and just as mandatory (birthdate
 * drives the existing under-18 legal restrictions — can't be skipped or
 * left for later, see completeGoogleOnboarding's own doc comment).
 */
export default function RegisterGoogleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { completeGoogleOnboarding, getPostAuthRoute } = useAuth();
  const { name: nameParam, email: emailParam } = useLocalSearchParams<{ name?: string; email?: string }>();
  const email = emailParam ?? '';
  const [name, setName] = useState(nameParam ?? '');
  const [birthdate, setBirthdate] = useState<string | null>(null);
  const [birthdateModalVisible, setBirthdateModalVisible] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  useEffect(() => {
    if (!emailParam) {
      router.replace('/login');
    }
  }, [emailParam]);

  const handleContinue = async () => {
    if (!name.trim()) {
      setError('Ingresa tu nombre completo');
      return;
    }
    if (!birthdate) {
      setError('Ingresa tu fecha de nacimiento');
      return;
    }
    if (!phone) {
      setError('Ingresa tu celular');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await completeGoogleOnboarding(name.trim(), birthdate, phone);
      router.replace(getPostAuthRoute('/home') as never);
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
          <Text style={[styles.headline, { color: colors.authText }]}>Completa tu perfil</Text>
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
          />

          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setBirthdateModalVisible(true);
            }}
            style={[
              styles.input,
              styles.birthdateRow,
              { backgroundColor: colors.authInput, borderColor: colors.authBorder },
            ]}
          >
            <Feather name="calendar" size={17} color={colors.authMuted} style={styles.calendarIcon} />
            <Text
              style={[
                styles.birthdateText,
                { color: birthdate ? colors.authText : colors.authMuted },
              ]}
            >
              {birthdate ? formatLongDate(birthdate) : 'Fecha de nacimiento'}
            </Text>
            {birthdate ? (
              <Feather name="check-circle" size={17} color={colors.primary} />
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setPhoneModalVisible(true);
            }}
            style={[
              styles.input,
              styles.birthdateRow,
              { backgroundColor: colors.authInput, borderColor: colors.authBorder },
            ]}
          >
            <Feather name="smartphone" size={17} color={colors.authMuted} style={styles.calendarIcon} />
            <Text
              style={[
                styles.birthdateText,
                { color: phone ? colors.authText : colors.authMuted },
              ]}
            >
              {phone ?? 'Celular'}
            </Text>
            {phone ? (
              <Feather name="check-circle" size={17} color={colors.primary} />
            ) : null}
          </Pressable>

          {error ? (
            <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
          ) : null}

          <AppButton
            label="Continuar"
            variant="primary"
            fullWidth
            loading={loading}
            onPress={handleContinue}
            style={styles.submitButton}
          />
        </View>
      </KeyboardAwareScrollViewCompat>

      <BirthdateModal
        visible={birthdateModalVisible}
        onClose={() => setBirthdateModalVisible(false)}
        initialValue={birthdate}
        onSave={(value) => {
          setBirthdate(value);
          setBirthdateModalVisible(false);
          if (error) setError('');
        }}
      />

      <PhoneModal
        visible={phoneModalVisible}
        onClose={() => setPhoneModalVisible(false)}
        initialValue={phone}
        onSave={(value) => {
          setPhone(value);
          setPhoneModalVisible(false);
          if (error) setError('');
        }}
      />
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
  },
  birthdateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIcon: {
    marginRight: 10,
  },
  birthdateText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  error: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginTop: -6,
  },
  submitButton: {
    marginTop: 6,
  },
});
