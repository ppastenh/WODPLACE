import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BottomSheet } from '@/components/BottomSheet';
import { useColors } from '@/hooks/useColors';
import { ClassSession } from '@/context/BookingContext';

interface AttendeesModalProps {
  visible: boolean;
  onClose: () => void;
  session: ClassSession | null;
  names: string[];
}

export function AttendeesModal({ visible, onClose, session, names }: AttendeesModalProps) {
  const colors = useColors();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={session ? `Agendados · ${session.type}` : 'Agendados'}
    >
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {names.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="users" size={22} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Todavía nadie se ha agendado en esta clase.
            </Text>
          </View>
        ) : (
          names.map((name, index) => (
            <View
              key={`${name}-${index}`}
              style={[styles.row, { borderTopColor: colors.border }]}
            >
              <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.initial, { color: colors.secondaryForeground }]}>
                  {name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.name, { color: colors.foreground }]}>{name}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    maxHeight: 360,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  name: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
});
