import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useDarkColors } from '@/hooks/useDarkColors';
import { RADIUS } from '@/constants/radius';

interface SkeletonProps {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  /** See Badge.tsx's comment -- the caller's screen decides the palette. */
  palette?: 'light' | 'dark';
}

/**
 * Pulsing placeholder bar. Plain `Animated` (not Reanimated) and no new
 * native dependency -- this round must not require another EAS build.
 */
export function Skeleton({ width, height, borderRadius = RADIUS.sm, palette = 'light' }: SkeletonProps) {
  const light = useColors();
  const dark = useDarkColors();
  const colors = palette === 'dark' ? dark : light;

  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: colors.muted,
        opacity: pulse,
      }}
    />
  );
}
