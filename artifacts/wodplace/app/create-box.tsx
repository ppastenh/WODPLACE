import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { createBox, getBoxAuthorizationStatus } from '@workspace/api-client-react';
import { AppButton } from '@/components/AppButton';
import { AppHeader } from '@/components/AppHeader';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

const NOT_AUTHORIZED_MESSAGE =
  'Necesitas que WODPLACE te autorice primero. Contacta a WODPLACE para solicitar acceso.';

/**
 * "Crear mi Box" — self-service entry point for any account with no admin
 * role at all (see lib/navigation.ts's getAdminNavItem). NOT open to
 * everyone: a super_admin has to pre-authorize this account's email from
 * their own panel first (box_creation_authorizations) — this screen checks
 * that on mount and shows a form only if authorized, since letting someone
 * fill it out just to get a 403 at the end is worse UX than telling them
 * upfront. Only asks for the box name; the rest (encargado, ubicación,
 * contacto, redes) is collected later by the "Datos del Box" screen, once
 * this account already has the box_admin role and can reach it through the
 * normal admin flow. Creating the box here just files the request — a
 * super_admin still has to approve it before the panel becomes usable.
 */
export default function CreateBoxScreen() {
  const colors = useColors();
  const { user, refreshActivationStatus } = useAuth();
  const [boxName, setBoxName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    getBoxAuthorizationStatus(user.id)
      .then((res) => setAuthorized(res.authorized))
      .catch(() => setAuthorized(false));
  }, [user?.id]);

  const canSubmit = boxName.trim().length >= 2;

  const handleSubmit = async () => {
    if (!user?.id || !canSubmit) return;
    setSubmitting(true);
    try {
      await createBox(user.id, boxName.trim());
      await refreshActivationStatus();
      Alert.alert(
        'Solicitud enviada',
        'Ya podés continuar desde el menú: primero el Acuerdo de Plataforma, y después tu PIN de administrador. Mientras tanto, el equipo de WODPLACE va a revisar tu box.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err: any) {
      let message = 'No se pudo crear el box. Intenta de nuevo.';
      if (err?.status === 409) {
        message = 'Esta cuenta ya tiene un rol de administrador asignado.';
      } else if (err?.status === 403) {
        message = NOT_AUTHORIZED_MESSAGE;
        setAuthorized(false);
      }
      Alert.alert('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader onBack={() => router.back()} />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Crear mi Box</Text>

        {authorized === null ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : authorized === false ? (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardTop}>
              <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name="lock" size={18} color={colors.secondaryForeground} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Acceso restringido</Text>
            </View>
            <Text style={[styles.hint, { color: colors.mutedForeground, textAlign: 'left' }]}>
              {NOT_AUTHORIZED_MESSAGE}
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.hint, { color: colors.mutedForeground, textAlign: 'left' }]}>
              Registrá tu box en WODPLACE. El equipo de WODPLACE va a revisar y aprobar tu
              solicitud antes de que puedas empezar a usar el panel de administración.
            </Text>

            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardTop}>
                <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
                  <Feather name="home" size={18} color={colors.secondaryForeground} />
                </View>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Nombre del Box</Text>
              </View>
              <TextInput
                value={boxName}
                onChangeText={setBoxName}
                placeholder="Ej. CrossFit Providencia"
                placeholderTextColor={colors.authMuted}
                style={[
                  styles.input,
                  { backgroundColor: colors.authInput, color: colors.authText, borderColor: colors.authBorder },
                ]}
                autoFocus
              />
            </View>

            <AppButton
              label="Solicitar creación"
              variant={canSubmit ? 'primary' : 'mutedDisabled'}
              disabled={!canSubmit}
              loading={submitting}
              fullWidth
              onPress={handleSubmit}
              style={styles.submitButton}
            />
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Vas a poder completar dueño, ubicación, contacto y redes sociales más adelante,
              una vez que aceptes el Acuerdo de Plataforma.
            </Text>
          </>
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 48, gap: 16 },
  center: { paddingVertical: 32, alignItems: 'center' },
  title: {
    fontSize: 22,
    fontFamily: 'Anton_400Regular',
    marginTop: 8,
    marginBottom: -4,
  },
  hint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 17,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  submitButton: {
    marginTop: 6,
  },
});
