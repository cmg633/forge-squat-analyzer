import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Download,
  Share2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  BookOpen,
  Info,
  ChevronRight,
  Sparkles,
  BarChart3,
  Layers,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { getResults, getFrames, getVideoUrl } from '../api/client';
import { BarPathChart } from '../components/BarPathChart';
import { QualityBadge } from '../components/QualityBadge';
import SkeletonLoader from '../components/SkeletonLoader';
import type { Finding } from '../types/analysis';

export default function ResultsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [framesData, setFramesData] = useState<any>(null);

  // Video playback state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeRep, setActiveRep] = useState<number | null>(null);
  const [filterResult, setFilterResult] = useState<string>('all');
  const [selectedCitation, setSelectedCitation] = useState<any | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  // Fetch results and frames
  useEffect(() => {
    if (!jobId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      getResults(jobId).catch((err) => {
        throw new Error(`Failed to load analysis results: ${err.message}`);
      }),
      getFrames(jobId).catch(() => null),
    ])
      .then(([resData, fData]) => {
        if (!isMounted) return;
        setResult(resData);
        setFramesData(fData);
        if (resData.reps && resData.reps.length > 0) {
          setActiveRep(resData.reps[0].rep_number);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [jobId]);

  // Video event handlers
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const cur = videoRef.current.currentTime;
      setCurrentTime(cur);

      // Determine active rep from currentTime
      if (result?.reps) {
        const matchingRep = result.reps.find(
          (r: any) => cur >= r.start_timestamp_s && cur <= r.end_timestamp_s
        );
        if (matchingRep && matchingRep.rep_number !== activeRep) {
          setActiveRep(matchingRep.rep_number);
        }
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const stepFrames = (framesDelta: number) => {
    if (!videoRef.current) return;
    const fps = result?.video_fps || 30;
    videoRef.current.pause();
    setIsPlaying(false);
    videoRef.current.currentTime = Math.max(
      0,
      Math.min(duration, videoRef.current.currentTime + framesDelta / fps)
    );
  };

  const jumpToRep = (repNumber: number) => {
    setActiveRep(repNumber);
    if (!videoRef.current || !result?.reps) return;
    const rep = result.reps.find((r: any) => r.rep_number === repNumber);
    if (rep) {
      videoRef.current.currentTime = rep.start_timestamp_s;
    }
  };

  const jumpToFrame = (timestampS?: number) => {
    if (!videoRef.current || timestampS === undefined || timestampS === null) return;
    videoRef.current.currentTime = timestampS;
    videoRef.current.pause();
    setIsPlaying(false);
  };

  // Keyboard shortcuts (Desktop)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        stepFrames(e.shiftKey ? 5 : 1);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        stepFrames(e.shiftKey ? -5 : -1);
      } else if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        if (!result?.reps) return;
        const currentIdx = result.reps.findIndex((r: any) => r.rep_number === activeRep);
        if (currentIdx > 0) jumpToRep(result.reps[currentIdx - 1].rep_number);
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        if (!result?.reps) return;
        const currentIdx = result.reps.findIndex((r: any) => r.rep_number === activeRep);
        if (currentIdx >= 0 && currentIdx < result.reps.length - 1) {
          jumpToRep(result.reps[currentIdx + 1].rep_number);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, activeRep, result, duration]);

  // Share action
  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Forge AI Squat Analysis Results',
          text: `Check out my squat technique analysis evaluated with Starting Strength rules!`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // user cancelled or share failed
      }
    }
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <SkeletonLoader variant="circle" height="h-8" />
          <SkeletonLoader variant="bar" height="h-6" className="w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonLoader variant="card" height="h-96" className="lg:col-span-2" />
          <SkeletonLoader variant="card" height="h-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonLoader variant="card" height="h-44" />
          <SkeletonLoader variant="card" height="h-44" />
          <SkeletonLoader variant="card" height="h-44" />
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="p-4 rounded-full bg-forge-red/10 border border-forge-red/30 mb-4 text-forge-red">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-2xl font-display font-bold uppercase text-white mb-2">
          Unable to Load Results
        </h2>
        <p className="text-forge-grey text-sm max-w-md mb-6">{error || 'Job not found.'}</p>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forge-red text-white text-xs font-bold uppercase tracking-wider hover:bg-forge-red-dark transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Upload
        </button>
      </div>
    );
  }

  const findings = result.findings || [];
  const reps = result.reps || [];
  const coaching = result.coaching || {};
  const qGate = result.quality_gate || {};

  // Stats
  const meetsCount = findings.filter((f: any) => f.result === 'meets_standard').length;
  const failsCount = findings.filter((f: any) => f.result === 'does_not_meet_standard').length;
  const cannotCount = findings.filter((f: any) => f.result === 'cannot_assess').length;

  const filteredFindings = findings.filter((f: any) => {
    if (filterResult === 'meets') return f.result === 'meets_standard';
    if (filterResult === 'fails') return f.result === 'does_not_meet_standard';
    if (filterResult === 'cannot') return f.result === 'cannot_assess';
    if (activeRep !== null) {
      // Show findings for active rep or general cannot_assess
      return f.rep_number === activeRep || f.rep_number === null;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-forge-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 rounded-lg bg-forge-surface border border-forge-border text-forge-grey hover:text-white transition-colors"
            title="Upload new video"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="eyebrow">ANALYSIS REPORT</span>
              <span className="text-[10px] text-forge-grey">#{jobId?.slice(0, 8)}</span>
            </div>
            <h1 className="display-heading text-2xl sm:text-3xl text-white">
              SQUAT KINEMATIC AUDIT
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forge-surface border border-forge-border text-forge-grey hover:text-white text-xs font-semibold transition-colors"
          >
            <Share2 size={14} />
            {shareCopied ? 'Copied Link!' : 'Share'}
          </button>
          <a
            href={getVideoUrl(jobId!)}
            download={`squat_analysis_${jobId?.slice(0, 8)}.mp4`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forge-red/10 border border-forge-red/30 text-forge-red hover:bg-forge-red/20 text-xs font-semibold transition-colors"
          >
            <Download size={14} />
            Annotated MP4
          </a>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ============================================================ */}
        {/* HERO TILE: Video Player (lg:col-span-8) */}
        {/* ============================================================ */}
        <div className="lg:col-span-8 glass-card p-4 rounded-2xl border border-forge-border space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
            <video
              ref={videoRef}
              src={getVideoUrl(jobId!)}
              className="w-full h-full object-contain"
              playsInline
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={() => {
                if (videoRef.current) setDuration(videoRef.current.duration);
              }}
              onEnded={() => setIsPlaying(false)}
            />

            {/* Rep indicator overlay */}
            {activeRep && (
              <div className="absolute top-3 right-3 px-3 py-1 rounded-lg bg-forge-red text-white text-xs font-display font-black tracking-wider uppercase shadow-red-glow">
                REP {activeRep}
              </div>
            )}
          </div>

          {/* Video Controls & Scrubber */}
          <div className="space-y-3">
            {/* Timeline scrubber with rep markers */}
            <div className="relative pt-1">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.01}
                value={currentTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCurrentTime(val);
                  if (videoRef.current) videoRef.current.currentTime = val;
                }}
                className="w-full h-1.5 bg-forge-surface rounded-lg appearance-none cursor-pointer accent-forge-red"
              />
              {/* Rep markers */}
              {duration > 0 &&
                reps.map((r: any) => {
                  const startPct = (r.start_timestamp_s / duration) * 100;
                  const bottomPct = (r.bottom_timestamp_s / duration) * 100;
                  return (
                    <div
                      key={r.rep_number}
                      className="absolute top-0 pointer-events-none"
                      style={{ left: `${startPct}%` }}
                    >
                      <div className="h-2 w-0.5 bg-forge-grey/60" />
                      <span className="text-[9px] font-mono text-forge-grey absolute -top-3.5 -left-2">
                        R{r.rep_number}
                      </span>
                    </div>
                  );
                })}
            </div>

            {/* Controls bar */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="w-8 h-8 rounded-lg bg-forge-red text-white flex items-center justify-center hover:bg-forge-red-dark transition-colors"
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                </button>
                <button
                  onClick={() => stepFrames(-1)}
                  className="p-1.5 rounded-lg bg-forge-surface border border-forge-border text-forge-grey hover:text-white transition-colors"
                  title="Previous frame (Left arrow)"
                >
                  <SkipBack size={14} />
                </button>
                <button
                  onClick={() => stepFrames(1)}
                  className="p-1.5 rounded-lg bg-forge-surface border border-forge-border text-forge-grey hover:text-white transition-colors"
                  title="Next frame (Right arrow)"
                >
                  <SkipForward size={14} />
                </button>
                <span className="font-mono text-forge-grey ml-2">
                  {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
                </span>
              </div>

              {/* Rep jump buttons */}
              <div className="flex items-center gap-1">
                <span className="text-forge-grey text-[11px] mr-1 hidden sm:inline">Rep:</span>
                {reps.map((r: any) => (
                  <button
                    key={r.rep_number}
                    onClick={() => jumpToRep(r.rep_number)}
                    className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-colors ${
                      activeRep === r.rep_number
                        ? 'bg-forge-red text-white'
                        : 'bg-forge-surface text-forge-grey hover:text-white border border-forge-border'
                    }`}
                  >
                    R{r.rep_number}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SUMMARY / SCORE TILE (lg:col-span-4) */}
        {/* ============================================================ */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-card p-5 rounded-2xl border border-forge-border space-y-4">
            <div className="flex items-center justify-between">
              <span className="eyebrow">AUDIT VERDICT</span>
              <span
                className={`badge ${
                  failsCount === 0 && meetsCount > 0
                    ? 'badge-green'
                    : failsCount > 0
                    ? 'badge-red'
                    : 'badge-grey'
                }`}
              >
                {failsCount === 0 && meetsCount > 0
                  ? 'STANDARD MET'
                  : failsCount > 0
                  ? 'NEEDS REVISION'
                  : 'INCONCLUSIVE'}
              </span>
            </div>

            {/* Reps and findings tallies */}
            <div className="grid grid-cols-3 gap-2 py-2 border-y border-forge-border text-center">
              <div>
                <div className="display-heading text-2xl text-white">{reps.length}</div>
                <div className="text-[10px] text-forge-grey uppercase tracking-wider">Reps</div>
              </div>
              <div>
                <div className="display-heading text-2xl text-forge-green">{meetsCount}</div>
                <div className="text-[10px] text-forge-grey uppercase tracking-wider">Pass</div>
              </div>
              <div>
                <div className="display-heading text-2xl text-forge-red">{failsCount}</div>
                <div className="text-[10px] text-forge-grey uppercase tracking-wider">Issues</div>
              </div>
            </div>

            {/* Coaching Text Tile */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-eyebrow text-forge-red font-display font-bold flex items-center gap-1.5">
                  <Sparkles size={13} />
                  Coaching Notes
                </span>
                <span className="text-[10px] text-forge-grey/70">
                  {coaching.generated_by === 'gemini'
                    ? 'Gemini 1.5'
                    : coaching.generated_by === 'anthropic'
                    ? 'Claude'
                    : 'Deterministic Engine'}
                </span>
              </div>
              <p className="text-xs text-forge-white/90 leading-relaxed bg-white/5 p-3 rounded-xl border border-forge-border">
                {coaching.summary || 'Squat analysis complete. Review individual criteria below.'}
              </p>
            </div>

            {/* Top 3 Fixes */}
            {coaching.top_fixes && coaching.top_fixes.length > 0 && (
              <div className="space-y-2">
                <span className="eyebrow">Top Priorities to Fix</span>
                <ul className="space-y-1.5 text-xs text-forge-grey">
                  {coaching.top_fixes.map((fix: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-mono text-forge-red font-bold">{idx + 1}.</span>
                      <span className="text-white/90">{fix}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Quality Gate Status */}
          <QualityBadge qualityGate={qGate} />
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECONDARY ROW: Kinematic Metrics & Bar Path Chart */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Per-Rep Kinematic Gauges (lg:col-span-6) */}
        <div className="lg:col-span-6 glass-card p-5 rounded-2xl border border-forge-border space-y-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">
              {activeRep ? `Rep ${activeRep} Kinematics` : 'Overall Kinematics'}
            </span>
            <span className="badge badge-orange">ESTIMATE LABELED</span>
          </div>

          {/* Active Rep Metrics Grid */}
          {result.per_rep_metrics && activeRep && result.per_rep_metrics[activeRep] ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Depth */}
              <div className="bg-forge-surface p-3 rounded-xl border border-forge-border space-y-1">
                <span className="text-[10px] uppercase text-forge-grey font-display tracking-wider block">
                  Depth Proxy
                </span>
                <div className="text-lg font-mono font-bold text-white">
                  {result.per_rep_metrics[activeRep].depth_hip_vs_knee?.value !== null
                    ? `${result.per_rep_metrics[activeRep].depth_hip_vs_knee.value > 0 ? '+' : ''}${result.per_rep_metrics[activeRep].depth_hip_vs_knee.value}px`
                    : 'N/A'}
                </div>
                <div className="flex items-center justify-between text-[10px] text-forge-grey">
                  <span className="badge badge-orange py-0 text-[9px]">ESTIMATE</span>
                  <span>hip vs knee</span>
                </div>
              </div>

              {/* Back angle */}
              <div className="bg-forge-surface p-3 rounded-xl border border-forge-border space-y-1">
                <span className="text-[10px] uppercase text-forge-grey font-display tracking-wider block">
                  Back Angle
                </span>
                <div className="text-lg font-mono font-bold text-white">
                  {result.per_rep_metrics[activeRep].back_angle_bottom?.value !== null
                    ? `${result.per_rep_metrics[activeRep].back_angle_bottom.value}°`
                    : 'N/A'}
                </div>
                <div className="flex items-center justify-between text-[10px] text-forge-grey">
                  <span>Target: ~45°</span>
                  <span className="text-[9px] text-forge-red">±10° tol</span>
                </div>
              </div>

              {/* Knee flexion */}
              <div className="bg-forge-surface p-3 rounded-xl border border-forge-border space-y-1">
                <span className="text-[10px] uppercase text-forge-grey font-display tracking-wider block">
                  Knee Flexion
                </span>
                <div className="text-lg font-mono font-bold text-white">
                  {result.per_rep_metrics[activeRep].knee_angle_bottom?.value !== null
                    ? `${result.per_rep_metrics[activeRep].knee_angle_bottom.value}°`
                    : 'N/A'}
                </div>
                <span className="text-[10px] text-forge-grey block">at bottom</span>
              </div>

              {/* Hip drive */}
              <div className="bg-forge-surface p-3 rounded-xl border border-forge-border space-y-1">
                <span className="text-[10px] uppercase text-forge-grey font-display tracking-wider block">
                  Hip Drive
                </span>
                <div className="text-lg font-mono font-bold text-white">
                  {result.per_rep_metrics[activeRep].hip_drive?.value === 1.0
                    ? 'Hips Lead'
                    : result.per_rep_metrics[activeRep].hip_drive?.value === 0.0
                    ? 'Chest Lead'
                    : 'N/A'}
                </div>
                <span className="badge badge-orange py-0 text-[9px]">ESTIMATE</span>
              </div>

              {/* Bar midfoot offset */}
              <div className="bg-forge-surface p-3 rounded-xl border border-forge-border space-y-1">
                <span className="text-[10px] uppercase text-forge-grey font-display tracking-wider block">
                  Midfoot Offset
                </span>
                <div className="text-lg font-mono font-bold text-white">
                  {result.per_rep_metrics[activeRep].bar_midfoot_offset?.value !== null
                    ? `${result.per_rep_metrics[activeRep].bar_midfoot_offset.value}px`
                    : 'N/A'}
                </div>
                <span className="text-[10px] text-forge-grey block">Max over ROM</span>
              </div>

              {/* Bar vertical std */}
              <div className="bg-forge-surface p-3 rounded-xl border border-forge-border space-y-1">
                <span className="text-[10px] uppercase text-forge-grey font-display tracking-wider block">
                  Path Deviation
                </span>
                <div className="text-lg font-mono font-bold text-white">
                  {result.per_rep_metrics[activeRep].bar_path_std?.value !== null
                    ? `${result.per_rep_metrics[activeRep].bar_path_std.value}px`
                    : 'N/A'}
                </div>
                <span className="text-[10px] text-forge-grey block">x-std dev</span>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-forge-grey text-xs">
              Select a rep above to inspect kinematics.
            </div>
          )}

          {/* Observed vs Estimated Legend */}
          <div className="p-3 bg-white/5 rounded-xl border border-forge-border text-[11px] text-forge-grey space-y-1">
            <div className="flex items-center gap-1.5 text-white font-semibold">
              <Info size={13} className="text-forge-red" />
              Observed vs. Estimated Legend
            </div>
            <p>
              <strong>Observed:</strong> Pure 2D geometric measurements extracted directly from visible joint vectors (e.g. back angle from shoulder to hip).
            </p>
            <p>
              <strong>Estimated:</strong> Proxies for 3D anatomical structures inferred from 2D landmarks (e.g. depth using knee landmark for patella, or gaze from ear-nose line). Marked with uncertainty.
            </p>
          </div>
        </div>

        {/* Bar Path Chart (lg:col-span-6) */}
        <div className="lg:col-span-6 glass-card p-5 rounded-2xl border border-forge-border space-y-4">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Barbell Trajectory</span>
            <span className="text-xs text-forge-grey font-mono">
              {activeRep ? `Rep ${activeRep} Drift` : 'Full Video Path'}
            </span>
          </div>
          <BarPathChart framesData={framesData} activeRep={activeRep ?? undefined} />
          <p className="text-[11px] text-forge-grey leading-relaxed">
            Per Chapter 1, Fig 2-7: <em>"The bar moves in a straight vertical line—the most efficient path between two points."</em> Horizontal drift away from vertical baseline reduces mechanical efficiency.
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* FINDINGS SECTION: Full Bento Grid of Audited Criteria */}
      {/* ============================================================ */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="eyebrow">AUDIT FINDINGS</span>
            <h3 className="display-heading text-xl sm:text-2xl text-white">
              DETAILED ASSESSMENT BREAKDOWN
            </h3>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-forge-surface p-1 rounded-xl border border-forge-border text-xs">
            {['all', 'meets', 'fails', 'cannot'].map((f) => (
              <button
                key={f}
                onClick={() => setFilterResult(f)}
                className={`px-3 py-1 rounded-lg font-display uppercase tracking-wider font-bold transition-colors ${
                  filterResult === f
                    ? 'bg-forge-red text-white'
                    : 'text-forge-grey hover:text-white'
                }`}
              >
                {f === 'all'
                  ? 'All'
                  : f === 'meets'
                  ? `Pass (${meetsCount})`
                  : f === 'fails'
                  ? `Issues (${failsCount})`
                  : `Cannot Assess (${cannotCount})`}
              </button>
            ))}
          </div>
        </div>

        {/* Grid of findings */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFindings.map((finding: Finding, idx: number) => {
            const isMeets = finding.result === 'meets_standard';
            const isFails = finding.result === 'does_not_meet_standard';

            return (
              <motion.div
                key={`${finding.criterion_id}-${finding.rep_number}-${idx}`}
                layout
                className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-4 ${
                  isMeets
                    ? 'bg-forge-card border-forge-border hover:border-forge-green/40'
                    : isFails
                    ? 'bg-forge-card border-forge-red/30 shadow-red-glow/20 hover:border-forge-red'
                    : 'bg-forge-card/60 border-forge-border/40 opacity-70'
                }`}
              >
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`badge text-[10px] ${
                        isMeets
                          ? 'badge-green'
                          : isFails
                          ? 'badge-red'
                          : 'badge-grey'
                      }`}
                    >
                      {isMeets ? 'PASS' : isFails ? 'DOES NOT MEET' : 'CANNOT ASSESS'}
                    </span>
                    {finding.rep_number && (
                      <span className="text-[10px] font-mono text-forge-grey">
                        Rep {finding.rep_number}
                      </span>
                    )}
                  </div>

                  <h4 className="font-display font-bold text-base uppercase text-white leading-tight">
                    {finding.title}
                  </h4>

                  <p className="text-xs text-forge-grey leading-relaxed">
                    {finding.short_explanation}
                  </p>
                </div>

                {/* Fix & Assumption Badges */}
                <div className="space-y-3 pt-2 border-t border-forge-border/60">
                  {finding.actionable_fix && (
                    <div className="text-xs">
                      <span className="text-forge-red font-semibold block mb-0.5">Fix:</span>
                      <span className="text-white/80">{finding.actionable_fix}</span>
                    </div>
                  )}

                  {finding.has_implementation_assumption && (
                    <div className="text-[10px] text-amber-400 bg-amber-400/10 p-2 rounded-lg border border-amber-400/20">
                      <strong>Assumption:</strong> {finding.implementation_assumption_text}
                    </div>
                  )}

                  {/* Footer metadata & Citation chip */}
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <button
                      onClick={() => setSelectedCitation(finding)}
                      className="inline-flex items-center gap-1 text-forge-red hover:text-white transition-colors underline underline-offset-2"
                    >
                      <BookOpen size={11} />
                      p. {finding.source_page} ({finding.source_section})
                    </button>

                    {finding.timestamp_s !== null && finding.timestamp_s !== undefined && (
                      <button
                        onClick={() => jumpToFrame(finding.timestamp_s!)}
                        className="text-forge-grey hover:text-white transition-colors font-mono"
                        title="Seek video to this finding"
                      >
                        @{finding.timestamp_s.toFixed(1)}s
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Citation Modal */}
      <AnimatePresence>
        {selectedCitation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-6 rounded-2xl border border-forge-border max-w-lg w-full space-y-4"
            >
              <div className="flex items-center justify-between border-b border-forge-border pb-3">
                <div>
                  <span className="eyebrow">REFERENCE GROUNDING</span>
                  <h4 className="font-display font-bold text-lg uppercase text-white">
                    {selectedCitation.title}
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedCitation(null)}
                  className="p-1.5 rounded-lg bg-forge-surface text-forge-grey hover:text-white"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs leading-relaxed">
                <div>
                  <span className="text-forge-grey block">Source Citation:</span>
                  <span className="text-white font-semibold">
                    Starting Strength (Reference Chapter), Page {selectedCitation.source_page},{' '}
                    {selectedCitation.source_section}
                  </span>
                </div>

                <div className="p-3 bg-forge-surface rounded-xl border border-forge-border">
                  <span className="text-forge-red font-display text-[10px] uppercase tracking-wider font-bold block mb-1">
                    Verbatim Rule Text:
                  </span>
                  <blockquote className="italic text-forge-white/90">
                    "{selectedCitation.verbatim_quote || 'Quote available in squat_skill.yaml'}"
                  </blockquote>
                </div>

                {selectedCitation.uncertainty_note && (
                  <div>
                    <span className="text-forge-grey block">Uncertainty Note:</span>
                    <span className="text-amber-300">{selectedCitation.uncertainty_note}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedCitation(null)}
                  className="px-4 py-2 rounded-xl bg-forge-surface border border-forge-border text-xs text-white hover:border-forge-red transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

