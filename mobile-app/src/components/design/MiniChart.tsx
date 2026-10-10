import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Line, Circle } from 'react-native-svg';
import { useTheme } from '../../theme';

interface Props {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export const MiniChart: React.FC<Props> = ({
  data,
  width = 320,
  height = 110,
  color: colorProp,
}) => {
  const { palette } = useTheme();
  // A line, not a fill, so it takes the deeper gold that reads on light paper.
  const color = colorProp ?? palette.goldText;
  if (data.length < 2) {
    return <View style={{ width, height }} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const topPad = 14;
  const bottomPad = 14;
  const inner = height - topPad - bottomPad;
  const points = data.map(
    (v, i) => [i * stepX, height - bottomPad - ((v - min) / range) * inner] as [number, number]
  );
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(' ');
  const fillPath = `${path} L ${width},${height} L 0,${height} Z`;
  const last = points[points.length - 1];

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <LinearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {[0, 0.5, 1].map((p) => {
        const y = topPad + p * inner;
        return (
          <Line key={p} x1={0} x2={width} y1={y} y2={y} stroke={palette.line2} strokeWidth={1} />
        );
      })}
      <Path d={fillPath} fill="url(#chart-fill)" />
      <Path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={last[0]} cy={last[1]} r={3.5} fill={palette.bg} stroke={color} strokeWidth={1.8} />
    </Svg>
  );
};
