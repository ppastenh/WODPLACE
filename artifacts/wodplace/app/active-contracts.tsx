import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useAcceptContracts,
  useGetContractAcceptance,
  useListContracts,
  useMarkContractRead,
} from '@workspace/api-client-react';
import { AppButton } from '@/components/AppButton';
import { AppHeader } from '@/components/AppHeader';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { getContractFileUrl } from '@/lib/apiConfig';
import { getAge } from '@/lib/dateUtils';

const MINOR_AGE_THRESHOLD = 18;

/**
 * Formats a ContractAcceptance timestamp in a readable, legally-relevant
 * Spanish format, e.g. "13 de julio de 2026, 09:41".
 */
function formatAcceptedAt(iso: string): string {
  const date = new Date(iso);
  const datePart = date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart}, ${timePart}`;
}

export default function ActiveContractsScreen() {
  const colors = useColors();
  const { user, refreshActivationStatus } = useAuth();
  const userId = user?.id ?? '';

  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [openingSlug, setOpeningSlug] = useState<string | null>(null);
  const [openedSlugs, setOpenedSlugs] = useState<Record<string, boolean>>({});
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('');
  // Explicit, separate consent to process the minor's personal data —
  // distinct from accepting the box's contract. Only asked when isMinor.
  const [minorDataConsent, setMinorDataConsent] = useState(false);

  // Minor status is derived *only* from the real birthdate on file — never
  // a self-declaration. If there's no birthdate yet, acceptance is blocked
  // (see `missingBirthdate` below) until the athlete adds it in Datos
  // Personales, where it's a locked field.
  const knownAge = user?.birthdate ? getAge(user.birthdate) : null;
  const missingBirthdate = !user?.birthdate;
  const isMinor = knownAge !== null && knownAge < MINOR_AGE_THRESHOLD;

  // Note: the generated UseQueryOptions type requires `queryKey` even for
  // this partial override object, but the hook fills it in internally —
  // `as never` sidesteps the overly strict override type.
  const contractsQuery = useListContracts(
    { userId },
    { query: { enabled: !!userId } as never },
  );
  const acceptanceQuery = useGetContractAcceptance(
    { userId },
    { query: { enabled: !!userId } as never },
  );
  const markReadMutation = useMarkContractRead();
  const acceptMutation = useAcceptContracts();

  const documents = contractsQuery.data ?? [];
  const acceptance = acceptanceQuery.data?.acceptance ?? null;
  const allRead = documents.length > 0 && documents.every((doc) => doc.read);
  const allChecked =
    documents.length > 0 && documents.every((doc) => checked[doc.slug]);
  const CL_PHONE_DIGITS = 9;
  const canAccept =
    !acceptance &&
    !missingBirthdate &&
    allRead &&
    allChecked &&
    emergencyName.trim().length > 0 &&
    emergencyPhone.length === CL_PHONE_DIGITS &&
    (!isMinor || (guardianName.trim().length > 0 && minorDataConsent));

  const handlePhoneChange = (text: string) => {
    const digitsOnly = text.replace(/\D/g, '').slice(0, CL_PHONE_DIGITS);
    setEmergencyPhone(digitsOnly);
  };

  const handleOpenDocument = async (slug: string, objectPath: string | null) => {
    if (!objectPath) {
      Alert.alert('Documento no disponible', 'Este documento aún no ha sido cargado.');
      return;
    }
    setOpeningSlug(slug);
    try {
      await WebBrowser.openBrowserAsync(getContractFileUrl(objectPath));
      // Opening the document is what unlocks the checkbox below — tapping
      // the checkbox itself is the "sí, lo leí" confirmation, so there's no
      // separate button/dialog to miss.
      setOpenedSlugs((prev) => ({ ...prev, [slug]: true }));
    } catch {
      Alert.alert('Error', 'No se pudo abrir el documento.');
    } finally {
      setOpeningSlug(null);
    }
  };

  const handleCheckboxPress = (slug: string) => {
    if (checked[slug]) {
      setChecked((prev) => ({ ...prev, [slug]: false }));
      return;
    }
    setChecked((prev) => ({ ...prev, [slug]: true }));
    markReadMutation.mutate(
      { slug, data: { userId } },
      {
        onSuccess: () => contractsQuery.refetch(),
        onError: () => {
          setChecked((prev) => ({ ...prev, [slug]: false }));
          Alert.alert('Error', 'No se pudo registrar la lectura. Intenta de nuevo.');
        },
      },
    );
  };

  const handleAccept = () => {
    acceptMutation.mutate(
      {
        data: {
          userId,
          emergencyContactName: emergencyName.trim(),
          emergencyContactPhone: `+56${emergencyPhone}`,
          ...(isMinor
            ? {
                guardianName: guardianName.trim(),
                minorDataConsent,
                ...(guardianRelationship.trim()
                  ? { guardianRelationship: guardianRelationship.trim() }
                  : {}),
              }
            : {}),
        },
      },
      {
        onSuccess: () => {
          acceptanceQuery.refetch();
          refreshActivationStatus();
          Alert.alert('Contratos aceptados', 'Tu aceptación quedó registrada. ¡Tu cuenta ya está activa!');
        },
        onError: (err) => {
          const message =
            err instanceof Error ? err.message : 'No se pudo registrar la aceptación.';
          Alert.alert('No se pudo aceptar', message);
        },
      },
    );
  };

  const isLoading = contractsQuery.isLoading || acceptanceQuery.isLoading;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader onBack={() => router.back()} />
      <KeyboardAwareScrollViewCompat contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.foreground }]}>Contratos Activos</Text>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : (
          <>
            <View style={styles.list}>
              {documents.map((doc) => (
                <View key={doc.slug} style={[styles.card, { backgroundColor: colors.card }]}>
                  <View style={styles.cardTop}>
                    <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
                      <Feather name="file-text" size={18} color={colors.secondaryForeground} />
                    </View>
                    <View style={styles.cardText}>
                      <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                        {doc.title}
                      </Text>
                      <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
                        {doc.read && doc.readAt
                          ? `Leído el ${formatAcceptedAt(doc.readAt)}`
                          : 'Pendiente de lectura'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusTag,
                        { backgroundColor: doc.read ? colors.success : colors.inactive },
                      ]}
                    >
                      <Text style={styles.statusTagText}>
                        {doc.read ? 'Leído' : 'Pendiente'}
                      </Text>
                    </View>
                  </View>

                  <AppButton
                    label={doc.read ? 'Ver documento de nuevo' : 'Leer documento'}
                    variant="outlineDark"
                    compact
                    loading={openingSlug === doc.slug}
                    onPress={() => handleOpenDocument(doc.slug, doc.objectPath ?? null)}
                    style={styles.viewButton}
                  />

                  {!acceptance ? (
                    (() => {
                      const isReady = doc.read || !!openedSlugs[doc.slug];
                      const isChecked = doc.read || !!checked[doc.slug];
                      return (
                        <Pressable
                          onPress={() => isReady && handleCheckboxPress(doc.slug)}
                          disabled={!isReady}
                          style={styles.checkRow}
                          hitSlop={6}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              {
                                borderColor: isReady ? colors.foreground : colors.border,
                                backgroundColor: isChecked ? colors.primary : 'transparent',
                                opacity: isReady ? 1 : 0.4,
                              },
                            ]}
                          >
                            {isChecked ? (
                              <Feather name="check" size={16} color={colors.primaryForeground} />
                            ) : null}
                          </View>
                          <Text
                            style={[
                              styles.checkLabel,
                              { color: colors.foreground, opacity: isReady ? 1 : 0.5 },
                            ]}
                          >
                            He leído y acepto: {doc.title}
                          </Text>
                        </Pressable>
                      );
                    })()
                  ) : null}
                  {!doc.read && !openedSlugs[doc.slug] ? (
                    <Text style={[styles.hint, { color: colors.mutedForeground, textAlign: 'left' }]}>
                      Abrí el documento para poder marcarlo como leído.
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>

            {acceptance ? (
              <View style={[styles.acceptedBox, { backgroundColor: colors.secondary }]}>
                <Feather name="check-circle" size={18} color={colors.secondaryForeground} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.acceptedTitle, { color: colors.secondaryForeground }]}>
                    Contratos aceptados
                  </Text>
                  <Text style={[styles.acceptedSubtitle, { color: colors.secondaryForeground }]}>
                    {formatAcceptedAt(acceptance.acceptedAt)}
                  </Text>
                  <Text style={[styles.acceptedSubtitle, { color: colors.secondaryForeground }]}>
                    Contacto de emergencia: {acceptance.emergencyContactName} ·{' '}
                    {acceptance.emergencyContactPhone}
                  </Text>
                  {acceptance.guardianName ? (
                    <Text style={[styles.acceptedSubtitle, { color: colors.secondaryForeground }]}>
                      Aceptado por el apoderado: {acceptance.guardianName}
                      {acceptance.guardianRelationship
                        ? ` (${acceptance.guardianRelationship})`
                        : ''}
                    </Text>
                  ) : null}
                  {acceptance.minorDataConsentAt ? (
                    <Text style={[styles.acceptedSubtitle, { color: colors.secondaryForeground }]}>
                      Consentimiento de datos del menor: {formatAcceptedAt(acceptance.minorDataConsentAt)}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : (
              <View style={styles.emergencySection}>
                <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                  Contacto de emergencia
                </Text>
                <Text style={[styles.hint, { color: colors.mutedForeground, textAlign: 'left' }]}>
                  Para poder avisar a alguien de tu confianza si tenés un accidente durante el
                  entrenamiento.
                </Text>
                <TextInput
                  value={emergencyName}
                  onChangeText={setEmergencyName}
                  placeholder="Nombre del contacto"
                  placeholderTextColor={colors.mutedForeground}
                  style={[
                    styles.input,
                    { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border },
                  ]}
                />
                <View
                  style={[
                    styles.phoneRow,
                    { backgroundColor: colors.input, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.phonePrefix, { color: colors.foreground }]}>+56</Text>
                  <TextInput
                    value={emergencyPhone}
                    onChangeText={handlePhoneChange}
                    placeholder="9 1234 5678"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="number-pad"
                    maxLength={CL_PHONE_DIGITS}
                    style={[styles.phoneInput, { color: colors.foreground }]}
                  />
                </View>

                {missingBirthdate ? (
                  <View style={[styles.noticeBox, { backgroundColor: colors.secondary }]}>
                    <Feather name="calendar" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.warningText, { color: colors.mutedForeground }]}>
                      Necesitamos tu fecha de nacimiento para continuar. Agregala en Datos
                      Personales (queda bloqueada al guardar) y volvé a esta pantalla.
                    </Text>
                  </View>
                ) : null}

                {isMinor ? (
                  <View style={styles.checkRow}>
                    <View
                      style={[
                        styles.checkbox,
                        { borderColor: colors.foreground, backgroundColor: colors.primary },
                      ]}
                    >
                      <Feather name="check" size={16} color={colors.primaryForeground} />
                    </View>
                    <Text style={[styles.checkLabel, { color: colors.foreground }]}>
                      Menor de 18 años (según tu fecha de nacimiento)
                    </Text>
                  </View>
                ) : null}

                {isMinor ? (
                  <View style={styles.guardianSection}>
                    <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                      Datos del apoderado
                    </Text>
                    <Text style={[styles.hint, { color: colors.mutedForeground, textAlign: 'left' }]}>
                      Como eres menor de edad, un apoderado debe aceptar estos contratos en tu
                      nombre. Necesitamos identificar a quién te autoriza a entrenar y poder
                      contactarlo.
                    </Text>
                    <TextInput
                      value={guardianName}
                      onChangeText={setGuardianName}
                      placeholder="Nombre del apoderado"
                      placeholderTextColor={colors.mutedForeground}
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.input,
                          color: colors.foreground,
                          borderColor: colors.border,
                        },
                      ]}
                    />
                    <TextInput
                      value={guardianRelationship}
                      onChangeText={setGuardianRelationship}
                      placeholder="Relación con el menor (ej. Madre, Padre, Tutor legal)"
                      placeholderTextColor={colors.mutedForeground}
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.input,
                          color: colors.foreground,
                          borderColor: colors.border,
                        },
                      ]}
                    />

                    <Pressable
                      onPress={() => setMinorDataConsent((prev) => !prev)}
                      style={styles.checkRow}
                      hitSlop={6}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          {
                            borderColor: colors.foreground,
                            backgroundColor: minorDataConsent ? colors.primary : 'transparent',
                          },
                        ]}
                      >
                        {minorDataConsent ? (
                          <Feather name="check" size={16} color={colors.primaryForeground} />
                        ) : null}
                      </View>
                      <Text style={[styles.checkLabel, { color: colors.foreground }]}>
                        Autorizo el tratamiento de los datos personales de mi hijo/a para los
                        fines de esta aplicación.
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                <AppButton
                  label="ACEPTADO"
                  variant={canAccept ? 'primary' : 'mutedDisabled'}
                  disabled={!canAccept}
                  loading={acceptMutation.isPending}
                  fullWidth
                  onPress={handleAccept}
                  style={styles.acceptButton}
                />
                {!allRead ? (
                  <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                    Lee todos los documentos para continuar.
                  </Text>
                ) : null}
              </View>
            )}
          </>
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 48, gap: 4 },
  title: {
    fontSize: 22,
    fontFamily: 'Anton_400Regular',
    marginTop: 8,
    marginBottom: 18,
  },
  list: {
    gap: 12,
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
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  statusTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  viewButton: {
    alignSelf: 'flex-start',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  emergencySection: {
    marginTop: 24,
    gap: 12,
  },
  guardianSection: {
    gap: 12,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  phonePrefix: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  acceptButton: {
    marginTop: 6,
  },
  hint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  acceptedBox: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 18,
    padding: 16,
    marginTop: 20,
  },
  acceptedTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    marginBottom: 2,
  },
  acceptedSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 16,
  },
});
