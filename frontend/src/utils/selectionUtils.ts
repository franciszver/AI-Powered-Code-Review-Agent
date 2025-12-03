import type { editor } from 'monaco-editor';

/**
 * Monaco editor selection interface
 */
interface MonacoSelection {
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
}

/**
 * Represents a range of selected lines in the code editor
 */
export interface SelectionRange {
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  selectedText: string;
}

/**
 * Extracts selection range from Monaco editor selection
 */
export function getSelectionRange(
  selection: MonacoSelection | null,
  model: editor.ITextModel | null
): SelectionRange | null {
  if (!selection || !model) {
    return null;
  }

  // Check if there's an actual selection (not just cursor position)
  if (
    selection.startLineNumber === selection.endLineNumber &&
    selection.startColumn === selection.endColumn
  ) {
    return null;
  }

  const isReversed = selection.startLineNumber > selection.endLineNumber ||
    (selection.startLineNumber === selection.endLineNumber && selection.startColumn > selection.endColumn);
  
  const startLine = Math.min(selection.startLineNumber, selection.endLineNumber);
  const endLine = Math.max(selection.startLineNumber, selection.endLineNumber);
  const startColumn = isReversed ? selection.endColumn : selection.startColumn;
  const endColumn = isReversed ? selection.startColumn : selection.endColumn;

  // Get the selected text
  const selectedText = model.getValueInRange({
    startLineNumber: startLine,
    startColumn: startColumn,
    endLineNumber: endLine,
    endColumn: endColumn,
  });

  return {
    startLine,
    endLine,
    startColumn,
    endColumn,
    selectedText,
  };
}

/**
 * Gets context lines around a selection
 * @param model The Monaco editor text model
 * @param selection The selection range
 * @param contextLines Number of lines to include before and after (default: 20)
 */
export function getContextAroundSelection(
  model: editor.ITextModel,
  selection: SelectionRange,
  contextLines: number = 20
): {
  beforeContext: string;
  selectedCode: string;
  afterContext: string;
  fullContext: string;
  contextStartLine: number;
  contextEndLine: number;
} {
  const totalLines = model.getLineCount();
  
  const contextStartLine = Math.max(1, selection.startLine - contextLines);
  const contextEndLine = Math.min(totalLines, selection.endLine + contextLines);

  // Handle edge case: selection starts at line 1 (no before context)
  let beforeContext = '';
  if (selection.startLine > 1) {
    const beforeEndLine = selection.startLine - 1;
    beforeContext = model.getValueInRange({
      startLineNumber: contextStartLine,
      startColumn: 1,
      endLineNumber: beforeEndLine,
      endColumn: model.getLineMaxColumn(beforeEndLine),
    });
  }

  const selectedCode = selection.selectedText;

  // Handle edge case: selection ends at last line (no after context)
  let afterContext = '';
  if (selection.endLine < totalLines) {
    const afterStartLine = selection.endLine + 1;
    afterContext = model.getValueInRange({
      startLineNumber: afterStartLine,
      startColumn: 1,
      endLineNumber: contextEndLine,
      endColumn: model.getLineMaxColumn(contextEndLine),
    });
  }

  const fullContext = model.getValueInRange({
    startLineNumber: contextStartLine,
    startColumn: 1,
    endLineNumber: contextEndLine,
    endColumn: model.getLineMaxColumn(contextEndLine),
  });

  return {
    beforeContext,
    selectedCode,
    afterContext,
    fullContext,
    contextStartLine,
    contextEndLine,
  };
}

/**
 * Detects the programming language from file extension
 */
export function detectLanguageFromFilename(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  const languageMap: Record<string, string> = {
    // JavaScript/TypeScript
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'mjs': 'javascript',
    'cjs': 'javascript',
    
    // Web
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'scss',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'svg': 'xml',
    
    // Python
    'py': 'python',
    'pyw': 'python',
    'pyx': 'python',
    
    // Java/JVM
    'java': 'java',
    'kt': 'kotlin',
    'kts': 'kotlin',
    'scala': 'scala',
    'groovy': 'groovy',
    
    // C/C++
    'c': 'c',
    'h': 'c',
    'cpp': 'cpp',
    'cc': 'cpp',
    'cxx': 'cpp',
    'hpp': 'cpp',
    'hxx': 'cpp',
    
    // C#
    'cs': 'csharp',
    
    // Go
    'go': 'go',
    
    // Rust
    'rs': 'rust',
    
    // Ruby
    'rb': 'ruby',
    'erb': 'ruby',
    
    // PHP
    'php': 'php',
    
    // Shell
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'fish': 'shell',
    'ps1': 'powershell',
    
    // SQL
    'sql': 'sql',
    
    // Markdown
    'md': 'markdown',
    'markdown': 'markdown',
    
    // YAML
    'yml': 'yaml',
    'yaml': 'yaml',
    
    // Docker
    'dockerfile': 'dockerfile',
    
    // Config files
    'ini': 'ini',
    'toml': 'ini',
    'conf': 'ini',
    'cfg': 'ini',
  };

  return languageMap[extension] || 'plaintext';
}

/**
 * Detects language from code content using heuristics
 */
export function detectLanguageFromContent(content: string): string {
  const trimmed = content.trim();
  
  // Check for common patterns
  if (trimmed.startsWith('<!DOCTYPE html') || trimmed.startsWith('<html')) {
    return 'html';
  }
  
  if (trimmed.startsWith('<?php')) {
    return 'php';
  }
  
  if (trimmed.startsWith('#!/bin/bash') || trimmed.startsWith('#!/bin/sh')) {
    return 'shell';
  }
  
  if (trimmed.startsWith('#!/usr/bin/env python') || trimmed.startsWith('#!/usr/bin/python')) {
    return 'python';
  }
  
  if (trimmed.startsWith('#!/usr/bin/env node') || trimmed.startsWith('#!/usr/bin/node')) {
    return 'javascript';
  }
  
  // Check for common keywords/patterns
  if (/^(import|from)\s+[\w.]+/.test(trimmed) && /def\s+\w+\s*\(/.test(trimmed)) {
    return 'python';
  }
  
  if (/^(import|export|const|let|var|function|class)\s/.test(trimmed)) {
    if (/:\s*(string|number|boolean|any|void)\b/.test(trimmed) || /interface\s+\w+/.test(trimmed)) {
      return 'typescript';
    }
    return 'javascript';
  }
  
  if (/^package\s+\w+/.test(trimmed) && /func\s+\w+/.test(trimmed)) {
    return 'go';
  }
  
  if (/^(use\s+|fn\s+|let\s+mut|impl\s+|struct\s+|enum\s+)/.test(trimmed)) {
    return 'rust';
  }
  
  if (/^(public|private|protected|class|interface)\s/.test(trimmed)) {
    if (/System\.out\.println/.test(trimmed) || /public\s+static\s+void\s+main/.test(trimmed)) {
      return 'java';
    }
    if (/Console\.WriteLine/.test(trimmed) || /namespace\s+\w+/.test(trimmed)) {
      return 'csharp';
    }
  }
  
  if (/^#include\s+[<"]/.test(trimmed)) {
    return 'cpp';
  }
  
  // Default to plaintext
  return 'plaintext';
}

/**
 * Validates if a selection range is valid
 */
export function isValidSelection(selection: SelectionRange | null): boolean {
  if (!selection) return false;
  
  return (
    selection.startLine > 0 &&
    selection.endLine >= selection.startLine &&
    selection.selectedText.length > 0
  );
}

/**
 * Formats a selection range for display
 */
export function formatSelectionRange(selection: SelectionRange): string {
  if (selection.startLine === selection.endLine) {
    return `Line ${selection.startLine}`;
  }
  return `Lines ${selection.startLine}-${selection.endLine}`;
}

