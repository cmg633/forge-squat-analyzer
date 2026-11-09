import { useState, useRef, useCallback } from 'react';
import { uploadVideo, getJobStatus, getResults } from '../api/client';
import type { UploadState, JobStatusResponse, AnalysisResult } from '../types/analysis';

const TERMINAL_STATUSES = new Set(['done', 'failed']);
const POLL_INTERVAL_MS = 1500;

export function useAnalysis() {
  const [state, setState] = useState<UploadState>({
    phase: 'idle',
    uploadProgress: 0,
    jobId: null,
    jobStatus: null,
    result: null,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(
    async (jobId: string) => {
      try {
        const status: JobStatusResponse = await getJobStatus(jobId);
        setState(prev => ({ ...prev, jobStatus: status }));

        if (status.status === 'done') {
          stopPolling();
          const result: AnalysisResult = await getResults(jobId);
          setState(prev => ({ ...prev, phase: 'done', result }));
          // Haptic feedback
          if ('vibrate' in navigator) {
            navigator.vibrate([80, 40, 80]);
          }
        } else if (status.status === 'failed') {
          stopPolling();
          setState(prev => ({
            ...prev,
            phase: 'error',
            error: status.error_reason ?? 'Analysis failed — please try again.',
          }));
        } else if (!TERMINAL_STATUSES.has(status.status)) {
          pollTimerRef.current = setTimeout(() => pollStatus(jobId), POLL_INTERVAL_MS);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Retry quietly up to 5 consecutive network failures before surfacing
        setState(prev => {
          const failCount = (prev as UploadState & { _failCount?: number })._failCount ?? 0;
          if (failCount < 5) {
            pollTimerRef.current = setTimeout(() => pollStatus(jobId), POLL_INTERVAL_MS * 2);
            return { ...prev, _failCount: failCount + 1 } as UploadState;
          }
          stopPolling();
          return { ...prev, phase: 'error', error: `Polling error: ${msg}` };
        });
      }
    },
    [stopPolling],
  );

  const startUpload = useCallback(
    async (file: File) => {
      // Cancel any previous upload
      abortRef.current?.abort();
      stopPolling();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({
        phase: 'uploading',
        uploadProgress: 0,
        jobId: null,
        jobStatus: null,
        result: null,
        error: null,
      });

      try {
        const { job_id } = await uploadVideo(
          file,
          pct => setState(prev => ({ ...prev, uploadProgress: pct })),
          controller.signal,
        );
        setState(prev => ({ ...prev, phase: 'polling', jobId: job_id }));
        await pollStatus(job_id);
      } catch (err) {
        if ((err as Error).message === 'Upload aborted') return;
        const msg = err instanceof Error ? err.message : String(err);
        setState(prev => ({ ...prev, phase: 'error', error: msg }));
      }
    },
    [pollStatus, stopPolling],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    stopPolling();
    setState({
      phase: 'idle',
      uploadProgress: 0,
      jobId: null,
      jobStatus: null,
      result: null,
      error: null,
    });
  }, [stopPolling]);

  return { state, startUpload, reset };
}
