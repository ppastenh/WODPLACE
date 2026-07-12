import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { AppButton } from '@/components/AppButton';

interface BirthdateLockedModalProps {
  visible: boolean;
  onClose: () => void;
}

export function BirthdateLockedModal({ visible, onClose }: BirthdateLockedModalProps) {
  const colors = useColors();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.centerWrap} pointerEvents="box-none">
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
            <Feather name="lock" size={20} color={colors.foreground} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Fecha de nacimiento bloqueada
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Esta información ya fue registrada y no puede modificarse. Si necesitas corregirla,
            contacta a tu box.
          </Text>
          <AppButton label="Entendido" variant="primary" fullWidth onPress={onClose} />
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
    alignItems: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Anton_400Regular',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 18,
  },
});
