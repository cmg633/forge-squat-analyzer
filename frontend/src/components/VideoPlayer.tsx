import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Layers } from 'lucide-react';
import { Button } from '../ui/Button';
import type { LandmarkPoint } from '../types/analysis';

interface FrameItem {
  frame_index: number;
  timestamp_s: number;
  landmarks?: Record<string, LandmarkPoint> | null;
  bar?: { x: number; y: number; confidence: number; tracked: boolean } | null;
  rep_number?: number | null;
  is_bottom?: boolean;
}

interface RepInfo {
  rep_number: number;
  start_timestamp_s: number;
  end_timestamp_s: number;
}

interface VideoPlayerProps {
  videoUrl: string;
  fps?: number;
  durationFallback?: number;
  frames?: FrameItem[];
  reps?: RepInfo[];
  activeRep: number | null;
  onSelectRep: (rep: number | null) => void;
  seekTimestamp: number | null;
}

const SKELETON_EDGES: Array<[string, string]> = [
  ['LEFT_SHOULDER', 'RIGHT_SHOULDER'],
  ['LEFT_SHOULDER', 'LEFT_ELBOW'],
  ['LEFT_ELBOW', 'LEFT_WRIST'],
  ['RIGHT_SHOULDER', 'RIGHT_ELBOW'],
  ['RIGHT_ELBOW', 'RIGHT_WRIST'],
  ['LEFT_SHOULDER', 'LEFT_HIP'],
  ['RIGHT_SHOULDER', 'RIGHT_HIP'],
  ['LEFT_HIP', 'RIGHT_HIP'],
  ['LEFT_HIP', 'LEFT_KNEE'],
  ['LEFT_KNEE', 'LEFT_ANKLE'],
  ['LEFT_ANKLE', 'LEFT_HEEL'],
  ['LEFT_HEEL', 'LEFT_FOOT_INDEX'],
  ['RIGHT_HIP', 'RIGHT_KNEE'],
  ['RIGHT_KNEE', 'RIGHT_ANKLE'],
  ['RIGHT_ANKLE', 'RIGHT_HEEL'],
  ['RIGHT_HEEL', 'RIGHT_FOOT_INDEX'],
];

export default function VideoPlayer({
  videoUrl,
  fps = 30,
  durationFallback = 0,
  frames = [],
  reps = [],
  activeRep,
  onSelectRep,
  seekTimestamp,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameMapRef = useRef<Map<number, FrameItem>>(new Map());

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationFallback);
  const [showOverlay, setShowOverlay] = useState(true);
  const [videoDecodeFailed, setVideoDecodeFailed] = useState(false);

  useEffect(() => {
    frameMapRef.current = new Map(frames.map((f) => [f.frame_index, f]));
    if (frames.length > 0) {
      const computedDur = frames[frames.length - 1].timestamp_s || frames.length / fps;
      setDuration((prev) => (prev > 0 ? prev : computedDur));
    }
  }, [frames, fps]);

  const drawFrameCanvas = useCallback(
    (timeS: number, skeletonFallbackMode: boolean) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = (video && video.videoWidth > 0 ? video.videoWidth : 1280);
      const h = (video && video.videoHeight > 0 ? video.videoHeight : 720);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      ctx.clearRect(0, 0, w, h);

      if (skeletonFallbackMode) {
        ctx.fillStyle = '#0A0A0A';
        ctx.fillRect(0, 0, w, h);
      }

      if ((!showOverlay && !skeletonFallbackMode) || frames.length === 0) return;

      const frameIdx = Math.min(frames.length - 1, Math.max(0, Math.round(timeS * fps)));
      const frame = frameMapRef.current.get(frameIdx) ?? frames[frameIdx];
      if (!frame) return;

      const lms = frame.landmarks;
      if (lms) {
        // Vertical midfoot plumb line
        const lh = lms.LEFT_HEEL;
        const lt = lms.LEFT_FOOT_INDEX;
        const rh = lms.RIGHT_HEEL;
        const rt = lms.RIGHT_FOOT_INDEX;

        let midfootX: number | null = null;
        if (lh && lt && lh.visibility > 0.35 && lt.visibility > 0.35) {
          midfootX = ((lh.x + lt.x) / 2) * w;
        } else if (rh && rt && rh.visibility > 0.35 && rt.visibility > 0.35) {
          midfootX = ((rh.x + rt.x) / 2) * w;
        }

        if (midfootX !== null) {
          ctx.save();
          ctx.setLineDash([6, 6]);
          ctx.strokeStyle = 'rgba(204, 255, 0, 0.7)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(midfootX, h * 0.1);
          ctx.lineTo(midfootX, h * 0.94);
          ctx.stroke();
          ctx.restore();
        }

        // Depth reference line at bottom of rep
        if (frame.is_bottom) {
          const lk = lms.LEFT_KNEE;
          const rk = lms.RIGHT_KNEE;
          const knee = lk && lk.visibility >= (rk?.visibility ?? 0) ? lk : rk;
          if (knee && knee.visibility > 0.35) {
            const ky = knee.y * h;
            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = '#A97BFF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(w * 0.25, ky);
            ctx.lineTo(w * 0.75, ky);
            ctx.stroke();
            ctx.restore();
          }
        }

        // Full skeleton render when in telemetry fallback mode (or if overlay enabled over black background)
        if (skeletonFallbackMode) {
          ctx.strokeStyle = '#CCFF00';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          for (const [a, b] of SKELETON_EDGES) {
            const pa = lms[a];
            const pb = lms[b];
            if (pa && pb && pa.visibility > 0.35 && pb.visibility > 0.35) {
              ctx.beginPath();
              ctx.moveTo(pa.x * w, pa.y * h);
              ctx.lineTo(pb.x * w, pb.y * h);
              ctx.stroke();
            }
          }
          for (const pt of Object.values(lms)) {
            if (pt.visibility > 0.4) {
              ctx.beginPath();
              ctx.arc(pt.x * w, pt.y * h, 5, 0, Math.PI * 2);
              ctx.fillStyle = '#F4F4EE';
              ctx.fill();
            }
          }
        }
      }

      // Draw trailing bar path when in fallback mode
      if (skeletonFallbackMode) {
        const startTrail = Math.max(0, frameIdx - 45);
        ctx.strokeStyle = 'rgba(240, 64, 184, 0.75)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        let started = false;
        for (let i = startTrail; i <= frameIdx; i++) {
          const bf = frames[i]?.bar;
          if (bf?.tracked) {
            const px = bf.x * w;
            const py = bf.y * h;
            if (!started) {
              ctx.moveTo(px, py);
              started = true;
            } else {
              ctx.lineTo(px, py);
            }
          }
        }
        ctx.stroke();
      }

      // Live CSRT bar reticle
      if (frame.bar?.tracked) {
        const bx = frame.bar.x * w;
        const by = frame.bar.y * h;
        ctx.strokeStyle = '#F040B8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(bx, by, 12, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
    [fps, frames, showOverlay],
  );

  // External seek request
  useEffect(() => {
    if (seekTimestamp === null) return;
    setIsPlaying(false);
    setCurrentTime(seekTimestamp);
    if (videoRef.current && !videoDecodeFailed) {
      videoRef.current.currentTime = seekTimestamp;
      videoRef.current.pause();
    }
    drawFrameCanvas(seekTimestamp, videoDecodeFailed);
  }, [seekTimestamp, videoDecodeFailed, drawFrameCanvas]);

  // Playback loop for native video overlay or tracked-skeleton fallback player
  useEffect(() => {
    let rafId: number;
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTs) / 1000;
      lastTs = now;

      if (videoDecodeFailed) {
        if (isPlaying && duration > 0) {
          setCurrentTime((prev) => {
            const next = prev + dt;
            if (next >= duration) {
              setIsPlaying(false);
              drawFrameCanvas(duration, true);
              return duration;
            }
            drawFrameCanvas(next, true);
            const repMatch = reps.find((r) => next >= r.start_timestamp_s && next <= r.end_timestamp_s);
            if (repMatch && repMatch.rep_number !== activeRep) {
              onSelectRep(repMatch.rep_number);
            }
            return next;
          });
          rafId = requestAnimationFrame(loop);
        }
      } else if (isPlaying && videoRef.current) {
        drawFrameCanvas(videoRef.current.currentTime, false);
        rafId = requestAnimationFrame(loop);
      }
    };

    drawFrameCanvas(currentTime, videoDecodeFailed);
    if (isPlaying) {
      rafId = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, videoDecodeFailed, duration, currentTime, drawFrameCanvas, reps, activeRep, onSelectRep]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || videoDecodeFailed) return;
    const t = video.currentTime;
    setCurrentTime(t);
    drawFrameCanvas(t, false);

    const matchingRep = reps.find((r) => t >= r.start_timestamp_s && t <= r.end_timestamp_s);
    if (matchingRep && matchingRep.rep_number !== activeRep) {
      onSelectRep(matchingRep.rep_number);
    }
  };

  const togglePlay = () => {
    if (videoDecodeFailed) {
      if (currentTime >= duration && duration > 0) setCurrentTime(0);
      setIsPlaying((p) => !p);
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const stepFrames = (delta: number) => {
    setIsPlaying(false);
    const maxDur = duration || 0;
    const next = Math.max(0, Math.min(maxDur, currentTime + delta / fps));
    setCurrentTime(next);
    if (videoRef.current && !videoDecodeFailed) {
      videoRef.current.pause();
      videoRef.current.currentTime = next;
    }
    drawFrameCanvas(next, videoDecodeFailed);
  };

  const jumpToRep = (repNum: number) => {
    onSelectRep(repNum);
    const rep = reps.find((r) => r.rep_number === repNum);
    if (rep) {
      setIsPlaying(false);
      setCurrentTime(rep.start_timestamp_s);
      if (videoRef.current && !videoDecodeFailed) {
        videoRef.current.currentTime = rep.start_timestamp_s;
      }
      drawFrameCanvas(rep.start_timestamp_s, videoDecodeFailed);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative border border-[var(--hairline)] bg-[#0A0A0A] overflow-hidden aspect-video">
        {!videoDecodeFailed && (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain block"
            playsInline
            onError={() => setVideoDecodeFailed(true)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                setDuration(videoRef.current.duration);
                drawFrameCanvas(videoRef.current.currentTime, false);
              }
            }}
            onEnded={() => setIsPlaying(false)}
            aria-label="Annotated squat analysis video"
          />
        )}

        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {activeRep !== null && (
          <div className="absolute top-3 left-3 px-2 py-1 bg-[#CCFF00] text-[#0A0A0A] font-pixel text-[10px] font-bold uppercase">
            Rep {activeRep}
          </div>
        )}

        {frames.length > 0 && !videoDecodeFailed && (
          <button
            type="button"
            onClick={() => setShowOverlay((v) => !v)}
            className="absolute top-3 right-3 px-2 py-1 bg-[#0A0A0A]/85 border border-[var(--hairline)] hover:border-[#CCFF00] text-[var(--text)] font-pixel text-[9px] uppercase flex items-center gap-1.5"
            aria-pressed={showOverlay}
          >
            <Layers size={12} className="text-[#CCFF00]" />
            <span>Plumb overlay: {showOverlay ? 'On' : 'Off'}</span>
          </button>
        )}

        {videoDecodeFailed && (
          <div className="absolute bottom-2 left-3 right-3 px-2 py-1 bg-[#0A0A0A]/90 border border-[var(--hairline)] type-mono text-[10px] text-[var(--text)]/75">
            Browser cannot decode server MPEG-4 codec directly. Playing real tracked pose &amp; bar overlay ({frames.length} frames); use Annotated MP4 to download file.
          </div>
        )}
      </div>

      {/* Scrubber */}
      <div className="relative pt-3">
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.01}
          value={currentTime}
          aria-label="Seek video timeline"
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            setIsPlaying(false);
            setCurrentTime(val);
            if (videoRef.current && !videoDecodeFailed) videoRef.current.currentTime = val;
            drawFrameCanvas(val, videoDecodeFailed);
          }}
          className="w-full h-1.5 bg-[#1E1E1E] accent-[#CCFF00] cursor-pointer"
        />

        {duration > 0 &&
          reps.map((r) => (
            <button
              key={r.rep_number}
              type="button"
              onClick={() => jumpToRep(r.rep_number)}
              className="absolute top-0 -translate-x-1/2 font-pixel text-[9px] text-[#F040B8] hover:text-[#CCFF00]"
              style={{ left: `${(r.start_timestamp_s / duration) * 100}%` }}
              title={`Jump to rep ${r.rep_number}`}
            >
              R{r.rep_number}
            </button>
          ))}
      </div>

      {/* Transport + Rep Selection */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <Pause size={14} /> : <Play size={14} fill="#0A0A0A" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => stepFrames(-1)} title="Previous frame" aria-label="Previous frame">
            <SkipBack size={14} />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => stepFrames(1)} title="Next frame" aria-label="Next frame">
            <SkipForward size={14} />
          </Button>
          <span className="type-mono text-[var(--text)]/70 ml-1">
            {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => onSelectRep(null)}
            className={`px-2 py-1 font-pixel text-[10px] border transition-colors ${
              activeRep === null
                ? 'border-[#CCFF00] bg-[#CCFF00] text-[#0A0A0A] font-bold'
                : 'border-[var(--hairline)] text-[var(--text)]/70 hover:text-[var(--text)]'
            }`}
          >
            All
          </button>
          {reps.map((r) => (
            <button
              key={r.rep_number}
              type="button"
              onClick={() => jumpToRep(r.rep_number)}
              className={`px-2 py-1 font-pixel text-[10px] border transition-colors ${
                activeRep === r.rep_number
                  ? 'border-[#CCFF00] bg-[#CCFF00] text-[#0A0A0A] font-bold'
                  : 'border-[var(--hairline)] text-[var(--text)]/70 hover:text-[var(--text)]'
              }`}
            >
              R{r.rep_number}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
