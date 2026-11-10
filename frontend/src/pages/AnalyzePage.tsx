import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, XCircle } from 'lucide-react';
import { uploadVideo, getJobStatus, getResults } from '../api/client';
import { saveHistory } from '../utils/db';
import type { JobStatus, JobStatusResponse } from '../types/analysis';
import { SelectionBox } from '../ui/SelectionBox';
import { Button } from '../ui/Button';

interface Stage {
  id: JobStatus;
  label: string;
  desc: string;
}

const STAGES: Stage[] = [
  { id: 'uploading', label: 'Uploading', desc: 'Transferring video clip' },
  { id: 'validating', label: 'Quality gate', desc: 'Checking side-view framing and visibility' },
  { id: 'tracking_pose', label: 'Pose estimation', desc: 'Extracting smoothed joint coordinates' },
  { id: 'tracking_bar', label: 'Bar tracking', desc: 'Following horizontal and vertical bar path' },
  { id: 'counting_reps', label: 'Rep detection', desc: 'Finding descent, hole, and lockout frames' },
  { id: 'assessing', label: 'Rule engine', desc: 'Evaluating Starting Strength pages 1–35 criteria' },
  { id: 'rendering', label: 'Rendering video', desc: 'Overlaying skeleton and bar trail' },
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
  const [statusMessage, setStatusMessage] = useState('Preparing upload…');
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const start = performance.now();
    const interval = setInterval(() => {
      setElapsedMs(Math.floor(performance.now() - start));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (file && !jobId) {
      const controller = new AbortController();
      abortRef.current = controller;

      uploadVideo(
        file,
        (pct) => {
          setCurrentStage('uploading');
          setProgress(Math.round(pct * 0.2));
          setStatusMessage(`Uploading video (${pct}%)…`);
        },
        controller.signal,
      )
        .then((res) => {
          setJobId(res.job_id);
          setProgress(25);
          setStatusMessage('Upload complete. Running quality checks…');
        })
        .catch((err) => {
          if (err.message !== 'Upload aborted') {
            const msg = String(err.message || '');
            if (msg.includes('HTTP 5') || msg.includes('Network error')) {
              setError('Something went wrong, try again');
            } else {
              setError(msg || 'Something went wrong, try again');
            }
          }
        });

      return () => {
        controller.abort();
      };
    } else if (!file && !jobId) {
      navigate('/', { replace: true });
    }
  }, [file, jobId, navigate]);

  useEffect(() => {
    if (!jobId) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let isMounted = true;
    let consecutiveFailures = 0;

    const poll = async () => {
      try {
        const status: JobStatusResponse = await getJobStatus(jobId);
        if (!isMounted) return;
        consecutiveFailures = 0;

        setCurrentStage(status.status);
        if (status.status_message) {
          setStatusMessage(status.status_message);
        }

        if (status.progress !== undefined) {
          const mapped = Math.round(20 + status.progress * 75);
          setProgress((prev) => Math.max(prev, mapped));
        }

        if (status.status === 'done') {
          setProgress(100);
          setStatusMessage('Analysis complete. Opening report…');

          try {
            const results = await getResults(jobId);
            await saveHistory({
              job_id: jobId,
              filename: file?.name || results.filename || 'squat_video.mp4',
              analyzed_at: new Date().toISOString(),
              total_reps: results.reps?.length || results.total_reps || 0,
              overall_score: null,
              quality_gate_passed: results.quality_gate?.passed ?? true,
            });
          } catch (e) {
            console.error('History save error:', e);
          }

          if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            try {
              navigator.vibrate(60);
            } catch {
              // ignore
            }
          }

          setTimeout(() => {
            if (isMounted) navigate(`/results/${jobId}`);
          }, 500);
          return;
        }

        if (status.status === 'failed') {
          setError(status.error_reason || 'Something went wrong, try again');
          return;
        }

        timer = setTimeout(poll, 1200);
      } catch {
        if (!isMounted) return;
        consecutiveFailures += 1;
        if (consecutiveFailures >= 4) {
          setError('Something went wrong, try again');
          return;
        }
        timer = setTimeout(poll, 2500);
      }
    };

    poll();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, file, navigate]);

  const activeStageIndex = STAGES.findIndex((s) => s.id === currentStage);

  const formatElapsed = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const remS = s % 60;
    return `${String(m).padStart(2, '0')}:${String(remS).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-16 space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-4">
        <div className="space-y-1">
          <div className="type-eyebrow text-[#CCFF00]">Processing video</div>
          <h1 className="type-h2">Analyzing squat reps</h1>
        </div>
        {jobId && (
          <span className="type-mono text-[var(--text)]/60">#{jobId.slice(0, 8)}</span>
        )}
      </div>

      {!error ? (
        <SelectionBox color="lime" cornerSize={6}>
          <div className="p-4 sm:p-6 bg-[var(--card-bg)] space-y-6">
            {/* Live Status & Timer */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--hairline)] pb-4">
              <div className="type-body text-[#CCFF00]">{statusMessage}</div>
              <div className="type-mono text-[var(--text)]/80 border border-[var(--hairline)] px-3 py-1 bg-[var(--bg)]">
                Elapsed {formatElapsed(elapsedMs)}
              </div>
            </div>

            {/* Real Progress Grid */}
            <div className="space-y-2">
              <div className="flex justify-between type-mono text-[var(--text)]/70">
                <span>Pipeline progress</span>
                <span className="text-[#CCFF00] font-bold">{progress}%</span>
              </div>
              <div className="grid grid-cols-10 gap-1 p-2 bg-[var(--bg)] border border-[var(--hairline)]">
                {Array.from({ length: 40 }).map((_, idx) => {
                  const isFilled = idx * 2.5 <= progress;
                  const isFrontier = !isFilled && (idx - 1) * 2.5 <= progress;
                  return (
                    <div
                      key={idx}
                      className={`h-4 border transition-colors duration-150 ${
                        isFilled
                          ? 'bg-[#CCFF00] border-[#0A0A0A]'
                          : isFrontier
                          ? 'bg-[#F040B8] border-[#F040B8]'
                          : 'bg-[#181818] border-[var(--hairline)] opacity-40'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Pipeline Stages */}
            <div className="space-y-2">
              {STAGES.map((stage, idx) => {
                const isPast = idx < activeStageIndex || currentStage === 'done';
                const isCurrent = idx === activeStageIndex && currentStage !== 'done';

                return (
                  <div
                    key={stage.id}
                    className={`flex items-center justify-between p-3 border ${
                      isCurrent
                        ? 'border-[#CCFF00] bg-[#CCFF00]/10 text-[#CCFF00]'
                        : isPast
                        ? 'border-[var(--hairline)] bg-[var(--bg)] text-[var(--text)]/80'
                        : 'border-transparent text-[var(--text)]/35'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center font-pixel text-[10px] border border-[var(--hairline)] bg-[var(--bg)]">
                        {isPast ? '✓' : `0${idx + 1}`}
                      </span>
                      <div>
                        <div className="type-small font-bold">{stage.label}</div>
                        <div className="type-small text-[var(--text)]/60">{stage.desc}</div>
                      </div>
                    </div>

                    <span className="type-mono text-[11px]">
                      {isCurrent ? 'Running' : isPast ? 'Done' : 'Pending'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end border-t border-[var(--hairline)]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  abortRef.current?.abort();
                  navigate('/');
                }}
                className="text-[#F040B8] hover:text-[#F4F4EE]"
              >
                <XCircle size={14} />
                <span>Cancel</span>
              </Button>
            </div>
          </div>
        </SelectionBox>
      ) : (
        <SelectionBox color="magenta" cornerSize={6}>
          <div className="p-6 bg-[var(--card-bg)] space-y-4">
            <div className="flex items-center gap-2 text-[#F040B8]">
              <AlertTriangle size={20} />
              <h2 className="type-h3 uppercase">
                {error === 'Something went wrong, try again' ? 'Analysis failed' : 'Cannot assess video'}
              </h2>
            </div>
            <p className="type-body bg-[var(--bg)] p-4 border border-[#F040B8]/50 text-[var(--text)]">
              {error}
            </p>
            {error !== 'Something went wrong, try again' && (
              <p className="type-small text-[var(--text)]/65">
                Required framing: 90° side view, full body visible, and steady camera.
              </p>
            )}
            <Button variant="primary" onClick={() => navigate('/')}>
              <ArrowLeft size={14} />
              <span>Try another video</span>
            </Button>
          </div>
        </SelectionBox>
      )}
    </div>
  );
}
