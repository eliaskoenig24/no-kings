'use client';

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface RadarDataPoint {
  topic: string;
  value: number;
  fullMark: number;
}

interface TwinRadarProps {
  data: RadarDataPoint[];
  color?: string;
  size?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: RadarDataPoint }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm shadow-lg">
      <span className="text-slate-400">{point.topic}: </span>
      <span className="text-slate-50 font-medium">{point.value}%</span>
    </div>
  );
}

export default function TwinRadar({ data, color = '#3b82f6', size }: TwinRadarProps) {
  return (
    <ResponsiveContainer width="100%" height={size ?? 300}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="#334155" />
        <PolarAngleAxis
          dataKey="topic"
          tick={{ fill: '#94a3b8', fontSize: 12 }}
        />
        <PolarRadiusAxis
          angle={0}
          tickCount={0}
          stroke="transparent"
          tick={false}
          axisLine={false}
        />
        <Radar
          name="Twin"
          dataKey="value"
          stroke={color}
          fill={color}
          fillOpacity={0.25}
          strokeWidth={2}
        />
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
