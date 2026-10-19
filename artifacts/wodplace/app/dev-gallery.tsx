import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { AppButton, type AppButtonVariant } from '@/components/AppButton';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppHeader } from '@/components/AppHeader';
import { useColors } from '@/hooks/useColors';
import { SPACING } from '@/constants/spacing';

const VARIANTS: AppButtonVariant[] = [
  'primary',
  'dark',
  'outlineLight',
  'outlineDark',
  'destructive',
  'mutedDisabled',
  'softBooked',
  'waitlist',
];
const TONES: BadgeTone[] = ['success', 'warning', 'neutral', 'danger'];

/**
 * Solo __DEV__ -- nunca en producción (ver la entrada en el menú lateral,
 * profile.tsx, que solo aparece bajo la misma condición). Revisión visual
 * a ojo de los tokens/componentes de la primera ronda de cimientos; no es
 * parte de la app real. Ver AUDITORIA-VISUAL.md.
 */
export default function DevGalleryScreen() {
  const colors = useColors();
  if (!__DEV__) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Galería (dev)</Text>

        <Section title="AppButton -- paleta clara">
          {VARIANTS.map((v) => (
            <AppButton key={v} label={v} variant={v} palette="light" onPress={() => {}} compact />
          ))}
        </Section>

        <Section title="AppButton -- paleta oscura">
          {VARIANTS.map((v) => (
            <AppButton key={v} label={v} variant={v} palette="dark" onPress={() => {}} compact />
          ))}
        </Section>

        <Section title="AppButton -- deshabilitado / cargando">
          <AppButton label="Deshabilitado" disabled onPress={() => {}} compact />
          <AppButton label="Cargando" loading onPress={() => {}} compact />
        </Section>

        <Section title="Badge -- paleta clara">
          <View style={styles.row}>
            {TONES.map((t) => (
              <Badge key={t} label={t} tone={t} palette="light" />
            ))}
          </View>
        </Section>

        <Section title="Badge -- paleta oscura">
          <View style={styles.row}>
            {TONES.map((t) => (
              <Badge key={t} label={t} tone={t} palette="dark" />
            ))}
          </View>
        </Section>

        <Section title="EmptyState -- paleta clara">
          <EmptyState title="Sin datos" description="Texto de ejemplo." palette="light" />
        </Section>

        <Section title="EmptyState -- paleta oscura">
          <EmptyState title="Sin datos" description="Texto de ejemplo." palette="dark" />
        </Section>

        <Section title="Skeleton -- paleta clara">
          <Skeleton width="100%" height={16} palette="light" />
          <Skeleton width="60%" height={16} palette="light" />
        </Section>

        <Section title="Skeleton -- paleta oscura">
          <Skeleton width="100%" height={16} palette="dark" />
          <Skeleton width="60%" height={16} palette="dark" />
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: SPACING.xxl, gap: SPACING.xxl },
  screenTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  section: { gap: SPACING.sm },
  sectionTitle: { fontSize: 12, fontFamily: 'Inter_700Bold', textTransform: 'uppercase' },
  sectionBody: { gap: SPACING.sm },
  row: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
});
