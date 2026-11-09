import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Upload,
  ShieldCheck,
  Activity,
  Crosshair,
  BarChart2,
  FileSearch,
  Video,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { uploadVideo, getJobStatus, getResults } from '../api/client';
import { saveHistory } from '../utils/db';
import type { JobStatus, JobStatusResponse } from '../types/analysis';

interface Stage {
  id: JobStatus;
  label: string;
  desc: string;
  icon: React.ElementType;
}

const STAGES: Stage[] = [
  { id: 'uploading', label: 'Uploading Video', desc: 'Sending file to CV pipeline', icon: Upload },
  { id: 'validating', label: 'Quality Gate', desc: 'Checking framing, view & steadiness', icon: ShieldCheck },
  { id: 'tracking_pose', label: 'Pose Estimation', desc: 'MediaPipe 33-landmark extraction', icon: Activity },
  { id: 'tracking_bar', label: 'Bar Path Tracking', desc: 'OpenCV CSRT continuous tracking', icon: Crosshair },
  { id: 'counting_reps', label: 'Rep Detection', desc: 'SciPy peak analysis on hip kinematics', icon: BarChart2 },
  { id: 'assessing', label: 'Skill Engine', desc: 'Deterministic evaluation vs Chapter 1-35', icon: FileSearch },
  { id: 'rendering', label: 'Video Rendering', desc: 'Generating overlay & kinetic vectors', icon: Video },
];

export default function AnalyzePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const file = location.state?.file as File | undefined;
  const initialJobId = searchParams.get('jobId');

  const [jobId, setJobId] = useState<string | null>(initialJobId);
  const [currentStage, setCurrentStage] = useState<JobStatus>('uploading');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Initializing analysis pipeline...');
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // 1. Upload if file passed
  useEffect(() => {
    if (file && !jobId) {
      const controller = new AbortController();
      abortRef.current = controller;

      uploadVideo(
        file,
        (pct) => {
          setCurrentStage('uploading');
          setProgress(Math.round(pct * 0.2)); // Upload is 0-20%
          setStatusMessage(`Uploading video (${pct}%)...`);
        },
        controller.signal
      )
        .then((res) => {
          setJobId(res.job_id);
          setProgress(25);
          setStatusMessage('Video received. Running quality validation...');
        })
        .catch((err) => {
          if (err.message !== 'Upload aborted') {
            setError(err.message || 'Upload failed');
          }
        });

      return () => {
        controller.abort();
      };
    } else if (!file && !jobId) {
      // No file and no job ID, go back to landing
      navigate('/', { replace: true });
    }
  }, [file, jobId, navigate]);

  // 2. Poll job status
  useEffect(() => {
    if (!jobId) return;

    let timer: any = null;
    let isMounted = true;

    const poll = async () => {
      try {
        const status: JobStatusResponse = await getJobStatus(jobId);
        if (!isMounted) return;

        setCurrentStage(status.status);
        if (status.status_message) {
          setStatusMessage(status.status_message);
        }

        // Map backend progress (0-1) to 20-95%
        if (status.progress !== undefined) {
          const mapped = Math.round(20 + status.progress * 75);
          setProgress((prev) => Math.max(prev, mapped));
        }

        if (status.status === 'done') {
          setProgress(100);
          setStatusMessage('Analysis complete! Fetching results...');

          // Save to history & navigate
          try {
            const results = await getResults(jobId);
            await saveHistory({
              job_id: jobId,
              filename: file?.name || 'squat_video.mp4',
              analyzed_at: new Date().toISOString(),
              total_reps: results.reps?.length || results.total_reps || 0,
              overall_score: results.overall_score ?? 85,
              quality_gate_passed: results.quality_gate?.passed ?? true,
            });
          } catch (e) {
            console.error('History save error:', e);
          }

          if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100]);
          }

          setTimeout(() => {
            if (isMounted) {
              navigate(`/results/${jobId}`);
            }
          }, 800);
          return;
        }

        if (status.status === 'failed') {
          setError(status.error_reason || 'Analysis failed. Please check the video requirements.');
          return;
        }

        // Continue polling
        timer = setTimeout(poll, 1200);
      } catch (err: any) {
        if (!isMounted) return;
        timer = setTimeout(poll, 2500); // retry
      }
    };

    poll();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, file, navigate]);

  const activeStageIndex = STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-12 relative">
      <div className="w-full max-w-xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forge-red/10 border border-forge-red/30">
            <Activity size={14} className="text-forge-red animate-pulse" />
            <span className="text-xs font-display font-bold uppercase tracking-eyebrow text-forge-red">
              PROCESSING PIPELINE
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-black uppercase text-white tracking-tight">
            ANALYZING YOUR SQUAT
          </h1>
          <p className="text-forge-grey text-sm max-w-md mx-auto">
            Our computer-vision pipeline is extracting kinematic landmarks, tracking the barbell, and evaluating mechanics against Starting Strength criteria.
          </p>
        </div>

        {/* Progress Card */}
        <div className="glass-card p-6 rounded-2xl border border-forge-border space-y-6">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-forge-grey font-medium tracking-wide flex items-center gap-2">
                <RefreshCw size={13} className="animate-spin text-forge-red" />
                {statusMessage}
              </span>
              <span className="font-mono font-bold text-forge-red">{progress}%</span>
            </div>
            <div className="h-2 w-full bg-forge-surface rounded-full overflow-hidden border border-forge-border">
              <motion.div
                className="h-full bg-gradient-to-r from-forge-red to-orange-500 rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Stepper */}
          <div className="space-y-3 pt-2">
            {STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              const isPast = idx < activeStageIndex || currentStage === 'done';
              const isCurrent = idx === activeStageIndex;
              const isUpcoming = idx > activeStageIndex && currentStage !== 'done';

              return (
                <div
                  key={stage.id}
                  className={`flex items-center gap-3.5 p-2.5 rounded-xl transition-all duration-300 border ${
                    isCurrent
                      ? 'bg-forge-red/10 border-forge-red/40 shadow-red-glow'
                      : isPast
                      ? 'bg-forge-surface/80 border-forge-border/40 text-forge-grey'
                      : 'border-transparent text-forge-grey/40 opacity-50'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                      isCurrent
                        ? 'bg-forge-red text-white border-forge-red'
                        : isPast
                        ? 'bg-forge-green/10 text-forge-green border-forge-green/30'
                        : 'bg-forge-surface text-forge-grey border-forge-border'
                    }`}
                  >
                    {isPast ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-display uppercase tracking-wider font-bold ${
                          isCurrent ? 'text-white' : isPast ? 'text-forge-grey' : 'text-forge-grey/50'
                        }`}
                      >
                        {stage.label}
                      </span>
                      {isCurrent && (
                        <span className="badge badge-red text-[10px] py-0.5">RUNNING</span>
                      )}
                    </div>
                    <p className="text-[11px] text-forge-grey/70 truncate">{stage.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Modal / Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-forge-red/15 border border-forge-red/50 space-y-3"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-forge-red shrink-0 mt-0.5" size={20} />
              <div className="space-y-1">
                <h4 className="font-display font-bold uppercase text-white tracking-wide">
                  PIPELINE COULD NOT ASSESS
                </h4>
                <p className="text-xs text-forge-white/90 leading-relaxed">{error}</p>
              </div>
            </div>
            <div className="pt-2 flex gap-3">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-forge-red text-white text-xs font-bold uppercase tracking-wider hover:bg-forge-red-dark transition-colors"
              >
                <ArrowLeft size={14} />
                Try Another Video
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

