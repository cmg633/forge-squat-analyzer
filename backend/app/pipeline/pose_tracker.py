"""
Pipeline module 3: Pose tracking with MediaPipe.
Runs per-frame landmark extraction with visibility scores.
Applies Savitzky-Golay smoothing.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import numpy as np
from scipy.signal import savgol_filter

logger = logging.getLogger(__name__)

def _find_task_model_path() -> Path:
    candidates = [
        Path(__file__).parent / "pose_landmarker_full.task",
        Path.cwd() / "backend" / "app" / "pipeline" / "pose_landmarker_full.task",
    ]
    for c in candidates:
        if c.exists():
            return c
    return candidates[0]

LANDMARK_NAMES = {
    0: "NOSE",
    1: "LEFT_EYE_INNER",
    2: "LEFT_EYE",
    3: "LEFT_EYE_OUTER",
    4: "RIGHT_EYE_INNER",
    5: "RIGHT_EYE",
    6: "RIGHT_EYE_OUTER",
    7: "LEFT_EAR",
    8: "RIGHT_EAR",
    9: "MOUTH_LEFT",
    10: "MOUTH_RIGHT",
    11: "LEFT_SHOULDER",
    12: "RIGHT_SHOULDER",
    13: "LEFT_ELBOW",
    14: "RIGHT_ELBOW",
    15: "LEFT_WRIST",
    16: "RIGHT_WRIST",
    17: "LEFT_PINKY",
    18: "RIGHT_PINKY",
    19: "LEFT_INDEX",
    20: "RIGHT_INDEX",
    21: "LEFT_THUMB",
    22: "RIGHT_THUMB",
    23: "LEFT_HIP",
    24: "RIGHT_HIP",
    25: "LEFT_KNEE",
    26: "RIGHT_KNEE",
    27: "LEFT_ANKLE",
    28: "RIGHT_ANKLE",
    29: "LEFT_HEEL",
    30: "RIGHT_HEEL",
    31: "LEFT_FOOT_INDEX",
    32: "RIGHT_FOOT_INDEX",
}


def track_pose(video_path: str) -> Tuple[List[Optional[List]], dict]:
    """
    Run MediaPipe Pose on every frame of the video.

    Returns:
        (raw_landmarks_per_frame, metadata)
        Each entry is either None (not detected) or a list of 33 landmark objects.
    """
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    logger.info(f"Pose tracking: {total_frames} frames at {fps:.1f} fps")

    all_landmarks = []
    model_path = str(_find_task_model_path())

    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.PoseLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    with vision.PoseLandmarker.create_from_options(options) as landmarker:
        frame_idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            timestamp_ms = int((frame_idx / (fps if fps > 0 else 30)) * 1000)
            res = landmarker.detect_for_video(mp_image, timestamp_ms)
            if res.pose_landmarks and len(res.pose_landmarks) > 0:
                all_landmarks.append(res.pose_landmarks[0])
            else:
                all_landmarks.append(None)
            frame_idx += 1

    cap.release()

    detection_rate = sum(1 for l in all_landmarks if l is not None) / max(len(all_landmarks), 1)
    logger.info(f"Pose detection rate: {detection_rate:.1%} ({len(all_landmarks)} frames)")

    metadata = {
        "total_frames": len(all_landmarks),
        "frames_with_pose": sum(1 for l in all_landmarks if l is not None),
        "detection_rate": detection_rate,
        "fps": fps,
    }

    return all_landmarks, metadata


def smooth_landmarks(all_landmarks: List[Optional[List]], fps: float) -> List[Optional[dict]]:
    """
    Apply Savitzky-Golay smoothing to landmark trajectories.

    Returns:
        List of dicts: {landmark_name: {x, y, z, visibility}} per frame,
        or None where no landmarks detected.
    """
    n_frames = len(all_landmarks)
    n_landmarks = 33

    # Build per-landmark time series
    xs = np.full((n_frames, n_landmarks), np.nan)
    ys = np.full((n_frames, n_landmarks), np.nan)
    zs = np.full((n_frames, n_landmarks), np.nan)
    vs = np.full((n_frames, n_landmarks), np.nan)

    for fi, lm_list in enumerate(all_landmarks):
        if lm_list is None:
            continue
        for li in range(n_landmarks):
            if li < len(lm_list):
                lm = lm_list[li]
                xs[fi, li] = lm.x
                ys[fi, li] = lm.y
                zs[fi, li] = lm.z
                vs[fi, li] = lm.visibility

    # Determine window for SG filter (must be odd, at least 5 frames)
    window = max(5, int(fps * 0.1))
    if window % 2 == 0:
        window += 1
    window = min(window, n_frames if n_frames % 2 == 1 else n_frames - 1)
    window = max(window, 5)
    polyorder = min(2, window - 1)

    # Smooth each coordinate
    smoothed_xs = _smooth_series(xs, window, polyorder)
    smoothed_ys = _smooth_series(ys, window, polyorder)
    # z and visibility: not smoothed (less critical)

    # Reconstruct per-frame dict
    result = []
    for fi in range(n_frames):
        if all_landmarks[fi] is None and np.all(np.isnan(smoothed_xs[fi])):
            result.append(None)
            continue
        frame_lms = {}
        for li, name in LANDMARK_NAMES.items():
            frame_lms[name] = {
                "x": float(smoothed_xs[fi, li]) if not np.isnan(smoothed_xs[fi, li]) else 0.0,
                "y": float(smoothed_ys[fi, li]) if not np.isnan(smoothed_ys[fi, li]) else 0.0,
                "z": float(zs[fi, li]) if not np.isnan(zs[fi, li]) else 0.0,
                "visibility": float(vs[fi, li]) if not np.isnan(vs[fi, li]) else 0.0,
            }
        result.append(frame_lms)

    return result


def _smooth_series(data: np.ndarray, window: int, polyorder: int) -> np.ndarray:
    """Apply SG filter to each landmark column, interpolating NaNs first."""
    out = data.copy()
    for col in range(data.shape[1]):
        series = data[:, col]
        # Interpolate NaNs
        nans = np.isnan(series)
        if nans.all():
            continue
        if nans.any():
            x = np.arange(len(series))
            series = np.interp(x, x[~nans], series[~nans])
        try:
            if len(series) >= window:
                series = savgol_filter(series, window, polyorder)
        except Exception:
            pass  # keep interpolated values
        out[:, col] = series
    return out

