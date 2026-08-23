import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useAckContractAcceptances,
  useListAdminContractAcceptances,
  useListAdminContracts,
  useRequestUploadUrl,
  useUpdateAdminContract,
  useAdminBoxName,
  useAdminSocialReports,
} from '@workspace/api-client-react';
import { AppButton } from '@/components/AppButton';
import { AppHeader } from '@/components/AppHeader';
import { useColors } from '@/hooks/useColors';
import { getAdminCode } from '@/lib/adminSession';

/**
 * Formats an acceptance timestamp the same way active-contracts.tsx does,
 * e.g. "13 de julio de 2026, 09:41".
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

export default function AdminContractsScreen() {
  const colors = useColors();
  const [code, setCode] = useState<string | null>(null);
  const [uploadingSlug, setUploadingSlug] = useState<string | null>(null);
  const [boxNameDraft, setBoxNameDraft] = useState('');
  const [boxNameEditing, setBoxNameEditing] = useState(false);
  const [boxNameSaving, setBoxNameSaving] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

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
  const acceptancesQuery = useListAdminContractAcceptances({
    query: { enabled: !!code } as never,
    request: { headers: adminHeaders },
  });
  const ackMutation = useAckContractAcceptances({
    request: { headers: adminHeaders },
  });

  const boxNameQuery = useAdminBoxName(code);
  const reportsQuery = useAdminSocialReports(code);

  const acceptances = acceptancesQuery.data ?? [];
  const unseenCount = acceptances.filter((item) => !item.seen).length;
  const reports = reportsQuery.reports ?? [];
  const pendingReports = reports.filter((r: any) => !r.resolvedAt);

  const handleAckAcceptances = () => {
    ackMutation.mutate(undefined, {
      onSuccess: () => acceptancesQuery.refetch(),
    });
  };

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

  const handleSaveBoxName = async () => {
    if (!boxNameDraft.trim() || !code) return;
    setBoxNameSaving(true);
    try {
      await boxNameQuery.save(boxNameDraft.trim());
      setBoxNameEditing(false);
    } catch {
      Alert.alert('Error', 'No se pudo guardar el nombre del box.');
    } finally {
      setBoxNameSaving(false);
    }
  };

  const handleResolveReport = async (reportId: string, deletePost: boolean) => {
    if (!code) return;
    setResolvingId(reportId);
    try {
      await reportsQuery.resolve(reportId, deletePost, code);
    } catch {
      Alert.alert('Error', 'No se pudo resolver el reporte.');
    } finally {
      setResolvingId(null);
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

        {/* ── Nombre del Box ── */}
        <View style={[styles.notifSection, { marginBottom: 12 }]}>
          <View style={styles.notifHeaderRow}>
            <Text style={[styles.notifTitle, { color: colors.foreground }]}>Nombre del Box</Text>
            {!boxNameEditing && (
              <Pressable
                onPress={() => { setBoxNameDraft(boxNameQuery.name ?? ''); setBoxNameEditing(true); }}
                style={({ pressed }) => [styles.editNameBtn, { borderColor: colors.navBorder }, pressed && { opacity: 0.6 }]}
              >
                <Feather name="edit-2" size={13} color={colors.foreground} />
                <Text style={[styles.editNameText, { color: colors.foreground }]}>Editar</Text>
              </Pressable>
            )}
          </View>
          {boxNameEditing ? (
            <View style={styles.boxNameRow}>
              <TextInput
                style={[styles.boxNameInput, { color: colors.foreground, borderColor: colors.navBorder, backgroundColor: colors.card }]}
                value={boxNameDraft}
                onChangeText={setBoxNameDraft}
                placeholder="Nombre del box"
                placeholderTextColor={colors.navInactive}
                autoFocus
                maxLength={50}
              />
              <Pressable
                onPress={handleSaveBoxName}
                disabled={!boxNameDraft.trim() || boxNameSaving}
                style={({ pressed }) => [styles.saveNameBtn, { backgroundColor: colors.navActive }, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.saveNameText}>{boxNameSaving ? '...' : 'Guardar'}</Text>
              </Pressable>
              <Pressable
                onPress={() => setBoxNameEditing(false)}
                hitSlop={10}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <Feather name="x" size={18} color={colors.navInactive} />
              </Pressable>
            </View>
          ) : (
            <Text style={[styles.boxNameCurrent, { color: colors.mutedForeground }]}>
              {boxNameQuery.name || 'Sin nombre configurado'}
            </Text>
          )}
        </View>

        {/* ── Cola de reportes ── */}
        <View style={[styles.notifSection]}>
          <View style={styles.notifHeaderRow}>
            <View style={styles.notifTitleRow}>
              <Text style={[styles.notifTitle, { color: colors.foreground }]}>Reportes de moderación</Text>
              {pendingReports.length > 0 && (
                <View style={[styles.notifBadge, { backgroundColor: colors.destructive }]}>
                  <Text style={styles.notifBadgeText}>{pendingReports.length}</Text>
                </View>
              )}
            </View>
          </View>
          {reportsQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
          ) : pendingReports.length === 0 ? (
            <Text style={[styles.notifEmpty, { color: colors.mutedForeground }]}>
              Sin reportes pendientes. ✅
            </Text>
          ) : (
            <View style={styles.notifList}>
              {pendingReports.map((report: any) => (
                <View key={report.id} style={[styles.reportCard, { backgroundColor: colors.card, borderColor: colors.navBorder }]}>
                  <View style={styles.reportCardHeader}>
                    <Text style={[styles.notifName, { color: colors.foreground }]}>
                      Motivo: {report.reason}
                    </Text>
                    <Text style={[styles.notifDetail, { color: colors.navInactive }]}>
                      Reportado por: {report.reporterName ?? 'usuario'}
                    </Text>
                  </View>
                  {report.postBody ? (
                    <Text style={[styles.reportPostBody, { color: colors.mutedForeground, borderLeftColor: colors.navBorder }]} numberOfLines={3}>
                      {report.postBody}
                    </Text>
                  ) : null}
                  <View style={styles.reportActions}>
                    <Pressable
                      onPress={() => handleResolveReport(report.id, true)}
                      disabled={resolvingId === report.id}
                      style={({ pressed }) => [styles.reportBtn, { backgroundColor: colors.destructive }, pressed && { opacity: 0.7 }]}
                    >
                      <Feather name="trash-2" size={14} color="#fff" />
                      <Text style={styles.reportBtnText}>Eliminar post</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleResolveReport(report.id, false)}
                      disabled={resolvingId === report.id}
                      style={({ pressed }) => [styles.reportBtn, { backgroundColor: colors.secondary }, pressed && { opacity: 0.7 }]}
                    >
                      <Feather name="check" size={14} color={colors.secondaryForeground} />
                      <Text style={[styles.reportBtnText, { color: colors.secondaryForeground }]}>Desestimar</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.notifSection}>
          <View style={styles.notifHeaderRow}>
            <View style={styles.notifTitleRow}>
              <Text style={[styles.notifTitle, { color: colors.foreground }]}>
                Aceptaciones de contrato
              </Text>
              {unseenCount > 0 ? (
                <View style={[styles.notifBadge, { backgroundColor: colors.destructive }]}>
                  <Text style={styles.notifBadgeText}>{unseenCount}</Text>
                </View>
              ) : null}
            </View>
            {unseenCount > 0 ? (
              <AppButton
                label="Marcar como vistas"
                variant="outlineDark"
                compact
                loading={ackMutation.isPending}
                onPress={handleAckAcceptances}
              />
            ) : null}
          </View>

          {acceptancesQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />
          ) : acceptances.length === 0 ? (
            <Text style={[styles.notifEmpty, { color: colors.mutedForeground }]}>
              Nadie ha aceptado los contratos todavía.
            </Text>
          ) : (
            <View style={styles.notifList}>
              {acceptances.map((item) => (
                <View
                  key={item.userId}
                  style={[
                    styles.notifCard,
                    { backgroundColor: item.seen ? colors.card : colors.secondary },
                  ]}
                >
                  {!item.seen ? (
                    <View style={[styles.notifDot, { backgroundColor: colors.destructive }]} />
                  ) : null}
                  <View style={styles.notifCardText}>
                    <Text style={[styles.notifName, { color: colors.foreground }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.notifDetail, { color: colors.mutedForeground }]}>
                      {item.email}
                    </Text>
                    <Text style={[styles.notifDetail, { color: colors.mutedForeground }]}>
                      Aceptó el {formatAcceptedAt(item.acceptedAt)}
                    </Text>
                    {item.guardianName ? (
                      <Text style={[styles.notifGuardian, { color: colors.foreground }]}>
                        Aceptado por el apoderado: {item.guardianName}
                        {item.guardianRelationship ? ` (${item.guardianRelationship})` : ''}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

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
  notifSection: { marginBottom: 24, gap: 10 },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  notifTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  notifBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: { color: '#fff', fontSize: 11, fontFamily: 'Inter_700Bold' },
  notifEmpty: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  notifList: { gap: 8 },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 14,
    padding: 12,
  },
  notifDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  notifCardText: { flex: 1, gap: 2 },
  notifName: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  notifDetail: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  notifGuardian: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginTop: 2 },
  // Box name editor
  editNameBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  editNameText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  boxNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  boxNameInput: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Inter_400Regular' },
  saveNameBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  saveNameText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#fff' },
  boxNameCurrent: { fontSize: 14, fontFamily: 'Inter_500Medium', marginTop: 4 },
  // Reports
  reportCard: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 10 },
  reportCardHeader: { gap: 2 },
  reportPostBody: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18, borderLeftWidth: 3, paddingLeft: 10, fontStyle: 'italic' },
  reportActions: { flexDirection: 'row', gap: 8 },
  reportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, paddingVertical: 10 },
  reportBtnText: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#fff' },
});
