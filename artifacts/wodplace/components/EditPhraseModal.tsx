import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { AppButton } from '@/components/AppButton';

interface EditPhraseModalProps {
  visible: boolean;
  onClose: () => void;
  initialValue: string;
  onSave: (value: string) => void;
}

const EMOJI_CATEGORIES: { label: string; icon: keyof typeof Feather.glyphMap; emojis: string[] }[] = [
  {
    label: 'Caritas',
    icon: 'smile',
    emojis: [
      '😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😜', '🤩', '😎',
      '🥳', '🤗', '😇', '🙂', '😅', '😉', '🤔', '😴', '😢', '😭',
      '😡', '🥺', '😏', '🤤', '😤', '🥵', '🥶', '😱', '🤯', '🥱',
    ],
  },
  {
    label: 'Gestos',
    icon: 'thumbs-up',
    emojis: [
      '👍', '👎', '👏', '🙌', '💪', '🙏', '👊', '✌️', '🤙', '👋',
      '🤝', '🫶', '🤟', '🤘', '👌',
    ],
  },
  {
    label: 'Corazones',
    icon: 'heart',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💯',
      '🔥', '⭐', '✨', '🎉', '🎯',
    ],
  },
  {
    label: 'Deporte',
    icon: 'activity',
    emojis: [
      '🏋️', '🏃', '🤸', '🥇', '🏆', '💥', '⚡', '🧠', '🦾', '🩹',
    ],
  },
];

export function EditPhraseModal({ visible, onClose, initialValue, onSave }: EditPhraseModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(initialValue);
  const [showEmoji, setShowEmoji] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
      setShowEmoji(false);
    }
  }, [visible, initialValue]);

  const toggleEmojiPicker = () => {
    if (showEmoji) {
      setShowEmoji(false);
      inputRef.current?.focus();
    } else {
      Keyboard.dismiss();
      inputRef.current?.blur();
      setShowEmoji(true);
    }
  };

  const insertEmoji = (emoji: string) => {
    setValue((prev) => (prev.length >= 60 ? prev : prev + emoji));
  };

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

          <View
            style={[
              styles.inputRow,
              { backgroundColor: colors.input, borderColor: colors.border },
            ]}
          >
            <TextInput
              ref={inputRef}
              value={value}
              onChangeText={setValue}
              placeholder="Escribe una frase corta"
              placeholderTextColor={colors.mutedForeground}
              maxLength={60}
              autoFocus
              onFocus={() => setShowEmoji(false)}
              style={[styles.input, { color: colors.foreground }]}
            />
            <Pressable onPress={toggleEmojiPicker} hitSlop={10} style={styles.emojiButton}>
              <Feather
                name="smile"
                size={20}
                color={showEmoji ? colors.primary : colors.mutedForeground}
              />
            </Pressable>
          </View>

          {showEmoji ? (
            <View style={[styles.emojiPanel, { borderColor: colors.border }]}>
              <View style={styles.categoryTabs}>
                {EMOJI_CATEGORIES.map((category, index) => (
                  <Pressable
                    key={category.label}
                    onPress={() => setActiveCategory(index)}
                    style={[
                      styles.categoryTab,
                      activeCategory === index && { backgroundColor: colors.secondary },
                    ]}
                    hitSlop={4}
                  >
                    <Feather
                      name={category.icon}
                      size={16}
                      color={
                        activeCategory === index ? colors.secondaryForeground : colors.mutedForeground
                      }
                    />
                  </Pressable>
                ))}
              </View>
              <ScrollView
                style={styles.emojiScroll}
                contentContainerStyle={styles.emojiGrid}
                showsVerticalScrollIndicator={false}
              >
                {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, index) => (
                  <Pressable
                    key={`${emoji}-${index}`}
                    onPress={() => insertEmoji(emoji)}
                    style={styles.emojiCell}
                    hitSlop={2}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

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
  },
  emojiButton: {
    padding: 8,
  },
  emojiPanel: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  categoryTabs: {
    flexDirection: 'row',
    gap: 6,
    padding: 8,
  },
  categoryTab: {
    padding: 8,
    borderRadius: 10,
  },
  emojiScroll: {
    maxHeight: 220,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 6,
    paddingBottom: 10,
  },
  emojiCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 24,
  },
});
