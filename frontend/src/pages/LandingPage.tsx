import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import UploadZone from '../components/UploadZone';
import { KineticHeading } from '../ui/KineticHeading';
import { Button } from '../ui/Button';

const REQUIREMENTS = [
  { label: 'Formats', value: 'MP4, MOV, WebM' },
  { label: 'Limits', value: 'Max 60s / 100 MB' },
  { label: 'Angle', value: '90° side view' },
  { label: 'Framing', value: 'Full body visible' },
  { label: 'Stability', value: 'Steady camera' },
];

const STEPS = [
  { num: '01', title: 'Upload', desc: 'Drop or record a side-view squat clip up to 60 seconds.' },
  { num: '02', title: 'Track', desc: 'MediaPipe tracks 33 joints and OpenCV follows the bar path.' },
  { num: '03', title: 'Feedback', desc: 'Deterministic rules score each rep with page-cited cues.' },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const [preloaderDone, setPreloaderDone] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return true;
    }
    return sessionStorage.getItem('forge_preloader_seen') === 'true';
  });
  const [loadPercent, setLoadPercent] = useState(0);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);

  useEffect(() => {
    if (preloaderDone) return;
    const interval = setInterval(() => {
      setLoadPercent((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setPreloaderDone(true);
            sessionStorage.setItem('forge_preloader_seen', 'true');
          }, 180);
          return 100;
        }
        return Math.min(100, prev + 16);
      });
    }, 35);
    return () => clearInterval(interval);
  }, [preloaderDone]);

  const handleFileSelect = (file: File) => {
    navigate('/analyze', { state: { file } });
  };

  const handleLoadSample = async () => {
    try {
      setSampleError(null);
      setIsLoadingSample(true);
      const res = await fetch('/sample_squat.mp4');
      if (!res.ok) throw new Error('Sample clip unavailable');
      const blob = await res.blob();
      const file = new File([blob], 'sample_squat.mp4', { type: 'video/mp4' });
      navigate('/analyze', { state: { file } });
    } catch {
      setSampleError('Could not load sample clip.');
      setIsLoadingSample(false);
    }
  };

  return (
    <div className="relative bg-[var(--bg)] text-[var(--text)]">
      {/* Compact Preloader (< 0.8s) */}
      <AnimatePresence>
        {!preloaderDone && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="fixed inset-0 z-50 bg-[#0A0A0A] flex flex-col items-center justify-center p-6 select-none"
          >
            <div className="w-full max-w-xs space-y-4">
              <div className="flex justify-between items-center type-eyebrow text-[#CCFF00]">
                <span>FORGE</span>
                <span className="type-mono">{String(loadPercent).padStart(2, '0')}%</span>
              </div>

              <div className="grid grid-cols-10 gap-1 p-2 border border-[var(--hairline)] bg-[var(--card-bg)]">
                {Array.from({ length: 20 }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-3 transition-colors duration-100 ${
                      idx * 5 <= loadPercent ? 'bg-[#CCFF00]' : 'bg-[#1E1E1E]'
                    }`}
                  />
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPreloaderDone(true);
                  sessionStorage.setItem('forge_preloader_seen', 'true');
                }}
                className="w-full"
              >
                Skip
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main 12-Col Hero + Upload Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-16 space-y-8 sm:space-y-12">
        {/* Hero Copy */}
        <section className="space-y-4 text-center max-w-4xl mx-auto">
          <div className="type-eyebrow text-[#CCFF00]">SIDE-VIEW SQUAT ANALYSIS</div>
          <KineticHeading className="justify-center" />
          <p className="type-body text-[var(--text)]/75 max-w-2xl mx-auto">
            Upload a side-view barbell squat video to assess form against Starting Strength pages 1–35.
          </p>
        </section>

        {/* Upload Zone + Sample Link */}
        <section className="max-w-3xl mx-auto space-y-3">
          <UploadZone onFile={handleFileSelect} />

          <div className="flex flex-col items-center gap-1 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLoadSample}
              disabled={isLoadingSample}
              className="underline"
            >
              {isLoadingSample ? 'Loading sample video…' : 'Try the sample video'}
            </Button>
            {sampleError && <span className="type-small text-[#F040B8]">{sampleError}</span>}
          </div>
        </section>

        {/* Compact Requirements Row (12-col aligned) */}
        <section aria-label="Recording requirements" className="border border-[var(--hairline)] bg-[var(--card-bg)]">
          <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[var(--hairline)]">
            {REQUIREMENTS.map((req) => (
              <div key={req.label} className="p-3 sm:p-4 text-center">
                <div className="type-mono text-[11px] text-[var(--text)]/55 uppercase">{req.label}</div>
                <div className="type-small font-semibold text-[var(--text)] mt-1">{req.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 3-Step Strip (Upload / Track / Feedback) */}
        <section aria-label="How it works" className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="md:col-span-4 p-4 sm:p-6 border border-[var(--hairline)] bg-[var(--card-bg)] space-y-2"
            >
              <div className="font-pixel text-xs text-[#CCFF00] uppercase">
                {step.num} · {step.title}
              </div>
              <p className="type-small text-[var(--text)]/80">{step.desc}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

export default LandingPage;
