"""Job store (in-memory) and status enum."""
from __future__ import annotations

import time
from enum import Enum
from typing import Dict, Optional

from app.models import AnalysisJob


class JobStatus(str, Enum):
    UPLOADING = "uploading"
    VALIDATING = "validating"
    TRACKING_POSE = "tracking_pose"
    TRACKING_BAR = "tracking_bar"
    COUNTING_REPS = "counting_reps"
    ASSESSING = "assessing"
    RENDERING = "rendering"
    DONE = "done"
    FAILED = "failed"


# Simple in-memory store — replace with Redis for multi-worker production
job_store: Dict[str, AnalysisJob] = {}


def update_job_status(job_id: str, status: JobStatus, message: str = "", progress: float = 0.0):
    """Update job status in the store."""
    job = job_store.get(job_id)
    if job:
        job.status = status
        job.status_message = message
        job.progress = progress
        job.updated_at = time.time()

