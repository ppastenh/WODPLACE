import React, { useRef } from 'react';
import { View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import {
  MEDAL_DEFAULT_SIZE,
  MEDAL_FROM,
  MEDAL_ICON,
  MEDAL_RING,
  MEDAL_RING_OPACITY,
  MEDAL_TO,
  medalIconSize,
  medalRing,
} from '@/components/ui/achievementMedalSpec';

/**
 * MEDALLA de logro (valores en achievementMedalSpec.ts): círculo de diámetro `size` (38 por defecto) con degradado radial de #7A4E2A (cx 40 %, cy 35 %) a #4A2E17, aro de 1,5 dp en #E2B887
 * al 75 % y el ícono centrado (tamaño = size x 0,5, color #F6F1E8). Todo escala con `size`.
 *
 * `icon`: el mismo mapeo que usa la medalla real (MedalBadge): un glifo de Feather, salvo "trophy" (MaterialCommunityIcons, porque Feather no lo tiene). Además acepta "mci:<nombre>" para
 * un glifo de MaterialCommunityIcons, la otra librería que ya usa el proyecto.
 * `muted`: medalla atenuada (sin medallas, con error): contorno punteado, sin relleno, y el ícono en `iconColor`.
 * `accessibilityLabel`: si se entrega, la medalla es una imagen con esa etiqueta; si no, es decorativa y queda oculta a lectores de pantalla.
 */
type Props = {
  icon: string;
  size?: number;
  accessibilityLabel?: string;
  muted?: boolean;
  iconColor?: string;
};

let uid = 0;

export function AchievementMedal({ icon, size = MEDAL_DEFAULT_SIZE, accessibilityLabel, muted = false, iconColor }: Props) {
  const id = useRef(`achievement-medal-${uid++}`).current;
  const ring = medalRing(size);
  const r = size / 2;
  const iconSize = medalIconSize(size);
  const color = iconColor ?? MEDAL_ICON;
  const glyph = icon.startsWith('mci:') ? (
    <MaterialCommunityIcons name={icon.slice(4) as React.ComponentProps<typeof MaterialCommunityIcons>['name']} size={iconSize} color={color} />
  ) : icon === 'trophy' ? (
    <MaterialCommunityIcons name="trophy" size={iconSize} color={color} />
  ) : (
    <Feather name={icon as React.ComponentProps<typeof Feather>['name']} size={iconSize} color={color} />
  );
  const a11y = accessibilityLabel
    ? ({ accessible: true, accessibilityRole: 'image', accessibilityLabel } as const)
    : ({ accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const);
  return (
    <View {...a11y} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id={id} cx="40%" cy="35%" r="75%" fx="40%" fy="35%">
            <Stop offset="0" stopColor={MEDAL_FROM} />
            <Stop offset="1" stopColor={MEDAL_TO} />
          </RadialGradient>
        </Defs>
        {muted ? null : <Circle cx={r} cy={r} r={r} fill={`url(#${id})`} />}
        <Circle
          cx={r}
          cy={r}
          r={r - ring / 2}
          fill="none"
          stroke={MEDAL_RING}
          strokeWidth={ring}
          strokeOpacity={MEDAL_RING_OPACITY}
          strokeDasharray={muted ? [ring * 2.2, ring * 2.2] : undefined}
        />
      </Svg>
      <View pointerEvents="none" style={{ position: 'absolute' }}>
        {glyph}
      </View>
    </View>
  );
}
