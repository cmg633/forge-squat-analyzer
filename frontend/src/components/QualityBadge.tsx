import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { QualityGateResult } from '../types/analysis';

interface QualityBadgeProps {
  qualityGate?: QualityGateResult;
}

export const QualityBadge: React.FC<QualityBadgeProps> = ({ qualityGate }) => {
  if (!qualityGate) return null;

  const checks = [
    { label: 'Side View', ok: qualityGate.is_side_view },
    { label: 'Full Body', ok: qualityGate.full_body_visible },
    { label: 'Visibility', ok: qualityGate.landmark_visibility_ok },
    { label: 'Steadiness', ok: qualityGate.camera_steady },
  ];

  return (
    <div className="bg-forge-card border border-forge-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-eyebrow text-forge-red font-display font-bold">
          QUALITY GATE
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
            qualityGate.passed
              ? 'bg-forge-green/10 text-forge-green border border-forge-green/30'
              : 'bg-forge-red/10 text-forge-red border border-forge-red/30'
          }`}
        >
          {qualityGate.passed ? (
            <>
              <CheckCircle2 size={12} />
              PASSED
            </>
          ) : (
            <>
              <XCircle size={12} />
              DEGRADED
            </>
          )}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {checks.map(({ label, ok }) => (
          <div
            key={label}
            className={`flex items-center gap-1.5 p-2 rounded-lg ${
              ok ? 'bg-white/5 text-forge-white' : 'bg-forge-red/10 text-forge-red'
            }`}
          >
            {ok ? (
              <CheckCircle2 size={14} className="text-forge-green flex-shrink-0" />
            ) : (
              <AlertTriangle size={14} className="text-forge-red flex-shrink-0" />
            )}
            <span className="truncate">{label}</span>
          </div>
        ))}
      </div>

      {qualityGate.reason && (
        <div className="mt-3 p-2 bg-forge-red/10 border border-forge-red/20 rounded-lg text-xs text-forge-red">
          {qualityGate.reason}
        </div>
      )}
    </div>
  );
};
