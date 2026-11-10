FROM python:3.11-slim

# System dependencies for OpenCV, MediaPipe, and H.264 video transcoding
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libxcb1 \
    libgomp1 \
    libportaudio2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy skill file and backend application
COPY skill/ /app/skill/
COPY backend/app/ /app/app/

# Ensure MediaPipe Pose Landmarker task bundle is present even if stripped from VCS
RUN if [ ! -f /app/app/pipeline/pose_landmarker_full.task ]; then \
      curl -fsSL -o /app/app/pipeline/pose_landmarker_full.task \
      https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task; \
    fi

# Writable storage for ephemeral uploads/outputs (supports non-root HF Space UID 1000)
RUN mkdir -p /tmp/forge_uploads /tmp/forge_outputs && chmod -R 777 /tmp/forge_uploads /tmp/forge_outputs /app/skill

EXPOSE 7860

ENV UPLOAD_DIR=/tmp/forge_uploads
ENV OUTPUT_DIR=/tmp/forge_outputs
ENV PORT=7860

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
