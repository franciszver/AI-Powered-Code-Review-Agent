/**
 * Token limits for different models
 */
export const MODEL_TOKEN_LIMITS: Record<string, number> = {
    // OpenAI models
    'gpt-4-turbo-preview': 128000,
    'gpt-4': 8192,
    'gpt-4-32k': 32768,
    'gpt-3.5-turbo': 4096,
    'gpt-3.5-turbo-16k': 16384,

    // Default
    'default': 4096,
};

/**
 * Estimate token count for a string
 * Uses a simple heuristic: ~4 characters per token for English text
 * This is a rough approximation - actual tokenization varies by model
 */
export function estimateTokenCount(text: string): number {
    // More accurate estimation considering:
    // - Average word length in code is shorter
    // - Special characters and whitespace
    // - Code tends to have more tokens per character

    const words = text.split(/\s+/).filter(Boolean);
    const specialChars = (text.match(/[^a-zA-Z0-9\s]/g) || []).length;

    // Estimate: words + special characters + some overhead
    return Math.ceil(words.length + specialChars * 0.5 + text.length / 10);
}

/**
 * Get the token limit for a model
 */
export function getModelTokenLimit(model: string): number {
    // Check for exact match
    if (MODEL_TOKEN_LIMITS[model]) {
        return MODEL_TOKEN_LIMITS[model];
    }

    // Check for partial match (model name contains key)
    for (const [key, limit] of Object.entries(MODEL_TOKEN_LIMITS)) {
        if (model.toLowerCase().includes(key.toLowerCase())) {
            return limit;
        }
    }

    return MODEL_TOKEN_LIMITS['default'];
}

/**
 * Calculate available tokens for context after reserving space for response
 */
export function getAvailableContextTokens(
    model: string,
    reserveForResponse: number = 2000
): number {
    const limit = getModelTokenLimit(model);
    return Math.max(0, limit - reserveForResponse);
}

/**
 * Check if content fits within token limit
 */
export function fitsWithinLimit(
    content: string,
    model: string,
    reserveForResponse: number = 2000
): boolean {
    const tokens = estimateTokenCount(content);
    const available = getAvailableContextTokens(model, reserveForResponse);
    return tokens <= available;
}

/**
 * Truncate content to fit within token limit
 */
export function truncateToFitLimit(
    content: string,
    model: string,
    reserveForResponse: number = 2000
): { content: string; wasTruncated: boolean; originalTokens: number; finalTokens: number } {
    const originalTokens = estimateTokenCount(content);
    const available = getAvailableContextTokens(model, reserveForResponse);

    if (originalTokens <= available) {
        return {
            content,
            wasTruncated: false,
            originalTokens,
            finalTokens: originalTokens,
        };
    }

    // Calculate approximate character limit
    // Using a more conservative ratio for truncation
    const targetChars = Math.floor(available * 3);

    // Truncate from the middle to preserve start and end context
    const halfTarget = Math.floor(targetChars / 2);
    const truncated = content.slice(0, halfTarget) +
        '\n\n... [content truncated] ...\n\n' +
        content.slice(-halfTarget);

    return {
        content: truncated,
        wasTruncated: true,
        originalTokens,
        finalTokens: estimateTokenCount(truncated),
    };
}

/**
 * Split content into chunks that fit within token limit
 */
export function splitIntoChunks(
    content: string,
    model: string,
    reserveForResponse: number = 2000,
    overlap: number = 100
): string[] {
    const available = getAvailableContextTokens(model, reserveForResponse);
    const targetChars = Math.floor(available * 3);

    if (content.length <= targetChars) {
        return [content];
    }

    const chunks: string[] = [];
    const lines = content.split('\n');
    let currentChunk = '';

    for (const line of lines) {
        const potentialChunk = currentChunk + (currentChunk ? '\n' : '') + line;

        if (estimateTokenCount(potentialChunk) > available) {
            if (currentChunk) {
                chunks.push(currentChunk);
                // Start new chunk with overlap
                const overlapLines = currentChunk.split('\n').slice(-overlap);
                currentChunk = overlapLines.join('\n') + '\n' + line;
            } else {
                // Single line exceeds limit, truncate it
                chunks.push(line.slice(0, targetChars));
                currentChunk = '';
            }
        } else {
            currentChunk = potentialChunk;
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
}

