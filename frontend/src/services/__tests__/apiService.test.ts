import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ApiError,
  createThread,
  getThread,
  getThreads,
  updateThread,
  deleteThread,
  addComment,
  generateReview,
  scanFile,
  getAIProviders,
  checkHealth,
} from '../apiService';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('apiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('ApiError', () => {
    it('creates error with message and status code', () => {
      const error = new ApiError('Not found', 404);

      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('ApiError');
    });

    it('includes optional details', () => {
      const details = { field: 'email', error: 'invalid' };
      const error = new ApiError('Validation failed', 400, details);

      expect(error.details).toEqual(details);
    });

    it('is an instance of Error', () => {
      const error = new ApiError('Test', 500);

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('createThread', () => {
    it('creates a new thread successfully', async () => {
      const mockThread = {
        id: 'thread-1',
        file: 'test.ts',
        startLine: 1,
        endLine: 5,
        selectedCode: 'const x = 1;',
        resolved: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        comments: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockThread),
      });

      const result = await createThread({
        file: 'test.ts',
        startLine: 1,
        endLine: 5,
        selectedCode: 'const x = 1;',
      });

      expect(result).toEqual(mockThread);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/threads'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('includes initial comment when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'thread-1' }),
      });

      await createThread({
        file: 'test.ts',
        startLine: 1,
        endLine: 5,
        selectedCode: 'code',
        initialComment: 'What does this do?',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('initialComment'),
        })
      );
    });
  });

  describe('getThread', () => {
    it('fetches a thread by ID', async () => {
      const mockThread = { id: 'thread-123', file: 'test.ts' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockThread),
      });

      const result = await getThread('thread-123');

      expect(result).toEqual(mockThread);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/threads/thread-123'),
        expect.any(Object)
      );
    });

    it('throws ApiError on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Thread not found' }),
      });

      await expect(getThread('nonexistent')).rejects.toThrow(ApiError);
    });
  });

  describe('getThreads', () => {
    it('fetches all threads', async () => {
      const mockThreads = [{ id: 'thread-1' }, { id: 'thread-2' }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockThreads),
      });

      const result = await getThreads();

      expect(result).toEqual(mockThreads);
    });

    it('applies file filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await getThreads({ file: 'test.ts' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('file=test.ts'),
        expect.any(Object)
      );
    });

    it('applies resolved filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await getThreads({ resolved: true });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('resolved=true'),
        expect.any(Object)
      );
    });

    it('applies pagination options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await getThreads({ limit: 10, offset: 20 });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('limit=10');
      expect(url).toContain('offset=20');
    });
  });

  describe('updateThread', () => {
    it('updates thread resolved status', async () => {
      const mockThread = { id: 'thread-1', resolved: true };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockThread),
      });

      const result = await updateThread('thread-1', { resolved: true });

      expect(result.resolved).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/threads/thread-1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ resolved: true }),
        })
      );
    });
  });

  describe('deleteThread', () => {
    it('deletes a thread', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: () => Promise.resolve({}),
      });

      await deleteThread('thread-1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/threads/thread-1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('addComment', () => {
    it('adds a user comment', async () => {
      const mockComment = {
        id: 'comment-1',
        threadId: 'thread-1',
        author: 'user',
        text: 'My comment',
        createdAt: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockComment),
      });

      const result = await addComment('thread-1', {
        author: 'user',
        text: 'My comment',
      });

      expect(result).toEqual(mockComment);
    });

    it('adds an AI comment with diff', async () => {
      const mockComment = {
        id: 'comment-2',
        threadId: 'thread-1',
        author: 'ai',
        text: 'AI response',
        diff: '- old\n+ new',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockComment),
      });

      const result = await addComment('thread-1', {
        author: 'ai',
        text: 'AI response',
        diff: '- old\n+ new',
      });

      expect(result.diff).toBe('- old\n+ new');
    });
  });

  describe('generateReview', () => {
    it('generates an AI review', async () => {
      const mockReview = {
        explanation: 'This code is well-written.',
        suggestions: ['Add type annotations'],
        provider: 'openai',
        model: 'gpt-4',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockReview),
      });

      const result = await generateReview({
        codeContext: 'const x = 1;',
        selectedCode: 'const x = 1;',
        language: 'javascript',
      });

      expect(result).toEqual(mockReview);
    });

    it('includes optional fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ explanation: 'test' }),
      });

      await generateReview({
        codeContext: 'code',
        selectedCode: 'code',
        language: 'typescript',
        fileName: 'test.ts',
        query: 'Is this optimal?',
        threadId: 'thread-1',
        useFallback: true,
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.fileName).toBe('test.ts');
      expect(body.query).toBe('Is this optimal?');
      expect(body.threadId).toBe('thread-1');
      expect(body.useFallback).toBe(true);
    });
  });

  describe('scanFile', () => {
    it('scans a file for issues', async () => {
      const mockResponse = {
        issues: [
          {
            id: 'issue-1',
            startLine: 5,
            endLine: 7,
            severity: 'error',
            message: 'Potential null reference',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await scanFile({
        code: 'const x = null; x.foo();',
        language: 'javascript',
        fileName: 'test.js',
      });

      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe('error');
    });

    it('calls correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ issues: [] }),
      });

      await scanFile({
        code: 'code',
        language: 'typescript',
        fileName: 'test.ts',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/ai/scan'),
        expect.any(Object)
      );
    });
  });

  describe('getAIProviders', () => {
    it('fetches available AI providers', async () => {
      const mockProviders = {
        available: [
          { provider: 'openai', model: 'gpt-4' },
        ],
        default: 'openai',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProviders),
      });

      const result = await getAIProviders();

      expect(result.available).toHaveLength(1);
      expect(result.default).toBe('openai');
    });
  });

  describe('checkHealth', () => {
    it('returns health status', async () => {
      const mockHealth = {
        status: 'ok',
        timestamp: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHealth),
      });

      const result = await checkHealth();

      expect(result.status).toBe('ok');
    });
  });

  describe('error handling', () => {
    it('throws ApiError on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      });

      await expect(checkHealth()).rejects.toThrow(ApiError);
    });

    it('extracts error message from response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid request body' }),
      });

      try {
        await checkHealth();
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe('Invalid request body');
        expect((error as ApiError).statusCode).toBe(400);
      }
    });

    it('handles JSON parse errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(checkHealth()).rejects.toThrow(ApiError);
    });

    it('uses default error message when none provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: () => Promise.resolve({}),
      });

      try {
        await checkHealth();
      } catch (error) {
        expect((error as ApiError).message).toContain('502');
      }
    });
  });
});

