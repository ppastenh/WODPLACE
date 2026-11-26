import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnnouncementCard } from '@/components/AnnouncementModal';
import { OwnBirthdayCardNew, UpcomingBirthdaysSectionNew } from '@/components/home/BirthdayCardsNew';
import { NoBoxCard } from '@/components/home/NoBoxCard';
import { PendingContractBanner, PinnedAvisoBanner, PlanNoticeBanner } from '@/components/home/NoticeBanners';
import { AvisoLookContext } from '@/components/home/AvisoLookContext';
import { AVISO_KIND_LABEL, avisoBorderContrasts, type AvisoBorderMode, type AvisoSizeStep } from '@/components/home/avisoLookSpec';
import { AVISO, DEMO_ANNOUNCEMENT, birthdayIn, planDemo } from '@/components/home/devHomeStates';
import { useColors } from '@/hooks/useColors';
import { FONT_SIZE } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

/**
 * "TODOS LOS AVISOS" (solo desarrollo; pedido 51): todos los avisos de Inicio juntos, uno debajo del otro y en el orden en que aparecen en Inicio, con datos de ejemplo y un rótulo pequeño con su nombre, para decidir si achicar
 * las letras y si darles bordes distintos. Dibuja los MISMOS componentes que usa Inicio; los chips "Letra" y "Borde" cambian TODOS a la vez mediante AvisoLookContext (con "actual" no cambia nada). No toca la lógica real ni
 * ningún archivo sensible. Nadie lo importa fuera de DevHomeScreen, que solo se carga con __DEV__: no llega a producción.
 */

const SIZE_CHIPS: { id: AvisoSizeStep; label: string }[] = [
  { id: 0, label: 'Letra de los avisos: actual' },
  { id: -1, label: 'Letra: −1' },
  { id: -2, label: 'Letra: −2' },
];
const BORDER_CHIPS: { id: AvisoBorderMode; label: string }[] = [
  { id: 'actual', label: 'Borde de los avisos: actual' },
  { id: 'tipo', label: 'por tipo' },
  { id: 'tipoAlt', label: 'por tipo (cumpleaños en arena)' },
  { id: 'franja', label: 'franja por tipo' },
  { id: 'sin', label: 'sin borde' },
];

function Tag({ text }: { text: string }) {
  const colors = useColors();
  return <Text style={[styles.tag, { color: colors.navInactive }]}>{text}</Text>;
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.chip, { backgroundColor: selected ? colors.accent : colors.input }]}>
      <Text style={[styles.chipText, { color: selected ? colors.accentForeground : colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

export function DevTodosAvisosView() {
  const colors = useColors();
  const [step, setStep] = useState<AvisoSizeStep>(0);
  const [border, setBorder] = useState<AvisoBorderMode>('actual');
  const contrasts = border === 'actual' || border === 'sin' ? [] : avisoBorderContrasts(border, colors as unknown as Record<string, string>);
  const noop = () => {};
  return (
    <AvisoLookContext.Provider value={{ step, border }}>
      <View style={[styles.root, { backgroundColor: colors.cream }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.title, { color: colors.foreground }]}>Todos los avisos (dev) · datos inventados</Text>
          <View style={styles.chips}>
            {SIZE_CHIPS.map((c) => (
              <Chip key={c.id} label={c.label} selected={step === c.id} onPress={() => setStep(c.id)} />
            ))}
          </View>
          <View style={styles.chips}>
            {BORDER_CHIPS.map((c) => (
              <Chip key={c.id} label={c.label} selected={border === c.id} onPress={() => setBorder(c.id)} />
            ))}
          </View>
          {contrasts.length > 0 ? (
            <Text style={[styles.tag, { color: colors.navInactive }]}>
              {contrasts.map((c) => `${AVISO_KIND_LABEL[c.kind]} ${c.color} ${c.worst.toFixed(2)}:1${c.ok ? '' : ' ✗ NO LLEGA a 3:1'}`).join(' · ')}
            </Text>
          ) : null}

          <View style={styles.stack}>
            <Tag text="1. Cumpleaños propio" />
            <OwnBirthdayCardNew name="Camila Rojas" />
            <Tag text="2. Sin box" />
            <NoBoxCard onPress={noop} />
            <Tag text="3. Aviso del plan: te quedan N clases" />
            <PlanNoticeBanner plan={planDemo({ classesRemaining: 1, daysUntilRenewal: 20 })} />
            <Tag text="4. Aviso del plan: plan por vencer" />
            <PlanNoticeBanner plan={planDemo({ classesRemaining: 5, daysUntilRenewal: 3 })} />
            <Tag text="5. Contrato pendiente" />
            <PendingContractBanner onPress={noop} />
            <Tag text="6. Aviso fijo del box (sin imagen)" />
            <PinnedAvisoBanner announcement={{ ...AVISO, imageUrl: null }} />
            <Tag text="7. Aviso fijo del box (con imagen)" />
            <PinnedAvisoBanner announcement={DEMO_ANNOUNCEMENT} />
            <Tag text="8. Próximos cumpleaños" />
            <UpcomingBirthdaysSectionNew birthdays={[birthdayIn('Valentina Soto', 0), birthdayIn('Matías Pérez Rojas', 3), birthdayIn('Ana López', 9)]} />
            <Tag text="9. Ventana de aviso importante, paso 1 (vista previa)" />
            <View style={[styles.scrim, { backgroundColor: colors.charcoal }]}>
              <AnnouncementCard announcement={{ ...AVISO, imageUrl: null }} confirming={false} onRequestClose={noop} onConfirm={noop} onBack={noop} />
            </View>
            <Tag text="10. Ventana de aviso importante, paso 2: ¿Ya leíste este aviso? (vista previa)" />
            <View style={[styles.scrim, { backgroundColor: colors.charcoal }]}>
              <AnnouncementCard announcement={{ ...AVISO, imageUrl: null }} confirming onRequestClose={noop} onConfirm={noop} onBack={noop} />
            </View>
          </View>
        </ScrollView>
      </View>
    </AvisoLookContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: SPACING.xxl, gap: SPACING.md, paddingBottom: SPACING.xxxl },
  title: { fontSize: FONT_SIZE.lg, fontFamily: 'Anton_400Regular' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: { borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  chipText: { fontSize: FONT_SIZE.xs, fontFamily: 'Inter_600SemiBold' },
  stack: { gap: 11 },
  tag: { fontSize: FONT_SIZE.xs, fontFamily: 'Inter_600SemiBold', lineHeight: 16 },
  scrim: { borderRadius: RADIUS.xl, padding: SPACING.lg },
});
