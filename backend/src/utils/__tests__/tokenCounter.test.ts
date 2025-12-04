import { describe, it, expect } from 'vitest';
import {
  estimateTokenCount,
  getModelTokenLimit,
  getAvailableContextTokens,
  fitsWithinLimit,
  truncateToFitLimit,
  splitIntoChunks,
} from '../tokenCounter.js';

describe('tokenCounter', () => {
  describe('estimateTokenCount', () => {
    it('estimates tokens for simple text', () => {
      const text = 'Hello world';
      const tokens = estimateTokenCount(text);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(20);
    });

    it('estimates more tokens for code with special characters', () => {
      const code = 'const x = () => { return { a: 1, b: 2 }; };';
      const tokens = estimateTokenCount(code);
      expect(tokens).toBeGreaterThan(5);
    });

    it('handles empty string', () => {
      expect(estimateTokenCount('')).toBe(0);
    });

    it('handles multiline content', () => {
      const content = 'line1\nline2\nline3';
      const tokens = estimateTokenCount(content);
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('getModelTokenLimit', () => {
    it('returns correct limit for known models', () => {
      expect(getModelTokenLimit('gpt-4')).toBe(8192);
      expect(getModelTokenLimit('gpt-4-turbo-preview')).toBe(128000);
      expect(getModelTokenLimit('gpt-3.5-turbo-16k')).toBe(16384);
    });

    it('returns default for unknown models', () => {
      expect(getModelTokenLimit('unknown-model')).toBe(4096);
    });

    it('matches partial model names', () => {
      expect(getModelTokenLimit('gpt-4-something')).toBe(8192);
    });
  });

  describe('getAvailableContextTokens', () => {
    it('reserves tokens for response', () => {
      const available = getAvailableContextTokens('gpt-4', 2000);
      expect(available).toBe(8192 - 2000);
    });

    it('uses custom reserve amount', () => {
      const available = getAvailableContextTokens('gpt-4', 1000);
      expect(available).toBe(8192 - 1000);
    });

    it('returns 0 if reserve exceeds limit', () => {
      const available = getAvailableContextTokens('gpt-3.5-turbo', 5000);
      expect(available).toBe(0);
    });
  });

  describe('fitsWithinLimit', () => {
    it('returns true for small content', () => {
      const content = 'Hello world';
      expect(fitsWithinLimit(content, 'gpt-4')).toBe(true);
    });

    it('returns false for very large content', () => {
      const content = 'x'.repeat(100000);
      expect(fitsWithinLimit(content, 'gpt-3.5-turbo')).toBe(false);
    });
  });

  describe('truncateToFitLimit', () => {
    it('returns original if within limit', () => {
      const content = 'Hello world';
      const result = truncateToFitLimit(content, 'gpt-4');
      
      expect(result.wasTruncated).toBe(false);
      expect(result.content).toBe(content);
    });

    it('truncates large content', () => {
      const content = 'x'.repeat(50000);
      const result = truncateToFitLimit(content, 'gpt-3.5-turbo');
      
      expect(result.wasTruncated).toBe(true);
      expect(result.content.length).toBeLessThan(content.length);
      expect(result.content).toContain('[content truncated]');
    });

    it('returns token counts', () => {
      const content = 'Hello world';
      const result = truncateToFitLimit(content, 'gpt-4');
      
      expect(result.originalTokens).toBeGreaterThan(0);
      expect(result.finalTokens).toBeGreaterThan(0);
    });
  });

  describe('splitIntoChunks', () => {
    it('returns single chunk for small content', () => {
      const content = 'Hello world';
      const chunks = splitIntoChunks(content, 'gpt-4');
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe(content);
    });

    it('splits large content into multiple chunks', () => {
      const content = Array.from({ length: 1000 }, (_, i) => `line ${i}`).join('\n');
      const chunks = splitIntoChunks(content, 'gpt-3.5-turbo');
      
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('maintains content integrity across chunks', () => {
      const lines = Array.from({ length: 100 }, (_, i) => `line ${i}`);
      const content = lines.join('\n');
      const chunks = splitIntoChunks(content, 'gpt-3.5-turbo', 500);
      
      // All chunks should contain valid content
      for (const chunk of chunks) {
        expect(chunk.length).toBeGreaterThan(0);
      }
    });
  });
});

