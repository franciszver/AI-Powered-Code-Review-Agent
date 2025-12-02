import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Thread,
  ThreadState,
  ThreadAction,
  Comment,
  CreateThreadInput,
  AddCommentInput,
  LineRange,
} from '../types/thread';
import { loadThreads, saveThreads } from '../utils/storageUtils';

const initialState: ThreadState = {
  threads: [],
  activeThreadId: null,
  isLoading: false,
  error: null,
};

function threadReducer(state: ThreadState, action: ThreadAction): ThreadState {
  switch (action.type) {
    case 'ADD_THREAD':
      return {
        ...state,
        threads: [...state.threads, action.payload],
        activeThreadId: action.payload.id,
      };

    case 'UPDATE_THREAD':
      return {
        ...state,
        threads: state.threads.map(thread =>
          thread.id === action.payload.id
            ? { ...thread, ...action.payload.updates, updatedAt: new Date() }
            : thread
        ),
      };

    case 'DELETE_THREAD':
      return {
        ...state,
        threads: state.threads.filter(thread => thread.id !== action.payload),
        activeThreadId:
          state.activeThreadId === action.payload ? null : state.activeThreadId,
      };

    case 'ADD_COMMENT':
      return {
        ...state,
        threads: state.threads.map(thread =>
          thread.id === action.payload.threadId
            ? {
                ...thread,
                comments: [...thread.comments, action.payload.comment],
                updatedAt: new Date(),
              }
            : thread
        ),
      };

    case 'SET_ACTIVE_THREAD':
      return {
        ...state,
        activeThreadId: action.payload,
      };

    case 'RESOLVE_THREAD':
      return {
        ...state,
        threads: state.threads.map(thread =>
          thread.id === action.payload
            ? { ...thread, resolved: true, updatedAt: new Date() }
            : thread
        ),
      };

    case 'UNRESOLVE_THREAD':
      return {
        ...state,
        threads: state.threads.map(thread =>
          thread.id === action.payload
            ? { ...thread, resolved: false, updatedAt: new Date() }
            : thread
        ),
      };

    case 'SET_THREADS':
      return {
        ...state,
        threads: action.payload,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'CLEAR_THREADS':
      return {
        ...state,
        threads: [],
        activeThreadId: null,
      };

    default:
      return state;
  }
}

interface ThreadContextValue {
  state: ThreadState;
  createThread: (input: CreateThreadInput) => Thread;
  deleteThread: (threadId: string) => void;
  addComment: (input: AddCommentInput) => Comment;
  setActiveThread: (threadId: string | null) => void;
  resolveThread: (threadId: string) => void;
  unresolveThread: (threadId: string) => void;
  getThreadsForFile: (file: string) => Thread[];
  getThreadsForRange: (file: string, range: LineRange) => Thread[];
  getThreadById: (threadId: string) => Thread | undefined;
  clearThreads: () => void;
}

const ThreadContext = createContext<ThreadContextValue | null>(null);

interface ThreadProviderProps {
  children: ReactNode;
  /** Storage key for localStorage persistence */
  storageKey?: string;
}

export function ThreadProvider({
  children,
  storageKey = 'code-review-threads',
}: ThreadProviderProps) {
  const [state, dispatch] = useReducer(threadReducer, initialState);

  // Load threads from localStorage on mount
  useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const savedThreads = loadThreads(storageKey);
      if (savedThreads.length > 0) {
        dispatch({ type: 'SET_THREADS', payload: savedThreads });
      }
    } catch (error) {
      console.error('Failed to load threads:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load saved threads' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [storageKey]);

  // Save threads to localStorage when they change
  useEffect(() => {
    // Only save if we have threads or if we're clearing previously saved threads
    if (!state.isLoading) {
      saveThreads(storageKey, state.threads);
    }
  }, [state.threads, storageKey, state.isLoading]);

  const createThread = useCallback((input: CreateThreadInput): Thread => {
    const now = new Date();
    const thread: Thread = {
      id: uuidv4(),
      file: input.file,
      range: input.range,
      selectedCode: input.selectedCode,
      comments: input.initialComment
        ? [
            {
              id: uuidv4(),
              author: 'user',
              text: input.initialComment,
              timestamp: now,
            },
          ]
        : [],
      createdAt: now,
      updatedAt: now,
      resolved: false,
    };

    dispatch({ type: 'ADD_THREAD', payload: thread });
    return thread;
  }, []);

  const deleteThread = useCallback((threadId: string) => {
    dispatch({ type: 'DELETE_THREAD', payload: threadId });
  }, []);

  const addComment = useCallback((input: AddCommentInput): Comment => {
    const comment: Comment = {
      id: uuidv4(),
      author: input.author,
      text: input.text,
      timestamp: new Date(),
      diff: input.diff,
    };

    dispatch({
      type: 'ADD_COMMENT',
      payload: { threadId: input.threadId, comment },
    });

    return comment;
  }, []);

  const setActiveThread = useCallback((threadId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_THREAD', payload: threadId });
  }, []);

  const resolveThread = useCallback((threadId: string) => {
    dispatch({ type: 'RESOLVE_THREAD', payload: threadId });
  }, []);

  const unresolveThread = useCallback((threadId: string) => {
    dispatch({ type: 'UNRESOLVE_THREAD', payload: threadId });
  }, []);

  const getThreadsForFile = useCallback(
    (file: string): Thread[] => {
      return state.threads.filter(thread => thread.file === file);
    },
    [state.threads]
  );

  const getThreadsForRange = useCallback(
    (file: string, range: LineRange): Thread[] => {
      return state.threads.filter(
        thread =>
          thread.file === file &&
          thread.range.startLine <= range.endLine &&
          thread.range.endLine >= range.startLine
      );
    },
    [state.threads]
  );

  const getThreadById = useCallback(
    (threadId: string): Thread | undefined => {
      return state.threads.find(thread => thread.id === threadId);
    },
    [state.threads]
  );

  const clearThreads = useCallback(() => {
    dispatch({ type: 'CLEAR_THREADS' });
  }, []);

  const value: ThreadContextValue = {
    state,
    createThread,
    deleteThread,
    addComment,
    setActiveThread,
    resolveThread,
    unresolveThread,
    getThreadsForFile,
    getThreadsForRange,
    getThreadById,
    clearThreads,
  };

  return (
    <ThreadContext.Provider value={value}>{children}</ThreadContext.Provider>
  );
}

export function useThreads(): ThreadContextValue {
  const context = useContext(ThreadContext);
  if (!context) {
    throw new Error('useThreads must be used within a ThreadProvider');
  }
  return context;
}

export { ThreadContext };

