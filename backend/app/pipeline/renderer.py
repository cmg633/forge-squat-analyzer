"""
Pipeline module 9: Video renderer.
Draws skeleton overlay + bar path on each frame, writes annotated MP4.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import List, Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# MediaPipe pose connections for skeleton drawing
POSE_CONNECTIONS = [
    # Face
    (0, 7), (0, 8),
    # Torso
    (11, 12), (11, 23), (12, 24), (23, 24),
    # Left arm
    (11, 13), (13, 15),
    # Right arm
    (12, 14), (14, 16),
    # Left leg
    (23, 25), (25, 27), (27, 29), (29, 31),
    # Right leg
    (24, 26), (26, 28), (28, 30), (30, 32),
]

LANDMARK_NAMES = [
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

# Signal red for brand
RED = (30, 58, 224)       # BGR: E03A1E
WHITE = (255, 255, 255)
GREEN = (80, 200, 80)
GREY = (120, 120, 120)
BAR_COLOR = (0, 200, 255)  # Yellow-cyan for bar path
REP_COLORS = [
    (0, 100, 255), (0, 200, 100), (200, 100, 0), (100, 0, 200), (0, 200, 200),
]


def render_annotated_video(
    input_video_path: str,
    output_path: str,
    smoothed_landmarks: List[Optional[dict]],
    bar_path: List[Optional[dict]],
    reps: List[dict],
    metadata: dict,
) -> str:
    """
    Draw skeleton + bar path overlay on each frame and write MP4.

    Returns:
        Path to output annotated video.
    """
    cap = cv2.VideoCapture(input_video_path)
    fps = metadata.get("output_fps", 30)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(output_path, fourcc, fps, (w, h))

    # Build bar path history for trail drawing
    bar_trail: List[tuple] = []
    BAR_TRAIL_LEN = 60

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Draw rep label background
        current_rep = _get_rep_number(frame_idx, reps)
        if current_rep is not None:
            label = f"REP {current_rep}"
            _draw_rep_badge(frame, label, w, h)

        # Draw skeleton
        lm = smoothed_landmarks[frame_idx] if frame_idx < len(smoothed_landmarks) else None
        if lm:
            _draw_skeleton(frame, lm, w, h)

        # Draw bar path trail
        bar = bar_path[frame_idx] if frame_idx < len(bar_path) else None
        if bar:
            bx = int(bar["x"] * w)
            by = int(bar["y"] * h)
            bar_trail.append((bx, by))
        if len(bar_trail) > BAR_TRAIL_LEN:
            bar_trail = bar_trail[-BAR_TRAIL_LEN:]

        _draw_bar_trail(frame, bar_trail)

        # Frame counter
        cv2.putText(
            frame, f"Frame {frame_idx}",
            (10, h - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, GREY, 1
        )

        writer.write(frame)
        frame_idx += 1

    cap.release()
    writer.release()

    # Re-encode to browser-compatible H.264 + faststart when ffmpeg is available (e.g. Docker/HF Space)
    import shutil
    import subprocess
    ffmpeg_bin = shutil.which("ffmpeg")
    if ffmpeg_bin:
        h264_tmp = str(Path(output_path).with_suffix(".h264.mp4"))
        try:
            subprocess.run(
                [
                    ffmpeg_bin, "-y", "-i", output_path,
                    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                    "-pix_fmt", "yuv420p", "-movflags", "+faststart", h264_tmp,
                ],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=120,
            )
            Path(h264_tmp).replace(output_path)
            logger.info(f"Transcoded {output_path} to H.264 faststart")
        except Exception as exc:
            logger.warning(f"ffmpeg H.264 transcode skipped ({exc}); serving raw OpenCV MP4")
            Path(h264_tmp).unlink(missing_ok=True)

    logger.info(f"Annotated video written to {output_path} ({frame_idx} frames)")
    return output_path


def _draw_skeleton(frame: np.ndarray, lm: dict, w: int, h: int):
    """Draw pose skeleton on frame."""
    # Build pixel coords
    pts = {}
    for name, data in lm.items():
        vis = data.get("visibility", 0)
        if vis > 0.3:
            px = int(data["x"] * w)
            py = int(data["y"] * h)
            pts[name] = (px, py, vis)

    # Draw connections
    for a_idx, b_idx in POSE_CONNECTIONS:
        if a_idx < len(LANDMARK_NAMES) and b_idx < len(LANDMARK_NAMES):
            a_name = LANDMARK_NAMES[a_idx]
            b_name = LANDMARK_NAMES[b_idx]
            if a_name in pts and b_name in pts:
                ax, ay, av = pts[a_name]
                bx, by, bv = pts[b_name]
                alpha = int(min(av, bv) * 255)
                color = RED
                cv2.line(frame, (ax, ay), (bx, by), color, 2, cv2.LINE_AA)

    # Draw landmark dots
    for name, (px, py, vis) in pts.items():
        cv2.circle(frame, (px, py), 4, WHITE, -1, cv2.LINE_AA)
        cv2.circle(frame, (px, py), 4, RED, 1, cv2.LINE_AA)


def _draw_bar_trail(frame: np.ndarray, trail: List[tuple]):
    """Draw bar path trail with fading effect."""
    n = len(trail)
    for i in range(1, n):
        alpha = i / n
        thickness = max(1, int(alpha * 3))
        color = tuple(int(c * alpha) for c in BAR_COLOR)
        cv2.line(frame, trail[i-1], trail[i], color, thickness, cv2.LINE_AA)
    if trail:
        # Current bar position: big dot
        cv2.circle(frame, trail[-1], 8, BAR_COLOR, -1, cv2.LINE_AA)
        cv2.circle(frame, trail[-1], 8, WHITE, 1, cv2.LINE_AA)


def _draw_rep_badge(frame: np.ndarray, label: str, w: int, h: int):
    """Draw rep number badge in top-right corner."""
    font = cv2.FONT_HERSHEY_DUPLEX
    scale = max(0.6, w / 1920)
    thickness = 2
    (tw, th), _ = cv2.getTextSize(label, font, scale, thickness)
    x = w - tw - 20
    y = 40
    # Background rect
    cv2.rectangle(frame, (x - 8, y - th - 8), (x + tw + 8, y + 8), (30, 58, 224), -1)
    cv2.putText(frame, label, (x, y), font, scale, WHITE, thickness, cv2.LINE_AA)


def _get_rep_number(frame_idx: int, reps: List[dict]) -> Optional[int]:
    """Return which rep number this frame belongs to, or None."""
    for rep in reps:
        if rep["start_frame"] <= frame_idx <= rep["end_frame"]:
            return rep["rep_number"]
    return None

