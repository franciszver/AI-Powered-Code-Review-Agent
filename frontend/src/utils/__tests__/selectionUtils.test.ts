import { describe, it, expect, vi } from 'vitest';
import {
  getSelectionRange,
  detectLanguageFromFilename,
  detectLanguageFromContent,
  isValidSelection,
  formatSelectionRange,
  getContextAroundSelection,
  SelectionRange,
} from '../selectionUtils';
import type { editor } from 'monaco-editor';

describe('selectionUtils', () => {
  describe('getSelectionRange', () => {
    it('returns null when selection is null', () => {
      const result = getSelectionRange(null, null);
      expect(result).toBeNull();
    });

    it('returns null when model is null', () => {
      const selection = {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 2,
        endColumn: 10,
      } as editor.ISelection;
      
      const result = getSelectionRange(selection, null);
      expect(result).toBeNull();
    });

    it('returns null when selection is just a cursor position', () => {
      const selection = {
        startLineNumber: 1,
        startColumn: 5,
        endLineNumber: 1,
        endColumn: 5,
      } as editor.ISelection;
      
      const model = {
        getValueInRange: vi.fn(() => ''),
      } as unknown as editor.ITextModel;
      
      const result = getSelectionRange(selection, model);
      expect(result).toBeNull();
    });

    it('returns correct range for valid selection', () => {
      const selection = {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 3,
        endColumn: 10,
      } as editor.ISelection;
      
      const model = {
        getValueInRange: vi.fn(() => 'selected text'),
      } as unknown as editor.ITextModel;
      
      const result = getSelectionRange(selection, model);
      
      expect(result).toEqual({
        startLine: 1,
        endLine: 3,
        startColumn: 1,
        endColumn: 10,
        selectedText: 'selected text',
      });
    });

    it('handles reverse selection (end before start)', () => {
      const selection = {
        startLineNumber: 5,
        startColumn: 1,
        endLineNumber: 2,
        endColumn: 10,
      } as editor.ISelection;
      
      const model = {
        getValueInRange: vi.fn(() => 'selected text'),
      } as unknown as editor.ITextModel;
      
      const result = getSelectionRange(selection, model);
      
      expect(result?.startLine).toBe(2);
      expect(result?.endLine).toBe(5);
    });
  });

  describe('detectLanguageFromFilename', () => {
    it('detects JavaScript files', () => {
      expect(detectLanguageFromFilename('app.js')).toBe('javascript');
      expect(detectLanguageFromFilename('component.jsx')).toBe('javascript');
      expect(detectLanguageFromFilename('module.mjs')).toBe('javascript');
    });

    it('detects TypeScript files', () => {
      expect(detectLanguageFromFilename('app.ts')).toBe('typescript');
      expect(detectLanguageFromFilename('component.tsx')).toBe('typescript');
    });

    it('detects Python files', () => {
      expect(detectLanguageFromFilename('script.py')).toBe('python');
      expect(detectLanguageFromFilename('app.pyw')).toBe('python');
    });

    it('detects Java files', () => {
      expect(detectLanguageFromFilename('Main.java')).toBe('java');
    });

    it('detects C/C++ files', () => {
      expect(detectLanguageFromFilename('main.c')).toBe('c');
      expect(detectLanguageFromFilename('header.h')).toBe('c');
      expect(detectLanguageFromFilename('app.cpp')).toBe('cpp');
      expect(detectLanguageFromFilename('header.hpp')).toBe('cpp');
    });

    it('detects Go files', () => {
      expect(detectLanguageFromFilename('main.go')).toBe('go');
    });

    it('detects Rust files', () => {
      expect(detectLanguageFromFilename('main.rs')).toBe('rust');
    });

    it('detects web files', () => {
      expect(detectLanguageFromFilename('index.html')).toBe('html');
      expect(detectLanguageFromFilename('styles.css')).toBe('css');
      expect(detectLanguageFromFilename('styles.scss')).toBe('scss');
      expect(detectLanguageFromFilename('data.json')).toBe('json');
    });

    it('detects config files', () => {
      expect(detectLanguageFromFilename('config.yml')).toBe('yaml');
      expect(detectLanguageFromFilename('config.yaml')).toBe('yaml');
      expect(detectLanguageFromFilename('README.md')).toBe('markdown');
    });

    it('returns plaintext for unknown extensions', () => {
      expect(detectLanguageFromFilename('file.xyz')).toBe('plaintext');
      expect(detectLanguageFromFilename('noextension')).toBe('plaintext');
    });

    it('handles uppercase extensions', () => {
      expect(detectLanguageFromFilename('App.JS')).toBe('javascript');
      expect(detectLanguageFromFilename('Main.JAVA')).toBe('java');
    });
  });

  describe('detectLanguageFromContent', () => {
    it('detects HTML from DOCTYPE', () => {
      const content = '<!DOCTYPE html>\n<html><body></body></html>';
      expect(detectLanguageFromContent(content)).toBe('html');
    });

    it('detects PHP from opening tag', () => {
      const content = '<?php\necho "Hello";';
      expect(detectLanguageFromContent(content)).toBe('php');
    });

    it('detects bash from shebang', () => {
      const content = '#!/bin/bash\necho "Hello"';
      expect(detectLanguageFromContent(content)).toBe('shell');
    });

    it('detects Python from shebang', () => {
      const content = '#!/usr/bin/env python\nprint("Hello")';
      expect(detectLanguageFromContent(content)).toBe('python');
    });

    it('detects TypeScript from type annotations', () => {
      const content = 'const x: string = "hello";\ninterface User { name: string; }';
      expect(detectLanguageFromContent(content)).toBe('typescript');
    });

    it('detects JavaScript from common keywords', () => {
      const content = 'const hello = "world";\nfunction test() {}';
      expect(detectLanguageFromContent(content)).toBe('javascript');
    });

    it('detects Go from package and func keywords', () => {
      const content = 'package main\n\nfunc main() {}';
      expect(detectLanguageFromContent(content)).toBe('go');
    });

    it('detects Rust from common keywords', () => {
      const content = 'fn main() {\n    let mut x = 5;\n}';
      expect(detectLanguageFromContent(content)).toBe('rust');
    });

    it('detects C++ from include directive', () => {
      const content = '#include <iostream>\nint main() {}';
      expect(detectLanguageFromContent(content)).toBe('cpp');
    });

    it('returns plaintext for unrecognized content', () => {
      const content = 'some random text without clear patterns';
      expect(detectLanguageFromContent(content)).toBe('plaintext');
    });
  });

  describe('isValidSelection', () => {
    it('returns false for null selection', () => {
      expect(isValidSelection(null)).toBe(false);
    });

    it('returns false for selection with invalid start line', () => {
      const selection: SelectionRange = {
        startLine: 0,
        endLine: 5,
        startColumn: 1,
        endColumn: 10,
        selectedText: 'text',
      };
      expect(isValidSelection(selection)).toBe(false);
    });

    it('returns false for selection with end before start', () => {
      const selection: SelectionRange = {
        startLine: 10,
        endLine: 5,
        startColumn: 1,
        endColumn: 10,
        selectedText: 'text',
      };
      expect(isValidSelection(selection)).toBe(false);
    });

    it('returns false for empty selection text', () => {
      const selection: SelectionRange = {
        startLine: 1,
        endLine: 5,
        startColumn: 1,
        endColumn: 10,
        selectedText: '',
      };
      expect(isValidSelection(selection)).toBe(false);
    });

    it('returns true for valid selection', () => {
      const selection: SelectionRange = {
        startLine: 1,
        endLine: 5,
        startColumn: 1,
        endColumn: 10,
        selectedText: 'selected code',
      };
      expect(isValidSelection(selection)).toBe(true);
    });

    it('returns true for single line selection', () => {
      const selection: SelectionRange = {
        startLine: 5,
        endLine: 5,
        startColumn: 1,
        endColumn: 10,
        selectedText: 'code',
      };
      expect(isValidSelection(selection)).toBe(true);
    });
  });

  describe('formatSelectionRange', () => {
    it('formats single line selection', () => {
      const selection: SelectionRange = {
        startLine: 5,
        endLine: 5,
        startColumn: 1,
        endColumn: 10,
        selectedText: 'code',
      };
      expect(formatSelectionRange(selection)).toBe('Line 5');
    });

    it('formats multi-line selection', () => {
      const selection: SelectionRange = {
        startLine: 5,
        endLine: 15,
        startColumn: 1,
        endColumn: 10,
        selectedText: 'code',
      };
      expect(formatSelectionRange(selection)).toBe('Lines 5-15');
    });
  });

  describe('getContextAroundSelection', () => {
    it('gets context around selection', () => {
      const model = {
        getLineCount: () => 100,
        getLineMaxColumn: vi.fn(() => 80),
        getValueInRange: vi.fn((range) => {
          if (range.startLineNumber < 10) return 'before context';
          if (range.startLineNumber > 15) return 'after context';
          return 'full context';
        }),
      } as unknown as editor.ITextModel;

      const selection: SelectionRange = {
        startLine: 10,
        endLine: 15,
        startColumn: 1,
        endColumn: 10,
        selectedText: 'selected code',
      };

      const result = getContextAroundSelection(model, selection, 5);

      expect(result.contextStartLine).toBe(5);
      expect(result.contextEndLine).toBe(20);
      expect(result.selectedCode).toBe('selected code');
    });

    it('handles selection at start of file', () => {
      const model = {
        getLineCount: () => 100,
        getLineMaxColumn: vi.fn(() => 80),
        getValueInRange: vi.fn(() => 'context'),
      } as unknown as editor.ITextModel;

      const selection: SelectionRange = {
        startLine: 1,
        endLine: 3,
        startColumn: 1,
        endColumn: 10,
        selectedText: 'selected code',
      };

      const result = getContextAroundSelection(model, selection, 5);

      expect(result.contextStartLine).toBe(1);
    });

    it('handles selection at end of file', () => {
      const model = {
        getLineCount: () => 50,
        getLineMaxColumn: vi.fn(() => 80),
        getValueInRange: vi.fn(() => 'context'),
      } as unknown as editor.ITextModel;

      const selection: SelectionRange = {
        startLine: 48,
        endLine: 50,
        startColumn: 1,
        endColumn: 10,
        selectedText: 'selected code',
      };

      const result = getContextAroundSelection(model, selection, 5);

      expect(result.contextEndLine).toBe(50);
    });
  });
});

