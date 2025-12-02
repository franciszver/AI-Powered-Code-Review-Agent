import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { fromIni } from '@aws-sdk/credential-providers';
import { BaseAIService } from './BaseAIService.js';
import { AIProviderConfig } from './types.js';

interface ClaudeResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

/**
 * AWS Bedrock implementation of the AI service
 * Uses Claude models via Bedrock
 */
export class BedrockService extends BaseAIService {
  private client: BedrockRuntimeClient | null = null;

  constructor(config?: Partial<AIProviderConfig>) {
    super({
      name: 'bedrock',
      model:
        config?.model ||
        process.env.BEDROCK_MODEL_ID ||
        'anthropic.claude-3-sonnet-20240229-v1:0',
      maxTokens: config?.maxTokens || 2000,
      temperature: config?.temperature || 0.3,
      options: {
        region: process.env.AWS_REGION || 'us-east-1',
        profile: process.env.AWS_PROFILE || 'default',
      },
    });

    this.initializeClient();
  }

  private initializeClient() {
    try {
      const region = (this.config.options?.region as string) || 'us-east-1';
      const profile = (this.config.options?.profile as string) || 'default';

      this.client = new BedrockRuntimeClient({
        region,
        credentials: fromIni({ profile }),
      });
    } catch (error) {
      console.warn('Failed to initialize Bedrock client:', error);
      this.client = null;
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
      throw new Error('Bedrock client not initialized');
    }

    // Format for Claude models on Bedrock
    const requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    };

    const command = new InvokeModelCommand({
      modelId: this.config.model,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody),
    });

    const response = await this.client.send(command);

    if (!response.body) {
      throw new Error('No response body from Bedrock');
    }

    const responseBody = JSON.parse(
      new TextDecoder().decode(response.body)
    ) as ClaudeResponse;

    const content = responseBody.content[0]?.text;
    if (!content) {
      throw new Error('No content in Bedrock response');
    }

    return content;
  }
}

