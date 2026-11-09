import { useEffect, useRef, useCallback } from 'react';
import type { LandmarkFrame, BarPathFrame } from '../types/analysis';

// MediaPipe Pose landmark connections
const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], // shoulders
  [11, 13], [13, 15], // left arm
  [12, 14], [14, 16], // right arm
  [11, 23], [12, 24], // torso sides
  [23, 24], // hips
  [23, 25], [25, 27], [27, 29], [29, 31], // left leg
  [24, 26], [26, 28], [28, 30], [30, 32], // right leg
];

interface VideoPlayerProps {
  videoUrl: string;
  frames?: LandmarkFrame[];
  barPath?: BarPathFrame[];
  repBoundaries?: Array<{ rep_number: number; start_frame: number; end_frame: number }>;
  onTimeUpdate?: (currentTime: number) => void;
  currentRep?: number | null;
  className?: string;
}

export default function VideoPlayer({
  videoUrl,
  frames = [],
  barPath = [],
  repBoundaries = [],
  onTimeUpdate,
  currentRep,
  className = '',
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(-1);

  // Index frames and bar path by frame index for O(1) lookup
  const frameMap = useRef<Map<number, LandmarkFrame>>(new Map());
  const barMap = useRef<Map<number, BarPathFrame>>(new Map());

  useEffect(() => {
    frameMap.current = new Map(frames.map(f => [f.frame_index, f]));
  }, [frames]);

  useEffect(() => {
    barMap.current = new Map(barPath.map(b => [b.frame_index, b]));
  }, [barPath]);

  const drawFrame = useCallback((frameIndex: number, videoWidth: number, videoHeight: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to match video dimensions
    if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
      canvas.width = videoWidth;
      canvas.height = videoHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const lf = frameMap.current.get(frameIndex);
    if (lf && lf.landmarks.length > 0) {
      const pts = lf.landmarks;
      const toX = (x: number) => x * canvas.width;
      const toY = (y: number) => y * canvas.height;

      // Draw skeleton connections
      ctx.strokeStyle = 'rgba(224,58,30,0.75)';
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (const [a, b] of POSE_CONNECTIONS) {
        const pa = pts[a];
        const pb = pts[b];
        if (pa && pb && pa.visibility > 0.4 && pb.visibility > 0.4) {
          ctx.beginPath();
          ctx.moveTo(toX(pa.x), toY(pa.y));
          ctx.lineTo(toX(pb.x), toY(pb.y));
          ctx.stroke();
        }
      }

      // Draw landmark dots
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (p.visibility > 0.4) {
          ctx.beginPath();
          ctx.arc(toX(p.x), toY(p.y), 4, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(224,58,30,0.9)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }

    // Draw bar position dot
    const bf = barMap.current.get(frameIndex);
    if (bf && bf.bar_x != null && bf.bar_y != null) {
      const bx = bf.bar_x * canvas.width;
      const by = bf.bar_y * canvas.height;
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(234,179,8,0.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, []);

  const renderLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video || !frames.length) {
      rafRef.current = requestAnimationFrame(renderLoop);
      return;
    }
    const fps = video.duration ? frames.length / video.duration : 30;
    const frameIndex = Math.round(video.currentTime * fps);

    if (frameIndex !== lastFrameRef.current) {
      lastFrameRef.current = frameIndex;
      drawFrame(frameIndex, video.videoWidth, video.videoHeight);
    }

    if (onTimeUpdate) onTimeUpdate(video.currentTime);
    rafRef.current = requestAnimationFrame(renderLoop);
  }, [frames.length, drawFrame, onTimeUpdate]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [renderLoop]);

  // Seek to rep when currentRep changes
  useEffect(() => {
    if (currentRep == null) return;
    const boundary = repBoundaries.find(r => r.rep_number === currentRep);
    if (!boundary || !videoRef.current) return;
    const video = videoRef.current;
    const fps = video.duration ? frames.length / video.duration : 30;
    video.currentTime = boundary.start_frame / fps;
  }, [currentRep, repBoundaries, frames.length]);

  return (
    <div className={`video-wrapper rounded-xl overflow-hidden bg-black ${className}`}>
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        playsInline
        className="w-full block"
        aria-label="Annotated squat analysis video"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      />
    </div>
  );
}
