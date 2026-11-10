import React from 'react';
import { Clock, Trash2, ArrowRight, AlertCircle } from 'lucide-react';
import { useHistory } from '../hooks/useHistory';
import { formatTimestamp } from '../utils/format';
import { TagChip } from '../ui/TagChip';
import { SelectionBox } from '../ui/SelectionBox';
import { Button, ButtonLink } from '../ui/Button';

export default function HistoryPage() {
  const { history, loading, removeEntry, clearAll } = useHistory();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--hairline)] pb-4">
        <div className="space-y-1">
          <div className="type-eyebrow text-[#CCFF00]">Saved locally</div>
          <h1 className="type-h2">History</h1>
        </div>

        {history.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (confirm('Clear all local analysis history?')) clearAll();
            }}
            className="border-[#F040B8] text-[#F040B8] hover:bg-[#F040B8] hover:text-[#0A0A0A]"
          >
            <Trash2 size={14} />
            <span>Clear all</span>
          </Button>
        )}
      </div>

      <div className="p-3 bg-[var(--card-bg)] border border-[var(--hairline)] flex items-center gap-3 type-small text-[var(--text)]/75">
        <AlertCircle size={16} className="text-[#CCFF00] shrink-0" />
        <span>Analyses are stored in this browser. Server video files expire after 6 hours.</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-20 bg-[var(--card-bg)] border border-[var(--hairline)] animate-pulse" />
          <div className="h-20 bg-[var(--card-bg)] border border-[var(--hairline)] animate-pulse" />
        </div>
      ) : history.length === 0 ? (
        <SelectionBox color="violet" cornerSize={6}>
          <div className="text-center py-12 px-6 bg-[var(--card-bg)] space-y-4">
            <Clock size={28} className="text-[#A97BFF] mx-auto" />
            <h2 className="type-h3">No saved analyses yet</h2>
            <p className="type-small text-[var(--text)]/65 max-w-sm mx-auto">
              Upload a side-view barbell squat clip to start recording your form history.
            </p>
            <ButtonLink to="/" variant="primary">
              Analyze a video
            </ButtonLink>
          </div>
        </SelectionBox>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => (
            <div
              key={entry.job_id}
              className="p-4 bg-[var(--card-bg)] border border-[var(--hairline)] hover:border-[#CCFF00] flex flex-wrap items-center justify-between gap-4 transition-colors"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="type-h3 truncate">{entry.filename || 'Squat video'}</span>
                  <TagChip
                    label={entry.quality_gate_passed ? 'Passed' : 'Degraded'}
                    variant={entry.quality_gate_passed ? 'lime' : 'magenta'}
                  />
                </div>
                <div className="flex items-center gap-3 type-mono text-[var(--text)]/65">
                  <span>{formatTimestamp(entry.analyzed_at)}</span>
                  <span>·</span>
                  <span className="text-[#CCFF00]">{entry.total_reps} reps</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <ButtonLink to={`/results/${entry.job_id}`} variant="primary" size="sm">
                  <span>View</span>
                  <ArrowRight size={13} />
                </ButtonLink>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEntry(entry.job_id)}
                  aria-label={`Remove ${entry.filename || 'entry'} from history`}
                  className="text-[var(--text)]/55 hover:text-[#F040B8]"
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
