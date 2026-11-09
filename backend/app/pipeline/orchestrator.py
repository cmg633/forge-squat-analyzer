"""
Pipeline orchestrator.
Ties together all pipeline stages and manages job state transitions.
"""
from __future__ import annotations

import json
import logging
import time
import traceback
from pathlib import Path
from typing import Optional

from app.config import settings
from app.jobs import job_store, update_job_status, JobStatus
from app.pipeline.ingest import ingest_video
from app.pipeline.quality_gate import run_quality_gate
from app.pipeline.pose_tracker import track_pose, smooth_landmarks
from app.pipeline.bar_tracker import track_bar
from app.pipeline.rep_detector import detect_reps
from app.pipeline.metrics import compute_metrics
from app.pipeline.skill_engine import load_skill, assess_rep
from app.pipeline.coaching_agent import generate_coaching
from app.pipeline.renderer import render_annotated_video

logger = logging.getLogger(__name__)

OUTPUT_DIR = Path(settings.OUTPUT_DIR)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


async def run_analysis_pipeline(job_id: str, video_path: str):
    """
    Main async orchestrator for the analysis pipeline.
    Updates job status at each stage.
    """
    try:
        logger.info(f"=== Pipeline start: job {job_id} ===")

        # ---- STAGE 1: Ingest ----
        update_job_status(job_id, JobStatus.VALIDATING, "Validating and normalizing video...", 0.05)
        try:
            norm_path, video_meta = ingest_video(video_path)
        except ValueError as e:
            _fail_job(job_id, str(e))
            return

        fps = video_meta["output_fps"]
        width = video_meta["output_width"]
        height = video_meta["output_height"]

        # ---- STAGE 2: Pose tracking ----
        update_job_status(job_id, JobStatus.TRACKING_POSE, "Tracking pose landmarks...", 0.15)
        raw_landmarks, pose_meta = track_pose(norm_path)
        smoothed_lms = smooth_landmarks(raw_landmarks, fps)

        # ---- STAGE 2b: Quality gate ----
        update_job_status(job_id, JobStatus.VALIDATING, "Running quality gate checks...", 0.30)
        gate_passed, gate_details = run_quality_gate(raw_landmarks, video_meta)
        gate_result = {
            "passed": gate_passed,
            "reason": " | ".join(gate_details.get("failures", [])) or None,
            "is_side_view": gate_details.get("side_view", {}).get("is_side_view", True),
            "full_body_visible": gate_details.get("full_body", {}).get("frame_coverage", 0) >= 0.60,
            "landmark_visibility_ok": gate_details.get("visibility", {}).get("avg_visibility", 0) >= 0.5,
            "camera_steady": gate_details.get("camera_steadiness", {}).get("median_frame_drift_normalized", 0) <= 0.03,
            "details": gate_details,
        }

        if not gate_passed:
            # We continue with analysis but mark it as degraded
            logger.warning(f"Quality gate failed: {gate_details['failures']}")

        # ---- STAGE 3: Bar tracking ----
        update_job_status(job_id, JobStatus.TRACKING_BAR, "Tracking barbell...", 0.45)
        bar_path = track_bar(norm_path, smoothed_lms)

        # ---- STAGE 4: Rep detection ----
        update_job_status(job_id, JobStatus.COUNTING_REPS, "Detecting reps...", 0.60)
        reps = detect_reps(smoothed_lms, fps)

        if not reps:
            _fail_job(job_id,
                "No squat reps detected. Please ensure the video shows at least one full "
                "squat rep (descent to bottom and return to standing), recorded from a side view "
                "with the full body visible."
            )
            return

        # ---- STAGE 5: Metrics + Assessment ----
        update_job_status(job_id, JobStatus.ASSESSING, "Computing metrics and assessing...", 0.70)
        skill = load_skill()
        all_findings = []
        per_rep_metrics = {}

        for rep in reps:
            rep_metrics = compute_metrics(rep, smoothed_lms, bar_path, width, height)
            per_rep_metrics[rep["rep_number"]] = {
                k: {
                    "value": v.get("value"),
                    "unit": v.get("unit", ""),
                    "confidence": v.get("confidence", 0),
                    "is_estimated": v.get("is_estimated", False),
                    "observation_note": v.get("observation_note", ""),
                }
                for k, v in rep_metrics.items()
            }
            rep_findings = assess_rep(rep["rep_number"], rep, rep_metrics, skill)
            all_findings.extend(rep_findings)

        # ---- STAGE 6: Coaching ----
        coaching = generate_coaching(all_findings, per_rep_metrics, skill)

        # ---- STAGE 7: Render annotated video ----
        update_job_status(job_id, JobStatus.RENDERING, "Rendering annotated video...", 0.85)
        annotated_path = str(OUTPUT_DIR / f"{job_id}_annotated.mp4")
        render_annotated_video(norm_path, annotated_path, smoothed_lms, bar_path, reps, video_meta)

        # ---- STAGE 8: Save results ----
        result = {
            "job_id": job_id,
            "filename": job_store.get(job_id, {}).filename if hasattr(job_store.get(job_id, {}), 'filename') else "upload",
            "video_duration_s": video_meta["duration_s"],
            "video_fps": float(fps),
            "frame_width": width,
            "frame_height": height,
            "total_frames": video_meta["output_total_frames"],
            "reps": reps,
            "findings": all_findings,
            "quality_gate": gate_result,
            "coaching": coaching.model_dump(),
            "per_rep_metrics": per_rep_metrics,
            "skill_version": skill.get("meta", {}).get("version", "1.0.0"),
            "pipeline_version": "1.0.0",
        }

        # Save full result JSON
        result_path = OUTPUT_DIR / f"{job_id}_result.json"
        with open(result_path, "w") as f:
            json.dump(result, f, indent=2, default=str)

        # Save per-frame data for canvas overlay
        frames_data = _build_frames_data(smoothed_lms, bar_path, reps, fps)
        frames_path = OUTPUT_DIR / f"{job_id}_frames.json"
        with open(frames_path, "w") as f:
            json.dump(frames_data, f)

        job = job_store.get(job_id)
        if job:
            job.filename = "upload"

        update_job_status(job_id, JobStatus.DONE, "Analysis complete!", 1.0)
        logger.info(f"=== Pipeline complete: job {job_id} | {len(reps)} reps | {len(all_findings)} findings ===")

    except Exception as e:
        logger.error(f"Pipeline error for job {job_id}: {e}")
        logger.error(traceback.format_exc())
        _fail_job(job_id, f"Internal error: {str(e)[:200]}")


def _fail_job(job_id: str, reason: str):
    """Mark a job as failed with a human-readable reason."""
    job = job_store.get(job_id)
    if job:
        job.status = JobStatus.FAILED
        job.status_message = reason
        job.error_reason = reason
        job.progress = 0.0
        job.updated_at = time.time()
    logger.error(f"Job {job_id} FAILED: {reason}")


def _build_frames_data(smoothed_lms, bar_path, reps, fps):
    """Build the per-frame data structure for the frontend canvas overlay."""
    # Map frame -> rep number
    frame_to_rep = {}
    for rep in reps:
        for fi in range(rep["start_frame"], rep["end_frame"] + 1):
            frame_to_rep[fi] = rep["rep_number"]

    frames = []
    for fi, lm in enumerate(smoothed_lms):
        bar = bar_path[fi] if fi < len(bar_path) else None
        frames.append({
            "frame_index": fi,
            "timestamp_s": fi / fps,
            "landmarks": lm,
            "bar": bar,
            "rep_number": frame_to_rep.get(fi),
            "is_bottom": any(rep["bottom_frame"] == fi for rep in reps),
            "is_standing": any(
                rep["start_frame"] == fi or rep["end_frame"] == fi for rep in reps
            ),
        })

    return {"frames": frames, "total_frames": len(frames), "fps": fps}

