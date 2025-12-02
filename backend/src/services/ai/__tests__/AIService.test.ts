import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIServiceFactory, generateReview, generateReviewWithFallback } from '../index.js';

// Mock the service implementations
vi.mock('../OpenAIService.js', () => ({
  OpenAIService: vi.fn().mockImplementation(() => ({
    provider: 'openai',
    model: 'gpt-4',
    isAvailable: vi.fn().mockReturnValue(true),
    review: vi.fn().mockResolvedValue({
      explanation: 'OpenAI review',
      suggestions: ['Suggestion 1'],
      diff: '- old\n+ new',
      provider: 'openai',
      model: 'gpt-4',
    }),
  })),
}));

vi.mock('../OpenRouterService.js', () => ({
  OpenRouterService: vi.fn().mockImplementation(() => ({
    provider: 'openrouter',
    model: 'claude-3',
    isAvailable: vi.fn().mockReturnValue(false),
    review: vi.fn().mockRejectedValue(new Error('Not available')),
  })),
}));

vi.mock('../BedrockService.js', () => ({
  BedrockService: vi.fn().mockImplementation(() => ({
    provider: 'bedrock',
    model: 'claude-3-sonnet',
    isAvailable: vi.fn().mockReturnValue(false),
    review: vi.fn().mockRejectedValue(new Error('Not available')),
  })),
}));

describe('AIServiceFactory', () => {
  beforeEach(() => {
    AIServiceFactory.clearInstances();
    vi.clearAllMocks();
  });

  describe('getService', () => {
    it('returns OpenAI service by default', () => {
      const service = AIServiceFactory.getService();
      expect(service.provider).toBe('openai');
    });

    it('returns requested provider', () => {
      const service = AIServiceFactory.getService('openai');
      expect(service.provider).toBe('openai');
    });

    it('caches service instances', () => {
      const service1 = AIServiceFactory.getService('openai');
      const service2 = AIServiceFactory.getService('openai');
      expect(service1).toBe(service2);
    });

    it('throws for unknown provider', () => {
      expect(() => {
        AIServiceFactory.getService('unknown' as any);
      }).toThrow('Unknown AI provider');
    });
  });

  describe('getAvailableServices', () => {
    it('returns only available services', () => {
      const services = AIServiceFactory.getAvailableServices();
      expect(services.length).toBe(1);
      expect(services[0].provider).toBe('openai');
    });
  });

  describe('clearInstances', () => {
    it('clears cached instances', () => {
      const service1 = AIServiceFactory.getService('openai');
      AIServiceFactory.clearInstances();
      const service2 = AIServiceFactory.getService('openai');
      expect(service1).not.toBe(service2);
    });
  });
});

describe('generateReview', () => {
  beforeEach(() => {
    AIServiceFactory.clearInstances();
    vi.clearAllMocks();
  });

  it('generates a review using default provider', async () => {
    const result = await generateReview({
      codeContext: 'const x = 1;',
      selectedCode: 'const x = 1;',
      language: 'javascript',
    });

    expect(result.explanation).toBe('OpenAI review');
    expect(result.provider).toBe('openai');
  });
});

describe('generateReviewWithFallback', () => {
  beforeEach(() => {
    AIServiceFactory.clearInstances();
    vi.clearAllMocks();
  });

  it('uses first available provider', async () => {
    const result = await generateReviewWithFallback({
      codeContext: 'const x = 1;',
      selectedCode: 'const x = 1;',
      language: 'javascript',
    });

    expect(result.provider).toBe('openai');
  });
});

