"""
Pipeline module 5: Rep detection.
Detects individual squat reps from smoothed hip-Y trajectory
using scipy find_peaks on the descent (troughs = bottom of squat).
"""
from __future__ import annotations

import logging
from typing import List, Optional, Tuple

import numpy as np
from scipy.signal import find_peaks, savgol_filter

logger = logging.getLogger(__name__)


def detect_reps(
    smoothed_landmarks: List[Optional[dict]],
    fps: float,
) -> List[dict]:
    """
    Detect squat reps from the hip Y trajectory.

    Strategy:
    - Extract hip midpoint Y coordinate (image coords: 0=top, 1=bottom).
    - Squatting DOWN = hip Y INCREASES (goes towards bottom of frame).
    - Bottom of squat = local MAXIMUM in hip Y.
    - Find peaks in hip Y = bottoms of squats.
    - For each bottom, find nearest preceding standing (local minimum)
      and nearest following standing.

    Returns:
        List of rep dicts: {rep_number, start_frame, bottom_frame, end_frame,
                             start_timestamp_s, bottom_timestamp_s, end_timestamp_s, duration_s}
    """
    n = len(smoothed_landmarks)
    hip_y = np.full(n, np.nan)

    for i, lm in enumerate(smoothed_landmarks):
        if lm is None:
            continue
        try:
            lh_y = lm["LEFT_HIP"]["y"]
            rh_y = lm["RIGHT_HIP"]["y"]
            lh_v = lm["LEFT_HIP"]["visibility"]
            rh_v = lm["RIGHT_HIP"]["visibility"]
            if lh_v > 0.3 and rh_v > 0.3:
                hip_y[i] = (lh_y + rh_y) / 2
            elif lh_v > 0.3:
                hip_y[i] = lh_y
            elif rh_v > 0.3:
                hip_y[i] = rh_y
        except (KeyError, TypeError):
            continue

    # Interpolate NaN gaps
    nans = np.isnan(hip_y)
    if nans.all():
        logger.warning("All hip_y values are NaN — cannot detect reps.")
        return []

    if nans.any():
        x = np.arange(n)
        hip_y = np.interp(x, x[~nans], hip_y[~nans])

    # Light smoothing scaled to fps so 15fps preserves rapid transitions
    win = max(3, int(round(fps * 0.13)))
    if win % 2 == 0:
        win += 1
    win = min(win, n if n % 2 == 1 else n - 1)
    win = max(win, 3)
    try:
        hip_y_smooth = savgol_filter(hip_y, win, min(2, win - 1)) if n >= win else hip_y
    except Exception:
        hip_y_smooth = hip_y

    # Find bottoms (peaks in hip_y = hip descending furthest)
    min_distance = int(fps * 0.8)   # min 0.8 seconds between reps
    prominence = float(np.std(hip_y_smooth) * 0.3)  # dynamic prominence scaled for 15fps

    bottoms, props = find_peaks(
        hip_y_smooth,
        distance=max(min_distance, 5),
        prominence=max(prominence, 0.05),
        width=max(1, int(fps * 0.08)),
    )

    logger.info(f"Detected {len(bottoms)} rep bottoms at frames: {bottoms.tolist()}")

    if len(bottoms) == 0:
        logger.warning("No rep bottoms detected. Check video content.")
        return []

    # For each bottom, find start and end (standing positions)
    reps = []
    for rep_num, bottom_frame in enumerate(bottoms, start=1):
        # Standing before: find the local minimum BEFORE the bottom
        # (hip is highest = y is smallest)
        start_frame = _find_standing_before(hip_y_smooth, bottom_frame)
        end_frame = _find_standing_after(hip_y_smooth, bottom_frame, n)

        reps.append({
            "rep_number": rep_num,
            "start_frame": int(start_frame),
            "bottom_frame": int(bottom_frame),
            "end_frame": int(end_frame),
            "start_timestamp_s": float(start_frame / fps),
            "bottom_timestamp_s": float(bottom_frame / fps),
            "end_timestamp_s": float(end_frame / fps),
            "duration_s": float((end_frame - start_frame) / fps),
            "hip_y_at_bottom": float(hip_y_smooth[bottom_frame]),
            "hip_y_at_standing": float(hip_y_smooth[start_frame]),
            "depth_delta_y": float(hip_y_smooth[bottom_frame] - hip_y_smooth[start_frame]),
        })

    logger.info(f"Rep detection complete: {len(reps)} reps")
    return reps


def has_squat_pattern(
    reps: List[dict],
    smoothed_landmarks: List[Optional[dict]],
) -> Tuple[bool, str]:
    """
    Verify candidate reps represent an actual squat pattern rather than walking or standing sway.
    Checks meaningful vertical hip drop (>= 0.08 normalized) and, when knees/ankles are visible,
    genuine knee flexion (<= 135 deg) in at least one rep.
    """
    if not reps:
        return False, "Cannot assess: no squat pattern detected."

    from app.pipeline.metrics import _compute_knee_angle

    max_drop = max((r.get("depth_delta_y", 0.0) for r in reps), default=0.0)
    if max_drop < 0.08:
        return False, "Cannot assess: no squat pattern detected (insufficient hip descent)."

    knee_angles = []
    for rep in reps:
        bf = rep["bottom_frame"]
        lm = smoothed_landmarks[bf] if bf < len(smoothed_landmarks) else None
        if lm is not None:
            kn = _compute_knee_angle(lm)
            if kn.get("value") is not None:
                knee_angles.append(float(kn["value"]))

    if knee_angles and min(knee_angles) > 135.0:
        return (
            False,
            "Cannot assess: no squat pattern detected (lifter appears upright or walking rather than squatting).",
        )

    return True, "OK"


def _find_standing_before(hip_y: np.ndarray, bottom: int) -> int:
    """Find the frame of best standing position before the bottom."""
    if bottom == 0:
        return 0
    search_start = max(0, bottom - len(hip_y) // 3)
    segment = hip_y[search_start:bottom]
    if len(segment) == 0:
        return max(0, bottom - 10)
    # Standing = minimum hip_y (hip highest)
    local_min = int(np.argmin(segment))
    return search_start + local_min


def _find_standing_after(hip_y: np.ndarray, bottom: int, n: int) -> int:
    """Find the frame of best standing position after the bottom."""
    if bottom >= n - 1:
        return n - 1
    search_end = min(n, bottom + (n - bottom) // 2)
    segment = hip_y[bottom:search_end]
    if len(segment) == 0:
        return min(n - 1, bottom + 10)
    local_min = int(np.argmin(segment))
    return bottom + local_min

