import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

interface AppHeaderProps {
  onBack?: () => void;
  onMenu?: () => void;
  menuOpen?: boolean;
  dark?: boolean;
}

export function AppHeader({ onBack, onMenu, menuOpen, dark }: AppHeaderProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const iconColor = dark ? colors.authText : colors.foreground;
  const bg = dark ? colors.authBackground : colors.background;
  const borderColor = dark ? colors.authBorder : colors.border;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bg,
          borderBottomColor: borderColor,
          paddingTop: insets.top + webTopInset + 14,
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
            <Feather name="arrow-left" size={24} color={iconColor} />
          </Pressable>
        ) : null}
      </View>
      <Text style={[styles.title, { color: iconColor }]}>WODPLACE</Text>
      <View style={[styles.side, styles.sideEnd]}>
        {onMenu ? (
          <Pressable
            onPress={onMenu}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Feather name={menuOpen ? 'x' : 'menu'} size={24} color={iconColor} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: {
    width: 32,
    alignItems: 'flex-start',
  },
  sideEnd: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Anton_400Regular',
    letterSpacing: 1,
  },
});
