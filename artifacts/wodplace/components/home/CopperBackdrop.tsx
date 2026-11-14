import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { GLOW_OPACITY, type CopperSurfaceColors } from '@/components/home/copperSurface';

/**
 * CAPAS del fondo de cobre oscuro compartido (degradado horizontal + brillo satinado) de "Medallas" y "Progreso mensual". Va como primer hijo de la tarjeta, que lleva el borde, la sombra
 * y el recorte (copperSurfaceStyles). Decorativo: sin toques y oculto a lectores de pantalla.
 */
let uid = 0;

export function CopperBackdrop({ c }: { c: Pick<CopperSurfaceColors, 'gradientStart' | 'gradientEnd' | 'glow'> }) {
  const id = useRef(`copper-glow-${uid++}`).current;
  return (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={[c.gradientStart, c.gradientEnd]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id={id} cx="12%" cy="0%" rx="55%" ry="120%" fx="12%" fy="0%" gradientUnits="objectBoundingBox">
              <Stop offset="0" stopColor={c.glow} stopOpacity={GLOW_OPACITY} />
              <Stop offset="1" stopColor={c.glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
      </View>
    </>
  );
}
