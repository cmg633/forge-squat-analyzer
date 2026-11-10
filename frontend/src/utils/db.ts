import { openDB, type IDBPDatabase } from 'idb';
import type { HistoryEntry } from '../types/analysis';

const DB_NAME = 'forge-squat-db';
const DB_VERSION = 1;
const STORE = 'history';

type ForgeDB = IDBPDatabase<{
  history: {
    key: string;
    value: HistoryEntry;
    indexes: { by_date: string };
  };
}>;

let _db: ForgeDB | null = null;

async function getDb(): Promise<ForgeDB> {
  if (_db) return _db;
  _db = await openDB<{
    history: {
      key: string;
      value: HistoryEntry;
      indexes: { by_date: string };
    };
  }>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'job_id' });
        store.createIndex('by_date', 'analyzed_at', { unique: false });
      }
    },
  });
  return _db;
}

export async function saveHistory(entry: HistoryEntry): Promise<void> {
  const db = await getDb();
  await db.put(STORE, entry);
}

export async function getAllHistory(): Promise<HistoryEntry[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex(STORE, 'by_date');
  return all.reverse(); // newest first
}

export async function deleteHistory(jobId: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, jobId);
}

export async function clearAllHistory(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE);
}
