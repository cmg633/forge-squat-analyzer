import React, { useCallback, useRef, useState } from 'react';
import { Upload, Film, AlertTriangle, Check } from 'lucide-react';
import { formatFileSize } from '../utils/format';

interface UploadZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
  accept?: string;
}

const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mov'];
const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB (matches backend MAX_FILE_MB)

function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.(mp4|mov|webm)$/i)) {
    return 'Unsupported format. Please upload an MP4, MOV, or WebM video.';
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `File is too large (${formatFileSize(file.size)}). Maximum size is 100 MB.`;
  }
  return null;
}

export default function UploadZone({ onFile, disabled = false, accept = 'video/*' }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleFile = useCallback(
    (file: File) => {
      const err = validateFile(file);
      if (err) {
        setValidationError(err);
        return;
      }
      setValidationError(null);
      setIsAccepted(true);

      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(40);
        } catch {
          // ignore if denied
        }
      }

      setTimeout(() => {
        onFile(file);
      }, 250);
    },
    [onFile],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile],
  );

  const onDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragging(true);
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    },
    [disabled],
  );

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = '';
    },
    [handleFile],
  );

  return (
    <div className="w-full space-y-3">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onMouseMove={onMouseMove}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`relative p-6 sm:p-12 border border-dashed transition-colors duration-150 cursor-pointer select-none overflow-hidden ${
          isAccepted
            ? 'bg-[#CCFF00] border-[#0A0A0A] text-[#0A0A0A]'
            : isDragging
            ? 'border-[#CCFF00] bg-[#CCFF00]/10'
            : 'border-[var(--hairline)] bg-[var(--card-bg)] hover:border-[#CCFF00]'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload side-view squat video"
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        {/* Figma Corner Squares */}
        <span aria-hidden="true" className="absolute top-0 left-0 w-2 h-2 bg-[#CCFF00]" />
        <span aria-hidden="true" className="absolute top-0 right-0 w-2 h-2 bg-[#CCFF00]" />
        <span aria-hidden="true" className="absolute bottom-0 left-0 w-2 h-2 bg-[#CCFF00]" />
        <span aria-hidden="true" className="absolute bottom-0 right-0 w-2 h-2 bg-[#CCFF00]" />

        {/* Subtle Pointer Dot-Matrix Reveal */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none dot-matrix opacity-40"
          style={{
            maskImage: `radial-gradient(circle 160px at ${mousePos.x}px ${mousePos.y}px, black 25%, transparent 80%)`,
            WebkitMaskImage: `radial-gradient(circle 160px at ${mousePos.x}px ${mousePos.y}px, black 25%, transparent 80%)`,
          }}
        />

        <div className="relative z-10 flex flex-col items-center justify-center text-center gap-4">
          {isAccepted ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Check size={28} />
              <div className="type-h3 text-[#0A0A0A]">Clip ready. Starting analysis…</div>
            </div>
          ) : isDragging ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Upload size={28} className="text-[#CCFF00]" />
              <div className="type-h3 text-[#CCFF00]">Release to upload clip</div>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 border border-[var(--hairline)] bg-[var(--bg)] flex items-center justify-center text-[#CCFF00]">
                <Upload size={20} />
              </div>

              <div className="space-y-1">
                <div className="font-display font-black text-xl sm:text-3xl uppercase tracking-tight leading-tight">
                  Drop a side-view squat video
                </div>
                <p className="type-small text-[var(--text)]/65">
                  Drag a file here, browse your device, or record a clip directly.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <span className="btn btn-md btn-primary">Choose video</span>

                <label
                  htmlFor="camera-capture"
                  className="btn btn-md btn-secondary"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Film size={14} />
                  <span>Record video</span>
                </label>
                <input
                  id="camera-capture"
                  type="file"
                  accept="video/*"
                  capture="environment"
                  className="hidden"
                  onChange={onInputChange}
                  disabled={disabled}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onInputChange}
        disabled={disabled}
        aria-hidden="true"
      />

      {validationError && (
        <div
          className="flex items-start gap-3 p-4 border border-[#F040B8] bg-[#F040B8]/10 text-[#F040B8] type-small"
          role="alert"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div>
            <div className="type-eyebrow text-[#F040B8] mb-1">Invalid file</div>
            <div>{validationError}</div>
          </div>
        </div>
      )}
    </div>
  );
}
