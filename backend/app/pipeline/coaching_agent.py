"""
Pipeline module 8: LLM coaching agent.
Generates coaching text using Gemini (default) or Anthropic.
Falls back to template-based text if LLM unavailable or fails.
LLM receives skill + metrics + verdicts. May NOT invent thresholds or change verdicts.
Output validated with Pydantic.
"""
from __future__ import annotations

import logging
import os
from typing import Dict, List, Optional

from pydantic import BaseModel, ValidationError

logger = logging.getLogger(__name__)


class CoachingOutput(BaseModel):
    summary: str
    top_fixes: List[str]
    per_finding_advice: Dict[str, str] = {}
    generated_by: str = "template"
    llm_failed: bool = False
    llm_failure_reason: str = ""


def generate_coaching(
    findings: List[dict],
    per_rep_metrics: Dict,
    skill: Optional[dict] = None,
) -> CoachingOutput:
    """
    Generate coaching text. Tries LLM first, falls back to template.
    """
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")

    if gemini_key:
        try:
            return _gemini_coaching(findings, per_rep_metrics, gemini_key)
        except Exception as e:
            logger.warning(f"Gemini coaching failed: {e} — falling back to template.")

    if anthropic_key:
        try:
            return _anthropic_coaching(findings, per_rep_metrics, anthropic_key)
        except Exception as e:
            logger.warning(f"Anthropic coaching failed: {e} — falling back to template.")

    logger.info("No LLM key set or LLM failed — using template coaching.")
    return _template_coaching(findings, llm_failed=(bool(gemini_key) or bool(anthropic_key)))


def _build_prompt(findings: List[dict], per_rep_metrics: Dict) -> str:
    """Build the LLM prompt. Very explicit constraints to prevent hallucination."""
    fails = [f for f in findings if f["result"] == "does_not_meet_standard"]
    meets = [f for f in findings if f["result"] == "meets_standard"]
    cannot = [f for f in findings if f["result"] == "cannot_assess"]

    fails_text = "\n".join(
        f"- [{f['criterion_id']}] {f['title']}: {f['short_explanation']}"
        for f in fails
    ) or "None"

    meets_text = "\n".join(f"- {f['title']}" for f in meets) or "None"
    cannot_text = "\n".join(f"- {f['title']}: {f['short_explanation'][:80]}" for f in cannot) or "None"

    return f"""You are an expert barbell squat coach. Write clear, motivating, actionable coaching text.

STRICT RULES:
1. Do NOT invent any numbers, thresholds, or measurements not given below.
2. Do NOT change any verdicts — the assessment engine has already determined meets/does_not_meet/cannot_assess.
3. Do NOT recommend exercises or programs not related to the squat technique.
4. Keep advice grounded in the Starting Strength methodology.
5. Be honest about what cannot be assessed.

ASSESSMENT RESULTS:
Does NOT meet standard:
{fails_text}

Meets standard:
{meets_text}

Cannot assess (camera angle/occlusion):
{cannot_text}

Respond in JSON only with this exact schema:
{{
  "summary": "<2-3 sentence overall assessment>",
  "top_fixes": ["<fix 1>", "<fix 2>", "<fix 3>"],
  "per_finding_advice": {{
    "<criterion_id>": "<1-2 sentence specific coaching tip>"
  }}
}}

Limit top_fixes to the 3 most important issues. If everything meets standard, say so positively.
"""


def _gemini_coaching(findings: List[dict], per_rep_metrics: Dict, api_key: str) -> CoachingOutput:
    """Call Gemini API for coaching text."""
    import json
    import urllib.request

    prompt = _build_prompt(findings, per_rep_metrics)
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 800},
    }
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        response_data = json.loads(resp.read())

    text = response_data["candidates"][0]["content"]["parts"][0]["text"]
    # Strip markdown code fences if present
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]

    parsed = json.loads(text.strip())
    result = CoachingOutput(
        summary=parsed.get("summary", ""),
        top_fixes=parsed.get("top_fixes", [])[:3],
        per_finding_advice=parsed.get("per_finding_advice", {}),
        generated_by="gemini",
        llm_failed=False,
    )
    # Validate with Pydantic
    return CoachingOutput.model_validate(result.model_dump())


def _anthropic_coaching(findings: List[dict], per_rep_metrics: Dict, api_key: str) -> CoachingOutput:
    """Call Anthropic API for coaching text."""
    import json
    import urllib.request

    prompt = _build_prompt(findings, per_rep_metrics)
    payload = {
        "model": "claude-3-haiku-20240307",
        "max_tokens": 800,
        "messages": [{"role": "user", "content": prompt}],
    }
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps(payload).encode(),
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        response_data = json.loads(resp.read())

    text = response_data["content"][0]["text"]
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]

    parsed = json.loads(text.strip())
    result = CoachingOutput(
        summary=parsed.get("summary", ""),
        top_fixes=parsed.get("top_fixes", [])[:3],
        per_finding_advice=parsed.get("per_finding_advice", {}),
        generated_by="anthropic",
        llm_failed=False,
    )
    return CoachingOutput.model_validate(result.model_dump())


def _template_coaching(findings: List[dict], llm_failed: bool = False) -> CoachingOutput:
    """
    Generate coaching from templates when LLM unavailable.
    Uses finding results and actionable_fix fields.
    """
    fails = [f for f in findings if f["result"] == "does_not_meet_standard"]
    meets = [f for f in findings if f["result"] == "meets_standard"]

    if not fails and not meets:
        summary = (
            "Analysis complete. Most criteria could not be assessed from this camera angle. "
            "Ensure a true side view with full body visible for the best assessment."
        )
    elif not fails:
        summary = (
            f"Excellent work! All {len(meets)} assessable criteria meet the standard. "
            "Focus on consistency and progressive overload."
        )
    else:
        criteria_issues = ", ".join(f['title'] for f in fails[:3])
        summary = (
            f"Analysis complete. {len(fails)} area(s) need attention: {criteria_issues}. "
            f"{len(meets)} criteria meet the standard. Focus on the fixes below."
        )

    # Top 3 fixes from fails
    top_fixes = []
    for f in fails[:3]:
        fix = f.get("actionable_fix", "")
        if fix:
            top_fixes.append(f"[{f['title']}] {fix}")

    if not top_fixes:
        top_fixes = ["Record a side-view video with full body visible for detailed coaching."]

    per_advice = {}
    for f in findings:
        if f.get("actionable_fix"):
            per_advice[f["criterion_id"]] = f["actionable_fix"]

    return CoachingOutput(
        summary=summary,
        top_fixes=top_fixes[:3],
        per_finding_advice=per_advice,
        generated_by="template",
        llm_failed=llm_failed,
        llm_failure_reason="No GEMINI_API_KEY or ANTHROPIC_API_KEY set, or LLM call failed." if llm_failed else "No LLM key provided.",
    )

