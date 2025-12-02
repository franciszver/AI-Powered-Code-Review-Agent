import { Router } from 'express';
import { body, param } from 'express-validator';
import * as threadController from '../controllers/threadController.js';

const router = Router();

// Validation middleware
const createThreadValidation = [
  body('file').isString().notEmpty().withMessage('File name is required'),
  body('startLine').isInt({ min: 1 }).withMessage('Start line must be a positive integer'),
  body('endLine').isInt({ min: 1 }).withMessage('End line must be a positive integer'),
  body('selectedCode').isString().notEmpty().withMessage('Selected code is required'),
  body('initialComment').optional().isString(),
];

const updateThreadValidation = [
  param('id').isUUID().withMessage('Invalid thread ID'),
  body('resolved').optional().isBoolean().withMessage('Resolved must be a boolean'),
];

const addCommentValidation = [
  param('id').isUUID().withMessage('Invalid thread ID'),
  body('author').isIn(['user', 'ai']).withMessage('Author must be "user" or "ai"'),
  body('text').isString().notEmpty().withMessage('Comment text is required'),
  body('diff').optional().isString(),
];

const idParamValidation = [
  param('id').isUUID().withMessage('Invalid thread ID'),
];

// Routes
router.post('/', createThreadValidation, threadController.createThread);
router.get('/', threadController.getThreads);
router.get('/:id', idParamValidation, threadController.getThread);
router.put('/:id', updateThreadValidation, threadController.updateThread);
router.delete('/:id', idParamValidation, threadController.deleteThread);
router.post('/:id/comments', addCommentValidation, threadController.addComment);
router.get('/:id/comments', idParamValidation, threadController.getComments);

export default router;

