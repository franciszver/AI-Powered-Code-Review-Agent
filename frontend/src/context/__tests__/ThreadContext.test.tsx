import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ThreadProvider, useThreads } from '../ThreadContext';
import { ReactNode } from 'react';

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

describe('ThreadContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ThreadProvider storageKey="test-threads">{children}</ThreadProvider>
  );

  describe('createThread', () => {
    it('creates a new thread', () => {
      const { result } = renderHook(() => useThreads(), { wrapper });

      act(() => {
        result.current.createThread({
          file: 'test.ts',
          range: { startLine: 1, endLine: 5 },
          selectedCode: 'const x = 1;',
        });
      });

      expect(result.current.state.threads).toHaveLength(1);
      expect(result.current.state.threads[0].file).toBe('test.ts');
      expect(result.current.state.threads[0].range).toEqual({ startLine: 1, endLine: 5 });
    });

    it('creates thread with initial comment', () => {
      const { result } = renderHook(() => useThreads(), { wrapper });

      act(() => {
        result.current.createThread({
          file: 'test.ts',
          range: { startLine: 1, endLine: 5 },
          selectedCode: 'const x = 1;',
          initialComment: 'What does this do?',
        });
      });

      expect(result.current.state.threads[0].comments).toHaveLength(1);
      expect(result.current.state.threads[0].comments[0].text).toBe('What does this do?');
      expect(result.current.state.threads[0].comments[0].author).toBe('user');
    });

    it('sets new thread as active', () => {
      const { result } = renderHook(() => useThreads(), { wrapper });

      act(() => {
        result.current.createThread({
          file: 'test.ts',
          range: { startLine: 1, endLine: 5 },
          selectedCode: 'const x = 1;',
        });
      });

      expect(result.current.state.activeThreadId).toBe(result.current.state.threads[0].id);
    });
  });

  describe('deleteThread', () => {
    it('deletes a thread', () => {
      const { result } = renderHook(() => useThreads(), { wrapper });

      let threadId: string;
      act(() => {
        const thread = result.current.createThread({
          file: 'test.ts',
          range: { startLine: 1, endLine: 5 },
          selectedCode: 'const x = 1;',
        });
        threadId = thread.id;
      });

      expect(result.current.state.threads).toHaveLength(1);

      act(() => {
        result.current.deleteThread(threadId);
      });

      expect(result.current.state.threads).toHaveLength(0);
    });

    it('clears active thread if deleted', () => {
      const { result } = renderHook(() => useThreads(), { wrapper });

      let threadId: string;
      act(() => {
        const thread = result.current.createThread({
          file: 'test.ts',
          range: { startLine: 1, endLine: 5 },
          selectedCode: 'const x = 1;',
        });
        threadId = thread.id;
      });

      expect(result.current.state.activeThreadId).toBe(threadId);

      act(() => {
        result.current.deleteThread(threadId);
      });

      expect(result.current.state.activeThreadId).toBeNull();
    });
  });

  describe('addComment', () => {
    it('adds a comment to a thread', () => {
      const { result } = renderHook(() => useThreads(), { wrapper });

      let threadId: string;
      act(() => {
        const thread = result.current.createThread({
          file: 'test.ts',
          range: { startLine: 1, endLine: 5 },
          selectedCode: 'const x = 1;',
        });
        threadId = thread.id;
      });

      act(() => {
        result.current.addComment({
          threadId,
          text: 'This is a comment',
          author: 'user',
        });
      });

      expect(result.current.state.threads[0].comments).toHaveLength(1);
      expect(result.current.state.threads[0].comments[0].text).toBe('This is a comment');
    });

    it('adds AI comment with diff', () => {
      const { result } = renderHook(() => useThreads(), { wrapper });

      let threadId: string;
      act(() => {
        const thread = result.current.createThread({
          file: 'test.ts',
          range: { startLine: 1, endLine: 5 },
          selectedCode: 'const x = 1;',
        });
        threadId = thread.id;
      });

      act(() => {
        result.current.addComment({
          threadId,
          text: 'Here is a suggestion',
          author: 'ai',
          diff: '- const x = 1;\n+ const x: number = 1;',
        });
      });

      expect(result.current.state.threads[0].comments[0].author).toBe('ai');
      expect(result.current.state.threads[0].comments[0].diff).toBe(
        '- const x = 1;\n+ const x: number = 1;'
      );
    });
  });

  describe('resolveThread / unresolveThread', () => {
    it('resolves a thread', () => {
      const { result } = renderHook(() => useThreads(), { wrapper });

      let threadId: string;
      act(() => {
        const thread = result.current.createThread({
          file: 'test.ts',
          range: { startLine: 1, endLine: 5 },
          selectedCode: 'const x = 1;',
        });
        threadId = thread.id;
      });

      expect(result.current.state.threads[0].resolved).toBe(false);

      act(() => {
        result.current.resolveThread(threadId);
      });

      expect(result.current.state.threads[0].resolved).toBe(true);
    });

    it('unresolves a thread', () => {
      const { result } = renderHook(() => useThreads(), { wrapper });

      let threadId: string;
      act(() => {
        const thread = result.current.createThread({
          file: 'test.ts',
          range: { startLine: 1, endLine: 5 },
          selectedCode: 'const x = 1;',
        });
        threadId = thread.id;
      });

      act(() => {
        result.current.resolveThread(threadId);
      });

      expect(result.current.state.threads[0].resolved).toBe(true);

      act(() => {
        result.current.unresolveThread(threadId);
      });

      expect(result.current.state.threads[0].resolved).toBe(false);
    });
  });

  describe('getThreadsForFile', () => {
    it('returns threads for a specific file', () => {
      const { result } = renderHook(() => useThreads(), { wrapper });

      act(() => {
        result.current.createThread({
          file: 'test1.ts',
          range: { startLine: 1, endLine: 5 },
          selectedCode: 'code 1',
        });
        result.current.createThread({
          file: 'test2.ts',
          range: { startLine: 1, endLine: 5 },
          selectedCode: 'code 2',
        });
        result.current.createThread({
          file: 'test1.ts',
          range: { startLine: 10, endLine: 15 },
          selectedCode: 'code 3',
        });
      });

      const threads = result.current.getThreadsForFile('test1.ts');
      expect(threads).toHaveLength(2);
      expect(threads.every(t => t.file === 'test1.ts')).toBe(true);
    });
  });

  describe('getThreadsForRange', () => {
    it('returns threads overlapping with a range', () => {
      const { result } = renderHook(() => useThreads(), { wrapper });

      act(() => {
        result.current.createThread({
          file: 'test.ts',
          range: { startLine: 1, endLine: 5 },
          selectedCode: 'code 1',
        });
        result.current.createThread({
          file: 'test.ts',
          range: { startLine: 10, endLine: 15 },
          selectedCode: 'code 2',
        });
        result.current.createThread({
          file: 'test.ts',
          range: { startLine: 4, endLine: 8 },
          selectedCode: 'code 3',
        });
      });

      const threads = result.current.getThreadsForRange('test.ts', {
        startLine: 3,
        endLine: 6,
      });
      
      expect(threads).toHaveLength(2); // Thread 1 (1-5) and Thread 3 (4-8)
    });
  });

  describe('clearThreads', () => {
    it('clears all threads', () => {
      const { result } = renderHook(() => useThreads(), { wrapper });

      act(() => {
        result.current.createThread({
          file: 'test1.ts',
          range: { startLine: 1, endLine: 5 },
          selectedCode: 'code 1',
        });
        result.current.createThread({
          file: 'test2.ts',
          range: { startLine: 1, endLine: 5 },
          selectedCode: 'code 2',
        });
      });

      expect(result.current.state.threads).toHaveLength(2);

      act(() => {
        result.current.clearThreads();
      });

      expect(result.current.state.threads).toHaveLength(0);
      expect(result.current.state.activeThreadId).toBeNull();
    });
  });

  describe('useThreads hook', () => {
    it('throws error when used outside provider', () => {
      expect(() => {
        renderHook(() => useThreads());
      }).toThrow('useThreads must be used within a ThreadProvider');
    });
  });
});

