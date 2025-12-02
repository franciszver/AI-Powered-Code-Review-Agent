import { useState, useCallback } from 'react';
import { Thread, Comment } from '../types/thread';
import { useThreads } from '../context/ThreadContext';

interface InlineThreadProps {
  thread: Thread;
  onClose?: () => void;
}

export default function InlineThread({ thread, onClose }: InlineThreadProps) {
  const { addComment, resolveThread, unresolveThread, deleteThread } = useThreads();
  const [newComment, setNewComment] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const handleSubmitComment = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (newComment.trim()) {
        addComment({
          threadId: thread.id,
          text: newComment.trim(),
          author: 'user',
        });
        setNewComment('');
      }
    },
    [addComment, newComment, thread.id]
  );

  const handleToggleResolved = useCallback(() => {
    if (thread.resolved) {
      unresolveThread(thread.id);
    } else {
      resolveThread(thread.id);
    }
  }, [thread.id, thread.resolved, resolveThread, unresolveThread]);

  const handleDelete = useCallback(() => {
    if (confirm('Are you sure you want to delete this thread?')) {
      deleteThread(thread.id);
      onClose?.();
    }
  }, [deleteThread, thread.id, onClose]);

  const formatTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  };

  return (
    <div
      className={`bg-thread-bg border border-thread-border rounded-lg shadow-lg overflow-hidden ${
        thread.resolved ? 'opacity-75' : ''
      }`}
      data-testid="inline-thread"
    >
      {/* Thread header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#2d2d2d] border-b border-thread-border">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-white"
            aria-label={isExpanded ? 'Collapse thread' : 'Expand thread'}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
          <span className="text-sm text-gray-300">
            Lines {thread.range.startLine}-{thread.range.endLine}
          </span>
          {thread.resolved && (
            <span className="text-xs px-2 py-0.5 bg-success/20 text-success rounded">
              Resolved
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleResolved}
            className={`p-1 rounded hover:bg-[#3c3c3c] ${
              thread.resolved ? 'text-success' : 'text-gray-400'
            }`}
            title={thread.resolved ? 'Unresolve thread' : 'Resolve thread'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            className="p-1 rounded hover:bg-[#3c3c3c] text-gray-400 hover:text-error"
            title="Delete thread"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[#3c3c3c] text-gray-400 hover:text-white"
              title="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Thread content */}
      {isExpanded && (
        <>
          {/* Selected code preview */}
          <div className="px-3 py-2 bg-[#1e1e1e] border-b border-thread-border">
            <pre className="text-xs text-gray-400 font-mono overflow-x-auto max-h-20">
              {thread.selectedCode.slice(0, 200)}
              {thread.selectedCode.length > 200 && '...'}
            </pre>
          </div>

          {/* Comments */}
          <div className="max-h-64 overflow-y-auto">
            {thread.comments.map(comment => (
              <CommentItem key={comment.id} comment={comment} formatTime={formatTime} />
            ))}
          </div>

          {/* Add comment form */}
          {!thread.resolved && (
            <form onSubmit={handleSubmitComment} className="p-3 border-t border-thread-border">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full px-3 py-2 bg-[#1e1e1e] border border-thread-border rounded text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-accent"
                rows={2}
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="px-3 py-1 bg-accent hover:bg-accent-hover disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
                >
                  Comment
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  formatTime: (date: Date | string) => string;
}

function CommentItem({ comment, formatTime }: CommentItemProps) {
  return (
    <div
      className={`px-3 py-2 border-b border-thread-border last:border-b-0 ${
        comment.author === 'ai' ? 'bg-[#1e2a1e]' : ''
      }`}
      data-testid="comment-item"
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-xs font-medium ${
            comment.author === 'ai' ? 'text-success' : 'text-accent'
          }`}
        >
          {comment.author === 'ai' ? 'AI Assistant' : 'You'}
        </span>
        <span className="text-xs text-gray-500">{formatTime(comment.timestamp)}</span>
      </div>
      <p className="text-sm text-gray-300 whitespace-pre-wrap">{comment.text}</p>
      
      {/* Diff suggestion */}
      {comment.diff && (
        <div className="mt-2 p-2 bg-[#1e1e1e] rounded border border-thread-border">
          <div className="text-xs text-gray-400 mb-1">Suggested change:</div>
          <pre className="text-xs font-mono overflow-x-auto">
            {comment.diff.split('\n').map((line, i) => (
              <div
                key={i}
                className={
                  line.startsWith('+')
                    ? 'text-success bg-success/10'
                    : line.startsWith('-')
                    ? 'text-error bg-error/10'
                    : 'text-gray-400'
                }
              >
                {line}
              </div>
            ))}
          </pre>
        </div>
      )}
    </div>
  );
}

