import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useListAdminContracts,
  useRequestUploadUrl,
  useUpdateAdminContract,
} from '@workspace/api-client-react';
import { AppButton } from '@/components/AppButton';
import { AppHeader } from '@/components/AppHeader';
import { useColors } from '@/hooks/useColors';
import { getAdminCode } from '@/lib/adminSession';

export default function AdminContractsScreen() {
  const colors = useColors();
  const [code, setCode] = useState<string | null>(null);
  const [uploadingSlug, setUploadingSlug] = useState<string | null>(null);

  useEffect(() => {
    const stored = getAdminCode();
    if (!stored) {
      router.replace('/admin-login');
      return;
    }
    setCode(stored);
  }, []);

  const adminHeaders = code ? { 'x-admin-code': code } : undefined;

  const contractsQuery = useListAdminContracts({
    // See note in active-contracts.tsx re: `as never`.
    query: { enabled: !!code } as never,
    request: { headers: adminHeaders },
  });
  const requestUploadUrlMutation = useRequestUploadUrl({
    request: { headers: adminHeaders },
  });
  const updateContractMutation = useUpdateAdminContract({
    request: { headers: adminHeaders },
  });

  const handleReplace = async (slug: string, title: string) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];

    setUploadingSlug(slug);
    try {
      const { uploadURL, objectPath } = await requestUploadUrlMutation.mutateAsync({
        data: {
          name: asset.name,
          size: asset.size ?? 0,
          contentType: asset.mimeType ?? 'application/pdf',
        },
      });

      const fileResponse = await fetch(asset.uri);
      const blob = await fileResponse.blob();

      const putResponse = await fetch(uploadURL, {
        method: 'PUT',
        headers: { 'Content-Type': asset.mimeType ?? 'application/pdf' },
        body: blob,
      });
      if (!putResponse.ok) throw new Error('Falló la subida del archivo');

      await updateContractMutation.mutateAsync({
        slug,
        data: { objectPath, title },
      });

      await contractsQuery.refetch();
      Alert.alert('Listo', `${title} fue actualizado.`);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'No se pudo actualizar el documento.',
      );
    } finally {
      setUploadingSlug(null);
    }
  };

  if (!code) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader onBack={() => router.replace('/active-contracts')} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Administrar contratos
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Sube o reemplaza los PDFs de Membresía, Responsabilidad y Salud, y
          Reglamento del Box.
        </Text>

        {contractsQuery.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : (
          <View style={styles.list}>
            {(contractsQuery.data ?? []).map((doc) => (
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
                      {doc.objectPath ? 'PDF cargado' : 'Sin PDF cargado'}
                    </Text>
                  </View>
                </View>
                <AppButton
                  label={doc.objectPath ? 'Reemplazar PDF' : 'Subir PDF'}
                  variant="outlineDark"
                  compact
                  loading={uploadingSlug === doc.slug}
                  onPress={() => handleReplace(doc.slug, doc.title)}
                  style={styles.uploadButton}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 48, gap: 4 },
  title: { fontSize: 20, fontFamily: 'Anton_400Regular', marginTop: 8 },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 8, marginBottom: 18 },
  list: { gap: 12 },
  card: { borderRadius: 18, padding: 16, gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  cardSubtitle: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  uploadButton: { alignSelf: 'flex-start' },
});
