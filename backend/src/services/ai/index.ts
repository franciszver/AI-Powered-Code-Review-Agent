import { IAIService, ReviewInput, ReviewOutput } from './types.js';
import { OpenAIService } from './OpenAIService.js';
import { OpenRouterService } from './OpenRouterService.js';
import { BedrockService } from './BedrockService.js';

export * from './types.js';
export * from './promptBuilder.js';
export { OpenAIService } from './OpenAIService.js';
export { OpenRouterService } from './OpenRouterService.js';
export { BedrockService } from './BedrockService.js';

type AIProvider = 'openai' | 'openrouter' | 'bedrock';

/**
 * AI Service Factory
 * Creates and manages AI service instances
 */
export class AIServiceFactory {
  private static instances: Map<AIProvider, IAIService> = new Map();

  /**
   * Get an AI service instance
   */
  static getService(provider?: AIProvider): IAIService {
    const selectedProvider = provider || (process.env.AI_PROVIDER as AIProvider) || 'openai';

    // Return cached instance if available
    if (this.instances.has(selectedProvider)) {
      return this.instances.get(selectedProvider)!;
    }

    // Create new instance
    let service: IAIService;
    switch (selectedProvider) {
      case 'openai':
        service = new OpenAIService();
        break;
      case 'openrouter':
        service = new OpenRouterService();
        break;
      case 'bedrock':
        service = new BedrockService();
        break;
      default:
        throw new Error(`Unknown AI provider: ${selectedProvider}`);
    }

    this.instances.set(selectedProvider, service);
    return service;
  }

  /**
   * Get all available services
   */
  static getAvailableServices(): IAIService[] {
    const providers: AIProvider[] = ['openai', 'openrouter', 'bedrock'];
    const available: IAIService[] = [];

    for (const provider of providers) {
      try {
        const service = this.getService(provider);
        if (service.isAvailable()) {
          available.push(service);
        }
      } catch {
        // Service not available
      }
    }

    return available;
  }

  /**
   * Clear cached instances (useful for testing)
   */
  static clearInstances(): void {
    this.instances.clear();
  }
}

/**
 * Generate a code review using the configured AI provider
 */
export async function generateReview(input: ReviewInput): Promise<ReviewOutput> {
  const service = AIServiceFactory.getService();
  return service.review(input);
}

/**
 * Generate a code review with fallback to other providers
 */
export async function generateReviewWithFallback(
  input: ReviewInput
): Promise<ReviewOutput> {
  const services = AIServiceFactory.getAvailableServices();

  if (services.length === 0) {
    throw new Error('No AI services available. Please configure at least one provider.');
  }

  let lastError: Error | null = null;

  for (const service of services) {
    try {
      return await service.review(input);
    } catch (error) {
      console.warn(`Failed to generate review with ${service.provider}:`, error);
      lastError = error as Error;
    }
  }

  throw lastError || new Error('All AI services failed');
}

