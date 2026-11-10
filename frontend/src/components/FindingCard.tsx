import React, { useState } from 'react';
import { CheckCircle2, XCircle, HelpCircle, ChevronDown, BookOpen } from 'lucide-react';
import type { Finding } from '../types/analysis';
import { SelectionBox } from '../ui/SelectionBox';
import { TagChip } from '../ui/TagChip';

interface FindingCardProps {
  finding: Finding;
  isActive?: boolean;
  onSelect?: () => void;
  onCite?: (finding: Finding) => void;
}

const RESULT_CONFIG = {
  meets_standard: {
    label: 'Meets',
    icon: CheckCircle2,
    color: 'lime' as const,
    border: 'border-[#CCFF00]/60',
    text: 'text-[#CCFF00]',
    badgeVariant: 'lime' as const,
  },
  does_not_meet_standard: {
    label: 'Issue',
    icon: XCircle,
    color: 'magenta' as const,
    border: 'border-[#F040B8]/70',
    text: 'text-[#F040B8]',
    badgeVariant: 'magenta' as const,
  },
  cannot_assess: {
    label: 'Cannot assess',
    icon: HelpCircle,
    color: 'violet' as const,
    border: 'border-[#A97BFF]/60',
    text: 'text-[#A97BFF]',
    badgeVariant: 'violet' as const,
  },
};

function shortUnit(unit?: string): string {
  if (!unit) return '';
  const u = unit.toLowerCase();
  if (u.startsWith('pixel')) return 'px';
  if (u.startsWith('degree')) return '°';
  if (u.startsWith('boolean')) return '';
  return unit.split(' ')[0];
}

export default function FindingCard({
  finding,
  isActive = false,
  onSelect,
  onCite,
}: FindingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const cfg = RESULT_CONFIG[finding.result] || RESULT_CONFIG.cannot_assess;
  const Icon = cfg.icon;

  const metric =
    finding.observed_measurement && typeof finding.observed_measurement === 'object'
      ? finding.observed_measurement
      : null;

  const isEstimated = Boolean(metric?.is_estimated);

  const metricSummary = metric && metric.value !== null
    ? `${metric.value}${shortUnit(metric.unit) ? ` ${shortUnit(metric.unit)}` : ''} · ${Math.round(metric.confidence * 100)}%`
    : finding.result === 'cannot_assess'
    ? 'Requires non-side view'
    : 'Informational';

  const cardBody = (
    <div
      onClick={onSelect}
      className={`bg-[var(--card-bg)] border ${cfg.border} transition-colors duration-150 ${
        onSelect ? 'cursor-pointer hover:border-[#CCFF00]' : ''
      }`}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Icon size={15} className={cfg.text} />
            <TagChip label={cfg.label} variant={cfg.badgeVariant} />
            {finding.has_implementation_assumption && (
              <TagChip label="Assumption" variant="yellow" />
            )}
            {metric && (
              <TagChip label={isEstimated ? 'Est.' : 'Obs.'} variant="outline" />
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCite?.(finding);
            }}
            className="type-mono text-[11px] text-[#A97BFF] hover:text-[#CCFF00] inline-flex items-center gap-1 shrink-0"
            title="Inspect Starting Strength source citation"
          >
            <BookOpen size={12} />
            <span>p.{finding.source_page}</span>
          </button>
        </div>

        <div className="space-y-1">
          <h4 className="type-h3 text-[var(--text)] leading-snug">{finding.title}</h4>
          <p className="type-small text-[var(--text)]/75 line-clamp-2">
            {finding.short_explanation}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[var(--hairline)]">
          <span className="type-mono text-[var(--text)]/65">{metricSummary}</span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((prev) => !prev);
            }}
            aria-expanded={expanded}
            className="font-pixel text-[10px] uppercase text-[#CCFF00] hover:underline inline-flex items-center gap-1"
          >
            <span>{expanded ? 'Hide details' : 'Details'}</span>
            <ChevronDown size={13} className={`transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-3 border-t border-[var(--hairline)] bg-[var(--bg)] space-y-3 type-small">
          <p className="text-[var(--text)]/85">{finding.short_explanation}</p>

          {finding.actionable_fix && (
            <div className="p-3 border border-[var(--hairline)] bg-[var(--card-bg)] space-y-1">
              <div className="type-eyebrow text-[#CCFF00]">Fix cue</div>
              <p className="text-[var(--text)]/90">{finding.actionable_fix}</p>
            </div>
          )}

          {finding.uncertainty_note && (
            <div className="p-3 border border-[#A97BFF]/50 bg-[#A97BFF]/10 space-y-1">
              <div className="type-eyebrow text-[#A97BFF]">Uncertainty</div>
              <p className="text-[var(--text)]/85">{finding.uncertainty_note}</p>
            </div>
          )}

          {finding.has_implementation_assumption && finding.implementation_assumption_text && (
            <div className="p-3 border border-[#F5FF00]/60 bg-[#F5FF00]/10 space-y-1">
              <div className="type-eyebrow text-[#F5FF00]">Implementation assumption</div>
              <p className="text-[var(--text)]/85">{finding.implementation_assumption_text}</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 type-mono text-[var(--text)]/60">
            <span>
              Starting Strength p.{finding.source_page} ({finding.source_section})
            </span>
            {finding.timestamp_s != null && <span>{finding.timestamp_s.toFixed(2)}s</span>}
          </div>
        </div>
      )}
    </div>
  );

  if (isActive) {
    return (
      <SelectionBox color={cfg.color} cornerSize={6}>
        {cardBody}
      </SelectionBox>
    );
  }

  return cardBody;
}
