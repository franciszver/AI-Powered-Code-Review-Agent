import { describe, it, expect } from 'vitest';
import {
  validateSelection,
  rangesOverlap,
  isNestedSelection,
  mergeRanges,
  suggestNonOverlappingRange,
} from '../selectionValidator';
import { Thread } from '../../types/thread';
import { SelectionRange } from '../selectionUtils';

const createMockThread = (startLine: number, endLine: number, file = 'test.ts'): Thread => ({
  id: `thread-${startLine}-${endLine}`,
  file,
  range: { startLine, endLine },
  selectedCode: 'mock code',
  comments: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  resolved: false,
});

const createMockSelection = (startLine: number, endLine: number): SelectionRange => ({
  startLine,
  endLine,
  startColumn: 1,
  endColumn: 10,
  selectedText: 'selected text',
});

describe('selectionValidator', () => {
  describe('validateSelection', () => {
    it('returns valid for non-overlapping selection', () => {
      const selection = createMockSelection(10, 15);
      const threads = [createMockThread(1, 5)];
      
      const result = validateSelection(selection, threads, 'test.ts');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.overlappingThreads).toHaveLength(0);
    });

    it('returns invalid for empty selection', () => {
      const selection: SelectionRange = {
        startLine: 1,
        endLine: 5,
        startColumn: 1,
        endColumn: 1,
        selectedText: '',
      };
      
      const result = validateSelection(selection, [], 'test.ts');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Selection is empty');
    });

    it('returns invalid for negative start line', () => {
      const selection = createMockSelection(-1, 5);
      
      const result = validateSelection(selection, [], 'test.ts');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid start line');
    });

    it('warns about overlapping threads', () => {
      const selection = createMockSelection(3, 8);
      const threads = [createMockThread(1, 5), createMockThread(7, 10)];
      
      const result = validateSelection(selection, threads, 'test.ts');
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.overlappingThreads).toHaveLength(2);
    });

    it('warns about large selections', () => {
      const selection = createMockSelection(1, 150);
      
      const result = validateSelection(selection, [], 'test.ts');
      
      expect(result.warnings).toContain('Large selection (>100 lines) may result in less focused feedback');
    });

    it('only checks threads for the same file', () => {
      const selection = createMockSelection(1, 5);
      const threads = [createMockThread(1, 5, 'other.ts')];
      
      const result = validateSelection(selection, threads, 'test.ts');
      
      expect(result.overlappingThreads).toHaveLength(0);
    });
  });

  describe('rangesOverlap', () => {
    it('returns true for overlapping ranges', () => {
      expect(rangesOverlap({ startLine: 1, endLine: 5 }, { startLine: 3, endLine: 8 })).toBe(true);
      expect(rangesOverlap({ startLine: 3, endLine: 8 }, { startLine: 1, endLine: 5 })).toBe(true);
    });

    it('returns true for adjacent ranges that share a line', () => {
      expect(rangesOverlap({ startLine: 1, endLine: 5 }, { startLine: 5, endLine: 10 })).toBe(true);
    });

    it('returns false for non-overlapping ranges', () => {
      expect(rangesOverlap({ startLine: 1, endLine: 5 }, { startLine: 6, endLine: 10 })).toBe(false);
    });

    it('returns true for contained ranges', () => {
      expect(rangesOverlap({ startLine: 1, endLine: 10 }, { startLine: 3, endLine: 7 })).toBe(true);
    });
  });

  describe('isNestedSelection', () => {
    it('returns true when selection contains thread', () => {
      expect(isNestedSelection(
        { startLine: 1, endLine: 10 },
        { startLine: 3, endLine: 7 }
      )).toBe(true);
    });

    it('returns true when thread contains selection', () => {
      expect(isNestedSelection(
        { startLine: 3, endLine: 7 },
        { startLine: 1, endLine: 10 }
      )).toBe(true);
    });

    it('returns false for partial overlap', () => {
      expect(isNestedSelection(
        { startLine: 1, endLine: 5 },
        { startLine: 3, endLine: 8 }
      )).toBe(false);
    });
  });

  describe('mergeRanges', () => {
    it('merges multiple ranges', () => {
      const ranges = [
        { startLine: 1, endLine: 5 },
        { startLine: 3, endLine: 8 },
        { startLine: 7, endLine: 12 },
      ];
      
      const merged = mergeRanges(ranges);
      
      expect(merged.startLine).toBe(1);
      expect(merged.endLine).toBe(12);
    });

    it('returns single range unchanged', () => {
      const ranges = [{ startLine: 5, endLine: 10 }];
      
      const merged = mergeRanges(ranges);
      
      expect(merged).toEqual({ startLine: 5, endLine: 10 });
    });

    it('throws for empty array', () => {
      expect(() => mergeRanges([])).toThrow('Cannot merge empty ranges');
    });
  });

  describe('suggestNonOverlappingRange', () => {
    it('returns original selection when no threads exist', () => {
      const selection = { startLine: 5, endLine: 10 };
      
      const suggestion = suggestNonOverlappingRange(selection, [], 'test.ts', 100);
      
      expect(suggestion).toEqual(selection);
    });

    it('returns original selection when not overlapping', () => {
      const selection = { startLine: 20, endLine: 25 };
      const threads = [createMockThread(1, 10)];
      
      const suggestion = suggestNonOverlappingRange(selection, threads, 'test.ts', 100);
      
      expect(suggestion).toEqual(selection);
    });

    it('returns null when no gap available', () => {
      const selection = { startLine: 5, endLine: 10 };
      const threads = [
        createMockThread(1, 50),
      ];
      
      const suggestion = suggestNonOverlappingRange(selection, threads, 'test.ts', 50);
      
      expect(suggestion).toBeNull();
    });

    it('finds gap between threads', () => {
      const selection = { startLine: 15, endLine: 20 };
      const threads = [
        createMockThread(1, 10),
        createMockThread(30, 40),
      ];
      
      const suggestion = suggestNonOverlappingRange(selection, threads, 'test.ts', 100);
      
      expect(suggestion).not.toBeNull();
      expect(suggestion!.startLine).toBeGreaterThan(10);
      expect(suggestion!.endLine).toBeLessThan(30);
    });
  });
});

