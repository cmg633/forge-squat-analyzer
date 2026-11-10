"""
Unit tests for the Forge Squat Analyser backend.
Covers: metrics, rep detection, skill engine, quality gate.
"""
import math
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import numpy as np
import pytest

from app.pipeline.metrics import (
    _angle_between,
    _compute_depth,
    _compute_back_angle,
    _compute_knee_angle,
    _compute_hip_drive,
    _compute_gaze,
    _cannot_assess,
)
from app.pipeline.rep_detector import detect_reps, _find_standing_before, _find_standing_after
from app.pipeline.skill_engine import assess_rep, load_skill, _assess_criterion


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_lm(overrides: dict) -> dict:
    """Make a fake landmark dict with default values."""
    defaults = {
        name: {"x": 0.5, "y": 0.5, "z": 0.0, "visibility": 0.9}
        for name in [
            "NOSE", "LEFT_EYE_INNER", "LEFT_EYE", "LEFT_EYE_OUTER",
            "RIGHT_EYE_INNER", "RIGHT_EYE", "RIGHT_EYE_OUTER",
            "LEFT_EAR", "RIGHT_EAR", "MOUTH_LEFT", "MOUTH_RIGHT",
            "LEFT_SHOULDER", "RIGHT_SHOULDER", "LEFT_ELBOW", "RIGHT_ELBOW",
            "LEFT_WRIST", "RIGHT_WRIST", "LEFT_PINKY", "RIGHT_PINKY",
            "LEFT_INDEX", "RIGHT_INDEX", "LEFT_THUMB", "RIGHT_THUMB",
            "LEFT_HIP", "RIGHT_HIP", "LEFT_KNEE", "RIGHT_KNEE",
            "LEFT_ANKLE", "RIGHT_ANKLE", "LEFT_HEEL", "RIGHT_HEEL",
            "LEFT_FOOT_INDEX", "RIGHT_FOOT_INDEX",
        ]
    }
    for key, val in overrides.items():
        defaults[key] = {**defaults[key], **val}
    return defaults


# ---------------------------------------------------------------------------
# 1. Metric: angle_between
# ---------------------------------------------------------------------------

class TestAngleBetween:
    def test_right_angle(self):
        a = (0, 1); b = (0, 0); c = (1, 0)
        angle = _angle_between(a, b, c)
        assert abs(angle - 90.0) < 0.01

    def test_straight_line(self):
        a = (-1, 0); b = (0, 0); c = (1, 0)
        angle = _angle_between(a, b, c)
        assert abs(angle - 180.0) < 0.01

    def test_acute_angle(self):
        a = (1, 0); b = (0, 0); c = (1, 1)
        angle = _angle_between(a, b, c)
        assert abs(angle - 45.0) < 0.01


# ---------------------------------------------------------------------------
# 2. Metric: depth
# ---------------------------------------------------------------------------

class TestDepthMetric:
    def test_hip_below_knee_meets_standard(self):
        """Hip y > knee y in image coords = depth achieved."""
        lm = _make_lm({
            "LEFT_HIP": {"y": 0.60, "visibility": 0.9},
            "RIGHT_HIP": {"y": 0.60, "visibility": 0.9},
            "LEFT_KNEE": {"y": 0.55, "visibility": 0.9},
            "RIGHT_KNEE": {"y": 0.55, "visibility": 0.9},
        })
        result = _compute_depth(lm, 1080)
        assert result["value"] is not None
        assert result["value"] > 0  # positive = hip below knee
        assert result["is_estimated"] is True

    def test_hip_above_knee_no_depth(self):
        """Hip y < knee y = above parallel."""
        lm = _make_lm({
            "LEFT_HIP": {"y": 0.45, "visibility": 0.9},
            "RIGHT_HIP": {"y": 0.45, "visibility": 0.9},
            "LEFT_KNEE": {"y": 0.55, "visibility": 0.9},
            "RIGHT_KNEE": {"y": 0.55, "visibility": 0.9},
        })
        result = _compute_depth(lm, 1080)
        assert result["value"] is not None
        assert result["value"] < 0  # negative = hip above knee

    def test_no_landmarks_cannot_assess(self):
        result = _compute_depth(None, 1080)
        assert result["value"] is None

    def test_low_visibility_cannot_assess(self):
        lm = _make_lm({
            "LEFT_HIP": {"visibility": 0.1},
            "RIGHT_HIP": {"visibility": 0.1},
            "LEFT_KNEE": {"visibility": 0.1},
            "RIGHT_KNEE": {"visibility": 0.1},
        })
        result = _compute_depth(lm, 1080)
        assert result["value"] is None


# ---------------------------------------------------------------------------
# 3. Metric: back angle
# ---------------------------------------------------------------------------

class TestBackAngle:
    def test_45_degree_torso(self):
        """Shoulder above and to the left of hip by equal amounts = 45°."""
        lm = _make_lm({
            "LEFT_SHOULDER": {"x": 0.3, "y": 0.3, "visibility": 0.9},
            "RIGHT_SHOULDER": {"x": 0.3, "y": 0.3, "visibility": 0.9},
            "LEFT_HIP": {"x": 0.5, "y": 0.5, "visibility": 0.9},
            "RIGHT_HIP": {"x": 0.5, "y": 0.5, "visibility": 0.9},
        })
        result = _compute_back_angle(lm)
        assert result["value"] is not None
        assert abs(result["value"] - 45.0) < 2.0

    def test_vertical_torso_90_degrees(self):
        """Shoulder directly above hip = 90°."""
        lm = _make_lm({
            "LEFT_SHOULDER": {"x": 0.5, "y": 0.2, "visibility": 0.9},
            "RIGHT_SHOULDER": {"x": 0.5, "y": 0.2, "visibility": 0.9},
            "LEFT_HIP": {"x": 0.5, "y": 0.6, "visibility": 0.9},
            "RIGHT_HIP": {"x": 0.5, "y": 0.6, "visibility": 0.9},
        })
        result = _compute_back_angle(lm)
        assert result["value"] is not None
        assert abs(result["value"] - 90.0) < 1.0

    def test_none_lm(self):
        result = _compute_back_angle(None)
        assert result["value"] is None


# ---------------------------------------------------------------------------
# 4. Metric: knee angle
# ---------------------------------------------------------------------------

class TestKneeAngle:
    def test_right_angle_knee(self):
        """90° knee: hip above knee, ankle to the side."""
        lm = _make_lm({
            "LEFT_HIP": {"x": 0.5, "y": 0.3, "visibility": 0.9},
            "LEFT_KNEE": {"x": 0.5, "y": 0.5, "visibility": 0.9},
            "LEFT_ANKLE": {"x": 0.6, "y": 0.5, "visibility": 0.9},
        })
        result = _compute_knee_angle(lm)
        assert result["value"] is not None
        assert abs(result["value"] - 90.0) < 5.0

    def test_straight_knee(self):
        """180° knee: hip, knee, ankle all in vertical line."""
        lm = _make_lm({
            "LEFT_HIP": {"x": 0.5, "y": 0.3, "visibility": 0.9},
            "LEFT_KNEE": {"x": 0.5, "y": 0.5, "visibility": 0.9},
            "LEFT_ANKLE": {"x": 0.5, "y": 0.7, "visibility": 0.9},
        })
        result = _compute_knee_angle(lm)
        assert result["value"] is not None
        assert abs(result["value"] - 180.0) < 2.0


# ---------------------------------------------------------------------------
# 5. Rep detection
# ---------------------------------------------------------------------------

class TestRepDetection:
    def _make_hip_signal(self, fps=30):
        """Create a synthetic hip-y signal with 3 clear reps."""
        # 10 seconds at 30 fps
        t = np.linspace(0, 10, int(10 * fps))
        # 3 reps: standing (y=0.4) → squat (y=0.65) → standing
        signal = 0.4 + 0.25 * np.maximum(0, np.sin(np.pi * t / 3)) ** 2
        return signal

    def _lm_from_signal(self, signal):
        """Make a list of landmark dicts from a hip-y signal."""
        lms = []
        for y in signal:
            lms.append({
                "LEFT_HIP": {"x": 0.5, "y": float(y), "z": 0.0, "visibility": 0.9},
                "RIGHT_HIP": {"x": 0.5, "y": float(y), "z": 0.0, "visibility": 0.9},
            })
        return lms

    def test_detects_reps(self):
        fps = 30
        signal = self._make_hip_signal(fps)
        lms = self._lm_from_signal(signal)
        reps = detect_reps(lms, fps)
        assert len(reps) >= 1

    def test_rep_structure(self):
        fps = 30
        signal = self._make_hip_signal(fps)
        lms = self._lm_from_signal(signal)
        reps = detect_reps(lms, fps)
        for rep in reps:
            assert "rep_number" in rep
            assert "bottom_frame" in rep
            assert "start_frame" in rep
            assert "end_frame" in rep
            assert rep["start_frame"] <= rep["bottom_frame"] <= rep["end_frame"]

    def test_no_movement_no_reps(self):
        """Flat signal (standing, no squat) should produce no reps."""
        lms = [{"LEFT_HIP": {"x": 0.5, "y": 0.4, "visibility": 0.9},
                "RIGHT_HIP": {"x": 0.5, "y": 0.4, "visibility": 0.9}} for _ in range(90)]
        reps = detect_reps(lms, 30)
        assert len(reps) == 0

    def test_all_none_no_reps(self):
        lms = [None] * 90
        reps = detect_reps(lms, 30)
        assert len(reps) == 0


# ---------------------------------------------------------------------------
# 6. Skill engine: cannot-assess paths
# ---------------------------------------------------------------------------

class TestSkillEngine:
    def _dummy_rep(self):
        return {
            "rep_number": 1,
            "start_frame": 0,
            "bottom_frame": 50,
            "end_frame": 100,
            "start_timestamp_s": 0.0,
            "bottom_timestamp_s": 1.67,
            "end_timestamp_s": 3.33,
            "duration_s": 3.33,
        }

    def test_non_side_view_criterion_cannot_assess(self):
        """STANCE_WIDTH cannot be assessed from side view."""
        skill = load_skill()
        criterion = next(c for c in skill["criteria"] if c["id"] == "STANCE_WIDTH")
        finding = _assess_criterion(criterion, 1, self._dummy_rep(), {})
        assert finding["result"] == "cannot_assess"

    def test_knee_tracking_cannot_assess(self):
        """KNEE_TRACKING cannot be assessed from side view."""
        skill = load_skill()
        criterion = next(c for c in skill["criteria"] if c["id"] == "KNEE_TRACKING")
        finding = _assess_criterion(criterion, 1, self._dummy_rep(), {})
        assert finding["result"] == "cannot_assess"

    def test_grip_cannot_assess(self):
        skill = load_skill()
        criterion = next(c for c in skill["criteria"] if c["id"] == "GRIP")
        finding = _assess_criterion(criterion, 1, self._dummy_rep(), {})
        assert finding["result"] == "cannot_assess"

    def test_depth_meets_standard(self):
        """Positive depth_px_delta should meet DEPTH_HIP_CREASE."""
        skill = load_skill()
        criterion = next(c for c in skill["criteria"] if c["id"] == "DEPTH_HIP_CREASE")
        metrics = {
            "depth_hip_vs_knee": {
                "value": 30.0,  # hip 30px below knee
                "unit": "px",
                "confidence": 0.8,
                "is_estimated": True,
                "observation_note": "test",
            }
        }
        finding = _assess_criterion(criterion, 1, self._dummy_rep(), metrics)
        assert finding["result"] == "meets_standard"

    def test_depth_does_not_meet(self):
        """Negative depth_px_delta should not meet DEPTH_HIP_CREASE."""
        skill = load_skill()
        criterion = next(c for c in skill["criteria"] if c["id"] == "DEPTH_HIP_CREASE")
        metrics = {
            "depth_hip_vs_knee": {
                "value": -50.0,  # hip 50px above knee = not deep enough
                "unit": "px",
                "confidence": 0.8,
                "is_estimated": True,
                "observation_note": "test",
            }
        }
        finding = _assess_criterion(criterion, 1, self._dummy_rep(), metrics)
        assert finding["result"] == "does_not_meet_standard"

    def test_no_metric_data_cannot_assess(self):
        """Missing metric data should produce cannot_assess."""
        skill = load_skill()
        criterion = next(c for c in skill["criteria"] if c["id"] == "DEPTH_HIP_CREASE")
        metrics = {
            "depth_hip_vs_knee": {
                "value": None,
                "unit": "",
                "confidence": 0.0,
                "is_estimated": False,
                "observation_note": "Cannot assess: missing data",
            }
        }
        finding = _assess_criterion(criterion, 1, self._dummy_rep(), metrics)
        assert finding["result"] == "cannot_assess"

    def test_back_angle_in_range(self):
        """Back angle of 45° should meet standard."""
        skill = load_skill()
        criterion = next(c for c in skill["criteria"] if c["id"] == "BACK_ANGLE_BOTTOM")
        metrics = {
            "back_angle_bottom": {
                "value": 45.0,
                "unit": "degrees",
                "confidence": 0.85,
                "is_estimated": False,
                "observation_note": "",
            }
        }
        finding = _assess_criterion(criterion, 1, self._dummy_rep(), metrics)
        assert finding["result"] == "meets_standard"

    def test_back_angle_too_low(self):
        """Back angle of 20° (very horizontal) should not meet standard."""
        skill = load_skill()
        criterion = next(c for c in skill["criteria"] if c["id"] == "BACK_ANGLE_BOTTOM")
        metrics = {
            "back_angle_bottom": {
                "value": 20.0,
                "unit": "degrees",
                "confidence": 0.85,
                "is_estimated": False,
                "observation_note": "",
            }
        }
        finding = _assess_criterion(criterion, 1, self._dummy_rep(), metrics)
        assert finding["result"] == "does_not_meet_standard"

    def test_findings_contain_required_fields(self):
        """Every finding must include source_page, result, rep_number, etc."""
        skill = load_skill()
        metrics = {
            "depth_hip_vs_knee": {"value": 20.0, "unit": "px", "confidence": 0.8,
                                   "is_estimated": True, "observation_note": ""},
            "back_angle_bottom": {"value": 45.0, "unit": "deg", "confidence": 0.9,
                                   "is_estimated": False, "observation_note": ""},
            "hip_drive": {"value": 1.0, "unit": "bool", "confidence": 0.6,
                          "is_estimated": True, "observation_note": ""},
            "eye_gaze": {"value": -5.0, "unit": "deg", "confidence": 0.5,
                         "is_estimated": True, "observation_note": ""},
            "bar_midfoot_offset": {"value": None, "unit": "", "confidence": 0.0,
                                   "is_estimated": False, "observation_note": "bar lost"},
            "bar_path_std": {"value": None, "unit": "", "confidence": 0.0,
                              "is_estimated": False, "observation_note": "bar lost"},
        }
        findings = assess_rep(1, self._dummy_rep(), metrics, skill)
        required = ["criterion_id", "result", "source_page", "rep_number", "short_explanation"]
        for f in findings:
            for field in required:
                assert field in f, f"Missing field {field} in finding {f.get('criterion_id')}"
            assert f["result"] in ("meets_standard", "does_not_meet_standard", "cannot_assess")

    def test_yaml_rule_change_changes_verdict(self):
        """
        Demonstrate hot-reload: change back angle threshold and re-evaluate.
        Uses direct criterion dict modification (simulates YAML edit).
        """
        skill = load_skill()
        # Find BACK_ANGLE_BOTTOM criterion
        criterion = next(c for c in skill["criteria"] if c["id"] == "BACK_ANGLE_BOTTOM")

        # At default ±10° (35-55°), 60° does not meet standard
        metrics = {
            "back_angle_bottom": {
                "value": 60.0, "unit": "deg", "confidence": 0.9,
                "is_estimated": False, "observation_note": "",
            }
        }
        finding_before = _assess_criterion(criterion, 1, self._dummy_rep(), metrics)
        assert finding_before["result"] == "does_not_meet_standard"

        # Temporarily modify threshold
        import copy
        modified_criterion = copy.deepcopy(criterion)
        modified_criterion["thresholds"]["BACK_ANGLE_MAX"]["value"] = 70  # widen range
        finding_after = _assess_criterion(modified_criterion, 1, self._dummy_rep(), metrics)
        assert finding_after["result"] == "meets_standard"


# ---------------------------------------------------------------------------
# 7. Quality gate
# ---------------------------------------------------------------------------

class TestQualityGate:
    from app.pipeline.quality_gate import _check_side_view, _check_full_body

    def test_front_view_fails_side_view_check(self):
        """In a front view, shoulder x-spread is large → fails side view."""
        # Mock landmark objects
        class FakeLm:
            def __init__(self, x, y, vis=0.9):
                self.x = x; self.y = y; self.visibility = vis

        class FakeList:
            def __init__(self, lms):
                self._lms = lms
            def __getitem__(self, i):
                return self._lms[i]
            def __len__(self):
                return len(self._lms)

        # Front view: left shoulder at x=0.2, right shoulder at x=0.8
        lms_per_frame = []
        for _ in range(30):
            frame_lms = [FakeLm(0.5, 0.1)] * 33  # defaults
            frame_lms[11] = FakeLm(0.2, 0.3)  # LEFT_SHOULDER
            frame_lms[12] = FakeLm(0.8, 0.3)  # RIGHT_SHOULDER
            frame_lms[23] = FakeLm(0.3, 0.6)  # LEFT_HIP
            frame_lms[24] = FakeLm(0.7, 0.6)  # RIGHT_HIP
            lms_per_frame.append(frame_lms)

        from app.pipeline.quality_gate import _check_side_view
        ok, detail = _check_side_view(lms_per_frame)
        assert not ok  # should fail (front view)
        assert detail["avg_lateral_spread_normalized"] > 0.25


# ---------------------------------------------------------------------------
# 8. End-to-End Pipeline Test on Real Clip
# ---------------------------------------------------------------------------

class TestEndToEndPipeline:
    import asyncio

    @pytest.mark.asyncio
    async def test_full_pipeline_on_real_clip(self):
        """Run the end-to-end pipeline on the common sample clip."""
        import json
        from pathlib import Path
        from app.pipeline.orchestrator import run_analysis_pipeline
        from app.jobs import job_store, JobStatus
        from app.models import AnalysisJob
        from app.config import settings

        clip_path = Path(__file__).parent / "common_sample_squat.mp4"
        if not clip_path.exists():
            pytest.skip("common_sample_squat.mp4 not found")

        job_id = "test-e2e-job-001"
        job_store[job_id] = AnalysisJob(job_id=job_id, status=JobStatus.UPLOADING)

        # Run pipeline
        await run_analysis_pipeline(job_id, str(clip_path))

        job = job_store[job_id]
        assert job.status == JobStatus.DONE, f"Pipeline failed: {job.error_reason}"

        result_path = Path(settings.OUTPUT_DIR) / f"{job_id}_result.json"
        assert result_path.exists()

        with open(result_path) as f:
            data = json.load(f)

        assert len(data["reps"]) >= 1, "Expected at least 1 rep detected in sample clip"
        assert len(data["findings"]) > 0, "Expected findings generated"
        assert "quality_gate" in data
        assert "coaching" in data
        assert data["coaching"]["summary"] != ""
        print(f"\n[E2E TEST SUCCESS] Detected {len(data['reps'])} reps, {len(data['findings'])} findings.")


class TestSafetyAndFallbacks:
    def test_coaching_fallback_without_api_key(self, monkeypatch):
        """App still produces coaching text via template when GEMINI_API_KEY is missing."""
        from app.config import settings
        from app.pipeline.coaching_agent import generate_coaching

        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
        monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "")

        findings = [
            {
                "criterion_id": "DEPTH_HIP_CREASE",
                "title": "Hip Crease Below Top of Patella",
                "result": "does_not_meet_standard",
                "short_explanation": "Hip stayed above parallel.",
                "actionable_fix": "Sit back until hip crease drops below top of knee.",
            }
        ]
        out = generate_coaching(findings, {})
        assert out.generated_by == "template"
        assert out.llm_failed is False
        assert out.summary != ""
        assert len(out.top_fixes) >= 1

    @pytest.mark.asyncio
    async def test_pipeline_internal_error_sanitized(self, monkeypatch):
        """Unhandled internal exceptions expose a friendly generic message, never raw tracebacks/lib names."""
        from app.jobs import JobStatus, job_store
        from app.models import AnalysisJob
        from app.pipeline import orchestrator

        def _boom(_path):
            raise OSError("libEGL.so.1: cannot open shared object file: No such file or directory")

        monkeypatch.setattr(orchestrator, "ingest_video", _boom)
        job_id = "test-err-sanitize-001"
        job_store[job_id] = AnalysisJob(job_id=job_id, status=JobStatus.UPLOADING)

        await orchestrator.run_analysis_pipeline(job_id, "fake.mp4")

        job = job_store[job_id]
        assert job.status == JobStatus.FAILED
        assert job.error_reason == "Something went wrong, try again"
        assert "libEGL" not in (job.error_reason or "")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

