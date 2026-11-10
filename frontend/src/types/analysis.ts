// ─── Core enums & literals ───────────────────────────────────────────────────

export type JobStatus =
  | 'uploading'
  | 'validating'
  | 'tracking_pose'
  | 'tracking_bar'
  | 'counting_reps'
  | 'assessing'
  | 'rendering'
  | 'done'
  | 'failed';

export type FindingResult =
  | 'meets_standard'
  | 'does_not_meet_standard'
  | 'cannot_assess';

// ─── Job polling ──────────────────────────────────────────────────────────────

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  status_message: string;
  progress: number; // 0–100
  error_reason?: string;
}

export interface UploadResponse {
  job_id: string;
  status: JobStatus;
}

// ─── Metric (per-rep measurement) ────────────────────────────────────────────

export interface Metric {
  value: number | null;
  unit: string;
  confidence: number; // 0–1
  is_estimated: boolean;
  observation_note?: string;
}

// ─── Per-rep metrics ─────────────────────────────────────────────────────────

export interface RepMetrics {
  rep_number: number;
  depth_hip_vs_knee: Metric;
  back_angle_bottom: Metric;
  knee_angle_bottom: Metric;
  hip_drive: Metric;
  eye_gaze: Metric;
  bar_midfoot_offset: Metric;
  bar_path_std: Metric;
}

// ─── Finding ─────────────────────────────────────────────────────────────────

export interface Finding {
  criterion_id: string;
  title: string;
  source_page: string | number;
  source_section: string;
  result: FindingResult;
  rep_number: number | null;
  frame_index: number | null;
  timestamp_s: number | null;
  observed_measurement?: Metric | string | null;
  short_explanation: string;
  actionable_fix: string;
  uncertainty_note?: string | null;
  has_implementation_assumption: boolean;
  implementation_assumption_text?: string | null;
  verbatim_quote?: string;
}

// ─── Coaching ────────────────────────────────────────────────────────────────

export interface Coaching {
  summary: string;
  top_fixes: string[];
  per_finding_advice: Record<string, string>;
  generated_by: string;
  llm_failed: boolean;
  llm_failure_reason?: string | null;
}

// ─── Quality gate ─────────────────────────────────────────────────────────────

export interface QualityGate {
  passed: boolean;
  reason?: string | null;
  is_side_view: boolean;
  full_body_visible: boolean;
  landmark_visibility_ok: boolean;
  camera_steady: boolean;
  details?: Record<string, any>;
}

export type QualityGateResult = QualityGate;

// ─── Bar path frame ───────────────────────────────────────────────────────────

export interface BarPathFrame {
  frame_index: number;
  timestamp_s: number;
  bar_x: number | null;
  bar_y: number | null;
  rep_number: number | null;
}

// ─── Landmark frame ───────────────────────────────────────────────────────────

export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface LandmarkFrame {
  frame_index: number;
  timestamp_s: number;
  landmarks: LandmarkPoint[];
  rep_number: number | null;
}

// ─── Frames response (GET /frames/:id) ───────────────────────────────────────

export interface FramesResponse {
  job_id: string;
  frames: LandmarkFrame[];
  bar_path: BarPathFrame[];
  rep_boundaries: Array<{ rep_number: number; start_frame: number; end_frame: number }>;
}

// ─── Full results response (GET /results/:id) ─────────────────────────────────

export interface AnalysisResult {
  job_id: string;
  video_filename?: string;
  filename?: string;
  total_reps?: number;
  fps?: number;
  video_fps?: number;
  frame_count?: number;
  total_frames?: number;
  duration_s?: number;
  video_duration_s?: number;
  quality_gate: QualityGate;
  reps?: Array<{
    rep_number: number;
    start_frame: number;
    bottom_frame: number;
    end_frame: number;
    start_timestamp_s: number;
    bottom_timestamp_s: number;
    end_timestamp_s: number;
    duration_s: number;
  }>;
  rep_metrics?: RepMetrics[];
  per_rep_metrics?: Record<string | number, Record<string, Metric>>;
  findings: Finding[];
  coaching: Coaching;
  overall_score?: number | null;
  processed_at?: string;
  skill_version?: string;
  pipeline_version?: string;
}

// ─── History entry (local IndexedDB) ─────────────────────────────────────────

export interface HistoryEntry {
  job_id: string;
  filename: string;
  analyzed_at: string;
  total_reps: number;
  overall_score: number | null;
  quality_gate_passed: boolean;
}
