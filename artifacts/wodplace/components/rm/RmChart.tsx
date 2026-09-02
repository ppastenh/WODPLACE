import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { useDarkColors } from '@/hooks/useDarkColors';

export type ChartPoint = { date: string; kg: number };

type Props = {
  points: ChartPoint[]; // chronological (oldest first)
  unitLabel: string; // 'kg' | 'lb' — the axis is drawn in this unit
  toDisplay: (kg: number) => number; // kg -> displayed value
  height?: number;
};

/** Minimal inline-SVG line chart. No chart library. */
export function RmChart({ points, unitLabel, toDisplay, height = 180 }: Props) {
  const colors = useDarkColors();
  const [w, setW] = React.useState(0);
  const padL = 38;
  const padR = 12;
  const padT = 14;
  const padB = 22;

  if (points.length === 0) {
    return (
      <View style={[styles.empty, { height, borderColor: colors.border }]}>
        <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 13 }}>
          Sin datos todavía
        </Text>
      </View>
    );
  }

  const vals = points.map((p) => toDisplay(p.kg));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const yMin = min - span * 0.1;
  const yMax = max + span * 0.1;

  const innerW = Math.max(0, w - padL - padR);
  const innerH = height - padT - padB;

  const x = (i: number) =>
    padL + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => padT + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const poly = points.map((p, i) => `${x(i)},${y(toDisplay(p.kg))}`).join(' ');
  const ticks = [yMax, (yMax + yMin) / 2, yMin];

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }}>
      {w > 0 ? (
        <Svg width={w} height={height}>
          {ticks.map((t, i) => (
            <React.Fragment key={i}>
              <Line
                x1={padL}
                x2={w - padR}
                y1={y(t)}
                y2={y(t)}
                stroke={colors.border}
                strokeWidth={1}
              />
              <SvgText
                x={padL - 6}
                y={y(t) + 3}
                fontSize={9}
                fill={colors.mutedForeground}
                textAnchor="end"
              >
                {Math.round(t)}
              </SvgText>
            </React.Fragment>
          ))}
          <SvgText x={4} y={12} fontSize={9} fill={colors.mutedForeground}>
            {unitLabel}
          </SvgText>
          <Polyline
            points={poly}
            fill="none"
            stroke={colors.primary}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((p, i) => (
            <Circle key={i} cx={x(i)} cy={y(toDisplay(p.kg))} r={3.5} fill={colors.primary} />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
  },
});
