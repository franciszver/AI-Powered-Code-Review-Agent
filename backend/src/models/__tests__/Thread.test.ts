import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database connection
vi.mock('../../db/connection.js', () => ({
  query: vi.fn(),
  transaction: vi.fn(),
  getClient: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-123'),
}));

import { query, transaction } from '../../db/connection.js';
import {
  createThread,
  getThreadById,
  getThreads,
  updateThread,
  deleteThread,
  addComment,
  getComments,
} from '../Thread.js';

describe('Thread Model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createThread', () => {
    it('creates a thread without initial comment', async () => {
      const mockThreadRow = {
        id: 'mock-uuid-123',
        file: 'test.ts',
        start_line: 1,
        end_line: 5,
        selected_code: 'const x = 1;',
        resolved: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(transaction).mockImplementation(async (callback) => {
        const mockClient = {
          query: vi.fn().mockResolvedValueOnce({ rows: [mockThreadRow] }),
        };
        return callback(mockClient as any);
      });

      const result = await createThread({
        file: 'test.ts',
        startLine: 1,
        endLine: 5,
        selectedCode: 'const x = 1;',
      });

      expect(result.id).toBe('mock-uuid-123');
      expect(result.file).toBe('test.ts');
      expect(result.comments).toHaveLength(0);
    });

    it('creates a thread with initial comment', async () => {
      const mockThreadRow = {
        id: 'mock-uuid-123',
        file: 'test.ts',
        start_line: 1,
        end_line: 5,
        selected_code: 'const x = 1;',
        resolved: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockCommentRow = {
        id: 'mock-uuid-123',
        thread_id: 'mock-uuid-123',
        author: 'user',
        text: 'Initial comment',
        diff: null,
        created_at: new Date(),
      };

      vi.mocked(transaction).mockImplementation(async (callback) => {
        const mockClient = {
          query: vi.fn()
            .mockResolvedValueOnce({ rows: [mockThreadRow] })
            .mockResolvedValueOnce({ rows: [mockCommentRow] }),
        };
        return callback(mockClient as any);
      });

      const result = await createThread({
        file: 'test.ts',
        startLine: 1,
        endLine: 5,
        selectedCode: 'const x = 1;',
        initialComment: 'Initial comment',
      });

      expect(result.comments).toHaveLength(1);
      expect(result.comments[0].text).toBe('Initial comment');
    });
  });

  describe('getThreadById', () => {
    it('returns thread with comments', async () => {
      const mockThreadRow = {
        id: 'thread-123',
        file: 'test.ts',
        start_line: 1,
        end_line: 5,
        selected_code: 'const x = 1;',
        resolved: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockCommentRows = [
        {
          id: 'comment-1',
          thread_id: 'thread-123',
          author: 'user',
          text: 'Comment 1',
          diff: null,
          created_at: new Date(),
        },
      ];

      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [mockThreadRow], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: mockCommentRows, rowCount: 1 } as any);

      const result = await getThreadById('thread-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('thread-123');
      expect(result?.comments).toHaveLength(1);
    });

    it('returns null for non-existent thread', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await getThreadById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getThreads', () => {
    it('returns all threads with comments', async () => {
      const mockThreadRows = [
        {
          id: 'thread-1',
          file: 'test.ts',
          start_line: 1,
          end_line: 5,
          selected_code: 'code 1',
          resolved: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'thread-2',
          file: 'test.ts',
          start_line: 10,
          end_line: 15,
          selected_code: 'code 2',
          resolved: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const mockCommentRows = [
        {
          id: 'comment-1',
          thread_id: 'thread-1',
          author: 'user',
          text: 'Comment 1',
          diff: null,
          created_at: new Date(),
        },
      ];

      vi.mocked(query)
        .mockResolvedValueOnce({ rows: mockThreadRows, rowCount: 2 } as any)
        .mockResolvedValueOnce({ rows: mockCommentRows, rowCount: 1 } as any);

      const result = await getThreads();

      expect(result).toHaveLength(2);
      expect(result[0].comments).toHaveLength(1);
      expect(result[1].comments).toHaveLength(0);
    });

    it('filters by file', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await getThreads({ file: 'specific.ts' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining(['specific.ts'])
      );
    });

    it('filters by resolved status', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await getThreads({ resolved: true });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining([true])
      );
    });
  });

  describe('updateThread', () => {
    it('updates thread resolved status', async () => {
      const mockThreadRow = {
        id: 'thread-123',
        file: 'test.ts',
        start_line: 1,
        end_line: 5,
        selected_code: 'const x = 1;',
        resolved: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [mockThreadRow], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await updateThread('thread-123', { resolved: true });

      expect(result?.resolved).toBe(true);
    });

    it('returns null for non-existent thread', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await updateThread('non-existent', { resolved: true });

      expect(result).toBeNull();
    });
  });

  describe('deleteThread', () => {
    it('deletes a thread', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rowCount: 1 } as any);

      const result = await deleteThread('thread-123');

      expect(result).toBe(true);
    });

    it('returns false for non-existent thread', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rowCount: 0 } as any);

      const result = await deleteThread('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('addComment', () => {
    it('adds a comment to a thread', async () => {
      const mockCommentRow = {
        id: 'mock-uuid-123',
        thread_id: 'thread-123',
        author: 'user',
        text: 'New comment',
        diff: null,
        created_at: new Date(),
      };

      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [mockCommentRow], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      const result = await addComment({
        threadId: 'thread-123',
        author: 'user',
        text: 'New comment',
      });

      expect(result.text).toBe('New comment');
      expect(result.author).toBe('user');
    });

    it('adds a comment with diff', async () => {
      const mockCommentRow = {
        id: 'mock-uuid-123',
        thread_id: 'thread-123',
        author: 'ai',
        text: 'Suggestion',
        diff: '- old\n+ new',
        created_at: new Date(),
      };

      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [mockCommentRow], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rowCount: 1 } as any);

      const result = await addComment({
        threadId: 'thread-123',
        author: 'ai',
        text: 'Suggestion',
        diff: '- old\n+ new',
      });

      expect(result.diff).toBe('- old\n+ new');
    });
  });

  describe('getComments', () => {
    it('returns comments for a thread', async () => {
      const mockCommentRows = [
        {
          id: 'comment-1',
          thread_id: 'thread-123',
          author: 'user',
          text: 'Comment 1',
          diff: null,
          created_at: new Date(),
        },
        {
          id: 'comment-2',
          thread_id: 'thread-123',
          author: 'ai',
          text: 'Comment 2',
          diff: '- old\n+ new',
          created_at: new Date(),
        },
      ];

      vi.mocked(query).mockResolvedValueOnce({ rows: mockCommentRows, rowCount: 2 } as any);

      const result = await getComments('thread-123');

      expect(result).toHaveLength(2);
      expect(result[0].author).toBe('user');
      expect(result[1].author).toBe('ai');
    });
  });
});

