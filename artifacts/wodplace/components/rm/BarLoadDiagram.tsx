import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  G,
  LinearGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useDarkColors } from '@/hooks/useDarkColors';
import type { LoadedPlate } from '@/lib/rm/barLoad';
import { plateClass, plateFill, plateStroke, plateTextColor } from '@/lib/rm/plateColors';
import { trimNum, type Unit } from '@/lib/rm/units';
import { PlateShape } from './PlateShape';

type Props = {
  /** One side, heaviest first (bar-side to collar). */
  perSide: LoadedPlate[];
  /** Bar weight, shown on the shaft (e.g. "20 kg"). */
  barLabel: string;
  /** Tap a plate on the drawing to remove it (manual mode). */
  onRemove?: (unit: Unit, weight: number) => void;
};

const H = 176;

// ── both-sides view ──────────────────────────────────────────────
const B_BIG_W = 20;
const B_BIG_H = 92;
const B_FRAC_W = 13;
const B_FRAC_H = 60;
const B_GAP = 3;
const B_SLEEVE = 20;

// ── zoomed single-side view ──────────────────────────────────────
const Z_BIG_W = 34;
const Z_BIG_H = 150;
const Z_FRAC_W = 22;
const Z_FRAC_H = 98;
const Z_GAP = 4;
const Z_SLEEVE = 30;
const Z_STUB = 46;

const dims = (p: LoadedPlate, zoom: boolean) => {
  const frac = plateClass(p.unit, p.weight) === 'frac';
  if (zoom) return { w: frac ? Z_FRAC_W : Z_BIG_W, h: frac ? Z_FRAC_H : Z_BIG_H, frac };
  return { w: frac ? B_FRAC_W : B_BIG_W, h: frac ? B_FRAC_H : B_BIG_H, frac };
};

/** Barbell with colour-coded plates and a light 3D treatment. Shows both
 *  sides until the load no longer fits, then cross-fades to a zoomed view
 *  of a single side (the other side is identical). */
export function BarLoadDiagram({ perSide, barLabel, onRemove }: Props) {
  const colors = useDarkColors();
  const [w, setW] = React.useState(0);
  const [mode, setMode] = React.useState<'both' | 'zoom'>('both');
  const mid = H / 2;

  const bothStackW = perSide.reduce((acc, p) => acc + B_GAP + dims(p, false).w, 0);

  // Pick the view (small hysteresis band so it doesn't flip-flop on the edge).
  React.useEffect(() => {
    if (!w) return;
    const slot = B_BIG_W + B_GAP;
    const budget = (w - 56 - 2 * B_SLEEVE - 28) / 2;
    const n = perSide.length;
    setMode((cur) => {
      if (n * slot > budget) return 'zoom';
      if (n * slot <= budget - slot) return 'both';
      return cur;
    });
  }, [w, perSide.length]);

  const progress = useSharedValue(0);
  React.useEffect(() => {
    progress.value = withTiming(mode === 'zoom' ? 1 : 0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [mode, progress]);

  const bothStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: 1 + progress.value * 0.12 }],
  }));
  const zoomStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: 0.9 + progress.value * 0.1 },
      { translateX: (1 - progress.value) * 26 },
    ],
  }));

  const labelW = Math.max(34, barLabel.length * 7 + 12);

  // ── both-sides geometry ──
  const centerGap = Math.max(56, w - 2 * (bothStackW + B_SLEEVE + 14));
  const collarL = (w - centerGap) / 2;
  const collarR = w - collarL;

  const renderBoth = () => {
    let offL = collarL;
    let offR = collarR;
    return (
      <>
        <Rect x={8} y={mid - 4} width={Math.max(0, w - 16)} height={8} rx={4} fill="url(#b-shaft)" />
        <Rect x={8} y={mid - 4} width={Math.max(0, w - 16)} height={1.4} rx={0.7} fill="#FFFFFF" opacity={0.22} />
        <Rect x={8} y={mid + 2.6} width={Math.max(0, w - 16)} height={1.4} rx={0.7} fill="#000000" opacity={0.3} />

        {/* sleeves + end caps + collars */}
        <Rect x={collarL - bothStackW - B_SLEEVE} y={mid - 9} width={B_SLEEVE} height={18} rx={3} fill="url(#b-sleeve)" />
        <Rect x={collarR + bothStackW} y={mid - 9} width={B_SLEEVE} height={18} rx={3} fill="url(#b-sleeve)" />
        <Rect x={collarL - bothStackW - B_SLEEVE - 4} y={mid - 11} width={5} height={22} rx={1.5} fill="url(#b-cap)" />
        <Rect x={collarR + bothStackW + B_SLEEVE - 1} y={mid - 11} width={5} height={22} rx={1.5} fill="url(#b-cap)" />
        <Rect x={collarL - 7} y={mid - 12} width={7} height={24} rx={2} fill="url(#b-cap)" />
        <Rect x={collarR} y={mid - 12} width={7} height={24} rx={2} fill="url(#b-cap)" />

        {perSide.map((p, i) => {
          const d = dims(p, false);
          const lcx = offL - B_GAP - d.w / 2;
          const rcx = offR + B_GAP + d.w / 2;
          offL -= B_GAP + d.w;
          offR += B_GAP + d.w;
          const common = {
            variant: 'stack' as const,
            w: d.w,
            h: d.h,
            fill: plateFill(p.unit, p.weight),
            stroke: plateStroke(p.unit, p.weight),
            textColor: plateTextColor(p.unit, p.weight),
            label: trimNum(p.weight, 2),
            unit: p.unit,
            small: d.frac,
          };
          return (
            <React.Fragment key={i}>
              <G onPress={onRemove ? () => onRemove(p.unit, p.weight) : undefined}>
                <PlateShape uid={`bl${i}`} cx={lcx} cy={mid} {...common} />
              </G>
              <G onPress={onRemove ? () => onRemove(p.unit, p.weight) : undefined}>
                <PlateShape uid={`br${i}`} cx={rcx} cy={mid} {...common} />
              </G>
            </React.Fragment>
          );
        })}

        <Rect x={w / 2 - labelW / 2} y={mid - 9} width={labelW} height={18} rx={9} fill={colors.background} fillOpacity={0.82} />
        <SvgText x={w / 2} y={mid + 4} fontSize={10} fontWeight="bold" fill={colors.mutedForeground} textAnchor="middle">
          {barLabel}
        </SvgText>
      </>
    );
  };

  // ── zoomed single-side geometry ──
  const collarX = Z_STUB;
  const plateStart = collarX + Z_SLEEVE + Z_GAP;
  const need = perSide.reduce((acc, p) => acc + dims(p, true).w + Z_GAP, 0);
  const avail = Math.max(1, w - plateStart - 26);
  const k = need > avail ? avail / need : 1;

  const renderZoom = () => {
    let x = plateStart;
    const nodes: React.ReactNode[] = [];
    perSide.forEach((p, i) => {
      const d = dims(p, true);
      const cx = x + d.w / 2;
      x += (d.w + Z_GAP) * k;
      nodes.push(
        <G key={i} onPress={onRemove ? () => onRemove(p.unit, p.weight) : undefined}>
          <PlateShape
            uid={`z${i}`}
            variant="stack"
            cx={cx}
            cy={mid}
            w={d.w}
            h={d.h}
            fill={plateFill(p.unit, p.weight)}
            stroke={plateStroke(p.unit, p.weight)}
            textColor={plateTextColor(p.unit, p.weight)}
            label={trimNum(p.weight, 2)}
            unit={p.unit}
            small={d.frac}
          />
        </G>,
      );
    });
    const endX = Math.max(plateStart + 6, x - Z_GAP * k + 4);
    return (
      <>
        {/* shaft stub fading off-frame to the left */}
        <Rect x={0} y={mid - 5} width={w} height={10} rx={5} fill="url(#z-shaft)" />
        <Rect x={0} y={mid - 5} width={w} height={1.6} rx={0.8} fill="#FFFFFF" opacity={0.22} />
        <Rect x={0} y={mid + 3.4} width={w} height={1.6} rx={0.8} fill="#000000" opacity={0.32} />
        <Rect x={0} y={mid - 14} width={30} height={28} fill="url(#z-fade)" />
        {/* knurl marks */}
        {[24, 30, 36].map((kx) => (
          <Rect key={kx} x={kx} y={mid - 6} width={1.3} height={12} fill="#FFFFFF" opacity={0.14} />
        ))}
        {/* collar + sleeve + end cap */}
        <Rect x={collarX - 4} y={mid - 13} width={8} height={26} rx={2} fill="url(#z-cap)" />
        <Rect x={collarX} y={mid - 11} width={Z_SLEEVE} height={22} rx={3} fill="url(#z-sleeve)" />
        {[0.3, 0.6].map((f) => (
          <Rect key={f} x={collarX + Z_SLEEVE * f} y={mid - 11} width={1.6} height={22} fill="#000000" opacity={0.22} />
        ))}
        <Rect x={endX} y={mid - 15} width={6} height={30} rx={2} fill="url(#z-cap)" />

        {nodes}
      </>
    );
  };

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <View style={{ height: H }}>
        {w > 0 ? (
          <>
            <Animated.View
              style={[StyleSheet.absoluteFill, bothStyle]}
              pointerEvents={mode === 'both' ? 'auto' : 'none'}
            >
              <Svg width={w} height={H}>
                <Defs>
                  <LinearGradient id="b-shaft" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#4A4E54" />
                    <Stop offset="0.45" stopColor="#8B9096" />
                    <Stop offset="0.55" stopColor="#7A7F85" />
                    <Stop offset="1" stopColor="#3B3E43" />
                  </LinearGradient>
                  <LinearGradient id="b-sleeve" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#5B6067" />
                    <Stop offset="0.5" stopColor="#9AA0A6" />
                    <Stop offset="1" stopColor="#44484D" />
                  </LinearGradient>
                  <LinearGradient id="b-cap" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#1A1C1F" />
                    <Stop offset="1" stopColor="#050506" />
                  </LinearGradient>
                </Defs>
                {renderBoth()}
              </Svg>
            </Animated.View>

            <Animated.View
              style={[StyleSheet.absoluteFill, zoomStyle]}
              pointerEvents={mode === 'zoom' ? 'auto' : 'none'}
            >
              <Svg width={w} height={H}>
                <Defs>
                  <LinearGradient id="z-shaft" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#4A4E54" />
                    <Stop offset="0.45" stopColor="#8B9096" />
                    <Stop offset="0.55" stopColor="#7A7F85" />
                    <Stop offset="1" stopColor="#3B3E43" />
                  </LinearGradient>
                  <LinearGradient id="z-sleeve" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#5B6067" />
                    <Stop offset="0.5" stopColor="#9AA0A6" />
                    <Stop offset="1" stopColor="#44484D" />
                  </LinearGradient>
                  <LinearGradient id="z-cap" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#1A1C1F" />
                    <Stop offset="1" stopColor="#050506" />
                  </LinearGradient>
                  <LinearGradient id="z-fade" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor={colors.card} stopOpacity="1" />
                    <Stop offset="1" stopColor={colors.card} stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                {renderZoom()}
              </Svg>
            </Animated.View>
          </>
        ) : null}
      </View>

      {mode === 'zoom' ? (
        <Text style={[styles.caption, { color: colors.mutedForeground }]}>
          Mostrando un lado — el otro es igual
        </Text>
      ) : null}
      {onRemove && perSide.length > 0 ? (
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Tocá un disco para quitarlo
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  caption: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 4, textAlign: 'center' },
  hint: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4, textAlign: 'center' },
});
