import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Trash2, ArrowRight, Video, AlertCircle } from 'lucide-react';
import { useHistory } from '../hooks/useHistory';
import { formatTimestamp } from '../utils/format';
import SkeletonLoader from '../components/SkeletonLoader';

export default function HistoryPage() {
  const { history, loading, removeEntry, clearAll } = useHistory();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-forge-border pb-4">
        <div>
          <span className="eyebrow">LOCAL STORAGE</span>
          <h1 className="display-heading text-3xl text-white">ANALYSIS HISTORY</h1>
        </div>

        {history.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Clear all local analysis history?')) clearAll();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forge-surface border border-forge-border text-xs text-forge-grey hover:text-forge-red hover:border-forge-red/30 transition-colors"
          >
            <Trash2 size={13} />
            Clear All
          </button>
        )}
      </div>

      {/* Ephemeral Notice Banner */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-white/5 border border-forge-border text-xs text-forge-grey">
        <AlertCircle size={16} className="text-forge-red shrink-0 mt-0.5" />
        <p>
          <strong className="text-white">Note:</strong> Analyses are indexed locally on your device. Video files on the backend server expire after a 6-hour TTL window to protect privacy and optimize storage.
        </p>
      </div>

      {/* History List */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonLoader variant="card" height="h-20" />
          <SkeletonLoader variant="card" height="h-20" />
          <SkeletonLoader variant="card" height="h-20" />
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-16 space-y-4 glass-card rounded-2xl border border-forge-border p-8">
          <div className="w-12 h-12 rounded-2xl bg-forge-surface border border-forge-border mx-auto flex items-center justify-center text-forge-grey">
            <Clock size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-bold text-xl uppercase text-white">
              NO PAST ANALYSES
            </h3>
            <p className="text-forge-grey text-xs max-w-sm mx-auto">
              Upload a side-view barbell squat video to receive a comprehensive kinematic assessment.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forge-red text-white font-display font-bold text-xs uppercase tracking-wider hover:bg-forge-red-dark transition-colors"
          >
            Start First Analysis
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => (
            <motion.div
              key={entry.job_id}
              layout
              className="glass-card p-4 rounded-xl border border-forge-border flex items-center justify-between gap-4 hover:border-forge-red/40 transition-colors group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-forge-surface border border-forge-border flex items-center justify-center text-forge-red shrink-0">
                  <Video size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-white text-base truncate">
                      {entry.filename || 'Squat Recording'}
                    </span>
                    <span
                      className={`badge text-[9px] py-0 ${
                        entry.quality_gate_passed ? 'badge-green' : 'badge-red'
                      }`}
                    >
                      {entry.quality_gate_passed ? 'PASSED' : 'DEGRADED'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-forge-grey mt-0.5">
                    <span>{formatTimestamp(entry.analyzed_at)}</span>
                    <span>·</span>
                    <span>{entry.total_reps} reps detected</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/results/${entry.job_id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forge-surface border border-forge-border text-xs text-white hover:bg-forge-red hover:border-forge-red transition-colors font-semibold"
                >
                  View
                  <ArrowRight size={13} />
                </Link>
                <button
                  onClick={() => removeEntry(entry.job_id)}
                  className="p-1.5 rounded-lg text-forge-grey hover:text-forge-red transition-colors"
                  title="Remove from history"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
