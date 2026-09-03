import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useDarkColors } from '@/hooks/useDarkColors';

type Props = {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
};

const THUMB = 26;

/** Stepped percentage slider (drag / tap the track, or use −/+). Snaps to
 *  `step`; the big readout turns copper once the value goes over 100%. */
export function PercentSlider({
  value,
  onChange,
  min = 30,
  max = 110,
  step = 5,
}: Props) {
  const colors = useDarkColors();
  const trackW = React.useRef(0);

  // Keep the gesture object stable — read live values through refs.
  const valueRef = React.useRef(value);
  const onChangeRef = React.useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  const setFromX = React.useCallback(
    (x: number) => {
      if (trackW.current <= 0) return;
      const frac = Math.max(0, Math.min(1, x / trackW.current));
      const raw = min + frac * (max - min);
      const next = Math.max(min, Math.min(max, Math.round(raw / step) * step));
      if (next !== valueRef.current) onChangeRef.current(next);
    },
    [min, max, step],
  );

  const pan = React.useMemo(
    () =>
      Gesture.Pan()
        .onBegin((e) => runOnJS(setFromX)(e.x))
        .onUpdate((e) => runOnJS(setFromX)(e.x)),
    [setFromX],
  );

  const clampSnap = (v: number) =>
    Math.max(min, Math.min(max, Math.round(v / step) * step));
  const frac = (Math.max(min, Math.min(max, value)) - min) / (max - min);
  const over = value > 100;

  return (
    <View style={{ gap: 14 }}>
      <View style={styles.readoutRow}>
        <Pressable
          onPress={() => onChange(clampSnap(value - step))}
          disabled={value <= min}
          hitSlop={10}
          style={({ pressed }) => [
            styles.bump,
            { borderColor: colors.border, opacity: value <= min ? 0.3 : pressed ? 0.6 : 1 },
          ]}
        >
          <Feather name="minus" size={18} color={colors.foreground} />
        </Pressable>

        <Text style={[styles.readout, { color: over ? colors.primary : colors.foreground }]}>
          {value}%
        </Text>

        <Pressable
          onPress={() => onChange(clampSnap(value + step))}
          disabled={value >= max}
          hitSlop={10}
          style={({ pressed }) => [
            styles.bump,
            { borderColor: colors.border, opacity: value >= max ? 0.3 : pressed ? 0.6 : 1 },
          ]}
        >
          <Feather name="plus" size={18} color={colors.foreground} />
        </Pressable>
      </View>

      <GestureDetector gesture={pan}>
        <View style={styles.trackTouch}>
          <View
            style={[styles.track, { backgroundColor: colors.card }]}
            onLayout={(e) => {
              trackW.current = e.nativeEvent.layout.width;
            }}
          >
            <View
              style={[styles.fill, { backgroundColor: colors.primary, width: `${frac * 100}%` }]}
            />
            <View
              style={[
                styles.thumb,
                {
                  backgroundColor: colors.primary,
                  borderColor: colors.background,
                  left: `${frac * 100}%`,
                  marginLeft: -THUMB / 2,
                },
              ]}
            />
          </View>
          <View style={styles.ticks}>
            <Text
              style={[
                styles.tick,
                { color: colors.mutedForeground, left: `${((50 - min) / (max - min)) * 100}%` },
              ]}
            >
              50
            </Text>
            <Text
              style={[
                styles.tick,
                { color: colors.mutedForeground, left: `${((100 - min) / (max - min)) * 100}%` },
              ]}
            >
              100
            </Text>
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  readoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22 },
  bump: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readout: { fontSize: 40, fontFamily: 'Anton_400Regular', minWidth: 96, textAlign: 'center' },
  trackTouch: { paddingVertical: 12 },
  track: { height: 12, borderRadius: 6, justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, height: 12, borderRadius: 6 },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    top: -(THUMB - 12) / 2,
  },
  ticks: { height: 14, marginTop: 4 },
  tick: {
    position: 'absolute',
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    transform: [{ translateX: -6 }],
  },
});
