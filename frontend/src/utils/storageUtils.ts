import { Thread } from '../types/thread';

const STORAGE_VERSION = '1.0';

interface StorageData {
  version: string;
  threads: Thread[];
  updatedAt: string;
}

/**
 * Loads threads from localStorage
 */
export function loadThreads(key: string): Thread[] {
  try {
    const data = localStorage.getItem(key);
    if (!data) {
      return [];
    }

    const parsed: StorageData = JSON.parse(data);
    
    // Version check for future migrations
    if (parsed.version !== STORAGE_VERSION) {
      console.warn(`Storage version mismatch: expected ${STORAGE_VERSION}, got ${parsed.version}`);
      // Could add migration logic here in the future
    }

    // Convert date strings back to Date objects
    return parsed.threads.map(thread => ({
      ...thread,
      createdAt: new Date(thread.createdAt),
      updatedAt: new Date(thread.updatedAt),
      comments: thread.comments.map(comment => ({
        ...comment,
        timestamp: new Date(comment.timestamp),
      })),
    }));
  } catch (error) {
    console.error('Failed to load threads from localStorage:', error);
    return [];
  }
}

/**
 * Saves threads to localStorage
 */
export function saveThreads(key: string, threads: Thread[]): boolean {
  try {
    const data: StorageData = {
      version: STORAGE_VERSION,
      threads,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to save threads to localStorage:', error);
    return false;
  }
}

/**
 * Clears threads from localStorage
 */
export function clearStoredThreads(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Failed to clear threads from localStorage:', error);
    return false;
  }
}

/**
 * Gets the storage size used by threads
 */
export function getStorageSize(key: string): number {
  try {
    const data = localStorage.getItem(key);
    return data ? new Blob([data]).size : 0;
  } catch {
    return 0;
  }
}

/**
 * Checks if localStorage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Exports threads as JSON string for download
 */
export function exportThreadsAsJson(threads: Thread[]): string {
  const data: StorageData = {
    version: STORAGE_VERSION,
    threads,
    updatedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Imports threads from JSON string
 */
export function importThreadsFromJson(json: string): Thread[] {
  try {
    const parsed: StorageData = JSON.parse(json);
    
    return parsed.threads.map(thread => ({
      ...thread,
      createdAt: new Date(thread.createdAt),
      updatedAt: new Date(thread.updatedAt),
      comments: thread.comments.map(comment => ({
        ...comment,
        timestamp: new Date(comment.timestamp),
      })),
    }));
  } catch (error) {
    console.error('Failed to import threads from JSON:', error);
    throw new Error('Invalid JSON format');
  }
}

