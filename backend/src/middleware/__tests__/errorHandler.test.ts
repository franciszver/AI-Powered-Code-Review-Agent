import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { errorHandler, createError, asyncHandler, AppError } from '../errorHandler.js';

describe('errorHandler middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: ReturnType<typeof vi.fn>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let consoleSpy: any;

    beforeEach(() => {
        mockReq = {};
        mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };
        mockNext = vi.fn();
        consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    describe('errorHandler', () => {
        it('returns 500 for generic errors', () => {
            const error = new Error('Something went wrong');

            errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Something went wrong',
            });
        });

        it('uses custom status code from AppError', () => {
            const error: AppError = new Error('Not found');
            error.statusCode = 404;

            errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Not found',
            });
        });

        it('uses default message for errors without message', () => {
            const error = { statusCode: 400 } as AppError;

            errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Internal server error',
            });
        });

        it('logs error to console', () => {
            const error = new Error('Test error');

            errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

            expect(consoleSpy).toHaveBeenCalled();
        });

        it('includes stack trace in development mode', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            const error = new Error('Dev error');
            error.stack = 'Error: Dev error\n    at test.js:1:1';

            errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Dev error',
                stack: 'Error: Dev error\n    at test.js:1:1',
            });

            process.env.NODE_ENV = originalEnv;
        });

        it('excludes stack trace in production mode', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';

            const error = new Error('Prod error');
            error.stack = 'Error: Prod error\n    at test.js:1:1';

            errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Prod error',
            });

            process.env.NODE_ENV = originalEnv;
        });

        it('handles various HTTP status codes', () => {
            const testCases = [
                { statusCode: 400, message: 'Bad Request' },
                { statusCode: 401, message: 'Unauthorized' },
                { statusCode: 403, message: 'Forbidden' },
                { statusCode: 404, message: 'Not Found' },
                { statusCode: 422, message: 'Unprocessable Entity' },
                { statusCode: 500, message: 'Internal Server Error' },
                { statusCode: 503, message: 'Service Unavailable' },
            ];

            testCases.forEach(({ statusCode, message }) => {
                const error: AppError = new Error(message);
                error.statusCode = statusCode;

                vi.clearAllMocks();
                errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

                expect(mockRes.status).toHaveBeenCalledWith(statusCode);
                expect(mockRes.json).toHaveBeenCalledWith({ error: message });
            });
        });
    });

    describe('createError', () => {
        it('creates error with message and default status 500', () => {
            const error = createError('Test error');

            expect(error.message).toBe('Test error');
            expect(error.statusCode).toBe(500);
            expect(error.isOperational).toBe(true);
        });

        it('creates error with custom status code', () => {
            const error = createError('Not found', 404);

            expect(error.message).toBe('Not found');
            expect(error.statusCode).toBe(404);
        });

        it('creates error with 400 bad request', () => {
            const error = createError('Invalid input', 400);

            expect(error.statusCode).toBe(400);
            expect(error.isOperational).toBe(true);
        });

        it('marks error as operational', () => {
            const error = createError('Operational error', 500);

            expect(error.isOperational).toBe(true);
        });

        it('returns an Error instance', () => {
            const error = createError('Test');

            expect(error).toBeInstanceOf(Error);
        });
    });

    describe('asyncHandler', () => {
        it('wraps async function and handles success', async () => {
            const asyncFn = vi.fn().mockResolvedValue(undefined);
            const wrapped = asyncHandler(asyncFn);

            wrapped(mockReq as Request, mockRes as Response, mockNext);
            // Allow promise to resolve
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('catches errors and passes to next', async () => {
            const error = new Error('Async error');
            const asyncFn = vi.fn().mockRejectedValue(error);
            const wrapped = asyncHandler(asyncFn);

            wrapped(mockReq as Request, mockRes as Response, mockNext);
            // Allow promise to reject and catch to execute
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(mockNext).toHaveBeenCalledWith(error);
        });

        it('handles synchronous errors in async function', async () => {
            const error = new Error('Sync error in async');
            const asyncFn = vi.fn().mockImplementation(async () => {
                throw error;
            });
            const wrapped = asyncHandler(asyncFn);

            wrapped(mockReq as Request, mockRes as Response, mockNext);
            // Allow promise to reject
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(mockNext).toHaveBeenCalledWith(error);
        });

        it('passes through req, res, next to handler', async () => {
            const asyncFn = vi.fn().mockResolvedValue(undefined);
            const wrapped = asyncHandler(asyncFn);

            const customReq = { params: { id: '123' } } as unknown as Request;
            const customRes = { status: vi.fn() } as unknown as Response;
            const customNext = vi.fn();

            wrapped(customReq, customRes, customNext);
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(asyncFn).toHaveBeenCalledWith(customReq, customRes, customNext);
        });

        it('works with resolved promises returning data', async () => {
            const asyncFn = vi.fn().mockImplementation(async (_req, res: Response) => {
                res.json({ data: 'test' });
            });
            const wrapped = asyncHandler(asyncFn);

            wrapped(mockReq as Request, mockRes as Response, mockNext);
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(mockRes.json).toHaveBeenCalledWith({ data: 'test' });
        });
    });
});

