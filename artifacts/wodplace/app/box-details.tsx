import React, { useState } from 'react';
import { Alert, KeyboardTypeOptions, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { submitBoxDetails } from '@workspace/api-client-react';
import { AppButton } from '@/components/AppButton';
import { AppHeader } from '@/components/AppHeader';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';

type AppColors = ReturnType<typeof useColors>;

const PHONE_PREFIX = '+56 9';

function capitalizeFirst(value: string): string {
  return value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/** Strips the fixed "+56 9" prefix back off an already-saved contactPhone,
 *  so the 8-digit field can be prefilled when revisiting this screen. */
function stripPhonePrefix(value: string | null): string {
  if (!value) return '';
  const digits = value.startsWith(PHONE_PREFIX) ? value.slice(PHONE_PREFIX.length) : value;
  return digits.replace(/\D/g, '').slice(0, 8);
}

/**
 * "Datos del Box" — reached right after PIN setup (see admin-login.tsx's
 * goToPanel) whenever this box_admin's box is missing owner/location/
 * contact. Nombre del Box was already set at "Crear mi Box" time but is
 * editable here too; social links are optional and can be left for later.
 * Saving does NOT wait for super_admin approval — that gate is separate,
 * upcoming work (Fase 4); this screen just proceeds into the panel once the
 * required fields are filled.
 */
export default function BoxDetailsScreen() {
  const colors = useColors();
  const { user, adminStatus, refreshActivationStatus } = useAuth();
  const box = adminStatus?.box ?? null;

  const [name, setName] = useState(box?.name ?? '');
  const [ownerName, setOwnerName] = useState(box?.ownerName ?? '');
  const [location, setLocation] = useState(box?.location ?? '');
  const [phoneDigits, setPhoneDigits] = useState(stripPhonePrefix(box?.contactPhone ?? null));
  const [whatsapp, setWhatsapp] = useState(box?.whatsapp ?? '');
  const [instagramUrl, setInstagramUrl] = useState(box?.instagramUrl ?? '');
  const [facebookUrl, setFacebookUrl] = useState(box?.facebookUrl ?? '');
  const [tiktokUrl, setTiktokUrl] = useState(box?.tiktokUrl ?? '');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    name.trim().length >= 2 &&
    ownerName.trim().length >= 2 &&
    location.trim().length >= 2 &&
    phoneDigits.length === 8;

  const handleSubmit = async () => {
    if (!user?.id || !canSubmit) return;
    setSubmitting(true);
    try {
      const result = await submitBoxDetails({
        userId: user.id,
        name: name.trim(),
        ownerName: ownerName.trim(),
        location: location.trim(),
        contactPhone: `${PHONE_PREFIX} ${phoneDigits}`,
        whatsapp: whatsapp.trim() || undefined,
        instagramUrl: instagramUrl.trim() || undefined,
        facebookUrl: facebookUrl.trim() || undefined,
        tiktokUrl: tiktokUrl.trim() || undefined,
      });
      await refreshActivationStatus();
      // Use the response's fresh status directly rather than `adminStatus`
      // from context — that snapshot won't reflect the update within this
      // same closure until the next render. Still pending/rechazado/
      // suspendido -> the waiting screen, not straight into the panel.
      if (result.box && result.box.status !== 'activo') {
        router.replace('/box-waiting' as never);
      } else {
        router.replace('/admin-dashboard?target=box' as never);
      }
    } catch {
      Alert.alert('Error', 'No se pudieron guardar los datos. Intenta de nuevo.');
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
        <Text style={[styles.title, { color: colors.foreground }]}>Datos del Box</Text>
        <Text style={[styles.hint, { color: colors.mutedForeground, textAlign: 'left' }]}>
          Completá estos datos para que el equipo de WODPLACE pueda revisar y aprobar tu box.
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Field
            label="Nombre del Box"
            value={name}
            onChangeText={setName}
            placeholder="Ej. CrossFit Providencia"
            colors={colors}
          />
          <Field
            label="Encargado (dueño)"
            value={ownerName}
            onChangeText={(v) => setOwnerName(capitalizeFirst(v))}
            placeholder="Nombre del encargado"
            colors={colors}
            autoCapitalize="words"
          />
          <Field
            label="Ubicación"
            value={location}
            onChangeText={setLocation}
            placeholder="Dirección del box"
            colors={colors}
          />
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Contacto celular
            </Text>
            <View
              style={[
                styles.phoneRow,
                { backgroundColor: colors.authInput, borderColor: colors.authBorder },
              ]}
            >
              <Text style={[styles.phonePrefix, { color: colors.mutedForeground }]}>
                {PHONE_PREFIX}
              </Text>
              <TextInput
                value={phoneDigits}
                onChangeText={(v) => setPhoneDigits(v.replace(/\D/g, '').slice(0, 8))}
                placeholder="12345678"
                placeholderTextColor={colors.authMuted}
                keyboardType="number-pad"
                maxLength={8}
                style={[styles.phoneInput, { color: colors.authText }]}
              />
            </View>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          Redes sociales (opcional — podés completarlo después)
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Field
            label="WhatsApp"
            value={whatsapp}
            onChangeText={setWhatsapp}
            placeholder="56912345678"
            colors={colors}
            keyboardType="phone-pad"
          />
          <Field
            label="Instagram"
            value={instagramUrl}
            onChangeText={setInstagramUrl}
            placeholder="https://instagram.com/tubox"
            colors={colors}
            keyboardType="url"
          />
          <Field
            label="Facebook"
            value={facebookUrl}
            onChangeText={setFacebookUrl}
            placeholder="https://facebook.com/tubox"
            colors={colors}
            keyboardType="url"
          />
          <Field
            label="TikTok"
            value={tiktokUrl}
            onChangeText={setTiktokUrl}
            placeholder="https://tiktok.com/@tubox"
            colors={colors}
            keyboardType="url"
          />
        </View>

        <AppButton
          label="Guardar y continuar"
          variant={canSubmit ? 'primary' : 'mutedDisabled'}
          disabled={!canSubmit}
          loading={submitting}
          fullWidth
          onPress={handleSubmit}
          style={styles.submitButton}
        />
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  colors,
  keyboardType,
  autoCapitalize = 'none',
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  colors: AppColors;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.authMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[
          styles.input,
          { backgroundColor: colors.authInput, color: colors.authText, borderColor: colors.authBorder },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 48, gap: 16 },
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
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: -8,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    gap: 14,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingLeft: 14,
  },
  phonePrefix: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginRight: 6,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  submitButton: {
    marginTop: 6,
  },
});
