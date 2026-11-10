# Stage 1: Build React SPA frontend (relative /api same-origin calls)
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: FastAPI backend + static frontend in a single container
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ffmpeg \
    libegl1 \
    libgles2 \
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

# Copy skill rules, backend app, and built frontend SPA
COPY skill/ /app/skill/
COPY backend/app/ /app/app/
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Ensure MediaPipe Pose Landmarker model bundle is present
RUN if [ ! -f /app/app/pipeline/pose_landmarker_full.task ]; then \
      curl -fsSL -o /app/app/pipeline/pose_landmarker_full.task \
      https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task; \
    fi

# Writable storage for ephemeral uploads/outputs (supports non-root UID 1000 containers)
RUN mkdir -p /tmp/forge_uploads /tmp/forge_outputs && chmod -R 777 /tmp/forge_uploads /tmp/forge_outputs /app/skill

EXPOSE 7860

ENV UPLOAD_DIR=/tmp/forge_uploads
ENV OUTPUT_DIR=/tmp/forge_outputs
ENV PORT=7860

CMD ["sh", "-c", "exec python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860} --workers 1"]
