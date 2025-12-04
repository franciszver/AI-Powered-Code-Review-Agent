import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIServiceFactory, generateReview, generateReviewWithFallback } from '../index.js';

// Mock OpenAIService
vi.mock('../OpenAIService.js', () => ({
  OpenAIService: vi.fn().mockImplementation(() => ({
    provider: 'openai',
    model: 'gpt-4',
    isAvailable: vi.fn().mockReturnValue(true),
    review: vi.fn().mockResolvedValue({
      explanation: 'Test explanation',
      suggestions: ['Test suggestion'],
      diff: '- old\n+ new',
      provider: 'openai',
      model: 'gpt-4',
    }),
  })),
}));

describe('AIServiceFactory', () => {
  beforeEach(() => {
    // Clear cached instances before each test
    AIServiceFactory.clearInstances();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getService', () => {
    it('returns OpenAI service by default', () => {
      const service = AIServiceFactory.getService();

      expect(service).toBeDefined();
      expect(service.provider).toBe('openai');
    });

    it('returns OpenAI service when explicitly requested', () => {
      const service = AIServiceFactory.getService('openai');

      expect(service).toBeDefined();
      expect(service.provider).toBe('openai');
    });

    it('caches service instances (singleton pattern)', () => {
      const service1 = AIServiceFactory.getService('openai');
      const service2 = AIServiceFactory.getService('openai');

      expect(service1).toBe(service2);
    });

    it('throws for unknown provider', () => {
      expect(() => {
        // @ts-expect-error Testing invalid provider
        AIServiceFactory.getService('unknown');
      }).toThrow('Unknown AI provider: unknown');
    });

    it('uses AI_PROVIDER env variable when no provider specified', () => {
      const originalEnv = process.env.AI_PROVIDER;
      process.env.AI_PROVIDER = 'openai';

      const service = AIServiceFactory.getService();

      expect(service.provider).toBe('openai');

      process.env.AI_PROVIDER = originalEnv;
    });
  });

  describe('getAvailableServices', () => {
    it('returns array of available services', () => {
      const services = AIServiceFactory.getAvailableServices();

      expect(Array.isArray(services)).toBe(true);
    });

    it('only includes services that are available', () => {
      const services = AIServiceFactory.getAvailableServices();

      services.forEach(service => {
        expect(service.isAvailable()).toBe(true);
      });
    });

    it('returns OpenAI when configured', () => {
      const services = AIServiceFactory.getAvailableServices();
      const providers = services.map(s => s.provider);

      expect(providers).toContain('openai');
    });
  });

  describe('clearInstances', () => {
    it('clears cached instances', () => {
      const service1 = AIServiceFactory.getService('openai');
      AIServiceFactory.clearInstances();
      const service2 = AIServiceFactory.getService('openai');

      // After clearing, should create a new instance
      expect(service1).not.toBe(service2);
    });
  });
});

describe('generateReview', () => {
  const originalEnv = process.env.AI_PROVIDER;

  beforeEach(() => {
    AIServiceFactory.clearInstances();
    vi.clearAllMocks();
    // Set the AI provider explicitly for tests
    process.env.AI_PROVIDER = 'openai';
  });

  afterEach(() => {
    process.env.AI_PROVIDER = originalEnv;
  });

  it('generates review using default service', async () => {
    const input = {
      codeContext: 'const x = 1;',
      selectedCode: 'const x = 1;',
      language: 'javascript',
    };

    const result = await generateReview(input);

    expect(result).toBeDefined();
    expect(result.explanation).toBe('Test explanation');
    expect(result.suggestions).toEqual(['Test suggestion']);
  });

  it('passes input to AI service', async () => {
    const input = {
      codeContext: 'function test() {}',
      selectedCode: 'function test() {}',
      language: 'typescript',
      fileName: 'test.ts',
      query: 'Is this a good function?',
    };

    const result = await generateReview(input);

    expect(result).toBeDefined();
    expect(result.provider).toBe('openai');
  });
});

describe('generateReviewWithFallback', () => {
  beforeEach(() => {
    AIServiceFactory.clearInstances();
    vi.clearAllMocks();
  });

  it('generates review with fallback capability', async () => {
    const input = {
      codeContext: 'const y = 2;',
      selectedCode: 'const y = 2;',
      language: 'javascript',
    };

    const result = await generateReviewWithFallback(input);

    expect(result).toBeDefined();
    expect(result.explanation).toBeTruthy();
  });

  it('throws when no services are available', async () => {
    // Mock getAvailableServices to return empty array
    vi.spyOn(AIServiceFactory, 'getAvailableServices').mockReturnValue([]);

    const input = {
      codeContext: 'code',
      selectedCode: 'code',
      language: 'javascript',
    };

    await expect(generateReviewWithFallback(input)).rejects.toThrow(
      'No AI services available'
    );
  });

  it('tries next service on failure', async () => {
    const failingService = {
      provider: 'failing',
      model: 'test',
      isAvailable: () => true,
      review: vi.fn().mockRejectedValue(new Error('Service failed')),
    };

    const successService = {
      provider: 'success',
      model: 'test',
      isAvailable: () => true,
      review: vi.fn().mockResolvedValue({
        explanation: 'Fallback success',
        suggestions: [],
        provider: 'success',
        model: 'test',
      }),
    };

    vi.spyOn(AIServiceFactory, 'getAvailableServices').mockReturnValue([
      failingService,
      successService,
    ]);

    const input = {
      codeContext: 'code',
      selectedCode: 'code',
      language: 'javascript',
    };

    const result = await generateReviewWithFallback(input);

    expect(failingService.review).toHaveBeenCalled();
    expect(successService.review).toHaveBeenCalled();
    expect(result.explanation).toBe('Fallback success');
  });

  it('throws last error when all services fail', async () => {
    const failingService1 = {
      provider: 'failing1',
      model: 'test',
      isAvailable: () => true,
      review: vi.fn().mockRejectedValue(new Error('First service failed')),
    };

    const failingService2 = {
      provider: 'failing2',
      model: 'test',
      isAvailable: () => true,
      review: vi.fn().mockRejectedValue(new Error('Second service failed')),
    };

    vi.spyOn(AIServiceFactory, 'getAvailableServices').mockReturnValue([
      failingService1,
      failingService2,
    ]);

    const input = {
      codeContext: 'code',
      selectedCode: 'code',
      language: 'javascript',
    };

    await expect(generateReviewWithFallback(input)).rejects.toThrow(
      'Second service failed'
    );
  });
});

