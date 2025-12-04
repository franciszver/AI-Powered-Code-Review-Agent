import { useMemo } from 'react';
import { useThreads } from '../context/ThreadContext';
import { Thread } from '../types/thread';
import InlineThread from './InlineThread';

interface ThreadPanelProps {
  /** Current file name to filter threads */
  currentFile: string | null;
  /** Whether to show all threads or just for current file */
  showAllFiles?: boolean;
}

export default function ThreadPanel({ currentFile, showAllFiles = false }: ThreadPanelProps) {
  const { state, setActiveThread, clearThreads } = useThreads();

  const filteredThreads = useMemo(() => {
    if (showAllFiles) {
      return state.threads;
    }
    if (!currentFile) {
      return [];
    }
    return state.threads.filter(thread => thread.file === currentFile);
  }, [state.threads, currentFile, showAllFiles]);

  const groupedThreads = useMemo(() => {
    const groups: Record<string, Thread[]> = {};
    
    filteredThreads.forEach(thread => {
      if (!groups[thread.file]) {
        groups[thread.file] = [];
      }
      groups[thread.file].push(thread);
    });

    // Sort threads within each group by line number
    Object.values(groups).forEach(threads => {
      threads.sort((a, b) => a.range.startLine - b.range.startLine);
    });

    return groups;
  }, [filteredThreads]);

  // Only show active thread if it belongs to the current file (or showing all files)
  const activeThread = useMemo(() => {
    if (!state.activeThreadId) return null;
    const thread = state.threads.find(t => t.id === state.activeThreadId);
    if (!thread) return null;
    // If showing all files, always show active thread
    // Otherwise, only show if it matches the current file
    if (showAllFiles || thread.file === currentFile) {
      return thread;
    }
    return null;
  }, [state.activeThreadId, state.threads, currentFile, showAllFiles]);

  const unresolvedCount = filteredThreads.filter(t => !t.resolved).length;
  const resolvedCount = filteredThreads.filter(t => t.resolved).length;

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400">
        Loading threads...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="thread-panel">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-thread-border">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-300">Threads</h3>
          {unresolvedCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 bg-accent/20 text-accent rounded">
              {unresolvedCount} open
            </span>
          )}
          {resolvedCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 bg-success/20 text-success rounded">
              {resolvedCount} resolved
            </span>
          )}
        </div>
        {filteredThreads.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Clear all threads?')) {
                clearThreads();
              }
            }}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Active thread view */}
      {activeThread && (
        <div className="p-3 border-b border-thread-border">
          <InlineThread
            thread={activeThread}
            onClose={() => setActiveThread(null)}
          />
        </div>
      )}

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {filteredThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-sm">
            <svg
              className="w-8 h-8 mb-2 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p>No threads yet</p>
            <p className="text-xs mt-1">Select code and click "Ask AI" to start</p>
          </div>
        ) : (
          Object.entries(groupedThreads).map(([file, threads]) => (
            <div key={file} className="border-b border-thread-border last:border-b-0">
              {showAllFiles && (
                <div className="px-3 py-1.5 bg-[#2d2d2d] text-xs text-gray-400 font-medium">
                  {file}
                </div>
              )}
              {threads.map(thread => (
                <ThreadListItem
                  key={thread.id}
                  thread={thread}
                  isActive={thread.id === state.activeThreadId}
                  onClick={() => setActiveThread(thread.id)}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface ThreadListItemProps {
  thread: Thread;
  isActive: boolean;
  onClick: () => void;
}

function ThreadListItem({ thread, isActive, onClick }: ThreadListItemProps) {
  const lastComment = thread.comments[thread.comments.length - 1];
  
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 hover:bg-[#2a2d2e] transition-colors ${
        isActive ? 'bg-[#37373d]' : ''
      } ${thread.resolved ? 'opacity-60' : ''}`}
      data-testid="thread-list-item"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400">
          Lines {thread.range.startLine}-{thread.range.endLine}
        </span>
        <div className="flex items-center gap-1">
          {thread.resolved && (
            <svg className="w-3 h-3 text-success" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
          <span className="text-xs text-gray-500">
            {thread.comments.length} {thread.comments.length === 1 ? 'comment' : 'comments'}
          </span>
        </div>
      </div>
      {lastComment && (
        <p className="text-xs text-gray-400 truncate">
          <span className={lastComment.author === 'ai' ? 'text-success' : 'text-accent'}>
            {lastComment.author === 'ai' ? 'AI' : 'You'}:
          </span>{' '}
          {lastComment.text.slice(0, 50)}
          {lastComment.text.length > 50 && '...'}
        </p>
      )}
    </button>
  );
}

