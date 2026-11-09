import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Upload,
  Camera,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Flame,
  Shield,
  FileText,
  Eye,
  Maximize2,
} from 'lucide-react';
import UploadZone from '../components/UploadZone';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [showFramingGuide, setShowFramingGuide] = useState(false);

  const handleFileSelect = (file: File) => {
    navigate('/analyze', { state: { file } });
  };

  return (
    <div className="min-h-screen bg-forge-bg text-forge-white">
      {/* Background grain */}
      <div className="fixed inset-0 bg-grain pointer-events-none opacity-50 z-0" />

      {/* Hero Section */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 pt-12 pb-8 sm:pt-20 sm:pb-16 text-center">
        {/* Eyebrow badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forge-red/10 border border-forge-red/30 mb-6"
        >
          <Flame size={14} className="text-forge-red animate-pulse" />
          <span className="text-xs font-display font-bold uppercase tracking-eyebrow text-forge-red">
            Computer Vision × Starting Strength
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-display font-black tracking-tight uppercase leading-none mb-4"
        >
          FORGE YOUR <span className="text-forge-red text-glow">BEST SQUAT</span>
        </motion.h1>

        {/* Subhead */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-forge-grey text-base sm:text-xl max-w-2xl mx-auto mb-10 font-light"
        >
          Real computer vision. Deterministic rules from Starting Strength. Every finding citing
          the exact page and section. No black boxes.
        </motion.p>

        {/* Looping Squat Skeleton Visual (SVG) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="relative max-w-sm mx-auto h-48 sm:h-56 mb-12 flex items-center justify-center bg-forge-surface/60 rounded-2xl border border-forge-border backdrop-blur-sm overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-forge-bg via-transparent to-transparent pointer-events-none" />

          {/* SVG Animated Skeleton */}
          <svg
            viewBox="0 0 200 200"
            className="w-40 h-40 stroke-forge-red fill-none"
            style={{ filter: 'drop-shadow(0 0 8px rgba(224, 58, 30, 0.5))' }}
          >
            {/* Floor */}
            <line x1="20" y1="180" x2="180" y2="180" stroke="#333" strokeWidth="2" />

            {/* Foot */}
            <line x1="90" y1="180" x2="120" y2="180" stroke="#888" strokeWidth="3" />

            {/* Dynamic squat animation with SVG smil */}
            {/* Lower leg */}
            <line x1="95" y1="180" x2="105" y2="135" strokeWidth="3">
              <animate
                attributeName="x2"
                values="105; 115; 105"
                dur="3s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="y2"
                values="135; 145; 135"
                dur="3s"
                repeatCount="indefinite"
              />
            </line>

            {/* Upper leg (thigh) */}
            <line x1="105" y1="135" x2="85" y2="95" strokeWidth="3">
              <animate
                attributeName="x1"
                values="105; 115; 105"
                dur="3s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="y1"
                values="135; 145; 135"
                dur="3s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="x2"
                values="85; 70; 85"
                dur="3s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="y2"
                values="95; 140; 95"
                dur="3s"
                repeatCount="indefinite"
              />
            </line>

            {/* Torso */}
            <line x1="85" y1="95" x2="75" y2="50" strokeWidth="4">
              <animate
                attributeName="x1"
                values="85; 70; 85"
                dur="3s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="y1"
                values="95; 140; 95"
                dur="3s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="x2"
                values="75; 90; 75"
                dur="3s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="y2"
                values="50; 100; 50"
                dur="3s"
                repeatCount="indefinite"
              />
            </line>

            {/* Head */}
            <circle cx="72" cy="40" r="8" fill="#E03A1E" strokeWidth="1">
              <animate
                attributeName="cx"
                values="72; 92; 72"
                dur="3s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="cy"
                values="40; 90; 40"
                dur="3s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Barbell */}
            <line x1="50" y1="48" x2="100" y2="48" stroke="#fff" strokeWidth="3">
              <animate
                attributeName="x1"
                values="50; 65; 50"
                dur="3s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="y1"
                values="48; 98; 48"
                dur="3s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="x2"
                values="100; 115; 100"
                dur="3s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="y2"
                values="48; 98; 48"
                dur="3s"
                repeatCount="indefinite"
              />
            </line>
          </svg>

          <div className="absolute bottom-2 text-[10px] text-forge-grey uppercase tracking-widest font-display">
            Real-Time Kinetic Pose Reconstruction
          </div>
        </motion.div>

        {/* Upload Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="max-w-xl mx-auto mb-12"
        >
          <UploadZone onFile={handleFileSelect} />
        </motion.div>

        {/* Supported Formats & Recording Guide Panel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 text-left mb-8"
        >
          <div className="bg-forge-card p-3 rounded-xl border border-forge-border">
            <div className="text-forge-red font-display text-xs uppercase tracking-eyebrow font-bold mb-1">
              Angle
            </div>
            <div className="text-sm font-semibold">Side View Only</div>
            <div className="text-[11px] text-forge-grey">Pure sagittal plane</div>
          </div>
          <div className="bg-forge-card p-3 rounded-xl border border-forge-border">
            <div className="text-forge-red font-display text-xs uppercase tracking-eyebrow font-bold mb-1">
              Framing
            </div>
            <div className="text-sm font-semibold">Full Body</div>
            <div className="text-[11px] text-forge-grey">Head to toes visible</div>
          </div>
          <div className="bg-forge-card p-3 rounded-xl border border-forge-border">
            <div className="text-forge-red font-display text-xs uppercase tracking-eyebrow font-bold mb-1">
              Limits
            </div>
            <div className="text-sm font-semibold">Max 60s / 100MB</div>
            <div className="text-[11px] text-forge-grey">MP4, MOV, WEBM</div>
          </div>
          <div className="bg-forge-card p-3 rounded-xl border border-forge-border">
            <div className="text-forge-red font-display text-xs uppercase tracking-eyebrow font-bold mb-1">
              Mount
            </div>
            <div className="text-sm font-semibold">Tripod / Stable</div>
            <div className="text-[11px] text-forge-grey">No camera shake</div>
          </div>
        </motion.div>

        {/* Framing Guide Trigger */}
        <button
          onClick={() => setShowFramingGuide(!showFramingGuide)}
          className="inline-flex items-center gap-1.5 text-xs text-forge-grey hover:text-forge-white transition-colors underline underline-offset-4"
        >
          <Maximize2 size={12} />
          {showFramingGuide ? 'Hide Framing Guide' : 'Show Recording Framing Guide'}
        </button>

        {/* Framing Guide Overlay Mock */}
        {showFramingGuide && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-4 bg-forge-surface border border-forge-border rounded-xl max-w-md mx-auto text-left text-xs text-forge-grey space-y-2"
          >
            <div className="font-semibold text-forge-white flex items-center gap-1.5">
              <Camera size={14} className="text-forge-red" />
              Optimal Camera Placement:
            </div>
            <p>1. Mount phone at hip height (around 3–3.5 feet off the ground).</p>
            <p>2. Stand 10–12 feet away so your full body is in frame at standing AND at depth.</p>
            <p>3. Record directly from the 90° side profile — not 45° quarter angle.</p>
            <p>4. Keep the barbell collars in view for bar-path tracking.</p>
          </motion.div>
        )}
      </div>

      {/* Feature Bento Grid (Footer Preview) */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 pb-20">
        <div className="text-center mb-8">
          <span className="text-xs uppercase tracking-eyebrow text-forge-red font-display font-bold">
            Built for Serious Lifters
          </span>
          <h2 className="text-2xl sm:text-3xl font-display font-bold uppercase mt-1">
            Engineered with Integrity
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-forge-card p-5 rounded-2xl border border-forge-border">
            <Shield className="text-forge-red mb-3" size={24} />
            <h3 className="font-display font-bold text-lg uppercase mb-1">Source-Grounded</h3>
            <p className="text-forge-grey text-xs leading-relaxed">
              Every single criterion links directly to pages 1–35 of the reference chapter. We never
              invent standards or fabricate requirements.
            </p>
          </div>
          <div className="bg-forge-card p-5 rounded-2xl border border-forge-border">
            <Eye className="text-forge-red mb-3" size={24} />
            <h3 className="font-display font-bold text-lg uppercase mb-1">Honest Uncertainty</h3>
            <p className="text-forge-grey text-xs leading-relaxed">
              If an angle is occluded or cannot be assessed from a side view, we say "cannot
              assess". No false confidence.
            </p>
          </div>
          <div className="bg-forge-card p-5 rounded-2xl border border-forge-border">
            <FileText className="text-forge-red mb-3" size={24} />
            <h3 className="font-display font-bold text-lg uppercase mb-1">YAML Skill Engine</h3>
            <p className="text-forge-grey text-xs leading-relaxed">
              Assessment logic is decoupled from code. Edit the YAML rules at runtime to re-tune
              coaching thresholds without redeploying.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
