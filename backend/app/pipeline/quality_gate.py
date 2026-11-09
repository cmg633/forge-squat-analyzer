"""
Pipeline module 2: Quality gate.
Checks side view, full-body visibility, landmark quality, camera steadiness.
"""
from __future__ import annotations

import logging
from typing import Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

# MediaPipe landmark indices
MP_LANDMARKS = {
    "NOSE": 0,
    "LEFT_EYE": 2,
    "RIGHT_EYE": 5,
    "LEFT_EAR": 7,
    "RIGHT_EAR": 8,
    "LEFT_SHOULDER": 11,
    "RIGHT_SHOULDER": 12,
    "LEFT_ELBOW": 13,
    "RIGHT_ELBOW": 14,
    "LEFT_WRIST": 15,
    "RIGHT_WRIST": 16,
    "LEFT_HIP": 23,
    "RIGHT_HIP": 24,
    "LEFT_KNEE": 25,
    "RIGHT_KNEE": 26,
    "LEFT_ANKLE": 27,
    "RIGHT_ANKLE": 28,
    "LEFT_HEEL": 29,
    "RIGHT_HEEL": 30,
    "LEFT_FOOT_INDEX": 31,
    "RIGHT_FOOT_INDEX": 32,
}

SIDE_VIEW_MIN_X_SEP = 0.05   # shoulder/hip x-separation in normalized [0,1] coords
MIN_VIS = 0.5
MIN_FRAME_COVERAGE = 0.60
MAX_CAMERA_SWAY_NORMALIZED = 0.03   # normalized shoulder drift per frame


def run_quality_gate(
    all_landmarks: List[Optional[List]],  # per-frame landmark list (None if not detected)
    video_metadata: dict,
) -> Tuple[bool, dict]:
    """
    Run all quality checks.

    Returns:
        (passed: bool, details: dict)
        details includes per-check results and human-readable reasons.
    """
    details: Dict = {}
    failures = []

    # --- 1. Side-view check ---
    side_view_ok, side_view_detail = _check_side_view(all_landmarks)
    details["side_view"] = side_view_detail
    if not side_view_ok:
        failures.append(
            "Camera does not appear to be in a side view. "
            "The shoulder and hip must be clearly separated horizontally. "
            "Please record from directly to the side (sagittal view)."
        )

    # --- 2. Full body in frame ---
    full_body_ok, full_body_detail = _check_full_body(all_landmarks)
    details["full_body"] = full_body_detail
    if not full_body_ok:
        failures.append(
            "Full body not visible in frame for enough frames. "
            "Ensure head, hips, knees, and feet are all visible throughout the squat."
        )

    # --- 3. Landmark visibility ---
    vis_ok, vis_detail = _check_visibility(all_landmarks)
    details["visibility"] = vis_detail
    if not vis_ok:
        failures.append(
            "Key body landmarks (hips, knees, ankles) are not clearly visible. "
            "Improve lighting and avoid loose/baggy clothing."
        )

    # --- 4. Camera steadiness ---
    steady_ok, steady_detail = _check_camera_steadiness(all_landmarks)
    details["camera_steadiness"] = steady_detail
    if not steady_ok:
        failures.append(
            "Camera is moving too much during the recording. "
            "Please mount the camera on a stable tripod or surface."
        )

    passed = len(failures) == 0
    details["failures"] = failures
    details["passed"] = passed

    if failures:
        logger.warning(f"Quality gate FAILED: {failures}")
    else:
        logger.info("Quality gate PASSED.")

    return passed, details


def _check_side_view(all_landmarks: List[Optional[List]]) -> Tuple[bool, dict]:
    """
    Side-view: shoulders and hips should have significant horizontal (x) separation.
    In a true sagittal view, left and right landmarks of the same joint are
    close in x (depth collapses them). Shoulder-to-hip x-distance should be
    meaningful (torso has extent in x).
    
    More robust check: in a side view, the shoulder x and hip x should be
    separated by some amount (the torso projects onto x-axis).
    In a front view, left-shoulder and right-shoulder are separated in x.
    
    We detect: if left_shoulder.x - right_shoulder.x spread > threshold,
    it's likely a front view, not a side view.
    """
    sep_values = []
    for lm_list in all_landmarks:
        if lm_list is None:
            continue
        try:
            ls = lm_list[MP_LANDMARKS["LEFT_SHOULDER"]]
            rs = lm_list[MP_LANDMARKS["RIGHT_SHOULDER"]]
            lh = lm_list[MP_LANDMARKS["LEFT_HIP"]]
            rh = lm_list[MP_LANDMARKS["RIGHT_HIP"]]

            # In a side view, L and R shoulder x-coords are close
            shoulder_x_spread = abs(ls.x - rs.x)
            hip_x_spread = abs(lh.x - rh.x)

            # Average lateral spread of same-side landmarks
            sep_values.append((shoulder_x_spread + hip_x_spread) / 2)
        except (IndexError, AttributeError):
            continue

    if not sep_values:
        return False, {"reason": "No landmarks detected", "avg_x_spread": None}

    avg_spread = float(np.median(sep_values))
    # In side view, spread should be low (< 0.25 normalized)
    # In front view, spread is high (> 0.25 normalized)
    is_side_view = avg_spread < 0.25
    return is_side_view, {
        "avg_lateral_spread_normalized": round(avg_spread, 3),
        "threshold": 0.25,
        "is_side_view": is_side_view,
        "reason": "OK" if is_side_view else "Lateral spread too high — likely front view",
    }


def _check_full_body(all_landmarks: List[Optional[List]]) -> Tuple[bool, dict]:
    """Check that key landmarks (hip, knee, ankle, shoulder) are visible in enough frames."""
    critical = [
        MP_LANDMARKS["LEFT_HIP"], MP_LANDMARKS["RIGHT_HIP"],
        MP_LANDMARKS["LEFT_KNEE"], MP_LANDMARKS["RIGHT_KNEE"],
        MP_LANDMARKS["LEFT_ANKLE"], MP_LANDMARKS["RIGHT_ANKLE"],
        MP_LANDMARKS["LEFT_SHOULDER"], MP_LANDMARKS["RIGHT_SHOULDER"],
    ]
    good_frames = 0
    total = len(all_landmarks)
    for lm_list in all_landmarks:
        if lm_list is None:
            continue
        try:
            # At least 6/8 critical landmarks visible
            visible_count = sum(
                1 for idx in critical
                if idx < len(lm_list) and lm_list[idx].visibility > MIN_VIS
            )
            if visible_count >= 6:
                good_frames += 1
        except (AttributeError, IndexError):
            continue

    coverage = good_frames / total if total > 0 else 0
    ok = coverage >= MIN_FRAME_COVERAGE
    return ok, {
        "frame_coverage": round(coverage, 3),
        "threshold": MIN_FRAME_COVERAGE,
        "good_frames": good_frames,
        "total_frames": total,
        "reason": "OK" if ok else f"Only {coverage:.0%} of frames have full body visible",
    }


def _check_visibility(all_landmarks: List[Optional[List]]) -> Tuple[bool, dict]:
    """Check average visibility of hip and knee landmarks."""
    vis_scores = []
    key_lms = [
        MP_LANDMARKS["LEFT_HIP"], MP_LANDMARKS["RIGHT_HIP"],
        MP_LANDMARKS["LEFT_KNEE"], MP_LANDMARKS["RIGHT_KNEE"],
    ]
    for lm_list in all_landmarks:
        if lm_list is None:
            continue
        try:
            frame_vis = [lm_list[idx].visibility for idx in key_lms if idx < len(lm_list)]
            if frame_vis:
                vis_scores.append(np.mean(frame_vis))
        except (AttributeError, IndexError):
            continue

    if not vis_scores:
        return False, {"reason": "No visibility scores available"}

    avg_vis = float(np.mean(vis_scores))
    ok = avg_vis >= MIN_VIS
    return ok, {
        "avg_visibility": round(avg_vis, 3),
        "threshold": MIN_VIS,
        "reason": "OK" if ok else f"Average landmark visibility {avg_vis:.2f} < {MIN_VIS}",
    }


def _check_camera_steadiness(all_landmarks: List[Optional[List]]) -> Tuple[bool, dict]:
    """Check camera sway by measuring frame-to-frame shoulder position drift."""
    shoulder_positions = []
    for lm_list in all_landmarks:
        if lm_list is None:
            shoulder_positions.append(None)
            continue
        try:
            ls = lm_list[MP_LANDMARKS["LEFT_SHOULDER"]]
            rs = lm_list[MP_LANDMARKS["RIGHT_SHOULDER"]]
            mid_x = (ls.x + rs.x) / 2
            mid_y = (ls.y + rs.y) / 2
            shoulder_positions.append((mid_x, mid_y))
        except (IndexError, AttributeError):
            shoulder_positions.append(None)

    # Compute frame-to-frame deltas
    deltas = []
    prev = None
    for pos in shoulder_positions:
        if pos is not None and prev is not None:
            dx = pos[0] - prev[0]
            dy = pos[1] - prev[1]
            deltas.append(np.sqrt(dx**2 + dy**2))
        if pos is not None:
            prev = pos

    if not deltas:
        return True, {"reason": "Could not assess — using default pass", "avg_drift": None}

    median_drift = float(np.median(deltas))
    ok = median_drift <= MAX_CAMERA_SWAY_NORMALIZED
    return ok, {
        "median_frame_drift_normalized": round(median_drift, 4),
        "threshold": MAX_CAMERA_SWAY_NORMALIZED,
        "reason": "OK" if ok else f"Camera sway {median_drift:.4f} > threshold {MAX_CAMERA_SWAY_NORMALIZED}",
    }

