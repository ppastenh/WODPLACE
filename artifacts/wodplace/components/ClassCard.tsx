import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { ClassSession } from '@/context/BookingContext';
import { formatDayLabel } from '@/lib/dateUtils';
import { AppButton } from '@/components/AppButton';

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

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.type, { color: colors.foreground }]}>{session.type}</Text>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>
          {showDayLabel ? `${formatDayLabel(session.date, now)} · ` : ''}
          {session.timeRangeLabel}
        </Text>
      </View>

      <Text style={[styles.coach, { color: colors.mutedForeground }]}>
        Imparte: {session.coach}
      </Text>

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
          style={({ pressed }) => [styles.attendeesLink, { opacity: pressed ? 0.6 : 1 }]}
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
}: {
  canCancel?: boolean;
  active?: boolean;
  onRequestCancel?: () => void;
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

  const badge = (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: active ? colors.destructive : colors.secondary,
          opacity: canCancel ? 1 : 0.6,
        },
      ]}
    >
      <Feather
        name={active ? 'x' : 'check'}
        size={13}
        color={active ? colors.destructiveForeground : colors.secondaryForeground}
      />
      <Text style={[styles.badgeText, { color: active ? colors.destructiveForeground : colors.secondaryForeground }]}>
        {active ? 'Cancelando…' : 'Agendado'}
      </Text>
    </View>
  );

  if (!onRequestCancel) return badge;

  return (
    <Pressable onPress={handlePress} hitSlop={6} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
      {badge}
    </Pressable>
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
    return (
      <AgendadoBadge canCancel={session.canCancel} active={cancelPending} onRequestCancel={onRequestCancel} />
    );
  }
  if (session.hasStarted) {
    return <AppButton label="Finalizado" variant="mutedDisabled" disabled compact />;
  }
  if (session.remaining <= 0) {
    return <AppButton label="No hay cupo" variant="mutedDisabled" disabled compact />;
  }
  return <AppButton label="Agendar" variant="primary" onPress={onBook} compact />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  type: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
  },
  time: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  coach: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statText: {
    fontSize: 12,
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
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  badgeText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
});
