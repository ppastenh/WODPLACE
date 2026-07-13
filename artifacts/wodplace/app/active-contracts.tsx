import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
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
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { getContractFileUrl } from '@/lib/apiConfig';

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
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [titleTapCount, setTitleTapCount] = useState(0);
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [openingSlug, setOpeningSlug] = useState<string | null>(null);

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
  const canAccept =
    !acceptance &&
    allRead &&
    allChecked &&
    emergencyName.trim().length > 0 &&
    emergencyPhone.trim().length > 0;

  const handleTitlePress = () => {
    const next = titleTapCount + 1;
    if (next >= 7) {
      setTitleTapCount(0);
      router.push('/admin-login');
      return;
    }
    setTitleTapCount(next);
  };

  const handleOpenDocument = async (slug: string, objectPath: string | null) => {
    if (!objectPath) {
      Alert.alert('Documento no disponible', 'Este documento aún no ha sido cargado.');
      return;
    }
    setOpeningSlug(slug);
    try {
      await WebBrowser.openBrowserAsync(getContractFileUrl(objectPath));
      Alert.alert(
        '¿Leíste el documento completo?',
        'Confirma que revisaste todo el contenido para poder marcarlo como leído.',
        [
          { text: 'Aún no', style: 'cancel' },
          {
            text: 'Sí, lo leí',
            onPress: () => {
              markReadMutation.mutate(
                { slug, data: { userId } },
                {
                  onSuccess: () => contractsQuery.refetch(),
                  onError: () =>
                    Alert.alert('Error', 'No se pudo registrar la lectura. Intenta de nuevo.'),
                },
              );
            },
          },
        ],
      );
    } catch {
      Alert.alert('Error', 'No se pudo abrir el documento.');
    } finally {
      setOpeningSlug(null);
    }
  };

  const handleAccept = () => {
    acceptMutation.mutate(
      {
        data: {
          userId,
          emergencyContactName: emergencyName.trim(),
          emergencyContactPhone: emergencyPhone.trim(),
        },
      },
      {
        onSuccess: () => {
          acceptanceQuery.refetch();
          Alert.alert('Contratos aceptados', 'Tu aceptación quedó registrada.');
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Pressable onPress={handleTitlePress}>
          <Text style={[styles.title, { color: colors.foreground }]}>Contratos Activos</Text>
        </Pressable>

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
                    <Pressable
                      onPress={() =>
                        doc.read &&
                        setChecked((prev) => ({ ...prev, [doc.slug]: !prev[doc.slug] }))
                      }
                      disabled={!doc.read}
                      style={styles.checkRow}
                      hitSlop={6}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          {
                            borderColor: colors.border,
                            backgroundColor: checked[doc.slug] ? colors.primary : 'transparent',
                            opacity: doc.read ? 1 : 0.4,
                          },
                        ]}
                      >
                        {checked[doc.slug] ? (
                          <Feather name="check" size={13} color={colors.primaryForeground} />
                        ) : null}
                      </View>
                      <Text
                        style={[
                          styles.checkLabel,
                          { color: doc.read ? colors.foreground : colors.mutedForeground },
                        ]}
                      >
                        He leído y acepto: {doc.title}
                      </Text>
                    </Pressable>
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
                </View>
              </View>
            ) : (
              <View style={styles.emergencySection}>
                <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                  Contacto de emergencia
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
                <TextInput
                  value={emergencyPhone}
                  onChangeText={setEmergencyPhone}
                  placeholder="Teléfono del contacto"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="phone-pad"
                  style={[
                    styles.input,
                    { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border },
                  ]}
                />

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
      </ScrollView>
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
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  emergencySection: {
    marginTop: 24,
    gap: 12,
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
});
