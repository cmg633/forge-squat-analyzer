"""
Pipeline module 4: Bar tracking with OpenCV CSRT.
Tracks the barbell using CSRT tracker initialized on first frame.
Bar seed point is auto-estimated from shoulder/wrist landmarks (auto mode)
or can be provided explicitly (user-tap mode via API).
"""
from __future__ import annotations

import logging
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)


def estimate_bar_seed(first_frame: np.ndarray, landmarks: Optional[dict]) -> Optional[Tuple[int, int]]:
    """
    Auto-estimate where the bar is on the first frame.
    Strategy: bar on back squat sits at shoulder height, slightly behind the neck.
    Use shoulder midpoint as the initial estimate.

    Returns (x, y) pixel coordinates or None.
    """
    if landmarks is None:
        return None

    try:
        ls = landmarks["LEFT_SHOULDER"]
        rs = landmarks["RIGHT_SHOULDER"]
        h, w = first_frame.shape[:2]

        mid_x = int((ls["x"] + rs["x"]) / 2 * w)
        mid_y = int((ls["y"] + rs["y"]) / 2 * h)
        return (mid_x, mid_y)
    except (KeyError, TypeError):
        return None


def track_bar(
    video_path: str,
    smoothed_landmarks: List[Optional[dict]],
    seed_point: Optional[Tuple[int, int]] = None,
    seed_box_size: int = 60,
) -> List[Optional[dict]]:
    """
    Track the barbell using CSRT tracker.

    Args:
        video_path: Path to normalized video.
        smoothed_landmarks: Per-frame landmark dicts.
        seed_point: Optional (x, y) pixel coordinate to initialize tracker.
                    If None, auto-estimated from first valid landmark frame.
        seed_box_size: Size of the initial bounding box around the seed point.

    Returns:
        List of dicts per frame: {x, y, confidence, tracked}
        or None if tracker not initialized.
    """
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    # Read first frame for seed
    ret, first_frame = cap.read()
    if not ret:
        cap.release()
        logger.error("Cannot read first frame for bar tracking.")
        return [None] * total_frames

    # Find seed point
    if seed_point is None:
        # Find first frame with landmarks
        for lm in smoothed_landmarks:
            if lm is not None:
                seed_point = estimate_bar_seed(first_frame, lm)
                break

    if seed_point is None:
        logger.warning("No seed point for bar tracker — bar tracking disabled.")
        cap.release()
        return [None] * total_frames

    sx, sy = seed_point
    h, w = first_frame.shape[:2]
    half = seed_box_size // 2

    # Clamp bounding box to frame
    x0 = max(0, sx - half)
    y0 = max(0, sy - half)
    x1 = min(w, sx + half)
    y1 = min(h, sy + half)
    bbox = (x0, y0, x1 - x0, y1 - y0)

    logger.info(f"Bar tracker seed: ({sx}, {sy}) bbox={bbox}")

    # Initialize CSRT tracker
    tracker = cv2.TrackerCSRT_create()
    tracker.init(first_frame, bbox)

    bar_path = []
    # First frame result
    bar_path.append({
        "x": float(sx) / w,  # normalize to [0,1]
        "y": float(sy) / h,
        "x_px": float(sx),
        "y_px": float(sy),
        "confidence": 1.0,
        "tracked": True,
    })

    consecutive_failures = 0
    MAX_FAILURES = 10

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        success, bbox_out = tracker.update(frame)

        if success and consecutive_failures < MAX_FAILURES:
            cx = bbox_out[0] + bbox_out[2] / 2
            cy = bbox_out[1] + bbox_out[3] / 2
            consecutive_failures = 0
            bar_path.append({
                "x": float(cx) / w,
                "y": float(cy) / h,
                "x_px": float(cx),
                "y_px": float(cy),
                "confidence": 1.0,
                "tracked": True,
            })
        else:
            consecutive_failures += 1
            logger.debug(f"Bar tracker lost at frame {len(bar_path)}")
            # Extrapolate from previous or use landmark-estimated position
            if bar_path:
                prev = bar_path[-1].copy()
                prev["confidence"] = max(0.0, 1.0 - consecutive_failures * 0.1)
                prev["tracked"] = False
            else:
                prev = None
            bar_path.append(prev)

    cap.release()

    tracked_pct = sum(1 for b in bar_path if b and b["tracked"]) / max(len(bar_path), 1)
    logger.info(f"Bar tracking: {tracked_pct:.1%} frames tracked ({len(bar_path)} total)")

    # Smooth bar path with simple moving average
    bar_path = _smooth_bar_path(bar_path)

    return bar_path


def _smooth_bar_path(bar_path: List[Optional[dict]], window: int = 5) -> List[Optional[dict]]:
    """Apply a simple moving-average smoothing to bar path coordinates."""
    n = len(bar_path)
    result = bar_path.copy()

    xs = [b["x"] if b else np.nan for b in bar_path]
    ys = [b["y"] if b else np.nan for b in bar_path]

    xs_arr = np.array(xs)
    ys_arr = np.array(ys)

    # Interpolate NaNs
    for arr in [xs_arr, ys_arr]:
        nans = np.isnan(arr)
        if nans.any() and not nans.all():
            x = np.arange(n)
            arr[nans] = np.interp(x[nans], x[~nans], arr[~nans])

    # Moving average
    kernel = np.ones(window) / window
    xs_smooth = np.convolve(xs_arr, kernel, mode="same")
    ys_smooth = np.convolve(ys_arr, kernel, mode="same")

    for i, entry in enumerate(result):
        if entry is not None:
            entry["x"] = float(xs_smooth[i])
            entry["y"] = float(ys_smooth[i])

    return result


def detect_barbell_presence(smoothed_landmarks: List[Optional[dict]]) -> Tuple[bool, dict]:
    """
    Check whether the lifter holds a barbell in a squat rack posture (wrists tucked near shoulder height)
    across enough frames, distinguishing barbell squats from bodyweight squats with no bar.
    """
    checked = 0
    grip_hits = 0

    for lm in smoothed_landmarks:
        if not lm:
            continue
        ls = lm.get("LEFT_SHOULDER")
        rs = lm.get("RIGHT_SHOULDER")
        lw = lm.get("LEFT_WRIST")
        rw = lm.get("RIGHT_WRIST")
        if not (ls and rs and lw and rw):
            continue
        has_shoulder = ls.get("visibility", 0) > 0.3 or rs.get("visibility", 0) > 0.3
        has_wrist = lw.get("visibility", 0) > 0.3 or rw.get("visibility", 0) > 0.3
        if not (has_shoulder and has_wrist):
            continue

        checked += 1
        dists = []
        if lw.get("visibility", 0) > 0.3 and ls.get("visibility", 0) > 0.3 and lw["y"] <= ls["y"] + 0.10:
            dists.append(float(np.hypot(lw["x"] - ls["x"], lw["y"] - ls["y"])))
        if rw.get("visibility", 0) > 0.3 and rs.get("visibility", 0) > 0.3 and rw["y"] <= rs["y"] + 0.10:
            dists.append(float(np.hypot(rw["x"] - rs["x"], rw["y"] - rs["y"])))

        sx = (ls["x"] + rs["x"]) / 2
        sy = (ls["y"] + rs["y"]) / 2
        wx = (lw["x"] + rw["x"]) / 2
        wy = (lw["y"] + rw["y"]) / 2
        if wy <= sy + 0.10:
            dists.append(float(np.hypot(wx - sx, wy - sy)))

        if dists and min(dists) < 0.14:
            grip_hits += 1

    ratio = (grip_hits / checked) if checked > 0 else 0.0
    detected = checked >= 3 and grip_hits >= 3 and ratio >= 0.08
    return detected, {"checked_frames": checked, "grip_frames": grip_hits, "grip_ratio": round(ratio, 3)}

