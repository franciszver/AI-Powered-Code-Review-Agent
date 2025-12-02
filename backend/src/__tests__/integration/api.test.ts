import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../server.js';

// Mock the database connection for integration tests
vi.mock('../../db/connection.js', () => ({
    query: vi.fn(),
    transaction: vi.fn(),
    getClient: vi.fn(),
    testConnection: vi.fn().mockResolvedValue(true),
    closePool: vi.fn(),
}));

// Mock the AI services
vi.mock('../../services/ai/index.js', () => ({
    generateReview: vi.fn().mockResolvedValue({
        explanation: 'Test explanation',
        suggestions: ['Test suggestion'],
        diff: '- old\n+ new',
        provider: 'openai',
        model: 'gpt-4',
    }),
    generateReviewWithFallback: vi.fn().mockResolvedValue({
        explanation: 'Test explanation',
        suggestions: ['Test suggestion'],
        diff: '- old\n+ new',
        provider: 'openai',
        model: 'gpt-4',
    }),
    AIServiceFactory: {
        getService: vi.fn(),
        getAvailableServices: vi.fn().mockReturnValue([
            { provider: 'openai', model: 'gpt-4', isAvailable: () => true },
        ]),
        clearInstances: vi.fn(),
    },
}));

// Mock Thread model
vi.mock('../../models/Thread.js', () => ({
    createThread: vi.fn().mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        file: 'test.ts',
        startLine: 1,
        endLine: 5,
        selectedCode: 'const x = 1;',
        resolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
    }),
    getThreadById: vi.fn().mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        file: 'test.ts',
        startLine: 1,
        endLine: 5,
        selectedCode: 'const x = 1;',
        resolved: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
    }),
    getThreads: vi.fn().mockResolvedValue([]),
    updateThread: vi.fn().mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        file: 'test.ts',
        startLine: 1,
        endLine: 5,
        selectedCode: 'const x = 1;',
        resolved: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        comments: [],
    }),
    deleteThread: vi.fn().mockResolvedValue(true),
    addComment: vi.fn().mockResolvedValue({
        id: '223e4567-e89b-12d3-a456-426614174001',
        threadId: '123e4567-e89b-12d3-a456-426614174000',
        author: 'user',
        text: 'Test comment',
        diff: null,
        createdAt: new Date(),
    }),
    getComments: vi.fn().mockResolvedValue([]),
}));

describe('API Integration Tests', () => {
    beforeAll(() => {
        // Setup before all tests
    });

    afterAll(() => {
        // Cleanup after all tests
    });

    describe('Health Check', () => {
        it('GET /health returns ok status', async () => {
            const response = await request(app).get('/health');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('ok');
            expect(response.body.timestamp).toBeDefined();
        });
    });

    describe('Thread API', () => {
        it('POST /api/threads creates a new thread', async () => {
            const response = await request(app)
                .post('/api/threads')
                .send({
                    file: 'test.ts',
                    startLine: 1,
                    endLine: 5,
                    selectedCode: 'const x = 1;',
                });

            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(response.body.file).toBe('test.ts');
        });

        it('GET /api/threads returns thread list', async () => {
            const response = await request(app).get('/api/threads');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        it('GET /api/threads/:id returns a specific thread', async () => {
            const response = await request(app).get(
                '/api/threads/123e4567-e89b-12d3-a456-426614174000'
            );

            expect(response.status).toBe(200);
            expect(response.body.id).toBe('123e4567-e89b-12d3-a456-426614174000');
        });

        it('PUT /api/threads/:id updates a thread', async () => {
            const response = await request(app)
                .put('/api/threads/123e4567-e89b-12d3-a456-426614174000')
                .send({ resolved: true });

            expect(response.status).toBe(200);
            expect(response.body.resolved).toBe(true);
        });

        it('DELETE /api/threads/:id deletes a thread', async () => {
            const response = await request(app).delete(
                '/api/threads/123e4567-e89b-12d3-a456-426614174000'
            );

            expect(response.status).toBe(204);
        });

        it('POST /api/threads/:id/comments adds a comment', async () => {
            const response = await request(app)
                .post('/api/threads/123e4567-e89b-12d3-a456-426614174000/comments')
                .send({
                    author: 'user',
                    text: 'Test comment',
                });

            expect(response.status).toBe(201);
            expect(response.body.text).toBe('Test comment');
        });
    });

    describe('AI API', () => {
        it('POST /api/ai/review generates a code review', async () => {
            const response = await request(app)
                .post('/api/ai/review')
                .send({
                    codeContext: 'const x = 1;\nconst y = 2;',
                    selectedCode: 'const x = 1;',
                    language: 'javascript',
                });

            expect(response.status).toBe(200);
            expect(response.body.explanation).toBeDefined();
            expect(response.body.suggestions).toBeDefined();
        });

        it('GET /api/ai/providers returns available providers', async () => {
            const response = await request(app).get('/api/ai/providers');

            expect(response.status).toBe(200);
            expect(response.body.available).toBeDefined();
            expect(Array.isArray(response.body.available)).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('returns 404 for unknown routes', async () => {
            const response = await request(app).get('/api/unknown');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Not found');
        });

        it('returns 400 for invalid thread creation', async () => {
            const response = await request(app)
                .post('/api/threads')
                .send({
                    file: '',
                    startLine: -1,
                });

            expect(response.status).toBe(400);
        });

        it('returns 400 for invalid UUID', async () => {
            const response = await request(app).get('/api/threads/invalid-uuid');

            expect(response.status).toBe(400);
        });
    });

    describe('CORS', () => {
        it('includes CORS headers', async () => {
            const response = await request(app)
                .options('/api/threads')
                .set('Origin', 'http://localhost:5173');

            expect(response.headers['access-control-allow-origin']).toBeDefined();
        });
    });
});

