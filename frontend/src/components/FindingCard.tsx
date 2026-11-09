import { motion } from 'framer-motion';
import { CheckCircle, XCircle, HelpCircle, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { Finding } from '../types/analysis';

interface FindingCardProps {
  finding: Finding;
  initiallyExpanded?: boolean;
}

const RESULT_CONFIG = {
  meets_standard: {
    label: 'PASS',
    icon: CheckCircle,
    colorClass: 'text-forge-green',
    bgClass: 'bg-forge-green/10',
    borderClass: 'border-forge-green/30',
    badgeClass: 'badge-green',
  },
  does_not_meet_standard: {
    label: 'FAIL',
    icon: XCircle,
    colorClass: 'text-forge-red',
    bgClass: 'bg-forge-red/10',
    borderClass: 'border-forge-red/30',
    badgeClass: 'badge-red',
  },
  cannot_assess: {
    label: 'N/A',
    icon: HelpCircle,
    colorClass: 'text-forge-grey',
    bgClass: 'bg-forge-grey/10',
    borderClass: 'border-forge-grey/30',
    badgeClass: 'badge-grey',
  },
};

export default function FindingCard({ finding, initiallyExpanded = false }: FindingCardProps) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const cfg = RESULT_CONFIG[finding.result];
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      className={`rounded-xl border ${cfg.borderClass} ${cfg.bgClass} overflow-hidden`}
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/5 transition-colors min-h-[52px]"
        aria-expanded={expanded}
        aria-label={`${finding.title} — ${cfg.label}`}
      >
        <Icon size={18} className={`${cfg.colorClass} shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`badge ${cfg.badgeClass}`}>{cfg.label}</span>
            {finding.has_implementation_assumption && (
              <span className="badge badge-orange">ASSUMPTION</span>
            )}
            {finding.rep_number != null && (
              <span className="badge badge-grey">REP {finding.rep_number}</span>
            )}
          </div>
          <p className="mt-1 font-semibold text-sm text-white leading-snug">{finding.title}</p>
        </div>
        <ChevronDown
          size={16}
          className={`text-forge-grey shrink-0 mt-1 transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expanded detail */}
      <AnimatedCollapse open={expanded}>
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          {/* Explanation */}
          <p className="text-forge-grey-light text-sm leading-relaxed">
            {finding.short_explanation}
          </p>

          {/* Observed measurement */}
          {finding.observed_measurement && (
            <div className="flex items-center gap-2 text-sm">
              <span className="eyebrow">Observed</span>
              <span className="font-mono text-white">
                {typeof finding.observed_measurement === 'object' && 'value' in finding.observed_measurement
                  ? `${finding.observed_measurement.value ?? '—'} ${finding.observed_measurement.unit || ''}`
                  : String(finding.observed_measurement)}
              </span>
            </div>
          )}

          {/* Actionable fix */}
          {finding.result === 'does_not_meet_standard' && (
            <div className="p-3 rounded-lg bg-forge-red/5 border border-forge-red/20">
              <p className="eyebrow mb-1">Fix</p>
              <p className="text-sm text-white leading-relaxed">{finding.actionable_fix}</p>
            </div>
          )}

          {/* Uncertainty note */}
          {finding.uncertainty_note && (
            <p className="text-forge-grey text-xs italic leading-relaxed">
              ⚠ {finding.uncertainty_note}
            </p>
          )}

          {/* Implementation assumption */}
          {finding.has_implementation_assumption && finding.implementation_assumption_text && (
            <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
              <p className="eyebrow mb-1" style={{ color: '#F97316' }}>Implementation Assumption</p>
              <p className="text-xs text-forge-grey leading-relaxed">
                {finding.implementation_assumption_text}
              </p>
            </div>
          )}

          {/* Source citation */}
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="badge badge-grey">
              p.{finding.source_page}
            </span>
            <span className="badge badge-grey truncate max-w-[200px]">
              {finding.source_section}
            </span>
          </div>
        </div>
      </AnimatedCollapse>
    </motion.div>
  );
}

function AnimatedCollapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      initial={false}
      animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      style={{ overflow: 'hidden' }}
    >
      {children}
    </motion.div>
  );
}
