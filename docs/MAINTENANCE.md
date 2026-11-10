# Maintenance & Operations Guide — Forge AI Squat Analyser

## 1. Architecture & Endpoints
- **Single-URL Stack:** Multi-stage [`Dockerfile`](../Dockerfile) builds `frontend/dist` and serves both the React SPA and FastAPI `/api/*` endpoints from one origin on port `7860` (relative `/api` requests, no `VITE_API_URL` required).
- **Health & Docs Routes:** `GET /health` (and `/api/health`), `GET /docs`, `POST /api/analyze`, `GET /api/jobs/{id}`, `GET /api/results/{id}`, `GET /api/frames/{id}`, `GET /api/video/{id}`. SPA fallback serves `index.html` for client routes such as `/results/:id`.

## 2. Keep-Alive Schedule (`.github/workflows/keep_alive.yml`)
- Runs automatically every **12 hours** (`cron: '0 */12 * * *'`) and supports manual triggers (`workflow_dispatch`).
- Always verifies the live Vercel frontend returns `HTTP 200`.
- Once your hosted backend URL is live, add a GitHub Repository Variable named **`BACKEND_HEALTH_URL`** (e.g., `https://<your-backend>/health`) under **Repo Settings → Secrets and variables → Actions → Variables** so the cron wakes and checks the backend `/health` endpoint automatically.

## 3. Free-Tier Hosting Notes & Limits
- **Hugging Face Spaces:** Docker & Gradio Spaces on `cpu-basic` require a Hugging Face PRO subscription (`402 Payment Required` on non-PRO accounts).
- **Alternative Free Docker Host (Render):** Connect `cmg633/forge-squat-analyzer` as a Docker Web Service (port `7860`, 512 MB RAM ceiling on free tier, spins down after 15 min idle, ~30–60s cold wake).
- **CPU Processing Latency:** MediaPipe Pose + OpenCV CSRT bar tracking + H.264 `ffmpeg` encoding run on CPU; keep test/production clips concise (≤ 60s max, recommended 10–20s for fast turnaround on constrained free-tier CPUs).

## 4. Storage TTL & Secrets Hygiene
- **Ephemeral Server Cleanup:** [`backend/app/main.py`](../backend/app/main.py) runs hourly cleanup removing uploaded clips, rendered MP4s, and JSON outputs older than `JOB_TTL_SECONDS` (`6 hours` default). Client history stays in browser IndexedDB (`useHistory.ts`).
- **Gemini Key Rotation:** Keep secrets strictly in gitignored `.env` locally and host secret managers (`GEMINI_API_KEY` + `FRONTEND_URL`) remotely. Never place real keys in `.env.example`.
- **Rule Hot-Reload:** Edit [`skill/squat_skill.yaml`](../skill/squat_skill.yaml) cleanly without modifying pipeline Python code; `skill_engine.py` reloads rules automatically based on file modification timestamp.

