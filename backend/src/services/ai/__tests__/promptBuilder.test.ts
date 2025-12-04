import { describe, it, expect } from 'vitest';
import {
  buildReviewPrompt,
  getSystemPrompt,
  parseReviewResponse,
  estimateTokenCount,
  truncateContext,
  formatDiff,
} from '../promptBuilder.js';
import type { ReviewInput } from '../types.js';

describe('promptBuilder', () => {
  describe('buildReviewPrompt', () => {
    it('builds basic prompt with code and language', () => {
      const input: ReviewInput = {
        codeContext: 'const x = 1;',
        selectedCode: 'const x = 1;',
        language: 'javascript',
      };

      const prompt = buildReviewPrompt(input);

      expect(prompt).toContain('Language: javascript');
      expect(prompt).toContain('const x = 1;');
      expect(prompt).toContain('Selected code to review');
    });

    it('includes file name when provided', () => {
      const input: ReviewInput = {
        codeContext: 'const x = 1;',
        selectedCode: 'const x = 1;',
        language: 'typescript',
        fileName: 'test.ts',
      };

      const prompt = buildReviewPrompt(input);

      expect(prompt).toContain('File: test.ts');
    });

    it('includes user query when provided', () => {
      const input: ReviewInput = {
        codeContext: 'const x = 1;',
        selectedCode: 'const x = 1;',
        language: 'javascript',
        query: 'Is this code efficient?',
      };

      const prompt = buildReviewPrompt(input);

      expect(prompt).toContain('User question: Is this code efficient?');
    });

    it('includes additional files when provided', () => {
      const input: ReviewInput = {
        codeContext: 'const x = 1;',
        selectedCode: 'const x = 1;',
        language: 'javascript',
        additionalFiles: [
          { name: 'helper.js', content: 'function helper() {}', language: 'javascript' },
          { name: 'utils.ts', content: 'export const PI = 3.14;', language: 'typescript' },
        ],
      };

      const prompt = buildReviewPrompt(input);

      expect(prompt).toContain('Additional files for context');
      expect(prompt).toContain('--- helper.js ---');
      expect(prompt).toContain('function helper() {}');
      expect(prompt).toContain('--- utils.ts ---');
      expect(prompt).toContain('export const PI = 3.14;');
    });

    it('wraps code in markdown code blocks', () => {
      const input: ReviewInput = {
        codeContext: 'print("hello")',
        selectedCode: 'print("hello")',
        language: 'python',
      };

      const prompt = buildReviewPrompt(input);

      expect(prompt).toContain('```python');
      expect(prompt).toContain('```');
    });
  });

  describe('getSystemPrompt', () => {
    it('returns a non-empty system prompt', () => {
      const prompt = getSystemPrompt();

      expect(prompt).toBeTruthy();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(100);
    });

    it('includes instructions for JSON format', () => {
      const prompt = getSystemPrompt();

      expect(prompt).toContain('JSON');
      expect(prompt).toContain('explanation');
      expect(prompt).toContain('suggestions');
    });

    it('includes code review guidelines', () => {
      const prompt = getSystemPrompt();

      expect(prompt).toContain('bugs');
      expect(prompt).toContain('security');
      expect(prompt).toContain('best practices');
    });
  });

  describe('parseReviewResponse', () => {
    it('parses valid JSON response', () => {
      const response = JSON.stringify({
        explanation: 'This code looks good.',
        suggestions: ['Add type annotations', 'Consider error handling'],
        diff: '- old\n+ new',
      });

      const result = parseReviewResponse(response);

      expect(result.explanation).toBe('This code looks good.');
      expect(result.suggestions).toEqual(['Add type annotations', 'Consider error handling']);
      expect(result.diff).toBe('- old\n+ new');
    });

    it('parses JSON embedded in text', () => {
      const response = `Here is my analysis:
      {
        "explanation": "Found an issue.",
        "suggestions": ["Fix the bug"]
      }
      Let me know if you need more details.`;

      const result = parseReviewResponse(response);

      expect(result.explanation).toBe('Found an issue.');
      expect(result.suggestions).toEqual(['Fix the bug']);
    });

    it('handles missing explanation', () => {
      const response = JSON.stringify({
        suggestions: ['Do something'],
      });

      const result = parseReviewResponse(response);

      expect(result.explanation).toBe('No explanation provided.');
    });

    it('handles missing suggestions', () => {
      const response = JSON.stringify({
        explanation: 'Code is fine.',
      });

      const result = parseReviewResponse(response);

      expect(result.suggestions).toEqual([]);
    });

    it('handles invalid suggestions array', () => {
      const response = JSON.stringify({
        explanation: 'Test',
        suggestions: 'not an array',
      });

      const result = parseReviewResponse(response);

      expect(result.suggestions).toEqual([]);
    });

    it('falls back to plain text for invalid JSON', () => {
      const response = 'This is just plain text feedback about the code.';

      const result = parseReviewResponse(response);

      expect(result.explanation).toBe(response);
      expect(result.suggestions).toEqual([]);
      expect(result.diff).toBeUndefined();
    });

    it('handles malformed JSON gracefully', () => {
      const response = '{ broken json "explanation": "test" }';

      const result = parseReviewResponse(response);

      expect(result.explanation).toBe(response);
    });
  });

  describe('estimateTokenCount', () => {
    it('returns positive count for non-empty text', () => {
      const text = 'Hello world';
      const tokens = estimateTokenCount(text);

      expect(tokens).toBeGreaterThan(0);
    });

    it('returns zero for empty string', () => {
      expect(estimateTokenCount('')).toBe(0);
    });

    it('returns higher count for longer text', () => {
      const short = 'short';
      const long = 'this is a much longer piece of text that should have more tokens';

      expect(estimateTokenCount(long)).toBeGreaterThan(estimateTokenCount(short));
    });

    it('handles code with special characters', () => {
      const code = 'const fn = () => { return { a: 1, b: 2 }; };';
      const tokens = estimateTokenCount(code);

      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('truncateContext', () => {
    it('returns original if within limit', () => {
      const context = 'short content';
      const result = truncateContext(context, 1000);

      expect(result).toBe(context);
    });

    it('truncates long content', () => {
      // Use multiline content so truncation works properly
      const lines = Array.from({ length: 500 }, (_, i) => `line ${i}: ${'x'.repeat(50)}`);
      const context = lines.join('\n');
      const result = truncateContext(context, 100);

      expect(result.length).toBeLessThan(context.length);
    });

    it('preserves selection when truncating', () => {
      const lines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`);
      const context = lines.join('\n');
      const result = truncateContext(context, 50, true);

      // Should keep middle lines (selection)
      expect(result).toContain('line 50');
    });

    it('adds truncation indicator when not preserving selection', () => {
      const context = 'x'.repeat(5000);
      const result = truncateContext(context, 100, false);

      expect(result).toContain('... (truncated)');
    });
  });

  describe('formatDiff', () => {
    it('shows unchanged lines with space prefix', () => {
      const original = 'const x = 1;';
      const suggested = 'const x = 1;';

      const diff = formatDiff(original, suggested);

      expect(diff).toBe(' const x = 1;');
    });

    it('shows removed lines with minus prefix', () => {
      const original = 'const x = 1;\nconst y = 2;';
      const suggested = 'const x = 1;';

      const diff = formatDiff(original, suggested);

      expect(diff).toContain('-const y = 2;');
    });

    it('shows added lines with plus prefix', () => {
      const original = 'const x = 1;';
      const suggested = 'const x = 1;\nconst y = 2;';

      const diff = formatDiff(original, suggested);

      expect(diff).toContain('+const y = 2;');
    });

    it('handles complete replacement', () => {
      const original = 'old code';
      const suggested = 'new code';

      const diff = formatDiff(original, suggested);

      expect(diff).toContain('-old code');
      expect(diff).toContain('+new code');
    });

    it('handles multi-line changes', () => {
      const original = 'line 1\nline 2\nline 3';
      const suggested = 'line 1\nmodified\nline 3';

      const diff = formatDiff(original, suggested);

      expect(diff).toContain(' line 1');
      expect(diff).toContain('-line 2');
      expect(diff).toContain('+modified');
      expect(diff).toContain(' line 3');
    });

    it('handles empty original', () => {
      const original = '';
      const suggested = 'new line';

      const diff = formatDiff(original, suggested);

      expect(diff).toContain('+new line');
    });

    it('handles empty suggested', () => {
      const original = 'old line';
      const suggested = '';

      const diff = formatDiff(original, suggested);

      expect(diff).toContain('-old line');
    });
  });
});
