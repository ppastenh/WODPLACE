import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Polygon, RadialGradient, Stop } from 'react-native-svg';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { shade } from '@/lib/rm/plateColors';

const COPPER = '#C79A6B';
const COPPER_ICON = '#8F6846';
const GRAY = '#5B5E63';
const GRAY_ICON = '#3D3F43';

let uidCounter = 0;

/**
 * A medal — circular badge with a 3D relief treatment (drop shadow, radial
 * gradient face, rim, top sheen) and a ribbon hanging below with a V-notch,
 * same layered-gradient technique as components/rm/PlateShape.tsx's plate
 * discs, just with the copper/gray palette instead of plate colors. One
 * `base` color feeds every gradient, so `unlocked` is the only thing that
 * changes between states.
 *
 * The icon is a real glyph overlaid as a plain View on top of the SVG (not
 * drawn inside it) — avoids needing to convert each glyph to an SVG path.
 * Almost always a Feather glyph (the catalog's `icon` field convention);
 * `"trophy"` is the one exception (no Feather equivalent), rendered via
 * MaterialCommunityIcons instead — see catalog.ts's own doc comment.
 *
 * `iconColor` overrides the default copper/gray icon tint (still only while
 * unlocked — a locked medal always reads as gray regardless) — used for the
 * gold/silver/bronze podium trophies, see lib/medalColors.ts.
 */
export function MedalBadge({
  icon,
  unlocked,
  size = 84,
  showRibbon = true,
  iconColor: iconColorOverride,
}: {
  icon: string;
  unlocked: boolean;
  size?: number;
  showRibbon?: boolean;
  iconColor?: string;
}) {
  const uid = useRef(`medal-${uidCounter++}`).current;
  const base = unlocked ? COPPER : GRAY;
  const iconColor = unlocked ? (iconColorOverride ?? COPPER_ICON) : GRAY_ICON;

  const r = size / 2;
  const cx = r;
  const cy = r;
  const ribbonHeight = showRibbon ? size * 0.5 : 0;
  const height = size + ribbonHeight;

  // Ribbon: two swallowtail polygons meeting under the circle — each one
  // wide where it tucks in behind the medal, narrowing to a point-ish tail,
  // with the inner edge pulled up toward the circle to form the center notch.
  const rw = r * 0.48;
  const gap = r * 0.1;
  const ribbonTop = cy + r * 0.7;
  const notchY = cy + r * 1.05;
  const ribbonBottom = cy + r * 1.5;

  const rimId = `${uid}-rim`;
  const faceId = `${uid}-face`;
  const ribbonId = `${uid}-ribbon`;

  const iconBoxSize = size * 0.5;

  return (
    <View style={{ width: size, height }}>
      <Svg width={size} height={height} viewBox={`0 0 ${size} ${height}`}>
        <Defs>
          <LinearGradient id={rimId} x1="0" y1="0" x2="0.3" y2="1">
            <Stop offset="0" stopColor={shade(base, 0.15)} />
            <Stop offset="1" stopColor={shade(base, -0.35)} />
          </LinearGradient>
          <RadialGradient id={faceId} cx="42%" cy="36%" r="70%">
            <Stop offset="0" stopColor={shade(base, 0.3)} />
            <Stop offset="0.6" stopColor={base} />
            <Stop offset="1" stopColor={shade(base, -0.22)} />
          </RadialGradient>
          {showRibbon && (
            <LinearGradient id={ribbonId} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={shade(base, -0.1)} />
              <Stop offset="1" stopColor={shade(base, -0.3)} />
            </LinearGradient>
          )}
        </Defs>

        {showRibbon && (
          <>
            <Polygon
              points={`${cx - rw},${ribbonTop} ${cx - gap},${ribbonTop} ${cx - gap * 2.6},${notchY} ${cx - rw * 0.62},${ribbonBottom}`}
              fill={`url(#${ribbonId})`}
            />
            <Polygon
              points={`${cx + rw},${ribbonTop} ${cx + gap},${ribbonTop} ${cx + gap * 2.6},${notchY} ${cx + rw * 0.62},${ribbonBottom}`}
              fill={`url(#${ribbonId})`}
            />
          </>
        )}

        <Circle cx={cx + r * 0.03} cy={cy + r * 0.08} r={r * 0.98} fill="#000000" opacity={0.28} />
        <Circle cx={cx} cy={cy} r={r * 0.98} fill={`url(#${rimId})`} />
        <Circle cx={cx} cy={cy} r={r * 0.8} fill={`url(#${faceId})`} />
        <Ellipse cx={cx - r * 0.22} cy={cy - r * 0.3} rx={r * 0.34} ry={r * 0.22} fill="#FFFFFF" opacity={0.22} />
      </Svg>

      <View
        pointerEvents="none"
        style={[
          styles.iconBox,
          { width: iconBoxSize, height: iconBoxSize, left: cx - iconBoxSize / 2, top: cy - iconBoxSize / 2 },
        ]}
      >
        {icon === 'trophy' ? (
          <MaterialCommunityIcons name="trophy" size={size * 0.42} color={iconColor} />
        ) : (
          <Feather name={icon as React.ComponentProps<typeof Feather>['name']} size={size * 0.4} color={iconColor} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconBox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
