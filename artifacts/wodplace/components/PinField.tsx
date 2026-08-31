import React, { useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface PinFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  /** Max digits (also the number of cells shown). Default 6. */
  length?: number;
  autoFocus?: boolean;
  editable?: boolean;
  onSubmitEditing?: () => void;
}

/**
 * Numeric PIN entry rendered as filled/empty dots. A single transparent
 * TextInput on top captures the digits; tapping anywhere refocuses it.
 */
export function PinField({
  value,
  onChangeText,
  length = 6,
  autoFocus,
  editable = true,
  onSubmitEditing,
}: PinFieldProps) {
  const colors = useColors();
  const inputRef = useRef<TextInput>(null);

  return (
    <Pressable style={styles.row} onPress={() => inputRef.current?.focus()}>
      {Array.from({ length }).map((_, i) => {
        const filled = i < value.length;
        return (
          <View
            key={i}
            style={[
              styles.cell,
              {
                backgroundColor: colors.authInput,
                borderColor: filled ? colors.primary : colors.authBorder,
              },
            ]}
          >
            {filled ? (
              <View style={[styles.dot, { backgroundColor: colors.authText }]} />
            ) : null}
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        editable={editable}
        onSubmitEditing={onSubmitEditing}
        caretHidden
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  cell: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
});
