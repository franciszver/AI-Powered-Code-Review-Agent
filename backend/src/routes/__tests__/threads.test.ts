import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import threadRoutes from '../threads.js';
import { errorHandler } from '../../middleware/errorHandler.js';

// Mock the Thread model
vi.mock('../../models/Thread.js', () => ({
  createThread: vi.fn(),
  getThreadById: vi.fn(),
  getThreads: vi.fn(),
  updateThread: vi.fn(),
  deleteThread: vi.fn(),
  addComment: vi.fn(),
  getComments: vi.fn(),
}));

import * as ThreadModel from '../../models/Thread.js';

const app = express();
app.use(express.json());
app.use('/api/threads', threadRoutes);
app.use(errorHandler);

describe('Thread Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/threads', () => {
    it('creates a new thread', async () => {
      const mockThread = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        file: 'test.ts',
        startLine: 1,
        endLine: 5,
        selectedCode: 'const x = 1;',
        resolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
      };

      vi.mocked(ThreadModel.createThread).mockResolvedValue(mockThread);

      const response = await request(app)
        .post('/api/threads')
        .send({
          file: 'test.ts',
          startLine: 1,
          endLine: 5,
          selectedCode: 'const x = 1;',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe(mockThread.id);
      expect(ThreadModel.createThread).toHaveBeenCalledWith({
        file: 'test.ts',
        startLine: 1,
        endLine: 5,
        selectedCode: 'const x = 1;',
        initialComment: undefined,
      });
    });

    it('returns 400 for invalid input', async () => {
      const response = await request(app)
        .post('/api/threads')
        .send({
          file: '',
          startLine: -1,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Validation failed');
    });
  });

  describe('GET /api/threads/:id', () => {
    it('returns a thread by ID', async () => {
      const mockThread = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        file: 'test.ts',
        startLine: 1,
        endLine: 5,
        selectedCode: 'const x = 1;',
        resolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
      };

      vi.mocked(ThreadModel.getThreadById).mockResolvedValue(mockThread);

      const response = await request(app)
        .get('/api/threads/123e4567-e89b-12d3-a456-426614174000');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(mockThread.id);
    });

    it('returns 404 for non-existent thread', async () => {
      vi.mocked(ThreadModel.getThreadById).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/threads/123e4567-e89b-12d3-a456-426614174000');

      expect(response.status).toBe(404);
    });

    it('returns 400 for invalid UUID', async () => {
      const response = await request(app)
        .get('/api/threads/invalid-id');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/threads', () => {
    it('returns all threads', async () => {
      const mockThreads = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          file: 'test.ts',
          startLine: 1,
          endLine: 5,
          selectedCode: 'const x = 1;',
          resolved: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          comments: [],
        },
      ];

      vi.mocked(ThreadModel.getThreads).mockResolvedValue(mockThreads);

      const response = await request(app).get('/api/threads');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it('filters threads by file', async () => {
      vi.mocked(ThreadModel.getThreads).mockResolvedValue([]);

      await request(app).get('/api/threads?file=test.ts');

      expect(ThreadModel.getThreads).toHaveBeenCalledWith({
        file: 'test.ts',
        resolved: undefined,
        limit: undefined,
        offset: undefined,
      });
    });

    it('filters threads by resolved status', async () => {
      vi.mocked(ThreadModel.getThreads).mockResolvedValue([]);

      await request(app).get('/api/threads?resolved=true');

      expect(ThreadModel.getThreads).toHaveBeenCalledWith({
        file: undefined,
        resolved: true,
        limit: undefined,
        offset: undefined,
      });
    });
  });

  describe('PUT /api/threads/:id', () => {
    it('updates a thread', async () => {
      const mockThread = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        file: 'test.ts',
        startLine: 1,
        endLine: 5,
        selectedCode: 'const x = 1;',
        resolved: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
      };

      vi.mocked(ThreadModel.updateThread).mockResolvedValue(mockThread);

      const response = await request(app)
        .put('/api/threads/123e4567-e89b-12d3-a456-426614174000')
        .send({ resolved: true });

      expect(response.status).toBe(200);
      expect(response.body.resolved).toBe(true);
    });

    it('returns 404 for non-existent thread', async () => {
      vi.mocked(ThreadModel.updateThread).mockResolvedValue(null);

      const response = await request(app)
        .put('/api/threads/123e4567-e89b-12d3-a456-426614174000')
        .send({ resolved: true });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/threads/:id', () => {
    it('deletes a thread', async () => {
      vi.mocked(ThreadModel.deleteThread).mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/threads/123e4567-e89b-12d3-a456-426614174000');

      expect(response.status).toBe(204);
    });

    it('returns 404 for non-existent thread', async () => {
      vi.mocked(ThreadModel.deleteThread).mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/threads/123e4567-e89b-12d3-a456-426614174000');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/threads/:id/comments', () => {
    it('adds a comment to a thread', async () => {
      const mockThread = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        file: 'test.ts',
        startLine: 1,
        endLine: 5,
        selectedCode: 'const x = 1;',
        resolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
      };

      const mockComment = {
        id: '223e4567-e89b-12d3-a456-426614174001',
        threadId: mockThread.id,
        author: 'user' as const,
        text: 'Test comment',
        diff: null,
        createdAt: new Date(),
      };

      vi.mocked(ThreadModel.getThreadById).mockResolvedValue(mockThread);
      vi.mocked(ThreadModel.addComment).mockResolvedValue(mockComment);

      const response = await request(app)
        .post('/api/threads/123e4567-e89b-12d3-a456-426614174000/comments')
        .send({
          author: 'user',
          text: 'Test comment',
        });

      expect(response.status).toBe(201);
      expect(response.body.text).toBe('Test comment');
    });

    it('returns 404 for non-existent thread', async () => {
      vi.mocked(ThreadModel.getThreadById).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/threads/123e4567-e89b-12d3-a456-426614174000/comments')
        .send({
          author: 'user',
          text: 'Test comment',
        });

      expect(response.status).toBe(404);
    });

    it('returns 400 for invalid author', async () => {
      const response = await request(app)
        .post('/api/threads/123e4567-e89b-12d3-a456-426614174000/comments')
        .send({
          author: 'invalid',
          text: 'Test comment',
        });

      expect(response.status).toBe(400);
    });
  });
});

