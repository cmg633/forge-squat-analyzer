import { useState, useEffect, useCallback } from 'react';
import {
  getAllHistory,
  saveHistory,
  deleteHistory,
  clearAllHistory,
} from '../utils/db';
import type { HistoryEntry } from '../types/analysis';

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const entries = await getAllHistory();
      setHistory(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addEntry = useCallback(
    async (entry: HistoryEntry) => {
      await saveHistory(entry);
      await load();
    },
    [load],
  );

  const removeEntry = useCallback(
    async (jobId: string) => {
      await deleteHistory(jobId);
      setHistory(prev => prev.filter(e => e.job_id !== jobId));
    },
    [],
  );

  const clearAll = useCallback(async () => {
    await clearAllHistory();
    setHistory([]);
  }, []);

  return { history, loading, error, addEntry, removeEntry, clearAll, reload: load };
}
