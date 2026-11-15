import React, { useRef } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { GLOW_OPACITY, type CopperSurfaceColors } from '@/components/home/copperSurface';

/**
 * CAPAS del fondo de cobre oscuro compartido de "Medallas" y "Progreso mensual": degradado horizontal y brillo satinado (respaldo, debajo) y, encima, la foto en duotono de cobre que cada tarjeta le pasa. Va como primer hijo de la tarjeta, que lleva el borde, la sombra
 * y el recorte (copperSurfaceStyles). Decorativo: sin toques y oculto a lectores de pantalla.
 */
let uid = 0;
const styles = StyleSheet.create({
  // Un require trae su ancho y alto propios (1116 px) y ganan sobre absoluteFill: sin width/height al 100 % la foto se dibuja a tamaño natural, anclada arriba a la izquierda (pedido 38).
  photo: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
});

export function CopperBackdrop({ c, image }: { c: Pick<CopperSurfaceColors, 'gradientStart' | 'gradientEnd' | 'glow'>; image: ImageSourcePropType }) {
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
      {/* La foto en duotono de cobre cubre todo lo anterior; el degradado y el brillo quedan DEBAJO, como respaldo mientras la foto carga (nada se dibuja encima: lo que se mide es la foto). */}
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
        <Image source={image} resizeMode="cover" style={styles.photo} />
      </View>
    </>
  );
}
