import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Film, AlertTriangle } from 'lucide-react';
import { formatFileSize } from '../utils/format';

interface UploadZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
  accept?: string;
}

const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mov'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.(mp4|mov|avi|webm)$/i)) {
    return 'Please upload an MP4, MOV, AVI, or WebM video file.';
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `File is too large (${formatFileSize(file.size)}). Maximum size is 2 GB.`;
  }
  return null;
}

export default function UploadZone({ onFile, disabled = false, accept = 'video/*' }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      const err = validateFile(file);
      if (err) {
        setValidationError(err);
        return;
      }
      setValidationError(null);
      onFile(file);
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

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

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
      <motion.div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        animate={{
          borderColor: isDragging
            ? 'rgba(224,58,30,0.6)'
            : validationError
            ? 'rgba(224,58,30,0.4)'
            : 'rgba(34,34,34,1)',
          boxShadow: isDragging ? '0 0 32px rgba(224,58,30,0.2)' : 'none',
        }}
        transition={{ duration: 0.2 }}
        className={`
          relative rounded-2xl border-2 border-dashed p-10
          flex flex-col items-center justify-center gap-5 text-center
          cursor-pointer select-none transition-opacity
          ${disabled ? 'opacity-50 pointer-events-none' : 'hover:border-forge-red/40'}
        `}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload squat video — click or drag a file here"
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      >
        {/* Background grain overlay */}
        <div className="absolute inset-0 bg-grain rounded-2xl opacity-30 pointer-events-none" />

        <AnimatePresence mode="wait">
          {isDragging ? (
            <motion.div
              key="dragging"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 rounded-2xl bg-forge-red/10 border border-forge-red/30 flex items-center justify-center">
                <Film size={32} className="text-forge-red" />
              </div>
              <p className="display-heading text-2xl text-forge-red">DROP IT</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-forge-surface border border-forge-border flex items-center justify-center transition-all group-hover:border-forge-red/30">
                <Upload size={28} className="text-forge-grey" />
              </div>

              <div className="space-y-1">
                <p className="display-heading text-2xl sm:text-3xl text-white">
                  DRAG YOUR VIDEO HERE
                </p>
                <p className="text-forge-grey text-sm">or tap to browse files</p>
              </div>

              <div className="flex flex-wrap justify-center gap-2 text-forge-grey/60 text-xs">
                <span>MP4 · MOV · AVI · WebM</span>
                <span>·</span>
                <span>Up to 2 GB</span>
              </div>

              {/* Mobile camera capture */}
              <label
                htmlFor="camera-capture"
                className="mt-1 flex items-center gap-2 px-4 py-2 rounded-lg bg-forge-surface border border-forge-border text-forge-grey text-sm font-medium hover:border-forge-red/40 hover:text-white transition-colors cursor-pointer"
                onClick={e => e.stopPropagation()}
              >
                <Film size={15} />
                Record with camera
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
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Hidden main file input */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onInputChange}
        disabled={disabled}
        aria-hidden="true"
      />

      {/* Validation error */}
      <AnimatePresence>
        {validationError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-start gap-2 px-4 py-3 rounded-lg bg-forge-red/10 border border-forge-red/30 text-forge-red text-sm"
            role="alert"
          >
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>{validationError}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
