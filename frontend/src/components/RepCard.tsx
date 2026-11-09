import { motion } from 'framer-motion';
import type { RepMetrics } from '../types/analysis';
import { formatMetric, formatConfidence } from '../utils/format';

interface RepCardProps {
  rep: RepMetrics;
  isActive?: boolean;
  onClick?: () => void;
}

interface MetricRowProps {
  label: string;
  value: number | null;
  unit: string;
  confidence: number;
  isEstimated: boolean;
  note?: string;
}

function MetricRow({ label, value, unit, confidence, isEstimated, note }: MetricRowProps) {
  return (
    <div className="flex items-start justify-between gap-2 py-2 border-b border-forge-border last:border-0">
      <div className="flex flex-col min-w-0">
        <span className="eyebrow">{label}</span>
        {note && <span className="text-forge-grey text-xs mt-0.5 leading-snug">{note}</span>}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="font-mono font-bold text-white text-sm">
          {formatMetric(value, unit)}
        </span>
        <div className="flex items-center gap-1.5">
          {isEstimated && <span className="badge badge-orange">ESTIMATE</span>}
          <span className="text-forge-grey text-xs">{formatConfidence(confidence)}</span>
        </div>
      </div>
    </div>
  );
}

export default function RepCard({ rep, isActive = false, onClick }: RepCardProps) {
  return (
    <motion.div
      layout
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        glass-card p-4 cursor-pointer select-none transition-all duration-200 snap-item w-72 shrink-0
        ${isActive ? 'border-forge-red/50 shadow-red-glow' : 'red-glow-hover'}
      `}
      role="button"
      tabIndex={0}
      aria-label={`Rep ${rep.rep_number} metrics`}
      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && onClick) onClick(); }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="eyebrow">Rep</p>
          <p className="display-heading text-3xl text-white">{rep.rep_number}</p>
        </div>
        {isActive && (
          <span className="badge badge-red">CURRENT</span>
        )}
      </div>

      {/* Metrics */}
      <div className="space-y-0">
        <MetricRow
          label="Depth"
          value={rep.depth_hip_vs_knee.value}
          unit={rep.depth_hip_vs_knee.unit}
          confidence={rep.depth_hip_vs_knee.confidence}
          isEstimated={rep.depth_hip_vs_knee.is_estimated}
          note={rep.depth_hip_vs_knee.observation_note}
        />
        <MetricRow
          label="Back Angle"
          value={rep.back_angle_bottom.value}
          unit={rep.back_angle_bottom.unit}
          confidence={rep.back_angle_bottom.confidence}
          isEstimated={rep.back_angle_bottom.is_estimated}
          note={rep.back_angle_bottom.observation_note}
        />
        <MetricRow
          label="Knee Angle"
          value={rep.knee_angle_bottom.value}
          unit={rep.knee_angle_bottom.unit}
          confidence={rep.knee_angle_bottom.confidence}
          isEstimated={rep.knee_angle_bottom.is_estimated}
          note={rep.knee_angle_bottom.observation_note}
        />
        <MetricRow
          label="Bar Offset"
          value={rep.bar_midfoot_offset.value}
          unit={rep.bar_midfoot_offset.unit}
          confidence={rep.bar_midfoot_offset.confidence}
          isEstimated={rep.bar_midfoot_offset.is_estimated}
          note={rep.bar_midfoot_offset.observation_note}
        />
        <MetricRow
          label="Bar Path σ"
          value={rep.bar_path_std.value}
          unit={rep.bar_path_std.unit}
          confidence={rep.bar_path_std.confidence}
          isEstimated={rep.bar_path_std.is_estimated}
          note={rep.bar_path_std.observation_note}
        />
      </div>
    </motion.div>
  );
}
