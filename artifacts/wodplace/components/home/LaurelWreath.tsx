import React from 'react';
import { View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { STEM_STROKE, canvasHalf, leftBranch, rightBranch, scaleFor } from '@/components/home/laurelGeometry';

/**
 * CORONA DE LAUREL reutilizable (decisión (y)): dos ramas independientes y simétricas (la derecha es el espejo exacto de la izquierda) alrededor de una medalla circular.
 * La geometría (tallo en arco de radio 26 y seis hojas por rama, para una medalla de radio 21; todo escala proporcionalmente) vive en laurelGeometry.ts, con pruebas.
 *
 * Props: size = diámetro de la medalla (dp), color, strokeWidth (grosor del tallo; por defecto 1,2 escalado) y opacity.
 * Se dibuja CENTRADA en el contenedor padre (que debe medir el diámetro de la medalla) y puede salirse de él. Decorativa: oculta a lectores de pantalla y sin tapar toques.
 */
type Props = {
  size: number;
  color: string;
  strokeWidth?: number;
  opacity?: number;
};

export function LaurelWreath({ size, color, strokeWidth, opacity = 1 }: Props) {
  const r = size / 2;
  const half = canvasHalf(r);
  const stroke = strokeWidth ?? STEM_STROKE * scaleFor(r);
  const branches = [leftBranch(r), rightBranch(r)];
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', left: r - half, top: r - half, width: half * 2, height: half * 2 }}
    >
      <Svg width={half * 2} height={half * 2} viewBox={`${-half} ${-half} ${half * 2} ${half * 2}`}>
        <G opacity={opacity}>
          {branches.map((b, i) => (
            <G key={i}>
              <Path d={b.stemPath} stroke={color} strokeWidth={stroke} strokeLinecap="round" fill="none" />
              {b.leaves.map((l) => (
                <Path key={l.angleDeg} d={l.path} fill={color} />
              ))}
            </G>
          ))}
        </G>
      </Svg>
    </View>
  );
}
