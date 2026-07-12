import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { AppButton } from '@/components/AppButton';

interface CancelConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function CancelConfirmModal({ visible, onClose, onConfirm }: CancelConfirmModalProps) {
  const colors = useColors();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.centerWrap} pointerEvents="box-none">
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>¿Cancelar esta reserva?</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Perderás tu cupo en esta clase.
          </Text>
          <View style={styles.actions}>
            <AppButton label="Sí, cancelar" variant="destructive" fullWidth onPress={onConfirm} />
            <AppButton label="No, mantener" variant="outlineDark" fullWidth onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 14, 0.5)',
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 22,
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Anton_400Regular',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 14,
  },
  actions: {
    gap: 10,
  },
});
