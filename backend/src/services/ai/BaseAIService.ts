import { IAIService, ReviewInput, ReviewOutput, AIProviderConfig } from './types.js';
import { buildReviewPrompt, getSystemPrompt, parseReviewResponse } from './promptBuilder.js';

/**
 * Base class for AI services
 */
export abstract class BaseAIService implements IAIService {
  protected config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  get provider(): string {
    return this.config.name;
  }

  get model(): string {
    return this.config.model;
  }

  /**
   * Check if the service is available/configured
   */
  abstract isAvailable(): boolean;

  /**
   * Generate a code review
   */
  async review(input: ReviewInput): Promise<ReviewOutput> {
    if (!this.isAvailable()) {
      throw new Error(`${this.provider} service is not available or not configured`);
    }

    const systemPrompt = getSystemPrompt();
    const userPrompt = buildReviewPrompt(input);

    try {
      const response = await this.generateCompletion(systemPrompt, userPrompt);
      const parsed = parseReviewResponse(response);

      return {
        ...parsed,
        provider: this.provider,
        model: this.model,
      };
    } catch (error) {
      console.error(`Error generating review with ${this.provider}:`, error);
      throw error;
    }
  }

  /**
   * Generate a completion from the AI provider
   * Must be implemented by subclasses
   */
  protected abstract generateCompletion(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string>;
}

