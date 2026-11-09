"""
Pipeline module 7: Skill engine.
Loads skill/squat_skill.yaml and applies rules deterministically to metrics.
Hot-reloadable: reads YAML on each call (cached with mtime check).
"""
from __future__ import annotations

import logging
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

logger = logging.getLogger(__name__)

def _find_skill_path() -> Path:
    """Find squat_skill.yaml searching from module location upwards."""
    # From backend/app/pipeline/skill_engine.py:
    # parents[0] = backend/app/pipeline
    # parents[1] = backend/app
    # parents[2] = backend
    # parents[3] = project root (novulies)
    candidates = [
        Path(__file__).parents[3] / "skill" / "squat_skill.yaml",   # from module location
        Path(__file__).parents[2] / "skill" / "squat_skill.yaml",   # one level up
        Path.cwd() / "skill" / "squat_skill.yaml",                  # from cwd (pytest)
        Path.cwd() / "backend" / ".." / "skill" / "squat_skill.yaml",
    ]
    for c in candidates:
        if c.exists():
            return c
    return candidates[0]  # fallback (may not exist)

SKILL_PATH = _find_skill_path()

_skill_cache: Dict = {}
_skill_mtime: float = 0.0


def load_skill() -> Dict:
    """Load and cache the skill YAML, refreshing if file changed."""
    global _skill_cache, _skill_mtime

    try:
        mtime = SKILL_PATH.stat().st_mtime
    except FileNotFoundError:
        logger.error(f"Skill file not found: {SKILL_PATH}")
        return {}

    if mtime != _skill_mtime or not _skill_cache:
        with open(SKILL_PATH, "r") as f:
            _skill_cache = yaml.safe_load(f)
        _skill_mtime = mtime
        logger.info(f"Skill loaded from {SKILL_PATH} (version {_skill_cache.get('meta', {}).get('version', '?')})")

    return _skill_cache


def assess_rep(
    rep_number: int,
    rep_data: dict,
    metrics: Dict[str, dict],
    skill: Optional[Dict] = None,
) -> List[dict]:
    """
    Apply skill rules to metrics for one rep.
    Returns a list of finding dicts.
    """
    if skill is None:
        skill = load_skill()

    criteria = skill.get("criteria", [])
    findings = []

    for criterion in criteria:
        finding = _assess_criterion(criterion, rep_number, rep_data, metrics)
        findings.append(finding)

    return findings


def _assess_criterion(
    criterion: dict,
    rep_number: int,
    rep_data: dict,
    metrics: Dict[str, dict],
) -> dict:
    """Apply one criterion to metrics — deterministic logic only."""
    cid = criterion["id"]
    result = "cannot_assess"
    explanation = ""
    fix = ""
    uncertainty = ""

    # ----- Criteria not assessable from side view -----
    if not criterion.get("side_view_assessable", True):
        return _build_finding(
            criterion=criterion,
            rep_number=rep_number,
            rep_data=rep_data,
            result="cannot_assess",
            explanation=criterion.get("side_view_assessable_reason", "Not visible from side view."),
            fix="Use a front-view or combined-view recording to assess this criterion.",
            uncertainty="Requires camera angle other than side view.",
            metric=None,
        )

    # ----- DEPTH_HIP_CREASE -----
    if cid == "DEPTH_HIP_CREASE":
        m = metrics.get("depth_hip_vs_knee", {})
        if m.get("value") is None:
            result = "cannot_assess"
            explanation = m.get("observation_note", "Cannot assess depth.")
            uncertainty = "Hip or knee landmarks not visible."
        else:
            depth_px = m["value"]
            # positive = hip below knee in image coords = depth achieved
            threshold = 5  # 5px tolerance for jitter (implementation assumption)
            if depth_px > threshold:
                result = "meets_standard"
                explanation = f"Hip crease is {depth_px:.0f}px below the knee landmark — below parallel."
                fix = "Good depth. Maintain."
            elif depth_px > -threshold:
                result = "does_not_meet_standard"
                explanation = f"Hip crease is at approximately the same height as the knee ({depth_px:.0f}px) — borderline parallel."
                fix = "Descend slightly further until the hip crease is clearly below the top of the knee."
            else:
                result = "does_not_meet_standard"
                explanation = f"Hip crease is {abs(depth_px):.0f}px ABOVE the knee — above parallel (not deep enough)."
                fix = "Squat deeper. Drive your hips down and back until the hip crease passes below the top of the patella (knee cap). Focus on 'sitting into' the squat."
            uncertainty = m.get("observation_note", "")

        return _build_finding(criterion, rep_number, rep_data, result, explanation, fix, uncertainty, m)

    # ----- BACK_ANGLE_BOTTOM -----
    if cid == "BACK_ANGLE_BOTTOM":
        m = metrics.get("back_angle_bottom", {})
        if m.get("value") is None:
            result = "cannot_assess"
            explanation = m.get("observation_note", "Cannot assess back angle.")
            uncertainty = "Shoulder or hip landmarks not visible."
        else:
            angle = m["value"]
            thresholds = criterion.get("thresholds", {})
            min_a = thresholds.get("BACK_ANGLE_MIN", {}).get("value", 35)
            max_a = thresholds.get("BACK_ANGLE_MAX", {}).get("value", 55)
            impl_note = thresholds.get("BACK_ANGLE_MIN", {}).get("implementation_assumption", "")

            if min_a <= angle <= max_a:
                result = "meets_standard"
                explanation = f"Torso angle {angle:.1f}° is within the target range ({min_a}°–{max_a}°) at the bottom."
                fix = "Good back angle. Maintain this position."
            elif angle < min_a:
                result = "does_not_meet_standard"
                explanation = f"Torso angle {angle:.1f}° is too horizontal (< {min_a}°). Excessive forward lean."
                fix = "Engage your upper back harder. Keep your chest up. Consider widening your stance slightly."
            else:
                result = "does_not_meet_standard"
                explanation = f"Torso angle {angle:.1f}° is too vertical (> {max_a}°). Very upright position."
                fix = "This may indicate hip flexor tightness or bar too high. Confirm squat depth and bar placement."

            uncertainty = f"The PDF says 'about 45°'. This ±10° range is an IMPLEMENTATION ASSUMPTION. {impl_note}"

        return _build_finding(criterion, rep_number, rep_data, result, explanation, fix, uncertainty, m)

    # ----- BAR_OVER_MIDFOOT -----
    if cid == "BAR_OVER_MIDFOOT":
        m = metrics.get("bar_midfoot_offset", {})
        if m.get("value") is None:
            result = "cannot_assess"
            explanation = m.get("observation_note", "Bar tracking or foot landmarks unavailable.")
            uncertainty = "Bar tracker lost or foot landmarks not visible."
        else:
            offset = m["value"]
            thr = criterion.get("thresholds", {}).get("BAR_MIDFOOT_TOLERANCE_PX", {}).get("value", 40)
            impl = criterion.get("thresholds", {}).get("BAR_MIDFOOT_TOLERANCE_PX", {}).get("implementation_assumption", "")
            if offset <= thr:
                result = "meets_standard"
                explanation = f"Maximum bar-midfoot offset {offset:.0f}px ≤ {thr}px. Bar stays over mid-foot."
                fix = "Good bar path. Maintain."
            else:
                result = "does_not_meet_standard"
                explanation = f"Bar drifts up to {offset:.0f}px from midfoot (threshold {thr}px)."
                fix = "Keep the bar over your mid-foot throughout the rep. This often indicates the bar is too high or the squat is too 'quad-dominant'."
            uncertainty = f"40px tolerance at 1080p is an IMPLEMENTATION ASSUMPTION. {impl}"

        return _build_finding(criterion, rep_number, rep_data, result, explanation, fix, uncertainty, m)

    # ----- HIP_DRIVE -----
    if cid == "HIP_DRIVE":
        m = metrics.get("hip_drive", {})
        if m.get("value") is None:
            result = "cannot_assess"
            explanation = m.get("observation_note", "Cannot assess hip drive.")
            uncertainty = "Insufficient ascent frames or landmark data."
        else:
            hip_leads = m["value"] > 0.5
            if hip_leads:
                result = "meets_standard"
                explanation = "Hips appear to rise before or alongside shoulders in the early ascent."
                fix = "Good hip drive. Continue driving hips up first."
            else:
                result = "does_not_meet_standard"
                explanation = "Shoulders appear to rise before hips in early ascent — 'good morning' pattern."
                fix = "Think 'hips UP not forward'. Drive the hips vertically, not into hip extension prematurely."
            uncertainty = "ESTIMATE: hip-drive assessment from landmark y-rates is low-confidence (0.65). Treat as a rough indicator."

        return _build_finding(criterion, rep_number, rep_data, result, explanation, fix, uncertainty, m)

    # ----- EYE_GAZE -----
    if cid == "EYE_GAZE":
        m = metrics.get("eye_gaze", {})
        if m.get("value") is None:
            result = "cannot_assess"
            explanation = m.get("observation_note", "Cannot assess gaze.")
            uncertainty = "Nose or ear landmarks not visible."
        else:
            angle = m["value"]
            thresholds = criterion.get("thresholds", {})
            min_a = thresholds.get("GAZE_MIN", {}).get("value", -20)
            max_a = thresholds.get("GAZE_MAX", {}).get("value", 10)
            impl = thresholds.get("GAZE_MIN", {}).get("implementation_assumption", "")

            if min_a <= angle <= max_a:
                result = "meets_standard"
                explanation = f"Head angle {angle:.1f}° consistent with eyes-down gaze (target {min_a}°–{max_a}°)."
                fix = "Good gaze direction. Keep looking 4-5 feet ahead on the floor."
            else:
                result = "does_not_meet_standard"
                explanation = f"Head angle {angle:.1f}° suggests {'looking up' if angle > max_a else 'extreme downward tilt'}."
                fix = "Cast your eyes down at a spot on the floor 4-5 feet in front of you. Do not look up at the ceiling."
            uncertainty = f"ESTIMATE: Gaze inferred from nose-ear angle — LOW confidence. {impl}"

        return _build_finding(criterion, rep_number, rep_data, result, explanation, fix, uncertainty, m)

    # ----- BAR_PATH_VERTICAL -----
    if cid == "BAR_PATH_VERTICAL":
        m = metrics.get("bar_path_std", {})
        if m.get("value") is None:
            result = "cannot_assess"
            explanation = m.get("observation_note", "Bar tracking unavailable.")
            uncertainty = "Bar tracker lost."
        else:
            std_px = m["value"]
            thr = criterion.get("thresholds", {}).get("BAR_PATH_STD_THRESHOLD_PX", {}).get("value", 25)
            impl = criterion.get("thresholds", {}).get("BAR_PATH_STD_THRESHOLD_PX", {}).get("implementation_assumption", "")
            if std_px <= thr:
                result = "meets_standard"
                explanation = f"Bar path horizontal std-dev {std_px:.1f}px ≤ {thr}px. Bar path is approximately vertical."
                fix = "Good bar path. Maintain."
            else:
                result = "does_not_meet_standard"
                explanation = f"Bar drifts horizontally (std-dev {std_px:.1f}px > {thr}px). Path is not vertical."
                fix = "Focus on maintaining bar position over mid-foot. Reinforce with lighter weight sets focusing on bar path control."
            uncertainty = f"25px std-dev threshold is an IMPLEMENTATION ASSUMPTION. {impl}"

        return _build_finding(criterion, rep_number, rep_data, result, explanation, fix, uncertainty, m)

    # ----- Criteria with result_logic = cannot_assess in YAML -----
    return _build_finding(
        criterion, rep_number, rep_data, "cannot_assess",
        criterion.get("side_view_assessable_reason", "Not assessable from this camera angle."),
        "Record from a different angle or use combined-view analysis.",
        "",
        None,
    )


def _build_finding(
    criterion: dict,
    rep_number: int,
    rep_data: dict,
    result: str,
    explanation: str,
    fix: str,
    uncertainty: str,
    metric: Optional[dict],
) -> dict:
    """Construct a finding dict."""
    thresholds = criterion.get("thresholds", {})
    has_impl_assumption = any(
        t.get("implementation_assumption") for t in thresholds.values()
        if isinstance(t, dict)
    )
    impl_assumption_texts = [
        t.get("implementation_assumption", "")
        for t in thresholds.values()
        if isinstance(t, dict) and t.get("implementation_assumption")
    ]

    return {
        "criterion_id": criterion["id"],
        "title": criterion["title"],
        "source_page": criterion["source_page"],
        "source_section": criterion.get("source_section", ""),
        "verbatim_quote": criterion.get("verbatim_quote", ""),
        "result": result,
        "rep_number": rep_number,
        "frame_index": rep_data.get("bottom_frame"),
        "timestamp_s": rep_data.get("bottom_timestamp_s"),
        "observed_measurement": {
            "value": metric.get("value") if metric else None,
            "unit": metric.get("unit", "") if metric else "",
            "confidence": metric.get("confidence", 0.0) if metric else 0.0,
            "is_estimated": metric.get("is_estimated", False) if metric else False,
            "observation_note": metric.get("observation_note", "") if metric else "",
        } if metric else None,
        "short_explanation": explanation,
        "actionable_fix": fix,
        "uncertainty_note": uncertainty,
        "has_implementation_assumption": has_impl_assumption,
        "implementation_assumption_text": " | ".join(impl_assumption_texts),
        "side_view_assessable": criterion.get("side_view_assessable", True),
        "tags": criterion.get("tags", []),
    }
