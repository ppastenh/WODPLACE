import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { arrowBadgeBorder, arrowBadgeIconSize, ARROW_BADGE_SIZE } from '@/components/home/arrowBadgeSpec';

/**
 * FLECHA DECORATIVA en un círculo translúcido con borde de cobre: el modelo es la flecha de la tarjeta "Tu próxima clase" (círculo de 32 dp, borde de 1,5 dp, relleno translúcido oscuro,
 * Feather "arrow-right" de 16 dp en crema). Esta pieza la usan "Tu próxima clase" (tamaño 32, su aspecto de siempre), "Medallas" y "PR destacado" (versión pequeña, ARROW_BADGE_SMALL):
 * el borde y el ícono escalan en proporción con `size`.
 * Es decorativa: el contenedor que la use debe llevar pointerEvents="none" y estar oculto a lectores de pantalla (toda la tarjeta sigue siendo el botón).
 */
type Props = {
  size?: number;
  borderColor: string;
  backgroundColor: string;
  arrowColor: string;
};

export function ArrowBadge({ size = ARROW_BADGE_SIZE, borderColor, backgroundColor, arrowColor }: Props) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: arrowBadgeBorder(size),
        borderColor,
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Feather name="arrow-right" size={arrowBadgeIconSize(size)} color={arrowColor} />
    </View>
  );
}
