"""
Backend application entry point.
Forge AI Squat Analyser — FastAPI backend.
"""
from __future__ import annotations

import asyncio
import logging
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.jobs import job_store, JobStatus
from app.pipeline.orchestrator import run_analysis_pipeline
from app.models import AnalysisJob, AnalysisResult, FrameData

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger.info("Forge Squat Analyser backend starting up.")
    # Start periodic cleanup task
    cleanup_task = asyncio.create_task(periodic_cleanup())
    yield
    cleanup_task.cancel()
    logger.info("Forge Squat Analyser backend shutting down.")


app = FastAPI(
    title="Forge AI Squat Analyser",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow Vercel frontend + localhost dev
origins = [
    "http://localhost:5173",
    "http://localhost:4173",
    "http://localhost:3000",
    "https://forge-squat.vercel.app",
    "https://frontend-sigma-three-74.vercel.app",
    settings.FRONTEND_URL,
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve annotated videos and uploaded files
UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_DIR = Path(settings.OUTPUT_DIR)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.post("/analyze", response_model=AnalysisJob)
async def start_analysis(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
):
    """Accept video upload, enqueue analysis job, return job_id immediately."""
    # Basic validation
    if video.size and video.size > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(413, f"File too large. Max {settings.MAX_FILE_MB} MB.")

    ext = Path(video.filename or "video.mp4").suffix.lower().lstrip(".")
    if ext not in {"mp4", "mov", "webm"}:
        raise HTTPException(415, f"Unsupported format '{ext}'. Use mp4, mov, or webm.")

    job_id = str(uuid.uuid4())
    video_path = UPLOAD_DIR / f"{job_id}.{ext}"

    # Stream file to disk
    with open(video_path, "wb") as f:
        while chunk := await video.read(1024 * 1024):  # 1MB chunks
            f.write(chunk)

    logger.info(f"Job {job_id}: video saved to {video_path}")

    # Create job record
    job = AnalysisJob(job_id=job_id, status=JobStatus.UPLOADING, filename=video.filename or "upload")
    job_store[job_id] = job

    # Run pipeline in background
    background_tasks.add_task(run_analysis_pipeline, job_id, str(video_path))

    return job


@app.get("/jobs/{job_id}", response_model=AnalysisJob)
async def get_job_status(job_id: str):
    """Poll job status and stage."""
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(404, f"Job {job_id} not found.")
    return job


@app.get("/results/{job_id}", response_model=AnalysisResult)
async def get_results(job_id: str):
    """Return full analysis results (only when done)."""
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(404, f"Job {job_id} not found.")
    if job.status != JobStatus.DONE:
        raise HTTPException(400, f"Job not done yet. Status: {job.status}")
    result_path = OUTPUT_DIR / f"{job_id}_result.json"
    if not result_path.exists():
        raise HTTPException(500, "Result file missing.")
    import json
    with open(result_path) as f:
        data = json.load(f)
    return AnalysisResult(**data)


@app.get("/frames/{job_id}")
async def get_frames(job_id: str):
    """Return per-frame landmark + bar path data for canvas overlay."""
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(404, f"Job {job_id} not found.")
    if job.status != JobStatus.DONE:
        raise HTTPException(400, "Job not done yet.")
    frames_path = OUTPUT_DIR / f"{job_id}_frames.json"
    if not frames_path.exists():
        raise HTTPException(500, "Frames file missing.")
    import json
    with open(frames_path) as f:
        data = json.load(f)
    return JSONResponse(content=data)


@app.get("/video/{job_id}")
async def get_annotated_video(job_id: str):
    """Stream annotated MP4."""
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(404, f"Job {job_id} not found.")
    if job.status != JobStatus.DONE:
        raise HTTPException(400, "Job not done yet.")
    video_path = OUTPUT_DIR / f"{job_id}_annotated.mp4"
    if not video_path.exists():
        raise HTTPException(500, "Annotated video not found.")
    return FileResponse(
        str(video_path),
        media_type="video/mp4",
        headers={"Content-Disposition": f'attachment; filename="squat_analysis_{job_id[:8]}.mp4"'},
    )


async def periodic_cleanup():
    """Remove jobs and files older than TTL."""
    import time
    while True:
        await asyncio.sleep(3600)  # run hourly
        cutoff = time.time() - settings.JOB_TTL_SECONDS
        for job_id, job in list(job_store.items()):
            if job.created_at < cutoff:
                logger.info(f"Cleaning up job {job_id}")
                for suffix in ["_result.json", "_frames.json", "_annotated.mp4"]:
                    p = OUTPUT_DIR / f"{job_id}{suffix}"
                    if p.exists():
                        p.unlink(missing_ok=True)
                for ext in ["mp4", "mov", "webm"]:
                    p = UPLOAD_DIR / f"{job_id}.{ext}"
                    if p.exists():
                        p.unlink(missing_ok=True)
                del job_store[job_id]

