import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadThreads,
  saveThreads,
  clearStoredThreads,
  getStorageSize,
  isStorageAvailable,
  exportThreadsAsJson,
  importThreadsFromJson,
} from '../storageUtils';
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
    get store() {
      return store;
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('storageUtils', () => {
  const mockThread: Thread = {
    id: 'thread-1',
    file: 'test.ts',
    range: { startLine: 1, endLine: 5 },
    selectedCode: 'const x = 1;',
    comments: [
      {
        id: 'comment-1',
        author: 'user',
        text: 'Test comment',
        timestamp: new Date('2024-01-01T10:00:00'),
      },
    ],
    createdAt: new Date('2024-01-01T10:00:00'),
    updatedAt: new Date('2024-01-01T10:00:00'),
    resolved: false,
  };

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('saveThreads', () => {
    it('saves threads to localStorage', () => {
      const result = saveThreads('test-key', [mockThread]);
      
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'test-key',
        expect.any(String)
      );
    });

    it('saves with correct version', () => {
      saveThreads('test-key', [mockThread]);
      
      const savedData = JSON.parse(localStorageMock.store['test-key']);
      expect(savedData.version).toBe('1.0');
    });

    it('saves threads array', () => {
      saveThreads('test-key', [mockThread]);
      
      const savedData = JSON.parse(localStorageMock.store['test-key']);
      expect(savedData.threads).toHaveLength(1);
      expect(savedData.threads[0].id).toBe('thread-1');
    });
  });

  describe('loadThreads', () => {
    it('loads threads from localStorage', () => {
      saveThreads('test-key', [mockThread]);
      
      const threads = loadThreads('test-key');
      
      expect(threads).toHaveLength(1);
      expect(threads[0].id).toBe('thread-1');
    });

    it('converts date strings to Date objects', () => {
      saveThreads('test-key', [mockThread]);
      
      const threads = loadThreads('test-key');
      
      expect(threads[0].createdAt).toBeInstanceOf(Date);
      expect(threads[0].updatedAt).toBeInstanceOf(Date);
      expect(threads[0].comments[0].timestamp).toBeInstanceOf(Date);
    });

    it('returns empty array when key does not exist', () => {
      const threads = loadThreads('nonexistent-key');
      
      expect(threads).toEqual([]);
    });

    it('returns empty array on parse error', () => {
      localStorageMock.store['test-key'] = 'invalid json';
      
      const threads = loadThreads('test-key');
      
      expect(threads).toEqual([]);
    });
  });

  describe('clearStoredThreads', () => {
    it('removes threads from localStorage', () => {
      saveThreads('test-key', [mockThread]);
      
      const result = clearStoredThreads('test-key');
      
      expect(result).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-key');
    });
  });

  describe('getStorageSize', () => {
    it('returns size of stored data', () => {
      saveThreads('test-key', [mockThread]);
      
      const size = getStorageSize('test-key');
      
      expect(size).toBeGreaterThan(0);
    });

    it('returns 0 for nonexistent key', () => {
      const size = getStorageSize('nonexistent-key');
      
      expect(size).toBe(0);
    });
  });

  describe('isStorageAvailable', () => {
    it('returns true when localStorage is available', () => {
      expect(isStorageAvailable()).toBe(true);
    });
  });

  describe('exportThreadsAsJson', () => {
    it('exports threads as JSON string', () => {
      const json = exportThreadsAsJson([mockThread]);
      const parsed = JSON.parse(json);
      
      expect(parsed.version).toBe('1.0');
      expect(parsed.threads).toHaveLength(1);
      expect(parsed.threads[0].id).toBe('thread-1');
    });

    it('produces formatted JSON', () => {
      const json = exportThreadsAsJson([mockThread]);
      
      expect(json).toContain('\n');
    });
  });

  describe('importThreadsFromJson', () => {
    it('imports threads from JSON string', () => {
      const json = exportThreadsAsJson([mockThread]);
      
      const threads = importThreadsFromJson(json);
      
      expect(threads).toHaveLength(1);
      expect(threads[0].id).toBe('thread-1');
    });

    it('converts date strings to Date objects', () => {
      const json = exportThreadsAsJson([mockThread]);
      
      const threads = importThreadsFromJson(json);
      
      expect(threads[0].createdAt).toBeInstanceOf(Date);
      expect(threads[0].comments[0].timestamp).toBeInstanceOf(Date);
    });

    it('throws error for invalid JSON', () => {
      expect(() => importThreadsFromJson('invalid json')).toThrow('Invalid JSON format');
    });
  });
});

