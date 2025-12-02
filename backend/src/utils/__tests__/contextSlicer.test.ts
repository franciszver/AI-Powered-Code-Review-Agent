import { describe, it, expect } from 'vitest';
import { sliceContext, isLargeFile, getFileStats } from '../contextSlicer.js';

describe('contextSlicer', () => {
  describe('sliceContext', () => {
    const createContent = (lines: number) => 
      Array.from({ length: lines }, (_, i) => `line ${i + 1}`).join('\n');

    it('returns full context for small files', () => {
      const content = createContent(50);
      const result = sliceContext(content, 20, 25);

      expect(result.wasTruncated).toBe(false);
      expect(result.contextStartLine).toBe(1);
      expect(result.contextEndLine).toBe(50);
    });

    it('slices context around selection for large files', () => {
      const content = createContent(1000);
      const result = sliceContext(content, 500, 510, {
        linesBefore: 10,
        linesAfter: 10,
        maxTotalLines: 50,
      });

      expect(result.contextStartLine).toBeGreaterThanOrEqual(490);
      expect(result.contextEndLine).toBeLessThanOrEqual(520);
    });

    it('respects maxTotalLines limit', () => {
      const content = createContent(200);
      const result = sliceContext(content, 50, 100, {
        linesBefore: 30,
        linesAfter: 30,
        maxTotalLines: 50,
      });

      const totalLines = result.contextEndLine - result.contextStartLine + 1;
      expect(totalLines).toBeLessThanOrEqual(50);
    });

    it('handles selection at the start of file', () => {
      const content = createContent(100);
      const result = sliceContext(content, 1, 5);

      expect(result.contextStartLine).toBe(1);
      expect(result.beforeContext).toBe('');
    });

    it('handles selection at the end of file', () => {
      const content = createContent(100);
      const result = sliceContext(content, 95, 100);

      expect(result.contextEndLine).toBe(100);
      expect(result.afterContext).toBe('');
    });

    it('truncates when exceeding maxCharacters', () => {
      const longLine = 'x'.repeat(1000);
      const content = Array.from({ length: 50 }, () => longLine).join('\n');
      
      const result = sliceContext(content, 20, 25, {
        maxCharacters: 5000,
      });

      expect(result.wasTruncated).toBe(true);
      expect(result.fullContext.length).toBeLessThanOrEqual(6000); // Some overhead allowed
    });

    it('includes original line count', () => {
      const content = createContent(150);
      const result = sliceContext(content, 50, 60);

      expect(result.originalLineCount).toBe(150);
    });
  });

  describe('isLargeFile', () => {
    it('returns false for small files', () => {
      const content = 'small content\n'.repeat(100);
      expect(isLargeFile(content)).toBe(false);
    });

    it('returns true for files exceeding line threshold', () => {
      const content = 'line\n'.repeat(1500);
      expect(isLargeFile(content, 1000)).toBe(true);
    });

    it('returns true for files exceeding character threshold', () => {
      const content = 'x'.repeat(60000);
      expect(isLargeFile(content, 10000, 50000)).toBe(true);
    });

    it('uses custom thresholds', () => {
      const content = 'line\n'.repeat(500);
      expect(isLargeFile(content, 400)).toBe(true);
      expect(isLargeFile(content, 600)).toBe(false);
    });
  });

  describe('getFileStats', () => {
    it('returns correct line count', () => {
      const content = 'line1\nline2\nline3';
      const stats = getFileStats(content);
      expect(stats.lineCount).toBe(3);
    });

    it('returns correct character count', () => {
      const content = '12345\n67890';
      const stats = getFileStats(content);
      expect(stats.charCount).toBe(11);
    });

    it('calculates average line length', () => {
      const content = '1234567890\n1234567890';
      const stats = getFileStats(content);
      expect(stats.avgLineLength).toBe(11); // 21 chars / 2 lines
    });
  });
});

