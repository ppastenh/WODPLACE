import React from 'react';
import { View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { LAUREL_DATA, LAUREL_GROUP_OPACITY, LAUREL_MIRROR, LAUREL_VIEWBOX, type LaurelShape } from '@/components/ui/laurelData';

/**
 * LAUREL decorativo 'relieve' (diseño propio de la dueña, vectorizado a datos en laurelData.ts): 88 x 72 dp con escala 1, dibujado con react-native-svg. Hojas con dos mitades (clara #F3D3AA y
 * oscura #C08A57) sobre un tallo en arco de 1,1 dp (#E2B887, puntas redondeadas); la rama derecha es el espejo de la izquierda (translate(88 0) scale(-1 1)).
 * `scale` agranda o achica el dibujo completo, proporcional (la tarjeta usa 0,9); `opacity` es la del grupo completo: 0,5 por defecto, y más tenue (0,25) sin medallas, con error o cargando.
 * La opacidad es decorativa y fija, NO un estado presionado. Decorativo: oculto a lectores de pantalla y dentro de un contenedor con pointerEvents="none" (nunca en un Text).
 */
type Props = { scale?: number; opacity?: number };

function Branch({ shape }: { shape: LaurelShape }) {
  const { stem, leafLight, leafDark, leaves } = shape;
  return (
    <>
      <Path d={stem.d} fill="none" stroke={stem.stroke} strokeWidth={stem.strokeWidth} strokeLinecap={stem.linecap} />
      {leaves.map((l, i) => (
        <G key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.rot}) scale(${l.scale})`}>
          <Path d={leafLight.d} fill={leafLight.fill} />
          <Path d={leafDark.d} fill={leafDark.fill} />
        </G>
      ))}
    </>
  );
}

export function Laurel({ scale = 1, opacity = LAUREL_GROUP_OPACITY }: Props) {
  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: LAUREL_VIEWBOX.w * scale, height: LAUREL_VIEWBOX.h * scale }}
    >
      <Svg width={LAUREL_VIEWBOX.w * scale} height={LAUREL_VIEWBOX.h * scale} viewBox={`0 0 ${LAUREL_VIEWBOX.w} ${LAUREL_VIEWBOX.h}`}>
        <G opacity={opacity}>
          <G>
            <Branch shape={LAUREL_DATA} />
          </G>
          <G transform={LAUREL_MIRROR}>
            <Branch shape={LAUREL_DATA} />
          </G>
        </G>
      </Svg>
    </View>
  );
}
