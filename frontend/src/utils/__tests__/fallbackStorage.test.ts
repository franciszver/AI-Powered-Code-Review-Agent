import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSyncQueue,
  addToSyncQueue,
  removeFromSyncQueue,
  clearSyncQueue,
  mergeThreads,
  getSyncStatus,
} from '../fallbackStorage';
import { Thread } from '../../types/thread';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => 'mock-uuid-' + Math.random().toString(36).substr(2, 9),
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true,
});

const createMockThread = (id: string, updatedAt: Date): Thread => ({
  id,
  file: 'test.ts',
  range: { startLine: 1, endLine: 5 },
  selectedCode: 'code',
  comments: [],
  createdAt: new Date(),
  updatedAt,
  resolved: false,
});

describe('fallbackStorage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('getSyncQueue', () => {
    it('returns empty array when no queue exists', () => {
      const queue = getSyncQueue();
      expect(queue).toEqual([]);
    });

    it('returns parsed queue from localStorage', () => {
      const mockQueue = [
        {
          id: 'op-1',
          type: 'create',
          data: { id: 'thread-1' },
          timestamp: new Date().toISOString(),
          retryCount: 0,
        },
      ];
      localStorageMock.setItem('code-review-sync-queue', JSON.stringify(mockQueue));

      const queue = getSyncQueue();

      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe('op-1');
      expect(queue[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('addToSyncQueue', () => {
    it('adds operation to queue', () => {
      addToSyncQueue({
        type: 'create',
        data: { id: 'thread-1' },
      });

      const queue = getSyncQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].type).toBe('create');
      expect(queue[0].retryCount).toBe(0);
    });

    it('preserves existing operations', () => {
      addToSyncQueue({ type: 'create', data: { id: 'thread-1' } });
      addToSyncQueue({ type: 'update', data: { id: 'thread-2', updates: {} } });

      const queue = getSyncQueue();
      expect(queue).toHaveLength(2);
    });
  });

  describe('removeFromSyncQueue', () => {
    it('removes operation from queue', () => {
      addToSyncQueue({ type: 'create', data: { id: 'thread-1' } });
      const queue = getSyncQueue();
      const opId = queue[0].id;

      removeFromSyncQueue(opId);

      expect(getSyncQueue()).toHaveLength(0);
    });

    it('only removes specified operation', () => {
      addToSyncQueue({ type: 'create', data: { id: 'thread-1' } });
      addToSyncQueue({ type: 'create', data: { id: 'thread-2' } });
      const queue = getSyncQueue();

      removeFromSyncQueue(queue[0].id);

      expect(getSyncQueue()).toHaveLength(1);
    });
  });

  describe('clearSyncQueue', () => {
    it('clears all operations', () => {
      addToSyncQueue({ type: 'create', data: { id: 'thread-1' } });
      addToSyncQueue({ type: 'create', data: { id: 'thread-2' } });

      clearSyncQueue();

      expect(getSyncQueue()).toHaveLength(0);
    });
  });

  describe('mergeThreads', () => {
    it('combines unique threads from both sources', () => {
      const local = [createMockThread('thread-1', new Date('2024-01-01'))];
      const remote = [createMockThread('thread-2', new Date('2024-01-01'))];

      const merged = mergeThreads(local, remote);

      expect(merged).toHaveLength(2);
    });

    it('prefers newer local thread over older remote', () => {
      const local = [createMockThread('thread-1', new Date('2024-01-02'))];
      const remote = [createMockThread('thread-1', new Date('2024-01-01'))];

      const merged = mergeThreads(local, remote);

      expect(merged).toHaveLength(1);
      expect(merged[0].updatedAt).toEqual(new Date('2024-01-02'));
    });

    it('prefers newer remote thread over older local', () => {
      const local = [createMockThread('thread-1', new Date('2024-01-01'))];
      const remote = [createMockThread('thread-1', new Date('2024-01-02'))];

      const merged = mergeThreads(local, remote);

      expect(merged).toHaveLength(1);
      expect(merged[0].updatedAt).toEqual(new Date('2024-01-02'));
    });

    it('handles empty arrays', () => {
      expect(mergeThreads([], [])).toEqual([]);
      expect(mergeThreads([createMockThread('1', new Date())], [])).toHaveLength(1);
      expect(mergeThreads([], [createMockThread('1', new Date())])).toHaveLength(1);
    });
  });

  describe('getSyncStatus', () => {
    it('returns status with pending changes count', () => {
      addToSyncQueue({ type: 'create', data: { id: 'thread-1' } });
      addToSyncQueue({ type: 'update', data: { id: 'thread-2', updates: {} } });

      const status = getSyncStatus();

      expect(status.pendingChanges).toBe(2);
      expect(status.isOnline).toBe(true);
    });

    it('returns null dates when no sync has occurred', () => {
      const status = getSyncStatus();

      expect(status.lastSyncAttempt).toBeNull();
      expect(status.lastSuccessfulSync).toBeNull();
    });
  });
});

