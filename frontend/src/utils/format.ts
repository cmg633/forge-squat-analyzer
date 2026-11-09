// ─── Angle ────────────────────────────────────────────────────────────────────

export function formatAngle(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${Math.round(value)}°`;
}

// ─── Offset / distance ────────────────────────────────────────────────────────

export function formatDistance(value: number | null | undefined, unit = 'cm'): string {
  if (value == null) return '—';
  return `${value.toFixed(1)} ${unit}`;
}

// ─── Generic metric value with unit ───────────────────────────────────────────

export function formatMetric(value: number | null | undefined, unit: string): string {
  if (value == null) return '—';
  if (unit === '°' || unit === 'deg') return `${Math.round(value)}°`;
  if (unit === 'cm' || unit === 'mm') return `${value.toFixed(1)} ${unit}`;
  if (unit === '%') return `${Math.round(value)}%`;
  return `${value.toFixed(2)} ${unit}`;
}

// ─── Score (0–100) ────────────────────────────────────────────────────────────

export function formatScore(score: number | null | undefined): string {
  if (score == null) return '—';
  return `${Math.round(score)}`;
}

// ─── Duration ─────────────────────────────────────────────────────────────────

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

// ─── Timestamp ────────────────────────────────────────────────────────────────

export function formatTimestamp(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

// ─── Relative time ────────────────────────────────────────────────────────────

export function formatRelative(isoString: string | null | undefined): string {
  if (!isoString) return '—';
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatTimestamp(isoString);
  } catch {
    return isoString;
  }
}

// ─── Confidence ───────────────────────────────────────────────────────────────

export function formatConfidence(confidence: number | null | undefined): string {
  if (confidence == null) return '—';
  return `${Math.round(confidence * 100)}%`;
}

// ─── Progress stage label ─────────────────────────────────────────────────────

export const STAGE_LABELS: Record<string, string> = {
  uploading: 'Uploading video',
  validating: 'Validating footage',
  tracking_pose: 'Tracking pose',
  tracking_bar: 'Tracking barbell',
  counting_reps: 'Counting reps',
  assessing: 'Assessing technique',
  rendering: 'Rendering analysis',
  done: 'Complete',
  failed: 'Failed',
};

export function getStagLabel(status: string): string {
  return STAGE_LABELS[status] ?? status;
}

// ─── File size ────────────────────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
