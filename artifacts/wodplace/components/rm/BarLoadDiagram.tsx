import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
import { plateFill, plateStroke, plateTextColor } from '@/lib/rm/plateColors';
import { trimNum, type Unit } from '@/lib/rm/units';

type Props = {
  /** One side, heaviest first (bar-side to collar). */
  perSide: LoadedPlate[];
  /** Bar weight, shown on the shaft (e.g. "20 kg"). */
  barLabel: string;
  /** Tap a plate on the drawing to remove it (manual mode). */
  onRemove?: (unit: Unit, weight: number) => void;
};

const H = 156;
const PLATE_W = 26;
const GAP = 3;
const SLEEVE_W = 24;
const MIN_PLATE_H = 48;

/** Barbell with the plates stacked on both sides (mirrored), colour-coded,
 *  with a light 3D treatment (metallic shaft, plate shine + shadow). */
export function BarLoadDiagram({ perSide, barLabel, onRemove }: Props) {
  const colors = useDarkColors();
  const [w, setW] = React.useState(0);
  const mid = H / 2;

  const maxKg = Math.max(1, ...perSide.map((p) => p.kg));
  const plateH = (kg: number) => MIN_PLATE_H + (kg / maxKg) * (H - MIN_PLATE_H - 22);

  const stackW = perSide.length * (PLATE_W + GAP);
  const centerGap = Math.max(64, w - 2 * (stackW + SLEEVE_W + 12));
  const collarX = (w - centerGap) / 2;
  const labelW = Math.max(34, barLabel.length * 7 + 10);

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 ? (
        <Svg width={w} height={H}>
          <Defs>
            <LinearGradient id="shaft" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#4A4E54" />
              <Stop offset="0.45" stopColor="#8B9096" />
              <Stop offset="0.55" stopColor="#7A7F85" />
              <Stop offset="1" stopColor="#3B3E43" />
            </LinearGradient>
            <LinearGradient id="sleeve" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#5B6067" />
              <Stop offset="0.5" stopColor="#9AA0A6" />
              <Stop offset="1" stopColor="#44484D" />
            </LinearGradient>
            <LinearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.38" />
              <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0.05" />
              <Stop offset="0.6" stopColor="#000000" stopOpacity="0" />
              <Stop offset="1" stopColor="#000000" stopOpacity="0.32" />
            </LinearGradient>
          </Defs>

          {/* shaft */}
          <Rect x={10} y={mid - 4} width={w - 20} height={8} rx={4} fill="url(#shaft)" />

          {/* sleeves */}
          <Rect x={collarX - stackW - SLEEVE_W} y={mid - 9} width={SLEEVE_W} height={18} rx={3} fill="url(#sleeve)" />
          <Rect x={w - collarX + stackW} y={mid - 9} width={SLEEVE_W} height={18} rx={3} fill="url(#sleeve)" />

          {/* black end caps + inner collar clamps */}
          <Rect x={collarX - stackW - SLEEVE_W - 4} y={mid - 11} width={5} height={22} rx={1.5} fill="#0C0D0F" />
          <Rect x={w - collarX + stackW + SLEEVE_W - 1} y={mid - 11} width={5} height={22} rx={1.5} fill="#0C0D0F" />
          <Rect x={collarX - 7} y={mid - 12} width={7} height={24} rx={2} fill="#0C0D0F" />
          <Rect x={w - collarX} y={mid - 12} width={7} height={24} rx={2} fill="#0C0D0F" />

          {/* plates */}
          {perSide.map((p, i) => {
            const h = plateH(p.kg);
            const fill = plateFill(p.unit, p.weight);
            const stroke = plateStroke(p.unit, p.weight);
            const txt = plateTextColor(p.unit, p.weight);
            const xLeft = collarX - (i + 1) * (PLATE_W + GAP) + GAP / 2;
            const xRight = w - collarX + i * (PLATE_W + GAP) + GAP / 2;
            return (
              <React.Fragment key={i}>
                {[xLeft, xRight].map((x, side) => (
                  <G
                    key={side}
                    onPress={onRemove ? () => onRemove(p.unit, p.weight) : undefined}
                  >
                    <Rect
                      x={x}
                      y={mid - h / 2}
                      width={PLATE_W}
                      height={h}
                      rx={4}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={1}
                    />
                    <Rect x={x} y={mid - h / 2} width={PLATE_W} height={h} rx={4} fill="url(#shine)" />
                    <SvgText
                      x={x + PLATE_W / 2}
                      y={mid - 3}
                      fontSize={11}
                      fontWeight="bold"
                      fill={txt}
                      textAnchor="middle"
                    >
                      {trimNum(p.weight, 2)}
                    </SvgText>
                    <SvgText
                      x={x + PLATE_W / 2}
                      y={mid + 9}
                      fontSize={7}
                      fill={txt}
                      textAnchor="middle"
                    >
                      {p.unit}
                    </SvgText>
                  </G>
                ))}
              </React.Fragment>
            );
          })}

          {/* bar-weight label, centred on the bare shaft */}
          <Rect
            x={w / 2 - labelW / 2}
            y={mid - 9}
            width={labelW}
            height={18}
            rx={9}
            fill={colors.background}
            fillOpacity={0.82}
          />
          <SvgText
            x={w / 2}
            y={mid + 4}
            fontSize={10}
            fontWeight="bold"
            fill={colors.mutedForeground}
            textAnchor="middle"
          >
            {barLabel}
          </SvgText>
        </Svg>
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
  hint: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 8, textAlign: 'center' },
});
