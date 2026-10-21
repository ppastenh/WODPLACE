import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ClassSession } from '@/context/BookingContext';
import { formatClassDateShort, formatHM } from '@/lib/dateUtils';
import { AppButton } from '@/components/AppButton';
import { SPACING } from '@/constants/spacing';
import { RADIUS } from '@/constants/radius';
import { FONT_SIZE } from '@/constants/typography';

interface ClassCardProps {
  session: ClassSession;
  now: Date;
  showDayLabel?: boolean;
  onPressAttendees: () => void;
  actionSlot: React.ReactNode;
}

export function ClassCard({
  session,
  now,
  showDayLabel,
  onPressAttendees,
  actionSlot,
}: ClassCardProps) {
  const colors = useColors();

  // Atenuada y sin botón de reservar si ya terminó (hora de fin, hora de
  // Chile -- ver isSessionEndedInChile) y el alumno no tiene nada
  // reservado ahí; una reserva ya hecha sigue viéndose normal (el
  // historial, ver profile.tsx, la necesita visible igual que antes).
  const dimmed = session.hasEnded && !session.isBooked && !session.isWaitlisted;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        dimmed && styles.cardEnded,
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.type, { color: colors.foreground }]} numberOfLines={1}>
          {session.type}
        </Text>
        <Text style={[styles.time, { color: colors.mutedForeground }]} numberOfLines={1}>
          {showDayLabel ? `${formatClassDateShort(session.date)} · ` : ''}
          {formatHM(session.startMinutes)}
        </Text>
      </View>

      <Text style={[styles.coach, { color: colors.mutedForeground }]}>
        Imparte: {session.coach}
      </Text>

      {session.notes ? (
        <Text style={[styles.notes, { color: colors.foreground }]} numberOfLines={3}>
          {session.notes}
        </Text>
      ) : null}

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.statText, { color: colors.mutedForeground }]}>
            {session.durationLabel}
          </Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.statText, { color: colors.mutedForeground }]}>
            {session.capacity} máx
          </Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Pressable
          onPress={onPressAttendees}
          hitSlop={8}
          style={({ pressed }) => [
            styles.attendeesLink,
            { transform: [{ scale: pressed ? 0.95 : 1 }] },
          ]}
        >
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Quedan{' '}
            <Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold' }}>
              {session.remaining}
            </Text>{' '}
            cupos
          </Text>
          <Feather name="users" size={13} color={colors.mutedForeground} />
        </Pressable>
        {actionSlot}
      </View>
    </View>
  );
}

export function AgendadoBadge({
  canCancel = true,
  active = false,
  onRequestCancel,
  label = 'Agendado',
}: {
  canCancel?: boolean;
  active?: boolean;
  onRequestCancel?: () => void;
  label?: string;
}) {
  const colors = useColors();

  const handlePress = () => {
    if (!onRequestCancel) return;
    if (!canCancel) {
      Alert.alert(
        'No se puede cancelar',
        'Ya no puedes cancelar esta clase porque falta menos de 1 hora para que comience.',
      );
      return;
    }
    onRequestCancel();
  };

  function renderBadge(pressed: boolean) {
    const bg = active
      ? pressed
        ? colors.destructivePressed
        : colors.destructive
      : pressed
        ? colors.secondaryPressed
        : colors.secondary;
    return (
      <View style={[styles.badge, { backgroundColor: bg, opacity: canCancel ? 1 : 0.6 }]}>
        <Feather
          name={active ? 'x' : 'check'}
          size={13}
          color={active ? colors.destructiveForeground : colors.secondaryForeground}
        />
        <Text style={[styles.badgeText, { color: active ? colors.destructiveForeground : colors.secondaryForeground }]}>
          {active ? 'Cancelando…' : label}
        </Text>
      </View>
    );
  }

  if (!onRequestCancel) return renderBadge(false);

  // Fondo SÓLIDO al presionar (destructivePressed/secondaryPressed), no
  // opacidad -- ver AUDITORIA-VISUAL.md.
  return <Pressable onPress={handlePress} hitSlop={6}>{({ pressed }) => renderBadge(pressed)}</Pressable>;
}

function EndedBadge() {
  const colors = useColors();
  return (
    <View style={[styles.badge, { backgroundColor: colors.secondary, opacity: 0.6 }]}>
      <Feather name="check-circle" size={13} color={colors.secondaryForeground} />
      <Text style={[styles.badgeText, { color: colors.secondaryForeground }]}>Terminada</Text>
    </View>
  );
}

export function ClassActionButton({
  session,
  onBook,
  onRequestCancel,
  cancelPending = false,
}: {
  session: ClassSession;
  onBook: () => void;
  onRequestCancel: () => void;
  cancelPending?: boolean;
}) {
  if (session.isBooked) {
    return <AgendadoBadge canCancel={session.canCancel} active={cancelPending} onRequestCancel={onRequestCancel} />;
  }
  if (session.isWaitlisted) {
    return (
      <AgendadoBadge
        canCancel={session.canCancel}
        active={cancelPending}
        onRequestCancel={onRequestCancel}
        label={`En espera${session.waitlistPosition ? ` #${session.waitlistPosition}` : ''}`}
      />
    );
  }
  // Terminada (hora de fin ya pasada) y sin nada reservado ahí: ni botón
  // de reservar ni de lista de espera, solo la etiqueta.
  if (session.hasEnded) {
    return <EndedBadge />;
  }
  // A started-but-still-today class stays bookable — calendar.tsx's
  // handleBook() gates it behind a confirmation ("¿reservar igual?") instead
  // of blocking it outright here.
  if (session.remaining <= 0) {
    return <AppButton label="Lista de espera" variant="waitlist" onPress={onBook} compact />;
  }
  return <AppButton label="Agendar" variant="primary" onPress={onBook} compact />;
}

// Fase 1 (tokens): solo valores que calzan EXACTO con SPACING/RADIUS/
// FONT_SIZE. 8, 17, 3, 4 no calzan con ningún token y quedan sin tocar a
// propósito -- ver la propuesta de Fase 2 (alineación) antes de mover
// cualquiera de esos.
const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.xl,
    gap: 8,
  },
  cardEnded: {
    opacity: 0.55,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  type: {
    flexShrink: 1,
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
  },
  time: {
    flexShrink: 0,
    fontSize: FONT_SIZE.base,
    fontFamily: 'Inter_500Medium',
  },
  coach: {
    fontSize: FONT_SIZE.base,
    fontFamily: 'Inter_400Regular',
  },
  notes: {
    fontSize: FONT_SIZE.base,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.xl,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Inter_500Medium',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  attendeesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  footerText: {
    fontSize: FONT_SIZE.base,
    fontFamily: 'Inter_500Medium',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  badgeText: {
    fontSize: FONT_SIZE.base,
    fontFamily: 'Inter_600SemiBold',
  },
});
