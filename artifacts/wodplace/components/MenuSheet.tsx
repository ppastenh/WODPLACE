import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BottomSheet } from '@/components/BottomSheet';
import { useColors } from '@/hooks/useColors';

interface MenuSheetProps {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
  userName: string;
  userEmail: string;
}

export function MenuSheet({ visible, onClose, onLogout, userName, userEmail }: MenuSheetProps) {
  const colors = useColors();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text style={[styles.name, { color: colors.foreground }]}>{userName}</Text>
        <Text style={[styles.email, { color: colors.mutedForeground }]}>{userEmail}</Text>
      </View>
      <Pressable
        onPress={() => {
          onClose();
          onLogout();
        }}
        style={({ pressed }) => [
          styles.row,
          { borderTopColor: colors.border, opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Feather name="log-out" size={18} color={colors.destructive} />
        <Text style={[styles.rowLabel, { color: colors.destructive }]}>Cerrar sesión</Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 14,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  email: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
