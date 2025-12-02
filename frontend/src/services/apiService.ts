const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Thread data from API
 */
export interface Thread {
  id: string;
  file: string;
  startLine: number;
  endLine: number;
  selectedCode: string;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
  comments: Comment[];
}

/**
 * Comment data from API
 */
export interface Comment {
  id: string;
  threadId: string;
  author: 'user' | 'ai';
  text: string;
  diff?: string | null;
  createdAt: string;
}

/**
 * AI review response
 */
export interface ReviewResponse {
  explanation: string;
  suggestions: string[];
  diff?: string;
  provider: string;
  model: string;
}

/**
 * API error
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Make an API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = `API error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Ignore JSON parse error
    }
    throw new ApiError(errorMessage, response.status);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Thread API

/**
 * Create a new thread
 */
export async function createThread(data: {
  file: string;
  startLine: number;
  endLine: number;
  selectedCode: string;
  initialComment?: string;
}): Promise<Thread> {
  return apiRequest<Thread>('/api/threads', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get a thread by ID
 */
export async function getThread(id: string): Promise<Thread> {
  return apiRequest<Thread>(`/api/threads/${id}`);
}

/**
 * Get all threads
 */
export async function getThreads(options?: {
  file?: string;
  resolved?: boolean;
  limit?: number;
  offset?: number;
}): Promise<Thread[]> {
  const params = new URLSearchParams();
  if (options?.file) params.set('file', options.file);
  if (options?.resolved !== undefined) params.set('resolved', String(options.resolved));
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));

  const query = params.toString();
  return apiRequest<Thread[]>(`/api/threads${query ? `?${query}` : ''}`);
}

/**
 * Update a thread
 */
export async function updateThread(
  id: string,
  data: { resolved?: boolean }
): Promise<Thread> {
  return apiRequest<Thread>(`/api/threads/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a thread
 */
export async function deleteThread(id: string): Promise<void> {
  return apiRequest<void>(`/api/threads/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Add a comment to a thread
 */
export async function addComment(
  threadId: string,
  data: {
    author: 'user' | 'ai';
    text: string;
    diff?: string;
  }
): Promise<Comment> {
  return apiRequest<Comment>(`/api/threads/${threadId}/comments`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// AI API

/**
 * Generate AI code review
 */
export async function generateReview(data: {
  threadId?: string;
  codeContext: string;
  selectedCode: string;
  language: string;
  query?: string;
  fileName?: string;
  additionalFiles?: Array<{
    name: string;
    content: string;
    language: string;
  }>;
  useFallback?: boolean;
}): Promise<ReviewResponse> {
  return apiRequest<ReviewResponse>('/api/ai/review', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get available AI providers
 */
export async function getAIProviders(): Promise<{
  available: Array<{ provider: string; model: string }>;
  default: string;
}> {
  return apiRequest('/api/ai/providers');
}

// Health check

/**
 * Check API health
 */
export async function checkHealth(): Promise<{ status: string; timestamp: string }> {
  return apiRequest('/health');
}

