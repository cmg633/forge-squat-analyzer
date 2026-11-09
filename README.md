# FORGE — AI Squat Analyser

<p align="center">
  <img src="frontend/public/favicon.svg" width="80" height="80" alt="Forge Logo" />
</p>

<p align="center">
  <strong>Production-grade, evidence-grounded computer-vision app for barbell squat kinematics.</strong><br>
  Built with MediaPipe, OpenCV CSRT, SciPy, FastAPI, React 18, Tailwind CSS, and Framer Motion.
</p>

<p align="center">
  <a href="#quickstart">Quickstart</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#evidence--verification">Evidence & Verification</a> •
  <a href="#skill-specification">Skill Specification</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#documentation">Documentation</a>
</p>

---

## Overview

Forge is an AI squat analysis system that assesses lifters against the definitive standard of strength training: **pages 1–35 of the Starting Strength reference chapter**.

Unlike black-box fitness apps that invent ungrounded scores or hallucinate precision, Forge operates on strict engineering honesty:
- **Deterministic Assessment:** Kinematic measurements are evaluated against rules defined in [`skill/squat_skill.yaml`](skill/squat_skill.yaml).
- **Honest Uncertainty:** Every metric is explicitly tagged as **Observed** (direct 2D vector calculation) or **Estimated** (proxy for 3D anatomy). Criteria invisible from a side view (such as stance width, toe angle, and knee valgus) produce an explicit `cannot assess` status.
- **Auditable Citations:** Every finding cites the exact page, figure, and section from the reference literature.
- **Scoped AI Coaching:** LLMs (Gemini / Anthropic / local template) only write motivating coaching prose. They are strictly forbidden from modifying verdicts or hallucinating thresholds.

---

## Visual Design Language

Crafted around high-contrast athletic performance:
- **Base Canvas:** Deep obsidian near-black (`#0B0B0B`) with subtle background grain.
- **Accent Signal:** High-energy signal red (`#E03A1E`) with radiant drop-shadow glows.
- **Typography:** Ultra-bold uppercase display headlines (`Barlow Condensed`) and clean technical body type (`Inter`).
- **Surface Cards:** Glassmorphic translucent cards (`#161616` with 1px hairline borders and `backdrop-blur`).
- **Eyebrow Badges:** Tracked-out uppercase micro-labels (`letter-spacing: 0.2em`).

---

## System Architecture

```mermaid
flowchart TD
    A["User Video Upload / Camera Recording\n(MP4 / MOV / WEBM, max 60s, max 100MB)"] --> B["FastAPI Backend\n(Port 7860)"]
    
    subgraph Pipeline ["Kinematic Analysis Pipeline"]
        B --> C["1. Ingest & Normalize\n(OpenCV rotation, resolution & FPS normalization)"]
        C --> D["2. Quality Gate\n(Side-view lateral spread, body framing, steadiness)"]
        D --> E["3. Pose Estimation\n(MediaPipe 33 Landmarks + Savitzky-Golay Smoothing)"]
        E --> F["4. Barbell Tracking\n(OpenCV CSRT continuous tracker + lost-frame detection)"]
        E --> G["5. Rep Detection\n(SciPy find_peaks on hip-Y descent kinetics)"]
        F & G --> H["6. Per-Rep Kinematic Metrics\n(Depth proxy, back angle, knee flexion, hip drive, bar drift)"]
        H --> I["7. Deterministic Skill Engine\n(Hot-reloadable squat_skill.yaml)"]
        I --> J["8. Coaching Agent\n(Gemini 1.5 Flash / Anthropic / Template Fallback)"]
        J --> K["9. Video Rendering\n(OpenCV skeleton & bar path trail overlay MP4)"]
    end
    
    K --> L["Client Bento Dashboard\n(React + Vite + Recharts + Canvas Overlay)"]
    L --> M["Local IndexedDB History\n(Device persistence with 6h server TTL notice)"]
```

---

## Pipeline Stages

1. **Ingest:** Validates format (MP4/MOV/WebM), duration (≤60s), and file size (≤100MB). Normalizes resolution and frame rate via OpenCV.
2. **Quality Gate:** Evaluates whether camera angle is a sagittal side view (by measuring normalized shoulder/hip x-spread). Rejects front-view recordings or heavy camera instability with readable failure reasons.
3. **Pose Estimation:** MediaPipe Pose extracts 33 body keypoints per frame. Jitter is eliminated via a Savitzky-Golay temporal smoothing filter.
4. **Bar Tracking:** OpenCV CSRT tracker initializes at the shoulder shelf and tracks the barbell trajectory, flagging tracking loss if occlusion occurs.
5. **Rep Detection:** `scipy.signal.find_peaks` analyzes vertical hip displacement to isolate rep start, deepest descent (bottom), and standing lockout.
6. **Kinematic Metrics:** Calculates depth delta (hip crease vs patellar proxy), bottom torso angle, knee flexion, ascending hip drive rate, and horizontal bar path variance.
7. **Skill Engine:** Deterministic rule engine evaluates metrics against `skill/squat_skill.yaml`.
8. **Coaching Agent:** Pydantic-validated LLM generates actionable cueing without modifying verdicts.
9. **Video Rendering:** OpenCV draws bone vectors and a 60-frame bar path trail to render an annotated MP4.

---

## Quickstart (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm or pnpm

### 1. Clone & Set Up Environment
```bash
git clone https://github.com/your-repo/forge-squat.git
cd forge-squat
cp .env.example .env
```

### 2. Launch Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 7860 --reload
```
*Backend runs at `http://localhost:7860` with interactive API docs at `http://localhost:7860/docs`.*

### 3. Launch Frontend (PWA)
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs at `http://localhost:5173`.*

---

## Docker Compose Launch

Run the entire full-stack application with a single command:

```bash
docker compose up --build
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:7860`
- API Health Check: `http://localhost:7860/health`

---

## Evidence & Verification

All mandatory verification steps have been executed and documented:

| Verification Task | Method | Result | Evidence |
|:------------------|:-------|:------:|:---------|
| **Unit Test Suite** | `pytest backend/tests/test_pipeline.py` | **27/27 PASSED** | Unit tests for angle geometry, depth logic, rep detection, cannot-assess paths |
| **Real Video Pipeline** | Run on 779-frame common sample | **5 REPS DETECTED** | Metrics table (depth, torso angle, knee angle) in [`docs/EVIDENCE.md`](docs/EVIDENCE.md) |
| **Visual Frame Audit** | Extract standing, bottom, and lockout | **CONFIRMED** | Extracted PNG frames inspected in [`docs/evidence_frames/`](docs/evidence_frames/) |
| **Hard Video Test** | Front-view video quality gate | **REJECTED** | Correctly fails side-view test (`avg_spread: 0.35 > 0.25`) |
| **YAML Hot-Reload** | Live threshold edit | **VERIFIED** | Relaxing angle tolerance flipped verdict from Fail to Pass with 0 code changes |
| **Frontend Production Build** | `tsc && vite build` | **COMPILED (7.75s)** | PWA manifest, service worker, and vendor chunks generated |

Read the full report in [`docs/EVIDENCE.md`](docs/EVIDENCE.md).

---

## Skill Specification (`skill/squat_skill.yaml`)

The criteria in `squat_skill.yaml` are mapped directly to reference pages 1–35:

| Criterion ID | Title | Page & Section | Side-View Assessable? | Logic Summary |
|:-------------|:------|:--------------:|:---------------------:|:--------------|
| `DEPTH_HIP_CREASE` | Hip crease below top of patella | p. 7, Fig 2-1 | **Yes** | Hip-Y > Knee-Y at bottom frame |
| `BACK_ANGLE_BOTTOM` | Back angle ~45° from horizontal | p. 13, Fig 2-13 | **Yes** | 35°–55° range (±10° assumption noted) |
| `BAR_OVER_MIDFOOT` | Bar remains over midfoot | p. 10, Fig 2-7 | **Yes** | Bar-X vs Midfoot-X within tolerance |
| `HIP_DRIVE` | Hips rise first ("up, not forward") | p. 18, Text | **Yes** | Hip vertical rise rate > shoulder rate |
| `EYE_GAZE` | Eyes down, 4-5 ft ahead on floor | p. 20, Text | **Yes** | Nose-to-ear angle proxy (estimate) |
| `BAR_POSITION_BACK` | Bar below scapular spine | p. 24, Fig 2-19 | **No** | Requires rear or combined angle |
| `STANCE_WIDTH` | Heels shoulder-width apart | p. 6, Text | **No** | Feet overlap in sagittal view |
| `TOE_ANGLE` | Toes turned out ~30° | p. 6, Text | **No** | Angle flattened in 2D side view |
| `KNEE_TRACKING` | Knees track over toes (no caving) | p. 8, Text | **No** | Valgus collapse occurs along medial axis |
| `GRIP` | Hands just outside shoulders | p. 23, Text | **No** | Requires frontal/posterior view |

---

## Deployment Guide

### Deploying Backend to Hugging Face Spaces (Docker SDK)

1. Create a Space on [Hugging Face](https://huggingface.co/spaces) with **Docker SDK** on port `7860`.
2. Push repository:
```bash
git remote add hf https://huggingface.co/spaces/YOUR_USERNAME/forge-squat-backend
git push hf main
```
3. Set Space Environment Variables / Secrets:
   - `FRONTEND_URL`: URL of your deployed Vercel frontend.
   - `GEMINI_API_KEY`: (Optional) Free-tier Google Gemini key for LLM coaching text.

### Deploying Frontend to Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```
2. Deploy frontend with production backend URL:
```bash
cd frontend
VITE_API_URL=https://YOUR_HF_SPACE_URL.hf.space vercel --prod
```
3. Configure `VITE_API_URL` in the Vercel project dashboard.

---

## Documentation Index

- [`docs/BUILD_NOTE.md`](docs/BUILD_NOTE.md): Architecture diagrams, design trade-offs, model choices, and build cost telemetry ($0 target).
- [`docs/EVIDENCE.md`](docs/EVIDENCE.md): Detailed verification evidence, metrics tables, quality gate proof, and visual overlay audits.
- [`docs/AI_USAGE.md`](docs/AI_USAGE.md): Audit of AI assistance, code inspection findings, and real bug catch-and-fix log.
- [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md): 15-minute product walkthrough (5 min pitch, 10 min live demo) and investor/coach objections handler.

---

## License

MIT License. Designed with scientific integrity for lifters and coaches worldwide.

