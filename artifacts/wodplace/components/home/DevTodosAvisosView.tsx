import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnnouncementCard } from '@/components/AnnouncementModal';
import { OwnBirthdayCardNew, UpcomingBirthdaysSectionNew } from '@/components/home/BirthdayCardsNew';
import { NoBoxCard } from '@/components/home/NoBoxCard';
import { PendingContractBanner, PinnedAvisoBanner, PlanNoticeBanner } from '@/components/home/NoticeBanners';
import { AVISO, DEMO_ANNOUNCEMENT, birthdayIn, planDemo } from '@/components/home/devHomeStates';
import { useColors } from '@/hooks/useColors';
import { FONT_SIZE } from '@/constants/typography';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';

/**
 * "TODOS LOS AVISOS" (solo desarrollo; pedidos 51 y 52): todos los avisos de Inicio juntos, uno debajo del otro y en el orden en que aparecen en Inicio, con datos de ejemplo y un rótulo pequeño con su nombre, con el diseño FINAL
 * (letra reducida y borde por tipo, decisión (ae)). Dibuja los MISMOS componentes que usa Inicio. No toca la lógica real ni ningún archivo sensible. Nadie lo importa fuera de DevHomeScreen, que solo se carga con __DEV__: no llega a producción.
 */

function Tag({ text }: { text: string }) {
  const colors = useColors();
  return <Text style={[styles.tag, { color: colors.navInactive }]}>{text}</Text>;
}

export function DevTodosAvisosView() {
  const colors = useColors();
  const noop = () => {};
  return (
    <View style={[styles.root, { backgroundColor: colors.cream }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>Todos los avisos (dev) · datos inventados</Text>
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
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: SPACING.xxl, gap: SPACING.md, paddingBottom: SPACING.xxxl },
  title: { fontSize: FONT_SIZE.lg, fontFamily: 'Anton_400Regular' },
  stack: { gap: 11 },
  tag: { fontSize: FONT_SIZE.xs, fontFamily: 'Inter_600SemiBold', lineHeight: 16 },
  scrim: { borderRadius: RADIUS.xl, padding: SPACING.lg },
});
