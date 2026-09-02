import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { useDarkColors } from '@/hooks/useDarkColors';
import type { LoadedPlate } from '@/lib/rm/barLoad';
import { trimNum } from '@/lib/rm/units';

type Props = {
  /** One side, heaviest first (bar-side to collar). */
  perSide: LoadedPlate[];
};

/** Draws the bar with the plates stacked on both sides (mirrored). */
export function BarLoadDiagram({ perSide }: Props) {
  const colors = useDarkColors();
  const [w, setW] = React.useState(0);
  const H = 130;
  const mid = H / 2;
  const sleeveH = 12;
  const plateGap = 3;

  // Plate visual height scales with kg (clamped).
  const maxKg = Math.max(1, ...perSide.map((p) => p.kg));
  const plateH = (kg: number) => 34 + (kg / maxKg) * 70;
  const plateW = 13;

  const stackW = perSide.length * (plateW + plateGap);
  const barCenterW = Math.max(40, w - 2 * stackW - 2 * 26);
  const collarX = (w - barCenterW) / 2 - 8;

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 ? (
        <Svg width={w} height={H}>
          {/* bar shaft */}
          <Rect
            x={collarX - stackW - 20}
            y={mid - 3}
            width={w - 2 * (collarX - stackW - 20)}
            height={6}
            rx={2}
            fill={colors.mutedForeground}
          />
          {/* sleeves */}
          <Rect x={collarX - stackW - 20} y={mid - sleeveH / 2} width={20} height={sleeveH} fill={colors.inactive} />
          <Rect
            x={w - (collarX - stackW - 20) - 20}
            y={mid - sleeveH / 2}
            width={20}
            height={sleeveH}
            fill={colors.inactive}
          />

          {/* left + right plate stacks (mirrored) */}
          {perSide.map((p, i) => {
            const h = plateH(p.kg);
            const xLeft = collarX - (i + 1) * (plateW + plateGap);
            const xRight = w - collarX + i * (plateW + plateGap);
            return (
              <React.Fragment key={i}>
                <Rect x={xLeft} y={mid - h / 2} width={plateW} height={h} rx={2} fill={colors.primary} />
                <Rect x={xRight} y={mid - h / 2} width={plateW} height={h} rx={2} fill={colors.primary} />
              </React.Fragment>
            );
          })}
          {/* centre reference line */}
          <Line x1={w / 2} y1={8} x2={w / 2} y2={H - 8} stroke={colors.border} strokeWidth={1} strokeDasharray="3 4" />
        </Svg>
      ) : null}

      {/* legend: per-side plate list */}
      <View style={styles.legend}>
        {perSide.length === 0 ? (
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 12 }}>
            Solo la barra.
          </Text>
        ) : (
          perSide.map((p, i) => (
            <View key={i} style={[styles.chip, { borderColor: colors.border }]}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.chipText, { color: colors.foreground }]}>
                {trimNum(p.weight, 2)} {p.unit}
              </Text>
            </View>
          ))
        )}
        <Text style={[styles.perSide, { color: colors.mutedForeground }]}>× cada lado</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  perSide: { fontSize: 11, fontFamily: 'Inter_400Regular', marginLeft: 2 },
});
