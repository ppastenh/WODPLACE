import React from 'react';
import {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
  TextPath,
} from 'react-native-svg';
import { shade } from '@/lib/rm/plateColors';
import type { Unit } from '@/lib/rm/units';

type Common = {
  /** Unique per instance — gradient ids are derived from it. */
  uid: string;
  cx: number;
  cy: number;
  fill: string;
  stroke: string;
  textColor: string;
  label: string;
  unit: Unit;
  /** Technical / fractional plate — shrink the text a touch. */
  small?: boolean;
};

type StackProps = Common & { variant: 'stack'; w: number; h: number };
type DiscProps = Common & { variant: 'disc'; d: number };

export type PlateShapeProps = StackProps | DiscProps;

/**
 * One colour-coded plate with a light 3D treatment (drop shadow, colour
 * gradient body, gloss sweep, inner bevel). Returns an SVG <G>, so it can be
 * dropped straight into a parent <Svg> (the bar diagram) or wrapped in its
 * own <Svg> (the manual-add buttons).
 */
export function PlateShape(props: PlateShapeProps) {
  const { uid, cx, cy, fill, stroke, textColor, label, unit, small } = props;
  const body = `${uid}-body`;
  const gloss = `${uid}-gloss`;
  const face = `${uid}-face`;

  if (props.variant === 'stack') {
    const { w, h } = props;
    const x = cx - w / 2;
    const y = cy - h / 2;
    const rx = Math.min(6, w / 3);
    return (
      <G>
        <Defs>
          <LinearGradient id={body} x1="0" y1="0" x2="0.35" y2="1">
            <Stop offset="0" stopColor={shade(fill, 0.3)} />
            <Stop offset="0.5" stopColor={fill} />
            <Stop offset="1" stopColor={shade(fill, -0.36)} />
          </LinearGradient>
          <LinearGradient id={gloss} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.42" />
            <Stop offset="0.42" stopColor="#FFFFFF" stopOpacity="0.05" />
            <Stop offset="0.6" stopColor="#000000" stopOpacity="0" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0.28" />
          </LinearGradient>
        </Defs>

        {/* drop shadow */}
        <Rect x={x + 1.5} y={y + 3.5} width={w} height={h} rx={rx} fill="#000000" opacity={0.3} />
        {/* body */}
        <Rect x={x} y={y} width={w} height={h} rx={rx} fill={`url(#${body})`} stroke={stroke} strokeWidth={1} />
        {/* gloss */}
        <Rect x={x} y={y} width={w} height={h} rx={rx} fill={`url(#${gloss})`} />
        {/* top bevel highlight */}
        <Rect x={x + 1.5} y={y + 1.5} width={w - 3} height={1.5} rx={0.75} fill="#FFFFFF" opacity={0.4} />

        <SvgText
          x={cx}
          y={cy - (small ? 1 : 2)}
          fontSize={small ? 9 : 11}
          fontWeight="bold"
          fill={textColor}
          textAnchor="middle"
        >
          {label}
        </SvgText>
        <SvgText x={cx} y={cy + (small ? 8 : 9)} fontSize={small ? 6 : 7} fill={textColor} textAnchor="middle">
          {unit}
        </SvgText>
      </G>
    );
  }

  const { d } = props;
  const r = d / 2;
  const hub = `${uid}-hub`;
  const arcId = `${uid}-arc`;

  // Everything below is a ratio of r, so fractional discs (smaller d) get
  // the identical treatment scaled proportionally — no separate layout.
  const ink = '#141414'; // number + wordmark — always dark, not colour-dependent
  const hubR = r * 0.34;
  const hole = r * 0.16;
  const arcR = r * 0.74;
  const tight = r < 24; // smaller (frac) discs

  // Longer decimal labels (e.g. "1.25") need a smaller font to stay inside
  // the face than short ones ("15") at the same disc size.
  const digits = label.length;
  const lengthFactor = digits <= 2 ? 1 : digits === 3 ? 0.85 : 0.72;
  const numFontSize = Math.max(6, Math.min(14, r * 0.46)) * lengthFactor;

  const brandFontSize = Math.max(4, r * 0.19);

  // Text-on-path arc hugging the bottom rim, rising toward the sides. Wide
  // span + generous radius so "WODPLACE" always has room to clear in full —
  // react-native-svg's TextPath has no textLength/lengthAdjust to force-fit.
  const a1 = (155 * Math.PI) / 180; // lower-left
  const a2 = (25 * Math.PI) / 180; // lower-right
  const arcPath =
    `M ${cx + arcR * Math.cos(a1)} ${cy + arcR * Math.sin(a1)} ` +
    `A ${arcR} ${arcR} 0 0 0 ${cx + arcR * Math.cos(a2)} ${cy + arcR * Math.sin(a2)}`;

  return (
    <G>
      <Defs>
        <LinearGradient id={body} x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor={shade(fill, 0.24)} />
          <Stop offset="0.55" stopColor={shade(fill, -0.08)} />
          <Stop offset="1" stopColor={shade(fill, -0.42)} />
        </LinearGradient>
        <RadialGradient id={face} cx="50%" cy="38%" r="65%">
          <Stop offset="0" stopColor={shade(fill, 0.32)} />
          <Stop offset="0.6" stopColor={fill} />
          <Stop offset="1" stopColor={shade(fill, -0.22)} />
        </RadialGradient>
        {/* metallic insert around the hole — silver, not the plate colour */}
        <LinearGradient id={hub} x1="0.15" y1="0" x2="0.85" y2="1">
          <Stop offset="0" stopColor="#F3F4F6" />
          <Stop offset="0.42" stopColor="#C7C9CF" />
          <Stop offset="0.58" stopColor="#9A9CA3" />
          <Stop offset="1" stopColor="#5A5C63" />
        </LinearGradient>
        <Path id={arcId} d={arcPath} />
      </Defs>

      {/* drop shadow */}
      <Circle cx={cx + 1} cy={cy + 3.5} r={r} fill="#000000" opacity={0.32} />
      {/* rim */}
      <Circle cx={cx} cy={cy} r={r} fill={`url(#${body})`} stroke={stroke} strokeWidth={1} />
      {/* face */}
      <Circle cx={cx} cy={cy} r={r * 0.82} fill={`url(#${face})`} />
      <Circle cx={cx} cy={cy} r={r * 0.82} fill="none" stroke="#000000" strokeOpacity={0.18} strokeWidth={1} />
      {/* top sheen */}
      <Circle cx={cx - r * 0.22} cy={cy - r * 0.28} r={r * 0.4} fill="#FFFFFF" opacity={0.12} />

      {/* metallic hub insert */}
      <Circle cx={cx} cy={cy} r={hubR} fill={`url(#${hub})`} stroke="#000000" strokeOpacity={0.28} strokeWidth={1} />
      <Circle
        cx={cx - hubR * 0.15}
        cy={cy - hubR * 0.25}
        r={hubR * 0.5}
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity={0.4}
        strokeWidth={0.8}
      />
      {/* bore hole */}
      <Circle cx={cx} cy={cy} r={hole} fill="#0B0C0E" />
      <Circle cx={cx} cy={cy} r={hole} fill="none" stroke="#000000" strokeOpacity={0.6} strokeWidth={1} />
      <Circle cx={cx} cy={cy - hole * 0.28} r={hole * 0.82} fill="none" stroke="#FFFFFF" strokeOpacity={0.15} strokeWidth={0.8} />

      {/* weight — above centre */}
      <SvgText
        x={cx}
        y={cy - r * 0.4}
        fontSize={numFontSize}
        fontWeight="bold"
        fill={ink}
        textAnchor="middle"
      >
        {label}
      </SvgText>

      {/* brand — below centre, curved along the bottom rim */}
      <SvgText
        fill={ink}
        fontWeight="bold"
        fontSize={brandFontSize}
        letterSpacing={tight ? -0.3 : -0.1}
        textAnchor="middle"
      >
        <TextPath href={`#${arcId}`} startOffset="50%">
          WODPLACE
        </TextPath>
      </SvgText>
    </G>
  );
}
