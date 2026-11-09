"""
Pipeline module 1: Video ingest and normalization.
Validates file, extracts metadata, and normalizes with OpenCV.
(ffmpeg not available; uses OpenCV for normalization.)
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Tuple

import cv2

logger = logging.getLogger(__name__)

MAX_DURATION_S = 60.0
MIN_DURATION_S = 2.0
MAX_FPS = 30
MAX_WIDTH = 1920
MAX_HEIGHT = 1080


def ingest_video(video_path: str) -> Tuple[str, dict]:
    """
    Validate and normalize a video file.

    Returns:
        (normalized_path, metadata_dict)

    Raises:
        ValueError with a human-readable message on failure.
    """
    path = Path(video_path)
    if not path.exists():
        raise ValueError(f"Video file not found: {video_path}")

    size_mb = path.stat().st_size / (1024 * 1024)
    if size_mb > 100:
        raise ValueError(f"File too large ({size_mb:.1f} MB). Maximum is 100 MB.")

    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise ValueError("Cannot open video file. Ensure it is a valid mp4/mov/webm.")

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    if fps <= 0:
        fps = 30.0  # assume 30 fps if unknown

    duration_s = total_frames / fps if fps > 0 else 0

    logger.info(
        f"Ingest: {path.name} | {width}x{height} @ {fps:.1f}fps | "
        f"{total_frames} frames | {duration_s:.1f}s | {size_mb:.1f}MB"
    )

    if duration_s < MIN_DURATION_S:
        cap.release()
        raise ValueError(
            f"Video too short ({duration_s:.1f}s). Minimum is {MIN_DURATION_S}s. "
            "Please record at least one full squat rep."
        )

    if duration_s > MAX_DURATION_S:
        cap.release()
        raise ValueError(
            f"Video too long ({duration_s:.1f}s). Maximum is {MAX_DURATION_S}s. "
            "Please trim to 60 seconds or fewer."
        )

    # Check if rotation metadata indicates portrait video (OpenCV may not auto-rotate)
    # We detect this by checking if height >> width in a squat context
    needs_rotation = False
    if height > width * 1.3:
        logger.info("Portrait orientation detected — rotating 90° to landscape for analysis.")
        needs_rotation = True

    # Normalize: cap FPS and resolution
    target_fps = min(fps, MAX_FPS)
    scale = 1.0
    if width > MAX_WIDTH or height > MAX_HEIGHT:
        scale = min(MAX_WIDTH / width, MAX_HEIGHT / height)

    # Write normalized video
    out_path = str(path.parent / (path.stem + "_norm.mp4"))
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")

    out_w = int(width * scale)
    out_h = int(height * scale)

    if needs_rotation:
        out_w, out_h = out_h, out_w  # swap for rotation

    out_w = out_w - (out_w % 2)  # ensure even dimensions
    out_h = out_h - (out_h % 2)

    writer = cv2.VideoWriter(out_path, fourcc, target_fps, (out_w, out_h))

    frame_step = max(1, int(fps / target_fps))
    frame_idx = 0
    written = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % frame_step == 0:
            if needs_rotation:
                frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
            if scale != 1.0:
                frame = cv2.resize(frame, (out_w, out_h), interpolation=cv2.INTER_AREA)
            writer.write(frame)
            written += 1
        frame_idx += 1

    cap.release()
    writer.release()

    actual_duration = written / target_fps if target_fps > 0 else duration_s

    metadata = {
        "original_path": str(path),
        "normalized_path": out_path,
        "original_width": width,
        "original_height": height,
        "output_width": out_w,
        "output_height": out_h,
        "original_fps": fps,
        "output_fps": target_fps,
        "original_total_frames": total_frames,
        "output_total_frames": written,
        "duration_s": actual_duration,
        "file_size_mb": size_mb,
        "was_rotated": needs_rotation,
        "was_scaled": scale != 1.0,
        "was_fps_capped": fps > MAX_FPS,
    }

    logger.info(f"Normalized video → {out_path} ({out_w}x{out_h} @ {target_fps}fps, {written} frames)")
    return out_path, metadata

