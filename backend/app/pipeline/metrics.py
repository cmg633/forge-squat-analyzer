"""
Pipeline module 6: Per-rep metrics computation.
Computes all assessable metrics for each rep from landmarks and bar path.
Every metric is tagged with is_estimated and confidence.
"""
from __future__ import annotations

import logging
import math
from typing import Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


def compute_metrics(
    rep: dict,
    smoothed_landmarks: List[Optional[dict]],
    bar_path: List[Optional[dict]],
    video_width: int,
    video_height: int,
) -> Dict[str, dict]:
    """
    Compute all metrics for a single rep.

    Returns:
        Dict mapping metric_name -> {value, unit, confidence, is_estimated, observation_note}
    """
    start_f = rep["start_frame"]
    bottom_f = rep["bottom_frame"]
    end_f = rep["end_frame"]

    frames = list(range(start_f, end_f + 1))
    bottom_lm = smoothed_landmarks[bottom_f] if bottom_f < len(smoothed_landmarks) else None

    metrics = {}

    # ---- DEPTH ----
    metrics["depth_hip_vs_knee"] = _compute_depth(bottom_lm, video_height)

    # ---- BACK ANGLE AT BOTTOM ----
    metrics["back_angle_bottom"] = _compute_back_angle(bottom_lm)

    # ---- KNEE ANGLE AT BOTTOM ----
    metrics["knee_angle_bottom"] = _compute_knee_angle(bottom_lm)

    # ---- HIP DRIVE (ascending phase) ----
    metrics["hip_drive"] = _compute_hip_drive(smoothed_landmarks, bottom_f, end_f)

    # ---- EYE GAZE ----
    metrics["eye_gaze"] = _compute_gaze(bottom_lm)

    # ---- BAR OVER MIDFOOT ----
    metrics["bar_midfoot_offset"] = _compute_bar_midfoot(
        smoothed_landmarks, bar_path, frames, video_width
    )

    # ---- BAR PATH VERTICAL DEVIATION ----
    metrics["bar_path_std"] = _compute_bar_path_std(bar_path, frames, video_width)

    return metrics


# ---------------------------------------------------------------------------
# Individual metric functions
# ---------------------------------------------------------------------------

def _vis_ok(lm: dict, name: str, threshold: float = 0.4) -> bool:
    """Check if a landmark has sufficient visibility."""
    try:
        return lm[name]["visibility"] > threshold
    except (TypeError, KeyError):
        return False


def _get_lm(lm: Optional[dict], name: str) -> Optional[dict]:
    if lm is None:
        return None
    return lm.get(name)


def _compute_depth(bottom_lm: Optional[dict], video_height: int) -> dict:
    """
    Hip crease vs top of patella (knee landmark proxy).
    In image coords: larger y = lower in frame.
    Hip crease below patella: hip_y > knee_y.
    """
    if bottom_lm is None:
        return _cannot_assess("No landmarks at bottom frame")

    # Choose best visible side
    lh = _get_lm(bottom_lm, "LEFT_HIP")
    rh = _get_lm(bottom_lm, "RIGHT_HIP")
    lk = _get_lm(bottom_lm, "LEFT_KNEE")
    rk = _get_lm(bottom_lm, "RIGHT_KNEE")

    # Use the more visible side
    left_ok = lh and lk and lh["visibility"] > 0.4 and lk["visibility"] > 0.4
    right_ok = rh and rk and rh["visibility"] > 0.4 and rk["visibility"] > 0.4

    if not left_ok and not right_ok:
        return _cannot_assess("Hip and knee landmarks not visible at bottom")

    hip_ys = []
    knee_ys = []
    if left_ok:
        hip_ys.append(lh["y"])
        knee_ys.append(lk["y"])
    if right_ok:
        hip_ys.append(rh["y"])
        knee_ys.append(rk["y"])

    hip_y = float(np.mean(hip_ys))
    knee_y = float(np.mean(knee_ys))
    delta_px = (hip_y - knee_y) * video_height

    conf = min(
        (lh["visibility"] if left_ok else 0.0),
        (rh["visibility"] if right_ok else 0.0),
        (lk["visibility"] if left_ok else 0.0),
        (rk["visibility"] if right_ok else 0.0),
    ) if (left_ok and right_ok) else max(
        (min(lh["visibility"], lk["visibility"]) if left_ok else 0.0),
        (min(rh["visibility"], rk["visibility"]) if right_ok else 0.0),
    )

    return {
        "value": round(delta_px, 1),
        "unit": "pixels (hip_y - knee_y, positive = hip below knee = depth achieved)",
        "confidence": round(float(conf), 2),
        "is_estimated": True,
        "observation_note": (
            "ESTIMATE: Landmark y-coordinates are used as a proxy for joint heights. "
            "Camera angle and limb depth (not visible in 2D) affect accuracy."
        ),
    }


def _compute_back_angle(bottom_lm: Optional[dict]) -> dict:
    """Torso angle from horizontal at bottom of squat."""
    if bottom_lm is None:
        return _cannot_assess("No landmarks at bottom frame")

    ls = _get_lm(bottom_lm, "LEFT_SHOULDER")
    rs = _get_lm(bottom_lm, "RIGHT_SHOULDER")
    lh = _get_lm(bottom_lm, "LEFT_HIP")
    rh = _get_lm(bottom_lm, "RIGHT_HIP")

    if not all([ls, rs, lh, rh]):
        return _cannot_assess("Shoulder or hip landmarks missing")

    vis_ok = all(
        v["visibility"] > 0.4 for v in [ls, rs, lh, rh] if v
    )
    if not vis_ok:
        return _cannot_assess("Shoulder or hip landmarks have low visibility")

    shoulder_x = (ls["x"] + rs["x"]) / 2
    shoulder_y = (ls["y"] + rs["y"]) / 2
    hip_x = (lh["x"] + rh["x"]) / 2
    hip_y = (lh["y"] + rh["y"]) / 2

    dx = abs(hip_x - shoulder_x)
    dy = abs(hip_y - shoulder_y)

    if dx < 1e-6:
        angle_deg = 90.0  # fully vertical
    else:
        angle_deg = math.degrees(math.atan2(dy, dx))

    # Confidence based on landmark visibility
    conf = float(np.mean([ls["visibility"], rs["visibility"], lh["visibility"], rh["visibility"]]))

    return {
        "value": round(angle_deg, 1),
        "unit": "degrees from horizontal (90=vertical, 0=horizontal)",
        "confidence": round(conf, 2),
        "is_estimated": False,
        "observation_note": (
            "Measured from shoulder midpoint to hip midpoint relative to horizontal. "
            "Side-view landmark positions used directly."
        ),
    }


def _compute_knee_angle(bottom_lm: Optional[dict]) -> dict:
    """Knee flexion angle at bottom."""
    if bottom_lm is None:
        return _cannot_assess("No landmarks at bottom frame")

    # Try best visible side
    for hip_name, knee_name, ankle_name in [
        ("LEFT_HIP", "LEFT_KNEE", "LEFT_ANKLE"),
        ("RIGHT_HIP", "RIGHT_KNEE", "RIGHT_ANKLE"),
    ]:
        h = _get_lm(bottom_lm, hip_name)
        k = _get_lm(bottom_lm, knee_name)
        a = _get_lm(bottom_lm, ankle_name)
        if h and k and a and all(v["visibility"] > 0.4 for v in [h, k, a]):
            angle = _angle_between(
                (h["x"], h["y"]), (k["x"], k["y"]), (a["x"], a["y"])
            )
            conf = float(np.mean([h["visibility"], k["visibility"], a["visibility"]]))
            return {
                "value": round(angle, 1),
                "unit": "degrees (180=straight, 90=fully bent)",
                "confidence": round(conf, 2),
                "is_estimated": False,
                "observation_note": "Knee joint angle from hip-knee-ankle vector.",
            }

    return _cannot_assess("Hip, knee, or ankle landmarks not visible")


def _compute_hip_drive(
    landmarks: List[Optional[dict]],
    bottom_f: int,
    end_f: int,
) -> dict:
    """
    Check hips rise before shoulders in ascending phase.
    """
    ascent_frames = list(range(bottom_f, end_f + 1))
    if len(ascent_frames) < 5:
        return _cannot_assess("Too few ascent frames to assess hip drive")

    early_n = max(2, int(len(ascent_frames) * 0.3))
    early_frames = ascent_frames[:early_n]

    hip_rates = []
    shoulder_rates = []

    for i in range(1, len(early_frames)):
        fi = early_frames[i]
        fi_prev = early_frames[i - 1]
        lm = landmarks[fi] if fi < len(landmarks) else None
        lm_prev = landmarks[fi_prev] if fi_prev < len(landmarks) else None
        if lm is None or lm_prev is None:
            continue

        try:
            # Rising = y decreasing (up in image)
            dh = -(( lm["LEFT_HIP"]["y"] + lm["RIGHT_HIP"]["y"]) / 2 -
                   (lm_prev["LEFT_HIP"]["y"] + lm_prev["RIGHT_HIP"]["y"]) / 2)
            ds = -(( lm["LEFT_SHOULDER"]["y"] + lm["RIGHT_SHOULDER"]["y"]) / 2 -
                   (lm_prev["LEFT_SHOULDER"]["y"] + lm_prev["RIGHT_SHOULDER"]["y"]) / 2)
            hip_rates.append(dh)
            shoulder_rates.append(ds)
        except (KeyError, TypeError):
            continue

    if not hip_rates:
        return _cannot_assess("Cannot compute rates — landmark data insufficient")

    avg_hip = float(np.mean(hip_rates))
    avg_shoulder = float(np.mean(shoulder_rates))
    hip_leads = avg_hip > avg_shoulder

    return {
        "value": 1.0 if hip_leads else 0.0,
        "unit": "boolean (1=hips lead, 0=hips do not lead)",
        "confidence": 0.65,  # This is inherently low-confidence from landmarks alone
        "is_estimated": True,
        "observation_note": (
            f"Hip rise rate {avg_hip:.4f} vs shoulder rise rate {avg_shoulder:.4f} in "
            f"first 30% of ascent. ESTIMATE — landmark smoothing affects accuracy."
        ),
        "hip_rate": round(avg_hip, 5),
        "shoulder_rate": round(avg_shoulder, 5),
    }


def _compute_gaze(bottom_lm: Optional[dict]) -> dict:
    """Eye gaze proxy from nose-to-ear angle."""
    if bottom_lm is None:
        return _cannot_assess("No landmarks at bottom frame")

    nose = _get_lm(bottom_lm, "NOSE")
    le = _get_lm(bottom_lm, "LEFT_EAR")
    re = _get_lm(bottom_lm, "RIGHT_EAR")

    if nose is None:
        return _cannot_assess("Nose landmark not visible")

    ear = None
    if le and le["visibility"] > 0.3:
        ear = le
    elif re and re["visibility"] > 0.3:
        ear = re

    if ear is None:
        return _cannot_assess("Ear landmarks not visible")

    dx = nose["x"] - ear["x"]
    dy = nose["y"] - ear["y"]
    angle_deg = math.degrees(math.atan2(dy, dx))

    conf = float(min(nose.get("visibility", 0.5), ear.get("visibility", 0.5))) * 0.7

    return {
        "value": round(angle_deg, 1),
        "unit": "degrees (nose-ear angle: negative=down, positive=up)",
        "confidence": round(conf, 2),
        "is_estimated": True,
        "observation_note": (
            "ESTIMATE: Gaze direction inferred from nose-ear angle as a proxy. "
            "Actual eye direction cannot be determined from body pose landmarks. "
            "Confidence is LOW — treat as a rough indicator only."
        ),
    }


def _compute_bar_midfoot(
    landmarks: List[Optional[dict]],
    bar_path: List[Optional[dict]],
    frames: List[int],
    video_width: int,
) -> dict:
    """Bar horizontal offset from midfoot, max over rep."""
    offsets = []

    for fi in frames:
        lm = landmarks[fi] if fi < len(landmarks) else None
        bar = bar_path[fi] if fi < len(bar_path) else None

        if lm is None or bar is None:
            continue
        if not bar.get("tracked", False):
            continue

        # Midfoot: average of heel and toe landmark x
        heel_x = None
        toe_x = None

        for heel, toe in [("LEFT_HEEL", "LEFT_FOOT_INDEX"), ("RIGHT_HEEL", "RIGHT_FOOT_INDEX")]:
            h = _get_lm(lm, heel)
            t = _get_lm(lm, toe)
            if h and t and h["visibility"] > 0.3 and t["visibility"] > 0.3:
                heel_x = h["x"]
                toe_x = t["x"]
                break

        if heel_x is None:
            continue

        midfoot_x = (heel_x + toe_x) / 2
        bar_x = bar["x"]  # normalized

        offset_px = abs(bar_x - midfoot_x) * video_width
        offsets.append(offset_px)

    if not offsets:
        return _cannot_assess("Bar tracker lost or foot landmarks not visible")

    max_offset = float(np.max(offsets))
    mean_offset = float(np.mean(offsets))

    return {
        "value": round(max_offset, 1),
        "unit": "pixels (max horizontal bar-midfoot offset over rep)",
        "confidence": 0.7,
        "is_estimated": True,
        "observation_note": (
            f"ESTIMATE: Max offset={max_offset:.1f}px, mean={mean_offset:.1f}px. "
            "Midfoot estimated from heel and toe landmarks. Bar from CSRT tracker."
        ),
    }


def _compute_bar_path_std(
    bar_path: List[Optional[dict]],
    frames: List[int],
    video_width: int,
) -> dict:
    """Bar path horizontal (x) standard deviation over rep — lower is more vertical."""
    xs = []
    for fi in frames:
        bar = bar_path[fi] if fi < len(bar_path) else None
        if bar and bar.get("tracked", False):
            xs.append(bar["x"] * video_width)

    if len(xs) < 3:
        return _cannot_assess("Insufficient bar track points in this rep")

    std_px = float(np.std(xs))
    return {
        "value": round(std_px, 1),
        "unit": "pixels (x std-dev; lower=more vertical path)",
        "confidence": 0.8,
        "is_estimated": False,
        "observation_note": f"Bar path horizontal std-dev over {len(xs)} tracked frames.",
    }


def _cannot_assess(reason: str) -> dict:
    return {
        "value": None,
        "unit": "",
        "confidence": 0.0,
        "is_estimated": False,
        "observation_note": f"Cannot assess: {reason}",
    }


def _angle_between(a: tuple, b: tuple, c: tuple) -> float:
    """
    Compute the angle at vertex B formed by vectors BA and BC.
    Returns degrees.
    """
    ba = (a[0] - b[0], a[1] - b[1])
    bc = (c[0] - b[0], c[1] - b[1])
    dot = ba[0] * bc[0] + ba[1] * bc[1]
    mag = math.sqrt(ba[0]**2 + ba[1]**2) * math.sqrt(bc[0]**2 + bc[1]**2)
    if mag < 1e-8:
        return 0.0
    cos_angle = max(-1.0, min(1.0, dot / mag))
    return math.degrees(math.acos(cos_angle))

