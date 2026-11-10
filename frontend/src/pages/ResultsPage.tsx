import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Download,
  Share2,
  AlertTriangle,
  ArrowLeft,
  XCircle,
  BookOpen,
} from 'lucide-react';
import { getResults, getFrames, getVideoUrl } from '../api/client';
import { getAllHistory } from '../utils/db';
import VideoPlayer from '../components/VideoPlayer';
import { BarPathChart } from '../components/BarPathChart';
import { QualityBadge } from '../components/QualityBadge';
import FindingCard from '../components/FindingCard';
import { SelectionBox } from '../ui/SelectionBox';
import { PixelTile } from '../ui/PixelTile';
import { TagChip } from '../ui/TagChip';
import { Button, ButtonLink } from '../ui/Button';
import type { AnalysisResult, Finding, Metric } from '../types/analysis';

interface MetricCardDef {
  key: string;
  label: string;
  target: string;
  hasAssumption: boolean;
  formatVal: (val: number | null, unit: string) => string;
}

function shortUnit(unit?: string): string {
  if (!unit) return '';
  const u = unit.toLowerCase();
  if (u.startsWith('pixel')) return 'px';
  if (u.startsWith('degree')) return '°';
  return '';
}

const REP_METRIC_DEFS: MetricCardDef[] = [
  {
    key: 'depth_hip_vs_knee',
    label: 'Depth proxy',
    target: 'Fig 2-1 (crease vs knee)',
    hasAssumption: true,
    formatVal: (v, u) => (v === null ? '—' : `${v > 0 ? '+' : ''}${v} ${shortUnit(u) || 'px'}`),
  },
  {
    key: 'back_angle_bottom',
    label: 'Back angle',
    target: '~45° (±10° assumption)',
    hasAssumption: true,
    formatVal: (v) => (v === null ? '—' : `${v}°`),
  },
  {
    key: 'knee_angle_bottom',
    label: 'Knee flexion',
    target: 'Bottom inflection',
    hasAssumption: false,
    formatVal: (v) => (v === null ? '—' : `${v}°`),
  },
  {
    key: 'hip_drive',
    label: 'Hip drive',
    target: 'p. 18 (hips rise first)',
    hasAssumption: false,
    formatVal: (v) => (v === null ? '—' : v > 0.5 ? 'Hips lead' : 'Chest leads'),
  },
  {
    key: 'eye_gaze',
    label: 'Eye gaze',
    target: 'p. 20 (proxy)',
    hasAssumption: true,
    formatVal: (v) => (v === null ? '—' : `${v}°`),
  },
  {
    key: 'bar_midfoot_offset',
    label: 'Midfoot offset',
    target: '40px max assumption',
    hasAssumption: true,
    formatVal: (v) => (v === null ? '—' : `${v} px`),
  },
  {
    key: 'bar_path_std',
    label: 'Path std dev',
    target: '25px σ assumption',
    hasAssumption: true,
    formatVal: (v) => (v === null ? '—' : `${v} px`),
  },
];

export default function ResultsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [emptyHistory, setEmptyHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [framesData, setFramesData] = useState<any>(null);

  const [activeRep, setActiveRep] = useState<number | null>(null);
  const [seekTimestamp, setSeekTimestamp] = useState<number | null>(null);
  const [activeFindingIdx, setActiveFindingIdx] = useState<number | null>(null);
  const [filterResult, setFilterResult] = useState<'all' | 'meets' | 'fails' | 'cannot'>('all');
  const [selectedCitation, setSelectedCitation] = useState<Finding | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  // If user opens /results directly without jobId, route to latest saved result or show empty state
  useEffect(() => {
    if (jobId) return;
    let mounted = true;
    setLoading(true);
    setEmptyHistory(false);

    getAllHistory()
      .then((entries) => {
        if (!mounted) return;
        if (entries.length > 0) {
          navigate(`/results/${entries[0].job_id}`, { replace: true });
        } else {
          setEmptyHistory(true);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setEmptyHistory(true);
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [jobId, navigate]);

  useEffect(() => {
    if (!jobId) return;
    let isMounted = true;
    setLoading(true);
    setEmptyHistory(false);
    setError(null);

    Promise.all([
      getResults(jobId),
      getFrames(jobId).catch(() => null),
    ])
      .then(([resData, fData]) => {
        if (!isMounted) return;
        setResult(resData);
        setFramesData(fData);
        if (resData.reps && resData.reps.length > 0) {
          setActiveRep(resData.reps[0].rep_number);
          setSeekTimestamp(resData.reps[0].bottom_timestamp_s);
        } else {
          setActiveRep(null);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load analysis results.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [jobId]);

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Forge Squat Analysis',
          text: 'Squat form evaluation against Starting Strength criteria',
          url: shareUrl,
        });
        return;
      } catch {
        // ignore cancelled share
      }
    }
    await navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const reps = result?.reps ?? [];

  const repScopedFindings = useMemo(() => {
    const all = result?.findings ?? [];
    if (activeRep === null) return all;
    return all.filter((f) => f.rep_number === activeRep || f.rep_number === null);
  }, [result?.findings, activeRep]);

  const meetsCount = repScopedFindings.filter((f) => f.result === 'meets_standard').length;
  const failsCount = repScopedFindings.filter((f) => f.result === 'does_not_meet_standard').length;
  const cannotCount = repScopedFindings.filter((f) => f.result === 'cannot_assess').length;

  const filteredFindings = repScopedFindings.filter((f) => {
    if (filterResult === 'meets') return f.result === 'meets_standard';
    if (filterResult === 'fails') return f.result === 'does_not_meet_standard';
    if (filterResult === 'cannot') return f.result === 'cannot_assess';
    return true;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-6">
        <div className="type-eyebrow text-[#CCFF00]">Loading analysis report…</div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-96 bg-[var(--card-bg)] border border-[var(--hairline)] animate-pulse" />
          <div className="lg:col-span-4 h-96 bg-[var(--card-bg)] border border-[var(--hairline)] animate-pulse" />
        </div>
      </div>
    );
  }

  if (emptyHistory) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-16">
        <SelectionBox color="violet" cornerSize={6}>
          <div className="p-8 bg-[var(--card-bg)] text-center space-y-4">
            <h1 className="type-h2">No results yet</h1>
            <p className="type-body text-[var(--text)]/70 max-w-md mx-auto">
              Upload a side-view squat clip to review your annotated video, rep metrics, and rule findings.
            </p>
            <ButtonLink to="/" variant="primary">
              Upload a squat video
            </ButtonLink>
          </div>
        </SelectionBox>
      </div>
    );
  }

  if (error || !result || !jobId) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-16">
        <SelectionBox color="magenta" cornerSize={6}>
          <div className="p-8 bg-[var(--card-bg)] text-center space-y-4">
            <AlertTriangle className="text-[#F040B8] mx-auto" size={28} />
            <h1 className="type-h2">Report unavailable</h1>
            <p className="type-small text-[var(--text)]/75">
              {error || 'This report may have expired (6-hour server limit).'}
            </p>
            <ButtonLink to="/" variant="primary">
              Analyze a new video
            </ButtonLink>
          </div>
        </SelectionBox>
      </div>
    );
  }

  const coaching = result.coaching;
  const activeRepMetrics: Record<string, Metric> | undefined =
    activeRep !== null && result.per_rep_metrics ? result.per_rep_metrics[activeRep] : undefined;

  const verdictLabel =
    failsCount === 0 && meetsCount > 0
      ? 'Meets criteria'
      : failsCount > 0
      ? 'Issues found'
      : 'Cannot assess';
  const verdictVariant = failsCount === 0 && meetsCount > 0 ? 'lime' : 'magenta';

  const coachingLabel =
    coaching.generated_by && coaching.generated_by !== 'template'
      ? `Rules: Deterministic YAML · Copy: ${coaching.generated_by.toUpperCase()} (cannot change verdicts)`
      : coaching.llm_failed
      ? 'Rules: Deterministic YAML · Copy: Template fallback (LLM unavailable)'
      : 'Rules: Deterministic YAML · Copy: Template fallback (no LLM key set)';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
      {/* Header Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--hairline)] pb-4">
        <div className="flex items-center gap-3">
          <ButtonLink to="/" variant="secondary" size="sm" aria-label="Back to upload">
            <ArrowLeft size={14} />
          </ButtonLink>
          <div>
            <div className="flex items-center gap-3">
              <span className="type-eyebrow text-[#CCFF00]">Analysis report</span>
              <span className="type-mono text-[var(--text)]/55">#{jobId.slice(0, 8)}</span>
            </div>
            <h1 className="type-h2 mt-1">Squat findings</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleShare}>
            <Share2 size={14} />
            <span>{shareCopied ? 'Link copied' : 'Share'}</span>
          </Button>
          <a
            href={getVideoUrl(jobId)}
            download={`squat_analysis_${jobId.slice(0, 8)}.mp4`}
            className="btn btn-sm btn-primary"
          >
            <Download size={14} />
            <span>Annotated MP4</span>
          </a>
        </div>
      </div>

      {/* Row 1: Video + Summary / Fix Next / Quality Gate */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <PixelTile headerTag="Annotated video" headerRight={`${result.video_fps || 30} fps`}>
            <VideoPlayer
              videoUrl={getVideoUrl(jobId)}
              fps={result.video_fps || 30}
              durationFallback={result.video_duration_s || 0}
              frames={framesData?.frames ?? []}
              reps={reps}
              activeRep={activeRep}
              onSelectRep={setActiveRep}
              seekTimestamp={seekTimestamp}
            />
          </PixelTile>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <SelectionBox color={failsCount > 0 ? 'magenta' : 'lime'} cornerSize={6}>
            <div className="p-4 sm:p-6 bg-[var(--card-bg)] space-y-4">
              <div className="flex items-center justify-between">
                <span className="type-eyebrow text-[#CCFF00]">Summary</span>
                <TagChip label={verdictLabel} variant={verdictVariant} />
              </div>

              {/* Real Tallies */}
              <div className="grid grid-cols-4 border border-[var(--hairline)] divide-x divide-[var(--hairline)] bg-[var(--bg)] text-center py-2">
                <div>
                  <div className="font-mono text-lg font-bold">{reps.length}</div>
                  <div className="type-mono text-[10px] text-[var(--text)]/55">Reps</div>
                </div>
                <div>
                  <div className="font-mono text-lg font-bold text-[#CCFF00]">{meetsCount}</div>
                  <div className="type-mono text-[10px] text-[#CCFF00]">Meets</div>
                </div>
                <div>
                  <div className="font-mono text-lg font-bold text-[#F040B8]">{failsCount}</div>
                  <div className="type-mono text-[10px] text-[#F040B8]">Issues</div>
                </div>
                <div>
                  <div className="font-mono text-lg font-bold text-[#A97BFF]">{cannotCount}</div>
                  <div className="type-mono text-[10px] text-[#A97BFF]">N/A</div>
                </div>
              </div>

              {/* Fix This Next */}
              <div className="space-y-2">
                <div className="type-eyebrow text-[#F040B8]">Fix this next</div>
                <p className="type-small text-[var(--text)]/90 p-3 bg-[var(--bg)] border border-[var(--hairline)]">
                  {coaching.summary}
                </p>

                {coaching.top_fixes && coaching.top_fixes.length > 0 && (
                  <ul className="space-y-1.5 type-small text-[var(--text)]/80 pt-1">
                    {coaching.top_fixes.slice(0, 3).map((fix, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="type-mono text-[#F040B8] font-bold">{idx + 1}.</span>
                        <span>{fix}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Honest LLM-vs-Deterministic Source Label */}
              <div className="pt-3 border-t border-[var(--hairline)] type-mono text-[11px] text-[var(--text)]/65 space-y-1">
                <div>{coachingLabel}</div>
                {coaching.llm_failed && coaching.llm_failure_reason && (
                  <div className="text-[#F5FF00]">{coaching.llm_failure_reason}</div>
                )}
              </div>
            </div>
          </SelectionBox>

          <QualityBadge qualityGate={result.quality_gate} />
        </div>
      </div>

      {/* Observed vs Estimated Legend Bar */}
      <div
        role="note"
        aria-label="Observed vs estimated metric legend"
        className="p-4 border border-[var(--hairline)] bg-[var(--card-bg)] flex flex-wrap items-center justify-between gap-4 type-small"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <TagChip label="Observed" variant="lime" />
            <span className="text-[var(--text)]/75">Direct 2D pose or CSRT bar measurement</span>
          </div>
          <div className="flex items-center gap-2">
            <TagChip label="Estimated" variant="outline" />
            <span className="text-[var(--text)]/75">Inferred from 2D proxies or low visibility</span>
          </div>
          <div className="flex items-center gap-2">
            <TagChip label="Assumption" variant="yellow" />
            <span className="text-[var(--text)]/75">Numeric tolerance added where text is qualitative</span>
          </div>
        </div>
      </div>

      {/* Row 2: Real Per-Rep Kinematics + Bar Path Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <PixelTile
            headerTag={activeRep ? `Rep ${activeRep} metrics` : 'Per-rep metrics'}
            headerRight={activeRep ? `Bottom frame · Confidence shown` : 'Select a rep'}
          >
            {activeRepMetrics ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {REP_METRIC_DEFS.map((def) => {
                  const m = activeRepMetrics[def.key];
                  if (!m) return null;
                  return (
                    <div
                      key={def.key}
                      className={`p-3 bg-[var(--bg)] border space-y-1 ${
                        m.is_estimated
                          ? 'border-dashed border-[var(--hairline)]'
                          : 'border-[var(--hairline)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="type-mono text-[10px] text-[var(--text)]/60 uppercase truncate">
                          {def.label}
                        </span>
                      </div>
                      <div className="font-mono text-base font-bold text-[#CCFF00]">
                        {def.formatVal(m.value, m.unit)}
                      </div>
                      <div className="flex items-center justify-between gap-1 type-mono text-[10px]">
                        <span className={m.is_estimated ? 'text-[#F5FF00]' : 'text-[var(--text)]/70'}>
                          {m.is_estimated ? 'Estimated' : 'Observed'}
                        </span>
                        <span className="text-[var(--text)]/55">
                          {Math.round((m.confidence ?? 0) * 100)}%
                        </span>
                      </div>
                      <div className="type-small text-[11px] text-[var(--text)]/55 truncate" title={def.target}>
                        {def.target}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center type-small text-[var(--text)]/65">
                Select a specific rep button (`R1`, `R2`…) under the video to inspect per-rep measurements.
              </div>
            )}
          </PixelTile>
        </div>

        <div className="lg:col-span-6">
          <PixelTile
            headerTag="Bar path drift"
            headerRight={activeRep ? `Rep ${activeRep}` : 'Full video'}
          >
            <BarPathChart framesData={framesData} activeRep={activeRep} />
            <p className="mt-3 pt-3 border-t border-[var(--hairline)] type-small text-[var(--text)]/70">
              Starting Strength p. 10, Fig 2-7: &ldquo;The bar moves in a straight vertical line—the most efficient path between two points.&rdquo;
            </p>
          </PixelTile>
        </div>
      </div>

      {/* Row 3: Findings List */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--hairline)] pb-4">
          <div className="space-y-1">
            <div className="type-eyebrow text-[#CCFF00]">Rule evaluation</div>
            <h2 className="type-h2">
              {activeRep ? `Rep ${activeRep} findings` : 'All findings'}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-[var(--card-bg)] border border-[var(--hairline)]">
            {(
              [
                { id: 'all', label: `All (${repScopedFindings.length})` },
                { id: 'meets', label: `Meets (${meetsCount})` },
                { id: 'fails', label: `Issues (${failsCount})` },
                { id: 'cannot', label: `Cannot assess (${cannotCount})` },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterResult(f.id)}
                className={`px-3 py-1.5 font-pixel text-[10px] uppercase transition-colors ${
                  filterResult === f.id
                    ? 'bg-[#CCFF00] text-[#0A0A0A] font-bold'
                    : 'text-[var(--text)]/65 hover:text-[var(--text)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFindings.map((finding, idx) => (
            <FindingCard
              key={`${finding.criterion_id}-${finding.rep_number}-${idx}`}
              finding={finding}
              isActive={activeFindingIdx === idx}
              onSelect={() => {
                setActiveFindingIdx(idx);
                if (finding.timestamp_s !== null && finding.timestamp_s !== undefined) {
                  setSeekTimestamp(finding.timestamp_s);
                }
              }}
              onCite={(f) => setSelectedCitation(f)}
            />
          ))}
        </div>
      </section>

      {/* Citation Modal */}
      {selectedCitation && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="citation-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
        >
          <SelectionBox color="lime" cornerSize={6} className="max-w-lg w-full">
            <div className="p-6 bg-[#0A0A0A] space-y-4">
              <div className="flex items-start justify-between gap-4 border-b border-[var(--hairline)] pb-3">
                <div className="space-y-1">
                  <div className="type-eyebrow text-[#CCFF00] flex items-center gap-1.5">
                    <BookOpen size={12} />
                    <span>Starting Strength Reference</span>
                  </div>
                  <h3 id="citation-modal-title" className="type-h3">
                    {selectedCitation.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCitation(null)}
                  aria-label="Close citation dialog"
                  className="text-[var(--text)]/60 hover:text-[var(--text)]"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="space-y-3 type-small">
                <div className="type-mono text-[#A97BFF]">
                  Reference chapter, p. {selectedCitation.source_page} ({selectedCitation.source_section})
                </div>

                <blockquote className="p-3 bg-[var(--card-bg)] border border-[var(--hairline)] italic text-[var(--text)]/90">
                  {selectedCitation.verbatim_quote || 'Rule quote defined in skill/squat_skill.yaml.'}
                </blockquote>

                {selectedCitation.uncertainty_note && (
                  <div className="p-3 border border-[#F5FF00]/60 bg-[#F5FF00]/10 text-[#F5FF00]">
                    {selectedCitation.uncertainty_note}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="primary" size="sm" onClick={() => setSelectedCitation(null)}>
                  Close
                </Button>
              </div>
            </div>
          </SelectionBox>
        </div>
      )}
    </div>
  );
}
