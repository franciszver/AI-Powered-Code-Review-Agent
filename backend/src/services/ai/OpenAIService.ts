import OpenAI from 'openai';
import { BaseAIService } from './BaseAIService.js';
import { AIProviderConfig } from './types.js';

/**
 * OpenAI implementation of the AI service
 */
export class OpenAIService extends BaseAIService {
  private client: OpenAI | null = null;

  constructor(config?: Partial<AIProviderConfig>) {
    super({
      name: 'openai',
      model: config?.model || process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      apiKey: config?.apiKey || process.env.OPENAI_API_KEY,
      maxTokens: config?.maxTokens || 2000,
      temperature: config?.temperature || 0.3,
    });

    if (this.config.apiKey) {
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
      });
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  protected async generateCompletion(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return content;
  }
}

