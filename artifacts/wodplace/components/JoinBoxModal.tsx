import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import type { RedeemBoxCodeResult } from '@workspace/api-client-react';
import colors from '@/constants/colors';
import { noBoxColors } from '@/components/home/noBoxCardColors';
import { formatBoxCodeInput } from '@/lib/boxCodeUtils';

interface JoinBoxModalProps {
  visible: boolean;
  onClose: () => void;
  onRedeem: (code: string) => Promise<RedeemBoxCodeResult>;
  /** Default true (tapping "+ agregar código" clearly means "I want to type
   *  now"). Pass false when the modal opens on its own — e.g. right after
   *  registering — so the keyboard doesn't pop up unless the person actually
   *  taps the field. */
  autoFocusInput?: boolean;
}

type Feedback = { tone: 'ok' | 'error'; text: string };

/** Diseño de Inicio (decisión (ac)): grafito, campo #232428 con foco de cobre y botón de cobre con texto carbón; es de claro fijo, no sigue el tema. */
const c = noBoxColors(colors.light);

export function JoinBoxModal({ visible, onClose, onRedeem, autoFocusInput = true }: JoinBoxModalProps) {
  const insets = useSafeAreaInsets();
  // Solo presentación: si el campo tiene el foco (el borde pasa a cobre).
  const [focused, setFocused] = useState(false);
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
            { backgroundColor: c.background, paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: c.handle }]} />
          <Text style={[styles.title, { color: c.primary }]}>Agregar código de box</Text>
          <Text style={[styles.subtitle, { color: c.secondary }]}>
            Ingresa el código que te dio tu box para unirte. Puedes pertenecer a más de un box.
          </Text>

          <View style={[styles.inputRow, { backgroundColor: c.inner, borderColor: focused ? c.focusBorder : c.fieldBorder }]}>
            <TextInput
              value={code}
              onChangeText={(v) => setCode(formatBoxCodeInput(v))}
              placeholder="Ej. 4KJ9P-XY2"
              placeholderTextColor={c.secondary}
              selectionColor={c.focusBorder}
              cursorColor={c.focusBorder}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={9}
              autoFocus={autoFocusInput}
              editable={!busy}
              onSubmitEditing={submit}
              style={[styles.input, { color: c.primary }]}
            />
          </View>

          {feedback ? (
            <Text
              style={[
                styles.feedback,
                { color: feedback.tone === 'ok' ? c.success : c.error },
              ]}
            >
              {feedback.text}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={busy ? 'Validando…' : 'Unirme'}
            disabled={busy}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              submit();
            }}
            style={({ pressed }) => [styles.button, { backgroundColor: pressed && !busy ? c.buttonPressed : c.button }]}
          >
            {busy ? (
              <ActivityIndicator color={c.buttonText} />
            ) : (
              <Text style={[styles.buttonText, { color: c.buttonText }]} numberOfLines={1}>
                Unirme
              </Text>
            )}
          </Pressable>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  button: {
    minHeight: 48,
    borderRadius: 999,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
});
