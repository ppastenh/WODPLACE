import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import type { RedeemBoxCodeResult } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { AppButton } from '@/components/AppButton';

interface JoinBoxModalProps {
  visible: boolean;
  onClose: () => void;
  onRedeem: (code: string) => Promise<RedeemBoxCodeResult>;
}

type Feedback = { tone: 'ok' | 'error'; text: string };

export function JoinBoxModal({ visible, onClose, onRedeem }: JoinBoxModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    if (visible) {
      setCode('');
      setBusy(false);
      setFeedback(null);
    }
  }, [visible]);

  const submit = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setFeedback({ tone: 'error', text: 'Ingresa el código que te dio tu box.' });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const result = await onRedeem(trimmed);
      if (result.joined && result.boxName) {
        setFeedback({ tone: 'ok', text: `Te uniste a ${result.boxName}.` });
        setTimeout(onClose, 1100);
      } else if (result.alreadyMember) {
        setFeedback({
          tone: 'ok',
          text: result.boxName
            ? `Ya perteneces a ${result.boxName}.`
            : 'Ya perteneces a ese box.',
        });
      } else {
        setFeedback({
          tone: 'error',
          text: 'Código inválido. Verifícalo con tu box.',
        });
      }
    } catch {
      setFeedback({
        tone: 'error',
        text: 'No pudimos validar el código ahora. Intenta más tarde.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior="padding" style={styles.avoider} keyboardVerticalOffset={0}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.foreground }]}>Agregar código de box</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Ingresa el código que te dio tu box para unirte. Puedes pertenecer a más de un box.
          </Text>

          <View style={[styles.inputRow, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <TextInput
              value={code}
              onChangeText={(v) => setCode(v.toUpperCase())}
              placeholder="Ej. 4KJ9P2"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
              autoFocus
              editable={!busy}
              onSubmitEditing={submit}
              style={[styles.input, { color: colors.foreground }]}
            />
          </View>

          {feedback ? (
            <Text
              style={[
                styles.feedback,
                { color: feedback.tone === 'ok' ? colors.success : colors.destructive },
              ]}
            >
              {feedback.text}
            </Text>
          ) : null}

          <AppButton
            label={busy ? 'Validando…' : 'Unirme'}
            variant="primary"
            fullWidth
            loading={busy}
            onPress={submit}
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
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
    marginTop: -8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingLeft: 16,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 2,
  },
  feedback: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginTop: -6,
  },
});
