import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface SegmentedControlProps {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}

export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.muted }]}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[
              styles.segment,
              active && { backgroundColor: colors.card, shadowOpacity: 0.08 },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: active ? colors.primary : colors.mutedForeground },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});
