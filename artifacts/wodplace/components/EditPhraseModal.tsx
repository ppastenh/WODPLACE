import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { AppButton } from '@/components/AppButton';

interface EditPhraseModalProps {
  visible: boolean;
  onClose: () => void;
  initialValue: string;
  onSave: (value: string) => void;
}

export function EditPhraseModal({ visible, onClose, initialValue, onSave }: EditPhraseModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.avoider}
        keyboardVerticalOffset={0}
      >
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.foreground }]}>Tu frase</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Escribe una frase corta"
            placeholderTextColor={colors.mutedForeground}
            maxLength={60}
            autoFocus
            style={[
              styles.input,
              {
                backgroundColor: colors.input,
                color: colors.foreground,
                borderColor: colors.border,
              },
            ]}
          />
          <AppButton
            label="Guardar"
            variant="primary"
            fullWidth
            onPress={() => {
              onSave(value.trim());
              onClose();
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 14, 0.5)',
  },
  avoider: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    gap: 14,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Anton_400Regular',
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
});
