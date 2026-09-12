import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { acceptPlatformAgreement } from '@workspace/api-client-react';
import { AppButton } from '@/components/AppButton';
import { AppHeader } from '@/components/AppHeader';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { getContractFileUrl } from '@/lib/apiConfig';

/**
 * Acceptance screen for the platform agreement — between WODPLACE
 * (super_admin) and this box's box_admin, about using the software to run
 * it. Simpler than Contratos Activos: one document, no per-paragraph read
 * tracking, just "open it, then accept". Reached only by a detected
 * box_admin who hasn't accepted yet (see lib/navigation.ts's
 * getAdminNavItem) — super_admin is exempt and never lands here.
 */
export default function PlatformAgreementScreen() {
  const colors = useColors();
  const { user, adminStatus, refreshActivationStatus } = useAuth();
  const userId = user?.id ?? '';

  const [opened, setOpened] = useState(false);
  const [opening, setOpening] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const document = adminStatus?.document ?? null;

  // Refresh on mount so a stale/cached adminStatus (e.g. from before an
  // admin uploaded the document) doesn't show outdated info here.
  useEffect(() => {
    refreshActivationStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenDocument = async () => {
    if (!document?.objectPath) {
      Alert.alert('Documento no disponible', 'Este documento aún no ha sido cargado.');
      return;
    }
    setOpening(true);
    try {
      await WebBrowser.openBrowserAsync(getContractFileUrl(document.objectPath));
      // Same pattern as Contratos Activos: opening the document is what
      // unlocks "Acepto" below.
      setOpened(true);
    } catch {
      Alert.alert('Error', 'No se pudo abrir el documento.');
    } finally {
      setOpening(false);
    }
  };

  const handleAccept = async () => {
    if (!userId) return;
    setAccepting(true);
    try {
      await acceptPlatformAgreement(userId);
      await refreshActivationStatus();
      Alert.alert(
        'Acuerdo aceptado',
        'Ya podés ingresar al panel de administración desde el menú.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch {
      Alert.alert('Error', 'No se pudo registrar la aceptación. Intenta de nuevo.');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader onBack={() => router.back()} />
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Acuerdo de Plataforma</Text>
        <Text style={[styles.hint, { color: colors.mutedForeground, textAlign: 'left' }]}>
          Para administrar tu box desde la app necesitás aceptar el acuerdo de uso de la
          plataforma WODPLACE.
        </Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardTop}>
            <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name="file-text" size={18} color={colors.secondaryForeground} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              {document?.title ?? 'Acuerdo de Plataforma'}
            </Text>
          </View>

          <AppButton
            label={opened ? 'Ver documento de nuevo' : 'Leer documento'}
            variant="outlineDark"
            compact
            loading={opening}
            onPress={handleOpenDocument}
            style={styles.viewButton}
          />
        </View>

        <AppButton
          label="Acepto"
          variant={opened ? 'primary' : 'mutedDisabled'}
          disabled={!opened}
          loading={accepting}
          fullWidth
          onPress={handleAccept}
          style={styles.acceptButton}
        />
        {!opened ? (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Abrí el documento para poder aceptarlo.
          </Text>
        ) : null}
      </KeyboardAwareScrollViewCompat>
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
  viewButton: {
    alignSelf: 'flex-start',
  },
  acceptButton: {
    marginTop: 6,
  },
});
