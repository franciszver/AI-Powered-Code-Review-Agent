import { ReviewInput } from './types.js';

/**
 * System prompt for the AI code reviewer
 */
const SYSTEM_PROMPT = `You are an expert code reviewer. Your task is to analyze code and provide helpful, constructive feedback.

When reviewing code, you should:
1. Identify potential bugs, errors, or issues
2. Suggest improvements for code quality, readability, and maintainability
3. Point out security vulnerabilities if any
4. Recommend best practices and design patterns
5. Provide clear explanations for your suggestions

Format your response as JSON with the following structure:
{
  "explanation": "A clear explanation of what the code does and any issues found",
  "suggestions": ["Array of specific suggestions for improvement"],
  "diff": "Optional: A GitHub-style diff showing suggested changes (use - for removed lines, + for added lines)"
}

Be concise but thorough. Focus on the most important issues first.`;

/**
 * Build the user prompt for code review
 */
export function buildReviewPrompt(input: ReviewInput): string {
  let prompt = '';

  // Add file context if available
  if (input.fileName) {
    prompt += `File: ${input.fileName}\n`;
  }

  // Add language
  prompt += `Language: ${input.language}\n\n`;

  // Add user query if provided
  if (input.query) {
    prompt += `User question: ${input.query}\n\n`;
  }

  // Add the code context
  prompt += `Code context:\n\`\`\`${input.language}\n${input.codeContext}\n\`\`\`\n\n`;

  // Highlight the selected code
  prompt += `Selected code to review:\n\`\`\`${input.language}\n${input.selectedCode}\n\`\`\`\n\n`;

  // Add additional files if provided
  if (input.additionalFiles && input.additionalFiles.length > 0) {
    prompt += 'Additional files for context:\n\n';
    for (const file of input.additionalFiles) {
      prompt += `--- ${file.name} ---\n\`\`\`${file.language}\n${file.content}\n\`\`\`\n\n`;
    }
  }

  prompt += 'Please review the selected code and provide your analysis in JSON format.';

  return prompt;
}

/**
 * Get the system prompt
 */
export function getSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

/**
 * Parse the AI response into structured output
 */
export function parseReviewResponse(response: string): {
  explanation: string;
  suggestions: string[];
  diff?: string;
} {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        explanation: parsed.explanation || 'No explanation provided.',
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        diff: parsed.diff || undefined,
      };
    }
  } catch {
    // If JSON parsing fails, try to extract information from plain text
    console.warn('Failed to parse AI response as JSON, falling back to plain text');
  }

  // Fallback: treat the entire response as the explanation
  return {
    explanation: response,
    suggestions: [],
    diff: undefined,
  };
}

/**
 * Estimate token count for a string (rough approximation)
 * Uses ~4 characters per token as a rough estimate
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate context to fit within token limits
 */
export function truncateContext(
  context: string,
  maxTokens: number,
  preserveSelection: boolean = true
): string {
  const estimatedTokens = estimateTokenCount(context);
  
  if (estimatedTokens <= maxTokens) {
    return context;
  }

  // Calculate how much we need to trim
  const targetLength = maxTokens * 4; // Convert back to approximate characters
  
  if (preserveSelection) {
    // Try to keep the middle (selected code) and trim from edges
    const lines = context.split('\n');
    const middleIndex = Math.floor(lines.length / 2);
    
    let result = lines[middleIndex];
    let topIndex = middleIndex - 1;
    let bottomIndex = middleIndex + 1;
    
    while (result.length < targetLength && (topIndex >= 0 || bottomIndex < lines.length)) {
      if (topIndex >= 0) {
        result = lines[topIndex] + '\n' + result;
        topIndex--;
      }
      if (bottomIndex < lines.length && result.length < targetLength) {
        result = result + '\n' + lines[bottomIndex];
        bottomIndex++;
      }
    }
    
    return result;
  }

  // Simple truncation from the end
  return context.slice(0, targetLength) + '\n... (truncated)';
}

/**
 * Format a diff suggestion
 */
export function formatDiff(
  originalCode: string,
  suggestedCode: string
): string {
  const originalLines = originalCode.split('\n');
  const suggestedLines = suggestedCode.split('\n');
  
  let diff = '';
  
  // Simple line-by-line diff (not a real diff algorithm)
  const maxLines = Math.max(originalLines.length, suggestedLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const original = originalLines[i];
    const suggested = suggestedLines[i];
    
    if (original === suggested) {
      diff += ` ${original || ''}\n`;
    } else {
      if (original !== undefined) {
        diff += `-${original}\n`;
      }
      if (suggested !== undefined) {
        diff += `+${suggested}\n`;
      }
    }
  }
  
  return diff.trimEnd();
}

