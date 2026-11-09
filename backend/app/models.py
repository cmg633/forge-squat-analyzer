"""Pydantic models for API request/response shapes."""
from __future__ import annotations

import time
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

from pydantic import BaseModel, Field


class AnalysisJob(BaseModel):
    job_id: str
    status: str
    filename: str = ""
    status_message: str = ""
    progress: float = 0.0
    created_at: float = Field(default_factory=time.time)
    updated_at: float = Field(default_factory=time.time)
    error_reason: Optional[str] = None


class LandmarkPoint(BaseModel):
    x: float
    y: float
    z: float = 0.0
    visibility: float = 1.0


class BarPoint(BaseModel):
    x: float
    y: float
    confidence: float = 1.0
    tracked: bool = True


class FrameData(BaseModel):
    frame_index: int
    timestamp_s: float
    landmarks: Dict[str, LandmarkPoint]  # landmark name -> coords (normalized 0-1)
    bar: Optional[BarPoint] = None
    is_bottom: bool = False
    is_standing: bool = False


class RepData(BaseModel):
    rep_number: int
    start_frame: int
    bottom_frame: int
    end_frame: int
    start_timestamp_s: float
    bottom_timestamp_s: float
    end_timestamp_s: float
    duration_s: float


class MetricValue(BaseModel):
    value: Optional[float]
    unit: str = ""
    confidence: float = 1.0
    is_estimated: bool = False
    observation_note: str = ""


class FindingResult(str, Enum):
    MEETS = "meets_standard"
    DOES_NOT_MEET = "does_not_meet_standard"
    CANNOT_ASSESS = "cannot_assess"


class Finding(BaseModel):
    criterion_id: str
    title: str
    source_page: int
    source_section: str
    result: FindingResult
    rep_number: Optional[int] = None
    frame_index: Optional[int] = None
    timestamp_s: Optional[float] = None
    observed_measurement: Optional[MetricValue] = None
    short_explanation: str = ""
    actionable_fix: str = ""
    uncertainty_note: str = ""
    has_implementation_assumption: bool = False
    implementation_assumption_text: str = ""


class QualityGateResult(BaseModel):
    passed: bool
    reason: Optional[str] = None
    is_side_view: bool = True
    full_body_visible: bool = True
    landmark_visibility_ok: bool = True
    camera_steady: bool = True
    details: Dict[str, Any] = {}


class CoachingText(BaseModel):
    summary: str
    top_fixes: List[str]
    per_finding_advice: Dict[str, str] = {}
    generated_by: str = "template"  # "gemini" | "anthropic" | "template"
    llm_failed: bool = False
    llm_failure_reason: str = ""


class AnalysisResult(BaseModel):
    job_id: str
    filename: str
    video_duration_s: float
    video_fps: float
    frame_width: int
    frame_height: int
    total_frames: int
    reps: List[RepData]
    findings: List[Finding]
    quality_gate: QualityGateResult
    coaching: CoachingText
    per_rep_metrics: Dict[int, Dict[str, MetricValue]] = {}
    skill_version: str = "1.0.0"
    pipeline_version: str = "1.0.0"

