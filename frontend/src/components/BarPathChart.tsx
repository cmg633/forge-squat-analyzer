import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface BarPathFrameItem {
  frame_index: number;
  timestamp_s: number;
  bar?: { x: number; y: number; confidence: number; tracked: boolean } | null;
  rep_number?: number | null;
}

interface BarPathChartProps {
  framesData?: {
    frames: BarPathFrameItem[];
  } | null;
  activeRep?: number | null;
}

export const BarPathChart: React.FC<BarPathChartProps> = ({ framesData, activeRep }) => {
  if (!framesData?.frames || framesData.frames.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center type-small text-[var(--text)]/60 border border-dashed border-[var(--hairline)]">
        No bar tracking data available.
      </div>
    );
  }

  const filteredFrames = activeRep
    ? framesData.frames.filter((f) => f.rep_number === activeRep && f.bar?.tracked)
    : framesData.frames.filter((f) => f.bar?.tracked);

  if (filteredFrames.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center type-small text-[var(--text)]/60 border border-dashed border-[var(--hairline)]">
        {activeRep ? `Bar was not continuously tracked during rep ${activeRep}.` : 'Bar tracker lost lock across clip.'}
      </div>
    );
  }

  const xs = filteredFrames.map((f) => f.bar!.x).sort((a, b) => a - b);
  const medianX = xs[Math.floor(xs.length / 2)];

  const chartData = filteredFrames.map((f) => ({
    time: f.timestamp_s.toFixed(2),
    horizontalDrift: +((f.bar!.x - medianX) * 100).toFixed(2),
  }));

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between type-mono text-[var(--text)]/65">
        <span>Horizontal bar offset vs median X</span>
        <span>Median X: {(medianX * 100).toFixed(1)}%</span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
          <XAxis
            dataKey="time"
            tick={{ fill: '#8A8A8A', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickLine={{ stroke: 'rgba(255,255,255,0.12)' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
            unit="s"
          />
          <YAxis
            tick={{ fill: '#8A8A8A', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickLine={{ stroke: 'rgba(255,255,255,0.12)' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
            unit="%"
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0A0A0A',
              border: '1px solid #CCFF00',
              fontFamily: 'JetBrains Mono',
              fontSize: '11px',
              padding: '6px 10px',
            }}
            labelStyle={{ color: '#CCFF00', fontWeight: 'bold' }}
            itemStyle={{ color: '#F4F4EE' }}
            formatter={(val: number) => [`${val > 0 ? '+' : ''}${val}%`, 'Horizontal drift']}
            labelFormatter={(label) => `Time: ${label}s`}
          />
          <ReferenceLine y={0} stroke="#A97BFF" strokeDasharray="3 3" strokeWidth={1.5} />
          <Line
            type="monotone"
            dataKey="horizontalDrift"
            stroke="#CCFF00"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#F040B8', stroke: '#F4F4EE' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
