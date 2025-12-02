/**
 * Represents a comment in a thread
 */
export interface Comment {
  id: string;
  author: 'user' | 'ai';
  text: string;
  timestamp: Date;
  /** For AI comments, includes the diff suggestion if any */
  diff?: string;
}

/**
 * Represents a line range in the code
 */
export interface LineRange {
  startLine: number;
  endLine: number;
}

/**
 * Represents a review thread tied to a code selection
 */
export interface Thread {
  id: string;
  /** File name or identifier */
  file: string;
  /** Line range this thread is attached to */
  range: LineRange;
  /** Comments in this thread */
  comments: Comment[];
  /** When the thread was created */
  createdAt: Date;
  /** When the thread was last updated */
  updatedAt: Date;
  /** Whether the thread is resolved */
  resolved: boolean;
  /** The original selected code when thread was created */
  selectedCode: string;
}

/**
 * Thread state for the context
 */
export interface ThreadState {
  threads: Thread[];
  activeThreadId: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Actions for thread reducer
 */
export type ThreadAction =
  | { type: 'ADD_THREAD'; payload: Thread }
  | { type: 'UPDATE_THREAD'; payload: { id: string; updates: Partial<Thread> } }
  | { type: 'DELETE_THREAD'; payload: string }
  | { type: 'ADD_COMMENT'; payload: { threadId: string; comment: Comment } }
  | { type: 'SET_ACTIVE_THREAD'; payload: string | null }
  | { type: 'RESOLVE_THREAD'; payload: string }
  | { type: 'UNRESOLVE_THREAD'; payload: string }
  | { type: 'SET_THREADS'; payload: Thread[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_THREADS' };

/**
 * Input for creating a new thread
 */
export interface CreateThreadInput {
  file: string;
  range: LineRange;
  selectedCode: string;
  initialComment?: string;
}

/**
 * Input for adding a comment to a thread
 */
export interface AddCommentInput {
  threadId: string;
  text: string;
  author: 'user' | 'ai';
  diff?: string;
}

