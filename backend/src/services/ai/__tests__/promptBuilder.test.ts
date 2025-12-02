import { describe, it, expect } from 'vitest';
import {
  buildReviewPrompt,
  getSystemPrompt,
  parseReviewResponse,
  estimateTokenCount,
  truncateContext,
  formatDiff,
} from '../promptBuilder.js';

describe('promptBuilder', () => {
  describe('getSystemPrompt', () => {
    it('returns a non-empty system prompt', () => {
      const prompt = getSystemPrompt();
      expect(prompt).toBeTruthy();
      expect(prompt.length).toBeGreaterThan(100);
    });

    it('includes JSON format instruction', () => {
      const prompt = getSystemPrompt();
      expect(prompt).toContain('JSON');
    });
  });

  describe('buildReviewPrompt', () => {
    it('builds a prompt with basic input', () => {
      const prompt = buildReviewPrompt({
        codeContext: 'const x = 1;\nconst y = 2;',
        selectedCode: 'const x = 1;',
        language: 'javascript',
      });

      expect(prompt).toContain('javascript');
      expect(prompt).toContain('const x = 1;');
      expect(prompt).toContain('Code context');
      expect(prompt).toContain('Selected code');
    });

    it('includes file name when provided', () => {
      const prompt = buildReviewPrompt({
        codeContext: 'code',
        selectedCode: 'selected',
        language: 'typescript',
        fileName: 'test.ts',
      });

      expect(prompt).toContain('File: test.ts');
    });

    it('includes user query when provided', () => {
      const prompt = buildReviewPrompt({
        codeContext: 'code',
        selectedCode: 'selected',
        language: 'python',
        query: 'Is this efficient?',
      });

      expect(prompt).toContain('User question: Is this efficient?');
    });

    it('includes additional files when provided', () => {
      const prompt = buildReviewPrompt({
        codeContext: 'main code',
        selectedCode: 'selected',
        language: 'javascript',
        additionalFiles: [
          { name: 'helper.js', content: 'helper code', language: 'javascript' },
        ],
      });

      expect(prompt).toContain('Additional files');
      expect(prompt).toContain('helper.js');
      expect(prompt).toContain('helper code');
    });
  });

  describe('parseReviewResponse', () => {
    it('parses valid JSON response', () => {
      const response = JSON.stringify({
        explanation: 'This code does X',
        suggestions: ['Suggestion 1', 'Suggestion 2'],
        diff: '- old\n+ new',
      });

      const result = parseReviewResponse(response);

      expect(result.explanation).toBe('This code does X');
      expect(result.suggestions).toEqual(['Suggestion 1', 'Suggestion 2']);
      expect(result.diff).toBe('- old\n+ new');
    });

    it('extracts JSON from mixed content', () => {
      const response = `Here is my analysis:
      
      {"explanation": "The code has issues", "suggestions": ["Fix it"]}
      
      Let me know if you need more help.`;

      const result = parseReviewResponse(response);

      expect(result.explanation).toBe('The code has issues');
      expect(result.suggestions).toEqual(['Fix it']);
    });

    it('falls back to plain text for invalid JSON', () => {
      const response = 'This is just plain text without JSON';

      const result = parseReviewResponse(response);

      expect(result.explanation).toBe(response);
      expect(result.suggestions).toEqual([]);
      expect(result.diff).toBeUndefined();
    });

    it('handles missing fields in JSON', () => {
      const response = JSON.stringify({ explanation: 'Only explanation' });

      const result = parseReviewResponse(response);

      expect(result.explanation).toBe('Only explanation');
      expect(result.suggestions).toEqual([]);
    });
  });

  describe('estimateTokenCount', () => {
    it('estimates tokens for short text', () => {
      const tokens = estimateTokenCount('Hello world');
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(10);
    });

    it('estimates tokens for longer text', () => {
      const longText = 'a'.repeat(1000);
      const tokens = estimateTokenCount(longText);
      expect(tokens).toBe(250); // 1000 / 4
    });
  });

  describe('truncateContext', () => {
    it('returns original if within limit', () => {
      const context = 'short text';
      const result = truncateContext(context, 1000);
      expect(result).toBe(context);
    });

    it('truncates long context', () => {
      const context = 'a'.repeat(10000);
      const result = truncateContext(context, 100);
      expect(result.length).toBeLessThan(context.length);
    });

    it('preserves middle when preserveSelection is true', () => {
      const lines = Array.from({ length: 100 }, (_, i) => `line ${i}`).join('\n');
      const result = truncateContext(lines, 50, true);
      expect(result).toContain('line 50'); // Middle should be preserved
    });
  });

  describe('formatDiff', () => {
    it('formats simple diff', () => {
      const original = 'const x = 1;';
      const suggested = 'const x: number = 1;';

      const diff = formatDiff(original, suggested);

      expect(diff).toContain('-const x = 1;');
      expect(diff).toContain('+const x: number = 1;');
    });

    it('handles multi-line diff', () => {
      const original = 'line1\nline2\nline3';
      const suggested = 'line1\nmodified\nline3';

      const diff = formatDiff(original, suggested);

      expect(diff).toContain(' line1');
      expect(diff).toContain('-line2');
      expect(diff).toContain('+modified');
      expect(diff).toContain(' line3');
    });

    it('handles additions', () => {
      const original = 'line1';
      const suggested = 'line1\nline2';

      const diff = formatDiff(original, suggested);

      expect(diff).toContain('+line2');
    });

    it('handles deletions', () => {
      const original = 'line1\nline2';
      const suggested = 'line1';

      const diff = formatDiff(original, suggested);

      expect(diff).toContain('-line2');
    });
  });
});

