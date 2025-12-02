import { SelectionRange } from './selectionUtils';
import { Thread, LineRange } from '../types/thread';

/**
 * Result of selection validation
 */
export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  overlappingThreads: Thread[];
  suggestedRange?: LineRange;
}

/**
 * Validate a selection against existing threads
 */
export function validateSelection(
  selection: SelectionRange,
  existingThreads: Thread[],
  fileName: string
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const overlappingThreads: Thread[] = [];

  // Check for empty selection
  if (!selection.selectedText || selection.selectedText.trim() === '') {
    errors.push('Selection is empty');
    return { isValid: false, warnings, errors, overlappingThreads };
  }

  // Check for valid line range
  if (selection.startLine < 1) {
    errors.push('Invalid start line');
    return { isValid: false, warnings, errors, overlappingThreads };
  }

  if (selection.endLine < selection.startLine) {
    errors.push('End line must be greater than or equal to start line');
    return { isValid: false, warnings, errors, overlappingThreads };
  }

  // Check for overlapping threads
  const fileThreads = existingThreads.filter(t => t.file === fileName);
  
  for (const thread of fileThreads) {
    if (rangesOverlap(
      { startLine: selection.startLine, endLine: selection.endLine },
      thread.range
    )) {
      overlappingThreads.push(thread);
    }
  }

  if (overlappingThreads.length > 0) {
    warnings.push(
      `Selection overlaps with ${overlappingThreads.length} existing thread(s)`
    );
  }

  // Check for nested selection (selection completely contains or is contained by existing thread)
  for (const thread of overlappingThreads) {
    if (isNestedSelection(
      { startLine: selection.startLine, endLine: selection.endLine },
      thread.range
    )) {
      warnings.push(
        `Selection is nested within thread on lines ${thread.range.startLine}-${thread.range.endLine}`
      );
    }
  }

  // Check for very large selections
  const lineCount = selection.endLine - selection.startLine + 1;
  if (lineCount > 100) {
    warnings.push('Large selection (>100 lines) may result in less focused feedback');
  }

  // Check for very small selections
  if (lineCount === 1 && selection.selectedText.length < 10) {
    warnings.push('Very small selection may lack context for meaningful review');
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    overlappingThreads,
  };
}

/**
 * Check if two line ranges overlap
 */
export function rangesOverlap(range1: LineRange, range2: LineRange): boolean {
  return range1.startLine <= range2.endLine && range1.endLine >= range2.startLine;
}

/**
 * Check if one range is nested within another
 */
export function isNestedSelection(selection: LineRange, threadRange: LineRange): boolean {
  // Selection contains thread
  const selectionContainsThread = 
    selection.startLine <= threadRange.startLine && 
    selection.endLine >= threadRange.endLine;
  
  // Thread contains selection
  const threadContainsSelection = 
    threadRange.startLine <= selection.startLine && 
    threadRange.endLine >= selection.endLine;
  
  return selectionContainsThread || threadContainsSelection;
}

/**
 * Merge overlapping selections
 */
export function mergeRanges(ranges: LineRange[]): LineRange {
  if (ranges.length === 0) {
    throw new Error('Cannot merge empty ranges');
  }

  if (ranges.length === 1) {
    return ranges[0];
  }

  const startLine = Math.min(...ranges.map(r => r.startLine));
  const endLine = Math.max(...ranges.map(r => r.endLine));

  return { startLine, endLine };
}

/**
 * Suggest a non-overlapping range
 */
export function suggestNonOverlappingRange(
  selection: LineRange,
  existingThreads: Thread[],
  fileName: string,
  totalLines: number
): LineRange | null {
  const fileThreads = existingThreads
    .filter(t => t.file === fileName)
    .sort((a, b) => a.range.startLine - b.range.startLine);

  if (fileThreads.length === 0) {
    return selection;
  }

  // Try to find a gap before the first thread
  if (selection.endLine < fileThreads[0].range.startLine) {
    return selection;
  }

  // Try to find a gap after the last thread
  const lastThread = fileThreads[fileThreads.length - 1];
  if (selection.startLine > lastThread.range.endLine) {
    return selection;
  }

  // Try to find a gap between threads
  for (let i = 0; i < fileThreads.length - 1; i++) {
    const currentEnd = fileThreads[i].range.endLine;
    const nextStart = fileThreads[i + 1].range.startLine;

    if (currentEnd + 1 < nextStart) {
      // There's a gap
      const gapStart = currentEnd + 1;
      const gapEnd = nextStart - 1;

      // Check if selection can fit in the gap
      const selectionSize = selection.endLine - selection.startLine + 1;
      const gapSize = gapEnd - gapStart + 1;

      if (selectionSize <= gapSize) {
        return {
          startLine: gapStart,
          endLine: Math.min(gapStart + selectionSize - 1, gapEnd),
        };
      }
    }
  }

  // No suitable gap found
  return null;
}

/**
 * Check if a thread should be auto-resolved based on code changes
 */
export function shouldAutoResolve(
  thread: Thread,
  newCode: string,
  oldCode: string
): boolean {
  // If the selected code has been completely removed, suggest resolving
  if (!newCode.includes(thread.selectedCode)) {
    return true;
  }

  // If the code has been significantly modified
  const similarity = calculateSimilarity(thread.selectedCode, newCode);
  if (similarity < 0.5) {
    return true;
  }

  return false;
}

/**
 * Calculate similarity between two strings (simple Jaccard-like similarity)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.split(/\s+/));
  const set2 = new Set(str2.split(/\s+/));

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

