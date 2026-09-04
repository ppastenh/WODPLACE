import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useColors } from '@/hooks/useColors';
import { AppButton } from '@/components/AppButton';
import { extractChileanDigits, formatChileanPhone, isValidChileanPhoneDigits } from '@/lib/phoneUtils';

interface PhoneModalProps {
  visible: boolean;
  onClose: () => void;
  initialValue: string | null;
  onSave: (value: string) => void;
}

export function PhoneModal({ visible, onClose, initialValue, onSave }: PhoneModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [digits, setDigits] = useState(() => extractChileanDigits(initialValue));
  const [error, setError] = useState<string | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);

  // Reset the field and the confirm step each time the sheet is (re)opened.
  useEffect(() => {
    if (visible) {
      setDigits(extractChileanDigits(initialValue));
      setError(null);
      setConfirmVisible(false);
    }
  }, [visible, initialValue]);

  const handleChangeText = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 8);
    setDigits(cleaned);
    if (error) setError(null);
  };

  const displayDigits = digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits;

  const handleSave = () => {
    if (!isValidChileanPhoneDigits(digits)) {
      setError('Ingresa un número chileno válido: +569 XXXX XXXX');
      return;
    }
    // Every save (first time or a later change) requires an explicit
    // confirmation, since the phone is treated as locked/confirmed data
    // once saved -- same behavior as the birthdate field.
    setConfirmVisible(true);
  };

  const commitSave = () => {
    onSave(formatChileanPhone(digits));
    onClose();
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={confirmVisible ? undefined : onClose} />
      <KeyboardAvoidingView behavior="padding" style={styles.avoider} keyboardVerticalOffset={0}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {confirmVisible ? (
            <View style={styles.confirmWrap}>
              <View style={[styles.confirmIconWrap, { backgroundColor: colors.secondary }]}>
                <Feather name="lock" size={20} color={colors.foreground} />
              </View>
              <Text
                style={[styles.title, { color: colors.foreground, marginBottom: 0, textAlign: 'center' }]}
              >
                Confirmar número de celular
              </Text>
              <Text
                style={[
                  styles.warningText,
                  { color: colors.mutedForeground, marginTop: 8, textAlign: 'center' },
                ]}
              >
                {formatChileanPhone(digits)} quedará registrado y bloqueado. ¿Deseas guardar este
                cambio?
              </Text>
              <View style={styles.confirmActions}>
                <AppButton
                  label="Confirmar"
                  variant="primary"
                  fullWidth
                  onPress={commitSave}
                  testID="phone-confirm"
                />
                <AppButton
                  label="Revisar de nuevo"
                  variant="outlineDark"
                  fullWidth
                  onPress={() => setConfirmVisible(false)}
                  testID="phone-confirm-cancel"
                />
              </View>
            </View>
          ) : (
            <>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
              <Text style={[styles.title, { color: colors.foreground }]}>Celular</Text>

              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: colors.input,
                    borderColor: error ? colors.destructive : colors.border,
                  },
                ]}
              >
                <Text style={[styles.prefix, { color: colors.foreground }]}>+56 9</Text>
                <TextInput
                  value={displayDigits}
                  onChangeText={handleChangeText}
                  placeholder="XXXX XXXX"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="number-pad"
                  maxLength={9}
                  autoFocus
                  style={[styles.input, { color: colors.foreground }]}
                  testID="phone-input"
                />
              </View>

              {error ? (
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              ) : (
                <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
                  Formato: +569 XXXX XXXX
                </Text>
              )}

              <View style={[styles.warningBox, { backgroundColor: colors.secondary }]}>
                <Feather name="lock" size={14} color={colors.mutedForeground} />
                <Text style={[styles.warningText, { color: colors.mutedForeground }]}>
                  Al guardar, este número quedará registrado y se bloqueará nuevamente.
                </Text>
              </View>

              <AppButton
                label="Guardar"
                variant="primary"
                fullWidth
                onPress={handleSave}
                style={styles.saveButton}
                testID="phone-save"
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
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
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Anton_400Regular',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    gap: 8,
  },
  prefix: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 1,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 8,
  },
  hintText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
  },
  saveButton: {
    marginTop: 20,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 18,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    lineHeight: 16,
  },
  confirmWrap: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingBottom: 4,
  },
  confirmIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmActions: {
    width: '100%',
    gap: 10,
    marginTop: 22,
  },
});
