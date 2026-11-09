import type {
  UploadResponse,
  JobStatusResponse,
  AnalysisResult,
  FramesResponse,
} from '../types/analysis';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7860';

// ─── Retry helper ─────────────────────────────────────────────────────────────

async function fetchWithRetry(
  input: RequestInfo,
  init?: RequestInit,
  retries = 3,
  delayMs = 500,
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(input, init);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
      }
      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, delayMs * 2 ** attempt));
      }
    }
  }
  throw lastError ?? new Error('Request failed');
}

// ─── Upload video ─────────────────────────────────────────────────────────────

export async function uploadVideo(
  file: File,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append('video', file);

    xhr.open('POST', `${API_URL}/analyze`);

    xhr.upload.addEventListener('progress', e => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadResponse);
        } catch {
          reject(new Error('Invalid JSON in upload response'));
        }
      } else {
        reject(new Error(`Upload failed: HTTP ${xhr.status} ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    if (signal) {
      signal.addEventListener('abort', () => xhr.abort());
    }

    xhr.send(form);
  });
}

// ─── Poll job status ──────────────────────────────────────────────────────────

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetchWithRetry(`${API_URL}/jobs/${encodeURIComponent(jobId)}`);
  return res.json() as Promise<JobStatusResponse>;
}

// ─── Get full results ─────────────────────────────────────────────────────────

export async function getResults(jobId: string): Promise<AnalysisResult> {
  const res = await fetchWithRetry(`${API_URL}/results/${encodeURIComponent(jobId)}`);
  return res.json() as Promise<AnalysisResult>;
}

// ─── Get per-frame landmarks + bar path ──────────────────────────────────────

export async function getFrames(jobId: string): Promise<FramesResponse> {
  const res = await fetchWithRetry(`${API_URL}/frames/${encodeURIComponent(jobId)}`);
  return res.json() as Promise<FramesResponse>;
}

// ─── Get annotated video URL ──────────────────────────────────────────────────

export function getVideoUrl(jobId: string): string {
  return `${API_URL}/video/${encodeURIComponent(jobId)}`;
}
