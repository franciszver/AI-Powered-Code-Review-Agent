import { Thread } from '../types/thread';
import { loadThreads, saveThreads, isStorageAvailable } from './storageUtils';

const FALLBACK_KEY = 'code-review-threads-fallback';
const SYNC_QUEUE_KEY = 'code-review-sync-queue';

/**
 * Sync status for threads
 */
export interface SyncStatus {
  lastSyncAttempt: Date | null;
  lastSuccessfulSync: Date | null;
  pendingChanges: number;
  isOnline: boolean;
}

/**
 * Queued operation for syncing
 */
interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  data: Thread | { id: string; updates: Partial<Thread> } | string;
  timestamp: Date;
  retryCount: number;
}

/**
 * Check if the backend API is available
 */
export async function checkBackendAvailability(apiUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get the sync queue from localStorage
 */
export function getSyncQueue(): QueuedOperation[] {
  if (!isStorageAvailable()) {
    return [];
  }

  try {
    const data = localStorage.getItem(SYNC_QUEUE_KEY);
    if (!data) {
      return [];
    }
    return JSON.parse(data).map((op: QueuedOperation) => ({
      ...op,
      timestamp: new Date(op.timestamp),
    }));
  } catch {
    return [];
  }
}

/**
 * Add an operation to the sync queue
 */
export function addToSyncQueue(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>): void {
  if (!isStorageAvailable()) {
    return;
  }

  const queue = getSyncQueue();
  const newOp: QueuedOperation = {
    ...operation,
    id: crypto.randomUUID(),
    timestamp: new Date(),
    retryCount: 0,
  };

  queue.push(newOp);
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Remove an operation from the sync queue
 */
export function removeFromSyncQueue(operationId: string): void {
  if (!isStorageAvailable()) {
    return;
  }

  const queue = getSyncQueue();
  const filtered = queue.filter(op => op.id !== operationId);
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
}

/**
 * Clear the sync queue
 */
export function clearSyncQueue(): void {
  if (!isStorageAvailable()) {
    return;
  }
  localStorage.removeItem(SYNC_QUEUE_KEY);
}

/**
 * Save threads to fallback storage
 */
export function saveFallbackThreads(threads: Thread[]): boolean {
  return saveThreads(FALLBACK_KEY, threads);
}

/**
 * Load threads from fallback storage
 */
export function loadFallbackThreads(): Thread[] {
  return loadThreads(FALLBACK_KEY);
}

/**
 * Merge local and remote threads
 * Resolves conflicts by preferring the most recently updated version
 */
export function mergeThreads(local: Thread[], remote: Thread[]): Thread[] {
  const merged = new Map<string, Thread>();

  // Add all remote threads
  for (const thread of remote) {
    merged.set(thread.id, thread);
  }

  // Merge local threads, preferring newer updates
  for (const localThread of local) {
    const remoteThread = merged.get(localThread.id);

    if (!remoteThread) {
      // Thread only exists locally
      merged.set(localThread.id, localThread);
    } else {
      // Both exist, prefer the one with the latest update
      const localDate = new Date(localThread.updatedAt);
      const remoteDate = new Date(remoteThread.updatedAt);

      if (localDate > remoteDate) {
        merged.set(localThread.id, localThread);
      }
    }
  }

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Get sync status
 */
export function getSyncStatus(): SyncStatus {
  const queue = getSyncQueue();
  
  let lastSyncAttempt: Date | null = null;
  let lastSuccessfulSync: Date | null = null;

  try {
    const statusData = localStorage.getItem('code-review-sync-status');
    if (statusData) {
      const status = JSON.parse(statusData);
      lastSyncAttempt = status.lastSyncAttempt ? new Date(status.lastSyncAttempt) : null;
      lastSuccessfulSync = status.lastSuccessfulSync ? new Date(status.lastSuccessfulSync) : null;
    }
  } catch {
    // Ignore parse errors
  }

  return {
    lastSyncAttempt,
    lastSuccessfulSync,
    pendingChanges: queue.length,
    isOnline: navigator.onLine,
  };
}

/**
 * Update sync status
 */
export function updateSyncStatus(updates: Partial<SyncStatus>): void {
  if (!isStorageAvailable()) {
    return;
  }

  try {
    const current = getSyncStatus();
    const updated = { ...current, ...updates };
    localStorage.setItem('code-review-sync-status', JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Create a sync manager that handles background syncing
 */
export function createSyncManager(apiUrl: string, onSyncComplete?: (success: boolean) => void) {
  let syncInterval: ReturnType<typeof setInterval> | null = null;

  const sync = async () => {
    const isAvailable = await checkBackendAvailability(apiUrl);
    updateSyncStatus({ lastSyncAttempt: new Date(), isOnline: isAvailable });

    if (!isAvailable) {
      onSyncComplete?.(false);
      return;
    }

    const queue = getSyncQueue();
    
    for (const operation of queue) {
      try {
        await processOperation(apiUrl, operation);
        removeFromSyncQueue(operation.id);
      } catch (error) {
        console.error('Failed to sync operation:', operation, error);
        // Increment retry count
        const updatedQueue = getSyncQueue().map(op =>
          op.id === operation.id ? { ...op, retryCount: op.retryCount + 1 } : op
        );
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(updatedQueue));
      }
    }

    updateSyncStatus({ lastSuccessfulSync: new Date() });
    onSyncComplete?.(true);
  };

  const start = (intervalMs: number = 30000) => {
    if (syncInterval) {
      clearInterval(syncInterval);
    }
    syncInterval = setInterval(sync, intervalMs);
    // Also sync immediately
    sync();
  };

  const stop = () => {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
  };

  const forceSync = () => sync();

  return { start, stop, forceSync, getSyncStatus };
}

/**
 * Process a single sync operation
 */
async function processOperation(apiUrl: string, operation: QueuedOperation): Promise<void> {
  const url = `${apiUrl}/api/threads`;

  switch (operation.type) {
    case 'create': {
      const thread = operation.data as Thread;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: thread.file,
          startLine: thread.range.startLine,
          endLine: thread.range.endLine,
          selectedCode: thread.selectedCode,
        }),
      });
      if (!response.ok) {
        throw new Error(`Failed to create thread: ${response.status}`);
      }
      break;
    }
    case 'update': {
      const { id, updates } = operation.data as { id: string; updates: Partial<Thread> };
      const response = await fetch(`${url}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error(`Failed to update thread: ${response.status}`);
      }
      break;
    }
    case 'delete': {
      const id = operation.data as string;
      const response = await fetch(`${url}/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok && response.status !== 404) {
        throw new Error(`Failed to delete thread: ${response.status}`);
      }
      break;
    }
  }
}

