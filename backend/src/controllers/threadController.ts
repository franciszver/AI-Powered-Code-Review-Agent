import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import * as ThreadModel from '../models/Thread.js';
import { createError, asyncHandler } from '../middleware/errorHandler.js';

/**
 * Create a new thread
 * POST /api/threads
 */
export const createThread = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed: ' + errors.array().map(e => e.msg).join(', '), 400);
  }

  const { file, startLine, endLine, selectedCode, initialComment } = req.body;

  const thread = await ThreadModel.createThread({
    file,
    startLine,
    endLine,
    selectedCode,
    initialComment,
  });

  res.status(201).json(thread);
});

/**
 * Get a thread by ID
 * GET /api/threads/:id
 */
export const getThread = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed: ' + errors.array().map(e => e.msg).join(', '), 400);
  }

  const { id } = req.params;

  const thread = await ThreadModel.getThreadById(id);

  if (!thread) {
    throw createError('Thread not found', 404);
  }

  res.json(thread);
});

/**
 * Get all threads with optional filtering
 * GET /api/threads
 */
export const getThreads = asyncHandler(async (req: Request, res: Response) => {
  const { file, resolved, limit, offset } = req.query;

  const threads = await ThreadModel.getThreads({
    file: file as string | undefined,
    resolved: resolved !== undefined ? resolved === 'true' : undefined,
    limit: limit ? parseInt(limit as string, 10) : undefined,
    offset: offset ? parseInt(offset as string, 10) : undefined,
  });

  res.json(threads);
});

/**
 * Update a thread
 * PUT /api/threads/:id
 */
export const updateThread = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed: ' + errors.array().map(e => e.msg).join(', '), 400);
  }

  const { id } = req.params;
  const { resolved } = req.body;

  const thread = await ThreadModel.updateThread(id, { resolved });

  if (!thread) {
    throw createError('Thread not found', 404);
  }

  res.json(thread);
});

/**
 * Delete a thread
 * DELETE /api/threads/:id
 */
export const deleteThread = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed: ' + errors.array().map(e => e.msg).join(', '), 400);
  }

  const { id } = req.params;

  const deleted = await ThreadModel.deleteThread(id);

  if (!deleted) {
    throw createError('Thread not found', 404);
  }

  res.status(204).send();
});

/**
 * Add a comment to a thread
 * POST /api/threads/:id/comments
 */
export const addComment = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed: ' + errors.array().map(e => e.msg).join(', '), 400);
  }

  const { id } = req.params;
  const { author, text, diff } = req.body;

  // Verify thread exists
  const thread = await ThreadModel.getThreadById(id);
  if (!thread) {
    throw createError('Thread not found', 404);
  }

  const comment = await ThreadModel.addComment({
    threadId: id,
    author,
    text,
    diff,
  });

  res.status(201).json(comment);
});

/**
 * Get comments for a thread
 * GET /api/threads/:id/comments
 */
export const getComments = asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed: ' + errors.array().map(e => e.msg).join(', '), 400);
  }

  const { id } = req.params;

  // Verify thread exists
  const thread = await ThreadModel.getThreadById(id);
  if (!thread) {
    throw createError('Thread not found', 404);
  }

  const comments = await ThreadModel.getComments(id);

  res.json(comments);
});

