FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy skill file (hot-reloadable)
COPY skill/ /app/skill/

# Copy backend application
COPY backend/app/ /app/app/

# Create storage directories
RUN mkdir -p /tmp/forge_uploads /tmp/forge_outputs

# Expose port for Hugging Face Spaces
EXPOSE 7860

ENV UPLOAD_DIR=/tmp/forge_uploads
ENV OUTPUT_DIR=/tmp/forge_outputs
ENV PORT=7860

# Start server
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]

