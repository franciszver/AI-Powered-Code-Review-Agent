import { BaseAIService } from './BaseAIService.js';
import { AIProviderConfig } from './types.js';

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * OpenRouter implementation of the AI service
 */
export class OpenRouterService extends BaseAIService {
  private apiKey: string | undefined;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(config?: Partial<AIProviderConfig>) {
    super({
      name: 'openrouter',
      model: config?.model || process.env.OPENROUTER_MODEL || 'anthropic/claude-3-opus',
      apiKey: config?.apiKey || process.env.OPENROUTER_API_KEY,
      maxTokens: config?.maxTokens || 2000,
      temperature: config?.temperature || 0.3,
    });

    this.apiKey = this.config.apiKey;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  protected async generateCompletion(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ai-code-review-assistant.com',
        'X-Title': 'AI Code Review Assistant',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data: OpenRouterResponse = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenRouter');
    }

    return content;
  }
}

