/**
 * Configuration for context slicing
 */
export interface ContextSlicerConfig {
    /** Number of lines to include before selection */
    linesBefore: number;
    /** Number of lines to include after selection */
    linesAfter: number;
    /** Maximum total lines to include */
    maxTotalLines: number;
    /** Maximum characters to include */
    maxCharacters: number;
}

const DEFAULT_CONFIG: ContextSlicerConfig = {
    linesBefore: 20,
    linesAfter: 20,
    maxTotalLines: 100,
    maxCharacters: 10000,
};

/**
 * Result of context slicing
 */
export interface SlicedContext {
    /** Context before the selection */
    beforeContext: string;
    /** The selected code */
    selectedCode: string;
    /** Context after the selection */
    afterContext: string;
    /** Full context (before + selected + after) */
    fullContext: string;
    /** Starting line number of the context */
    contextStartLine: number;
    /** Ending line number of the context */
    contextEndLine: number;
    /** Whether the context was truncated */
    wasTruncated: boolean;
    /** Original line count of the file */
    originalLineCount: number;
}

/**
 * Slice context around a selection for large files
 */
export function sliceContext(
    fileContent: string,
    selectionStartLine: number,
    selectionEndLine: number,
    config: Partial<ContextSlicerConfig> = {}
): SlicedContext {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    const lines = fileContent.split('\n');
    const totalLines = lines.length;

    // Calculate context boundaries
    let contextStartLine = Math.max(1, selectionStartLine - mergedConfig.linesBefore);
    let contextEndLine = Math.min(totalLines, selectionEndLine + mergedConfig.linesAfter);

    // Ensure we don't exceed max total lines
    const totalContextLines = contextEndLine - contextStartLine + 1;
    if (totalContextLines > mergedConfig.maxTotalLines) {
        // Prioritize keeping the selection centered
        const halfMax = Math.floor(mergedConfig.maxTotalLines / 2);
        const selectionMid = Math.floor((selectionStartLine + selectionEndLine) / 2);
        contextStartLine = Math.max(1, selectionMid - halfMax);
        contextEndLine = Math.min(totalLines, contextStartLine + mergedConfig.maxTotalLines - 1);
    }

    // Extract the lines (convert to 0-indexed)
    const beforeLines = lines.slice(contextStartLine - 1, selectionStartLine - 1);
    const selectedLines = lines.slice(selectionStartLine - 1, selectionEndLine);
    const afterLines = lines.slice(selectionEndLine, contextEndLine);

    let beforeContext = beforeLines.join('\n');
    let selectedCode = selectedLines.join('\n');
    let afterContext = afterLines.join('\n');

    // Check character limit and truncate if needed
    let wasTruncated = false;
    const totalChars = beforeContext.length + selectedCode.length + afterContext.length;

    if (totalChars > mergedConfig.maxCharacters) {
        wasTruncated = true;
        const availableChars = mergedConfig.maxCharacters - selectedCode.length;

        if (availableChars > 0) {
            const halfAvailable = Math.floor(availableChars / 2);

            if (beforeContext.length > halfAvailable) {
                beforeContext = '...\n' + beforeContext.slice(-halfAvailable);
            }

            if (afterContext.length > halfAvailable) {
                afterContext = afterContext.slice(0, halfAvailable) + '\n...';
            }
        } else {
            // Selection itself is too large, truncate it
            selectedCode = selectedCode.slice(0, mergedConfig.maxCharacters) + '\n... (truncated)';
            beforeContext = '';
            afterContext = '';
        }
    }

    const fullContext = [beforeContext, selectedCode, afterContext]
        .filter(Boolean)
        .join('\n');

    return {
        beforeContext,
        selectedCode,
        afterContext,
        fullContext,
        contextStartLine,
        contextEndLine,
        wasTruncated: wasTruncated || totalContextLines > mergedConfig.maxTotalLines,
        originalLineCount: totalLines,
    };
}

/**
 * Check if a file is considered "large"
 */
export function isLargeFile(
    content: string,
    thresholdLines: number = 1000,
    thresholdChars: number = 50000
): boolean {
    const lineCount = content.split('\n').length;
    return lineCount > thresholdLines || content.length > thresholdChars;
}

/**
 * Get file statistics
 */
export function getFileStats(content: string): {
    lineCount: number;
    charCount: number;
    avgLineLength: number;
} {
    const lines = content.split('\n');
    return {
        lineCount: lines.length,
        charCount: content.length,
        avgLineLength: Math.round(content.length / lines.length),
    };
}

