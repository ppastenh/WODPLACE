import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { useDarkColors } from '@/hooks/useDarkColors';
import type { LoadedPlate } from '@/lib/rm/barLoad';
import { plateFill, plateStroke, plateTextColor } from '@/lib/rm/plateColors';
import { trimNum } from '@/lib/rm/units';

type Props = {
  /** One side, heaviest first (bar-side to collar). */
  perSide: LoadedPlate[];
  /** Tap a plate to remove it (manual mode). */
  onRemove?: (unit: LoadedPlate['unit'], weight: number) => void;
};

const H = 150;
const PLATE_W = 26;
const GAP = 3;
const SLEEVE_W = 22;
const MIN_PLATE_H = 46;

/** Bar with the plates stacked on both sides (mirrored), colour-coded. */
export function BarLoadDiagram({ perSide, onRemove }: Props) {
  const colors = useDarkColors();
  const [w, setW] = React.useState(0);
  const mid = H / 2;

  const maxKg = Math.max(1, ...perSide.map((p) => p.kg));
  const plateH = (kg: number) => MIN_PLATE_H + (kg / maxKg) * (H - MIN_PLATE_H - 24);

  const stackW = perSide.length * (PLATE_W + GAP);
  // centre gap for the bare shaft
  const centerGap = Math.max(46, w - 2 * (stackW + SLEEVE_W + 14));
  const collarX = (w - centerGap) / 2;

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 ? (
        <Svg width={w} height={H}>
          {/* shaft */}
          <Rect
            x={12}
            y={mid - 3}
            width={w - 24}
            height={6}
            rx={3}
            fill={colors.mutedForeground}
          />
          {/* sleeves */}
          <Rect x={collarX - stackW - SLEEVE_W} y={mid - 7} width={SLEEVE_W} height={14} rx={2} fill={colors.inactive} />
          <Rect x={w - collarX + stackW} y={mid - 7} width={SLEEVE_W} height={14} rx={2} fill={colors.inactive} />
          {/* collars */}
          <Rect x={collarX - 6} y={mid - 9} width={6} height={18} rx={1} fill={colors.mutedForeground} />
          <Rect x={w - collarX} y={mid - 9} width={6} height={18} rx={1} fill={colors.mutedForeground} />

          {perSide.map((p, i) => {
            const h = plateH(p.kg);
            const fill = plateFill(p.unit, p.weight);
            const stroke = plateStroke(p.unit, p.weight);
            const txt = plateTextColor(p.unit, p.weight);
            const xLeft = collarX - (i + 1) * (PLATE_W + GAP) + GAP / 2;
            const xRight = w - collarX + i * (PLATE_W + GAP) + GAP / 2;
            const cyNum = mid - 4;
            const cyUnit = mid + 9;
            return (
              <React.Fragment key={i}>
                {[xLeft, xRight].map((x, side) => (
                  <React.Fragment key={side}>
                    <Rect
                      x={x}
                      y={mid - h / 2}
                      width={PLATE_W}
                      height={h}
                      rx={3}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={1}
                    />
                    <SvgText
                      x={x + PLATE_W / 2}
                      y={cyNum}
                      fontSize={11}
                      fontWeight="bold"
                      fill={txt}
                      textAnchor="middle"
                    >
                      {trimNum(p.weight, 2)}
                    </SvgText>
                    <SvgText
                      x={x + PLATE_W / 2}
                      y={cyUnit}
                      fontSize={7}
                      fill={txt}
                      textAnchor="middle"
                    >
                      {p.unit}
                    </SvgText>
                  </React.Fragment>
                ))}
              </React.Fragment>
            );
          })}
        </Svg>
      ) : null}

      {/* tap-to-remove row (manual mode) */}
      {onRemove && perSide.length > 0 ? (
        <View style={styles.removeRow}>
          {perSide.map((p, i) => (
            <Pressable
              key={i}
              onPress={() => onRemove(p.unit, p.weight)}
              style={[styles.removeChip, { borderColor: colors.border }]}
            >
              <View style={[styles.dot, { backgroundColor: plateFill(p.unit, p.weight) }]} />
              <Text style={[styles.removeText, { color: colors.foreground }]}>
                {trimNum(p.weight, 2)} {p.unit}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>✕</Text>
            </Pressable>
          ))}
          <Text style={[styles.perSide, { color: colors.mutedForeground }]}>× cada lado · tocá para quitar</Text>
        </View>
      ) : perSide.length === 0 ? (
        <Text style={[styles.perSide, { color: colors.mutedForeground, marginTop: 8 }]}>
          Barra vacía.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  removeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 12 },
  removeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  removeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  perSide: { fontSize: 11, fontFamily: 'Inter_400Regular' },
});
