import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDarkColors } from '@/hooks/useDarkColors';

type Props = {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
};

export function RmHeader({ title, onBack, right }: Props) {
  const colors = useDarkColors();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          paddingTop: insets.top + webTopInset + 12,
        },
      ]}
    >
      <View style={styles.side}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Feather name="arrow-left" size={24} color={colors.foreground} />
          </Pressable>
        ) : null}
      </View>
      <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: { width: 44, justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
  },
});
