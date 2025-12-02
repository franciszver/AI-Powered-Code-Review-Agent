import { Router } from 'express';
import { body } from 'express-validator';
import { asyncHandler, createError } from '../middleware/errorHandler.js';
import { validationResult } from 'express-validator';
import { generateReview, generateReviewWithFallback, AIServiceFactory } from '../services/ai/index.js';
import * as ThreadModel from '../models/Thread.js';

const router = Router();

// Validation for review endpoint
const reviewValidation = [
  body('threadId').optional().isUUID().withMessage('Invalid thread ID'),
  body('codeContext').isString().notEmpty().withMessage('Code context is required'),
  body('selectedCode').isString().notEmpty().withMessage('Selected code is required'),
  body('language').isString().notEmpty().withMessage('Language is required'),
  body('query').optional().isString(),
  body('fileName').optional().isString(),
  body('additionalFiles').optional().isArray(),
  body('useFallback').optional().isBoolean(),
];

/**
 * Generate AI code review
 * POST /api/ai/review
 */
router.post(
  '/review',
  reviewValidation,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError(
        'Validation failed: ' + errors.array().map((e) => e.msg).join(', '),
        400
      );
    }

    const {
      threadId,
      codeContext,
      selectedCode,
      language,
      query,
      fileName,
      additionalFiles,
      useFallback = false,
    } = req.body;

    // Generate review
    const reviewFn = useFallback ? generateReviewWithFallback : generateReview;
    const review = await reviewFn({
      codeContext,
      selectedCode,
      language,
      query,
      fileName,
      additionalFiles,
    });

    // If threadId is provided, add the AI response as a comment
    if (threadId) {
      const thread = await ThreadModel.getThreadById(threadId);
      if (thread) {
        await ThreadModel.addComment({
          threadId,
          author: 'ai',
          text: review.explanation + 
            (review.suggestions.length > 0 
              ? '\n\nSuggestions:\n' + review.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')
              : ''),
          diff: review.diff,
        });
      }
    }

    res.json(review);
  })
);

/**
 * Get available AI providers
 * GET /api/ai/providers
 */
router.get(
  '/providers',
  asyncHandler(async (_req, res) => {
    const services = AIServiceFactory.getAvailableServices();
    
    res.json({
      available: services.map(s => ({
        provider: s.provider,
        model: s.model,
      })),
      default: process.env.AI_PROVIDER || 'openai',
    });
  })
);

export default router;
