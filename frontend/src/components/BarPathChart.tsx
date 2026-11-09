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

interface BarPathChartProps {
  framesData?: {
    frames: Array<{
      frame_index: number;
      timestamp_s: number;
      bar?: { x: number; y: number; confidence: number; tracked: boolean };
      rep_number?: number;
    }>;
  };
  activeRep?: number;
}

export const BarPathChart: React.FC<BarPathChartProps> = ({ framesData, activeRep }) => {
  if (!framesData?.frames || framesData.frames.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-forge-grey text-sm">
        No bar tracking data available
      </div>
    );
  }

  // Filter for active rep if specified
  const filteredFrames = activeRep
    ? framesData.frames.filter((f) => f.rep_number === activeRep && f.bar?.tracked)
    : framesData.frames.filter((f) => f.bar?.tracked);

  if (filteredFrames.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-forge-grey text-sm">
        Bar was not tracked in this rep
      </div>
    );
  }

  // Compute baseline x (median of tracked points) to show deviation
  const xs = filteredFrames.map((f) => f.bar!.x);
  const medianX = xs.slice().sort()[Math.floor(xs.length / 2)];

  const chartData = filteredFrames.map((f) => ({
    frame: f.frame_index,
    time: f.timestamp_s.toFixed(2),
    // Horizontal drift from median, in percentage of frame width
    horizontalDrift: +((f.bar!.x - medianX) * 100).toFixed(2),
    // Vertical position (inverted so higher in squat = higher on chart)
    verticalPos: +((1 - f.bar!.y) * 100).toFixed(1),
  }));

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-eyebrow text-forge-grey font-display">
          Bar Horizontal Drift (% frame width)
        </span>
        <span className="text-xs text-forge-grey">
          Baseline median x: {(medianX * 100).toFixed(1)}%
        </span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
          <XAxis
            dataKey="time"
            tick={{ fill: '#888', fontSize: 10 }}
            tickLine={{ stroke: '#333' }}
            axisLine={{ stroke: '#333' }}
            unit="s"
          />
          <YAxis
            tick={{ fill: '#888', fontSize: 10 }}
            tickLine={{ stroke: '#333' }}
            axisLine={{ stroke: '#333' }}
            unit="%"
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#161616',
              border: '1px solid #333',
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: '#aaa' }}
            itemStyle={{ color: '#E03A1E' }}
            formatter={(val: any) => [`${val}%`, 'Drift']}
            labelFormatter={(label) => `Time: ${label}s`}
          />
          <ReferenceLine y={0} stroke="#444" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="horizontalDrift"
            stroke="#E03A1E"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#E03A1E' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
