/**
 * Input for AI code review
 */
export interface ReviewInput {
  /** The code context (surrounding lines) */
  codeContext: string;
  /** The selected code to review */
  selectedCode: string;
  /** Programming language */
  language: string;
  /** Optional user query/question */
  query?: string;
  /** Optional file name for additional context */
  fileName?: string;
  /** Optional additional files for multi-file context */
  additionalFiles?: Array<{
    name: string;
    content: string;
    language: string;
  }>;
}

/**
 * Output from AI code review
 */
export interface ReviewOutput {
  /** Explanation of the code and any issues found */
  explanation: string;
  /** List of suggestions for improvement */
  suggestions: string[];
  /** GitHub-style diff suggestion (optional) */
  diff?: string;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Provider that generated the response */
  provider: string;
  /** Model used */
  model: string;
}

/**
 * AI provider configuration
 */
export interface AIProviderConfig {
  /** Provider name */
  name: string;
  /** API key or credentials */
  apiKey?: string;
  /** Model to use */
  model: string;
  /** Maximum tokens for response */
  maxTokens?: number;
  /** Temperature for response generation */
  temperature?: number;
  /** Additional provider-specific options */
  options?: Record<string, unknown>;
}

/**
 * AI service interface
 */
export interface IAIService {
  /** Provider name */
  readonly provider: string;
  /** Current model */
  readonly model: string;
  
  /**
   * Generate a code review
   */
  review(input: ReviewInput): Promise<ReviewOutput>;
  
  /**
   * Check if the service is available/configured
   */
  isAvailable(): boolean;
}

