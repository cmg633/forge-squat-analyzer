# AI USAGE — Forge AI Squat Analyser

## What Was Delegated to AI

| Task | Delegation Level | Notes |
|------|-----------------|-------|
| Architecture design | Assisted | AI proposed modular pipeline; human reviewed and confirmed |
| skill/squat_skill.yaml | AI generated | Based on reference chapter pages 1-35; every criterion reviewed for accuracy |
| Backend pipeline modules | AI written | All 8 modules (ingest, quality_gate, pose_tracker, bar_tracker, rep_detector, metrics, skill_engine, coaching_agent) |
| Unit tests (27 tests) | AI written | Tests verified correct failure cases (cannot_assess paths) |
| Frontend React components | AI written | All 22 components/pages generated from spec |
| Dockerfile + docker-compose | AI written | Standard configuration reviewed |
| Documentation | AI written | BUILD_NOTE, EVIDENCE, DEMO_SCRIPT |

## What Was Inspected

| Artifact | Inspection Method | Findings |
|----------|------------------|---------|
| skill/squat_skill.yaml | Line-by-line review | Verified every criterion ID, source page, verbatim quote, and threshold against reference |
| Metric computations | Unit test execution | 27 tests cover all metric edge cases |
| Rep detection | Synthetic signal test | Verified with sine wave signal (3 reps detected correctly) |
| Quality gate | Side-view detection test | Verified front-view landmark spreads correctly trigger failure |
| Skill engine cannot-assess | Unit tests | Verified STANCE_WIDTH, KNEE_TRACKING, GRIP all correctly return cannot_assess |

## One Real Bug Caught and Corrected

**Bug:** The skill engine module used a hardcoded absolute path for the YAML skill file:
```python
SKILL_PATH = Path(__file__).parents[3] / "skill" / "squat_skill.yaml"
```

**Problem:** When pytest was invoked from the project root directory (`novulies/`), `Path(__file__).parents[3]` resolved to `c:\Users\Chiranth  M G\OneDrive\Desktop\novulies\backend\tests\` — which is NOT the project root containing the `skill/` directory. This caused `FileNotFoundError` and the skill tests reported `KeyError: 'criteria'` because the YAML failed to load and returned an empty dict.

**Discovery:** Running `python -m pytest backend/tests/test_pipeline.py -v` from the project root showed 9 test failures in the `TestSkillEngine` class, all with `KeyError: 'criteria'` and the log line `ERROR app.pipeline.skill_engine:skill_engine.py:31 Skill file not found`.

**Fix:** Replaced the hardcoded path with a path resolution function that searches multiple candidate locations (module-relative paths at different depths, plus `Path.cwd() / "skill"`), and uses the first existing one:

```python
def _find_skill_path() -> Path:
    candidates = [
        Path(__file__).parents[3] / "skill" / "squat_skill.yaml",
        Path(__file__).parents[2] / "skill" / "squat_skill.yaml",
        Path.cwd() / "skill" / "squat_skill.yaml",
    ]
    for c in candidates:
        if c.exists():
            return c
    return candidates[0]
```

**Verification:** Re-ran pytest after the fix → 27/27 tests passed.

**Lesson:** Path resolution in Python modules depends on the working directory at runtime. Test-time working directory may differ from the module's physical location. Always use multiple candidate paths or accept the YAML path as a configuration parameter.

