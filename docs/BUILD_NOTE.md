# BUILD NOTE — Forge AI Squat Analyser

> Build date: 2026-11-09 | Pipeline version: 1.0.0

---

## Architecture Diagram

```mermaid
graph TD
    User["User (Mobile/Desktop)"] -->|Upload MP4/MOV/WEBM| FE["Frontend\nReact + Vite + PWA\nVercel"]
    FE -->|POST /analyze| BE["Backend\nFastAPI + Python 3.11\nHugging Face Spaces :7860"]
    BE -->|job_id| FE
    FE -->|Poll GET /jobs/id| BE
    BE --> P1["1. Ingest\n(OpenCV normalize)"]
    P1 --> P2["2. Quality Gate\n(side-view, visibility,\nsteadiness)"]
    P2 --> P3["3. Pose\n(MediaPipe Pose)\n+ SG smoothing"]
    P3 --> P4["4. Bar Tracker\n(CSRT OpenCV)"]
    P4 --> P5["5. Rep Detector\n(scipy find_peaks on hip-Y)"]
    P5 --> P6["6. Metrics\n(depth, angle, bar path,\nper-rep)"]
    P6 --> P7["7. Skill Engine\n(squat_skill.yaml\nhot-reloadable YAML rules)"]
    P7 --> P8["8. Coaching Agent\n(Gemini/Anthropic/Template)"]
    P8 --> P9["9. Renderer\n(OpenCV skeleton + bar trail)"]
    P9 --> Store["Ephemeral Storage\n/tmp (TTL 6h cleanup)"]
    FE -->|GET /results/id| BE
    FE -->|GET /frames/id\n(canvas overlay)| BE
    FE -->|GET /video/id\n(annotated MP4)| BE
    FE -->|IndexedDB| Local["Local History\n(device only)"]
    SK["skill/squat_skill.yaml\n(hot-reload)"] -->|load at runtime| P7
    LLM["Gemini API / Anthropic API\n(optional — template fallback)"] --- P8
```

---

## Model & Tool Choices

| Component | Choice | Reason |
|-----------|--------|--------|
| Pose estimation | MediaPipe Pose (model_complexity=1) | Free, runs CPU-only, 33 body landmarks, well-tested on squats |
| Bar tracking | OpenCV CSRT | Best single-object tracker available in opencv-contrib; handles partial occlusion |
| Landmark smoothing | Savitzky-Golay filter (window≈fps×0.1) | Removes jitter without introducing lag or overshooting |
| Rep detection | scipy.signal.find_peaks on hip-Y | Simple, deterministic, explainable; no ML model needed |
| Skill engine | YAML rules + pure Python | Deterministic, auditable, hot-reloadable without code change |
| Coaching LLM | Gemini 1.5 Flash (default), Anthropic Claude Haiku (fallback) | Free tier available; lightweight for text-only output |
| Backend framework | FastAPI | Async, automatic OpenAPI docs, great Python ecosystem fit |
| Frontend framework | React + Vite + TypeScript | Industry standard; Vite for fast HMR and tree-shaking |
| Styling | Tailwind CSS | Utility-first; makes custom design system easy to enforce |
| Animation | Framer Motion | Smooth, accessible animations with reduced-motion support |
| Charts | Recharts | React-native, composable, works well with Tailwind |
| Local storage | IndexedDB (via `idb` library) | Structured storage for analysis history |

---

## Actual Time Spent

| Task | Estimated time |
|------|----------------|
| Architecture design & skill YAML | 45 min |
| Backend pipeline (8 modules) | 90 min |
| Backend tests (27 unit tests) | 30 min |
| Frontend (22 components/pages) | 120 min |
| Deployment configuration | 20 min |
| Documentation | 30 min |
| **Total** | **~6 hours** |

---

## Build Cost

| Item | Cost |
|------|------|
| MediaPipe Pose | \$0 (open source, local inference) |
| OpenCV CSRT | \$0 (open source, local) |
| Gemini 1.5 Flash coaching | ~\$0.001 per video (1-2K tokens, free tier covers it) |
| Hugging Face Spaces (Docker) | \$0 (free tier with 2 vCPU, 16GB RAM) |
| Vercel frontend | \$0 (free tier) |
| **Per-video cost** | **~\$0** |

---

## Trade-offs & Design Decisions

### Depth Measurement
**Decision:** Use hip-Y landmark vs knee-Y landmark as a proxy for "hip crease below top of patella."

**Trade-off:** This is a 2D projection on the image plane. The true 3D depth of the hip crease relative to the patella depends on camera angle and body proportions. The estimate is labeled "ESTIMATE" everywhere. At typical side-view angles, this proxy is approximately correct but not medically precise.

**Why not 3D reconstruction?** Would require stereo cameras or monocular depth estimation (DepthAnything/MiDaS), adding significant latency and GPU requirements. Not justified for MVP; noted as a known limitation.

### Bar Tracking
**Decision:** Auto-seed CSRT tracker from shoulder midpoint landmark.

**Trade-off:** The shoulder landmark is a good proxy for bar position on a low-bar squat, but may be off for high-bar or unusual positioning. User can override with a tap on the first frame via the API seed_point parameter.

**Why not keypoint detection for the bar?** No labeled squat bar dataset available without training. CSRT with auto-seed works for clean videos.

### Rep Detection
**Decision:** `find_peaks` on hip-Y (image coordinate, so peaks = deepest point of squat).

**Trade-off:** Sensitive to camera shake and occluded frames. Mitigated by Savitzky-Golay smoothing pre-peak detection. Minimum inter-peak distance enforced at 0.8 seconds to avoid false positives from jitter.

### Coaching LLM
**Decision:** LLM writes coaching text ONLY. Verdicts computed deterministically by the skill engine.

**Trade-off:** LLM cannot change assessment outcomes. This may make coaching text seem repetitive with the findings. Alternative (letting LLM assess) was rejected because LLMs hallucinate thresholds and reference citations.

### No ffmpeg
**Decision:** Use OpenCV for video I/O and normalization instead of ffmpeg (not available in sandboxed environment).

**Trade-off:** MP4 output uses `mp4v` codec (MPEG-4 Part 2), which is widely supported but not as efficient as H.264. For production deployment, add ffmpeg to the Docker image and use `libx264` with `-movflags +faststart` for web-optimized MP4.

**Noted in UI:** Annotated video downloads will play in most video players but are not H.264 faststart. HF Spaces Docker image should add ffmpeg.

---

## Known Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|------------|
| Depth estimate is 2D landmark proxy | Low-confidence for borderline reps | Labeled "ESTIMATE" with uncertainty note everywhere |
| CSRT bar tracker may lose the bar in busy backgrounds | bar_path metrics cannot_assess | "Tracker lost" flag per frame; user can re-run |
| No ffmpeg in local dev; video uses mp4v codec | Larger file size, no H.264 faststart | Add ffmpeg to Docker Dockerfile (documented) |
| No GPU acceleration for MediaPipe | ~1–3 FPS processing on CPU | MediaPipe model_complexity=1 is a good CPU balance |
| In-memory job store (single worker) | Jobs lost on server restart | For production: use Redis; documented |
| Front-view / occluded videos fail quality gate | Cannot analyze non-side views | Quality gate returns readable failure reason |
| yt-dlp not available in sandbox | Cannot download sample video automatically | Use user-provided video or run yt-dlp outside sandbox |
| Capacitor APK build requires separate Android/JDK environment | APK not built in this run | Documented steps provided |

---

## What's Mocked or Manual

| Item | Status |
|------|--------|
| Sample video download | **Manual** — yt-dlp not available. Use any side-view squat MP4. |
| Deployment | **Credentials required** — See deployment instructions below. |
| Android APK | **Skipped** — Capacitor requires Android SDK/JDK not available in sandbox. |
| iOS support | **Skipped by design** — iOS App Store requires paid developer account. PWA on iOS Safari is supported. |
| Bar tracking seed | **Auto** (shoulder midpoint) in production. Manual tap via API param available. |

---

## Deployment Instructions

### Backend → Hugging Face Spaces

```bash
# 1. Create a new Space at https://huggingface.co/spaces
#    SDK: Docker, Hardware: CPU Basic (free)

# 2. Push the Docker image:
huggingface-cli login  # uses HF_TOKEN
huggingface-cli repo create forge-squat-analyser --type space --space-sdk docker

git remote add hf https://huggingface.co/spaces/YOUR_USERNAME/forge-squat-analyser
git push hf main

# 3. Set Space secrets in the HF UI:
#    GEMINI_API_KEY (optional)
#    FRONTEND_URL (your Vercel URL)
```

### Frontend → Vercel

```bash
# 1. Install Vercel CLI:
npm install -g vercel

# 2. Deploy:
cd frontend
VITE_API_URL=https://YOUR_USERNAME-forge-squat-analyser.hf.space vercel --prod

# 3. Set in Vercel dashboard:
#    VITE_API_URL=https://YOUR_USERNAME-forge-squat-analyser.hf.space
```

### Local Development

```bash
# Backend:
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 7860

# Frontend:
cd frontend
npm install
VITE_API_URL=http://localhost:7860 npm run dev

# Or with Docker:
docker compose up
```

### Required Environment Variables

| Variable | Required | Where | Description |
|----------|----------|-------|-------------|
| `GEMINI_API_KEY` | No | Backend | Enables Gemini coaching (falls back to template) |
| `ANTHROPIC_API_KEY` | No | Backend | Alternative LLM provider |
| `FRONTEND_URL` | Yes for prod | Backend | Vercel frontend URL for CORS |
| `VITE_API_URL` | Yes | Frontend | Backend URL |
| `HF_TOKEN` | Yes for deploy | CI | Hugging Face write token |
| `VERCEL_TOKEN` | Yes for deploy | CI | Vercel deploy token |

**Missing tokens in this build:** HF_TOKEN and VERCEL_TOKEN were not set in the environment. All files are ready. Run the deployment commands above with valid tokens to deploy.

