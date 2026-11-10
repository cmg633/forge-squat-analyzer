import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { QualityGateResult } from '../types/analysis';
import { TagChip } from '../ui/TagChip';

interface QualityBadgeProps {
  qualityGate?: QualityGateResult;
}

export const QualityBadge: React.FC<QualityBadgeProps> = ({ qualityGate }) => {
  if (!qualityGate) return null;

  const checks = [
    { label: 'Side view framing', ok: qualityGate.is_side_view },
    { label: 'Full body visible', ok: qualityGate.full_body_visible },
    { label: 'Landmark clarity', ok: qualityGate.landmark_visibility_ok },
    { label: 'Steady camera', ok: qualityGate.camera_steady },
  ];

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--hairline)]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--hairline)] bg-[var(--bg)]">
        <span className="type-eyebrow text-[#CCFF00]">Quality gate</span>
        <TagChip
          label={qualityGate.passed ? 'Passed' : 'Degraded'}
          variant={qualityGate.passed ? 'lime' : 'magenta'}
        />
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {checks.map(({ label, ok }) => (
            <div
              key={label}
              className={`flex items-center gap-2 p-2 border type-small ${
                ok
                  ? 'border-[var(--hairline)] bg-[var(--bg)] text-[var(--text)]/80'
                  : 'border-[#F040B8] bg-[#F040B8]/10 text-[#F040B8]'
              }`}
            >
              {ok ? (
                <CheckCircle2 size={14} className="text-[#CCFF00] shrink-0" />
              ) : (
                <AlertTriangle size={14} className="text-[#F040B8] shrink-0" />
              )}
              <span className="truncate">{label}</span>
            </div>
          ))}
        </div>

        {qualityGate.reason && (
          <div className="p-3 bg-[#F040B8]/10 border border-[#F040B8] type-small text-[#F040B8]">
            {qualityGate.reason}
          </div>
        )}
      </div>
    </div>
  );
};
