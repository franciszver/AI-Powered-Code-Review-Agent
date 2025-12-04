import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThreadPanel from '../ThreadPanel';
import { ThreadProvider, useThreads } from '../../context/ThreadContext';
import { Thread } from '../../types/thread';

// Mock the ThreadContext
const mockThreads: Thread[] = [
  {
    id: 'thread-1',
    file: 'test.ts',
    range: { startLine: 1, endLine: 5 },
    selectedCode: 'const x = 1;',
    resolved: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    comments: [
      {
        id: 'comment-1',
        author: 'user',
        text: 'What does this code do?',
        timestamp: new Date('2024-01-01'),
      },
      {
        id: 'comment-2',
        author: 'ai',
        text: 'This code declares a constant.',
        timestamp: new Date('2024-01-01'),
      },
    ],
  },
  {
    id: 'thread-2',
    file: 'test.ts',
    range: { startLine: 10, endLine: 15 },
    selectedCode: 'function test() {}',
    resolved: true,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    comments: [
      {
        id: 'comment-3',
        author: 'user',
        text: 'Is this correct?',
        timestamp: new Date('2024-01-02'),
      },
    ],
  },
  {
    id: 'thread-3',
    file: 'other.ts',
    range: { startLine: 1, endLine: 3 },
    selectedCode: 'import x from "y";',
    resolved: false,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
    comments: [],
  },
];

const mockState = {
  threads: mockThreads,
  activeThreadId: null,
  isLoading: false,
  error: null,
};

const mockSetActiveThread = vi.fn();
const mockClearThreads = vi.fn();

vi.mock('../../context/ThreadContext', async () => {
  const actual = await vi.importActual('../../context/ThreadContext');
  return {
    ...actual,
    useThreads: vi.fn(() => ({
      state: mockState,
      setActiveThread: mockSetActiveThread,
      clearThreads: mockClearThreads,
    })),
  };
});

// Mock InlineThread component
vi.mock('../InlineThread', () => ({
  default: ({ thread, onClose }: { thread: Thread; onClose: () => void }) => (
    <div data-testid="inline-thread">
      <span>Thread: {thread.id}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('ThreadPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.threads = mockThreads;
    mockState.activeThreadId = null;
    mockState.isLoading = false;
  });

  describe('rendering', () => {
    it('renders thread panel with header', () => {
      render(<ThreadPanel currentFile="test.ts" />);

      expect(screen.getByText('Threads')).toBeInTheDocument();
    });

    it('shows loading state', () => {
      mockState.isLoading = true;

      render(<ThreadPanel currentFile="test.ts" />);

      expect(screen.getByText('Loading threads...')).toBeInTheDocument();
    });

    it('shows empty state when no threads', () => {
      mockState.threads = [];

      render(<ThreadPanel currentFile="test.ts" />);

      expect(screen.getByText('No threads yet')).toBeInTheDocument();
      expect(screen.getByText('Select code and click "Ask AI" to start')).toBeInTheDocument();
    });

    it('renders thread list items', () => {
      render(<ThreadPanel currentFile="test.ts" />);

      expect(screen.getAllByTestId('thread-list-item')).toHaveLength(2);
    });
  });

  describe('filtering', () => {
    it('filters threads by current file', () => {
      render(<ThreadPanel currentFile="test.ts" />);

      const items = screen.getAllByTestId('thread-list-item');
      expect(items).toHaveLength(2); // Only threads for test.ts
    });

    it('shows all threads when showAllFiles is true', () => {
      render(<ThreadPanel currentFile="test.ts" showAllFiles={true} />);

      const items = screen.getAllByTestId('thread-list-item');
      expect(items).toHaveLength(3); // All threads
    });

    it('shows no threads when currentFile is null and showAllFiles is false', () => {
      render(<ThreadPanel currentFile={null} />);

      expect(screen.getByText('No threads yet')).toBeInTheDocument();
    });

    it('shows file headers when showAllFiles is true', () => {
      render(<ThreadPanel currentFile="test.ts" showAllFiles={true} />);

      expect(screen.getByText('test.ts')).toBeInTheDocument();
      expect(screen.getByText('other.ts')).toBeInTheDocument();
    });
  });

  describe('counters', () => {
    it('shows open thread count', () => {
      render(<ThreadPanel currentFile="test.ts" />);

      expect(screen.getByText('1 open')).toBeInTheDocument();
    });

    it('shows resolved thread count', () => {
      render(<ThreadPanel currentFile="test.ts" />);

      expect(screen.getByText('1 resolved')).toBeInTheDocument();
    });

    it('hides counters when all threads are resolved', () => {
      mockState.threads = mockThreads.map(t => ({ ...t, resolved: true }));

      render(<ThreadPanel currentFile="test.ts" />);

      expect(screen.queryByText('open')).not.toBeInTheDocument();
    });
  });

  describe('thread list item', () => {
    it('displays line range', () => {
      render(<ThreadPanel currentFile="test.ts" />);

      expect(screen.getByText('Lines 1-5')).toBeInTheDocument();
      expect(screen.getByText('Lines 10-15')).toBeInTheDocument();
    });

    it('displays comment count', () => {
      render(<ThreadPanel currentFile="test.ts" />);

      expect(screen.getByText('2 comments')).toBeInTheDocument();
      expect(screen.getByText('1 comment')).toBeInTheDocument();
    });

    it('shows resolved checkmark for resolved threads', () => {
      render(<ThreadPanel currentFile="test.ts" />);

      const resolvedThread = screen.getAllByTestId('thread-list-item')[1];
      expect(resolvedThread.querySelector('svg')).toBeInTheDocument();
    });

    it('shows last comment preview', () => {
      render(<ThreadPanel currentFile="test.ts" />);

      expect(screen.getByText(/This code declares a constant/)).toBeInTheDocument();
    });

    it('truncates long comment text', () => {
      mockState.threads = [
        {
          ...mockThreads[0],
          comments: [
            {
              id: 'long-comment',
              author: 'ai',
              text: 'This is a very long comment that should be truncated because it exceeds fifty characters',
              timestamp: new Date(),
            },
          ],
        },
      ];

      render(<ThreadPanel currentFile="test.ts" />);

      expect(screen.getByText(/\.\.\./)).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls setActiveThread when clicking a thread', () => {
      render(<ThreadPanel currentFile="test.ts" />);

      const items = screen.getAllByTestId('thread-list-item');
      fireEvent.click(items[0]);

      expect(mockSetActiveThread).toHaveBeenCalledWith('thread-1');
    });

    it('shows clear all button when threads exist', () => {
      render(<ThreadPanel currentFile="test.ts" />);

      expect(screen.getByText('Clear all')).toBeInTheDocument();
    });

    it('hides clear all button when no threads', () => {
      mockState.threads = [];

      render(<ThreadPanel currentFile="test.ts" />);

      expect(screen.queryByText('Clear all')).not.toBeInTheDocument();
    });

    it('calls clearThreads after confirmation', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<ThreadPanel currentFile="test.ts" />);

      fireEvent.click(screen.getByText('Clear all'));

      expect(mockClearThreads).toHaveBeenCalled();
    });

    it('does not clear threads when confirmation cancelled', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<ThreadPanel currentFile="test.ts" />);

      fireEvent.click(screen.getByText('Clear all'));

      expect(mockClearThreads).not.toHaveBeenCalled();
    });
  });

  describe('active thread', () => {
    it('renders InlineThread when thread is active', () => {
      mockState.activeThreadId = 'thread-1';

      render(<ThreadPanel currentFile="test.ts" />);

      expect(screen.getByTestId('inline-thread')).toBeInTheDocument();
    });

    it('does not render InlineThread when no active thread', () => {
      mockState.activeThreadId = null;

      render(<ThreadPanel currentFile="test.ts" />);

      expect(screen.queryByTestId('inline-thread')).not.toBeInTheDocument();
    });

    it('does not show active thread from different file', () => {
      mockState.activeThreadId = 'thread-3'; // From other.ts

      render(<ThreadPanel currentFile="test.ts" />);

      expect(screen.queryByTestId('inline-thread')).not.toBeInTheDocument();
    });

    it('shows active thread from different file when showAllFiles is true', () => {
      mockState.activeThreadId = 'thread-3';

      render(<ThreadPanel currentFile="test.ts" showAllFiles={true} />);

      expect(screen.getByTestId('inline-thread')).toBeInTheDocument();
    });

    it('highlights active thread in list', () => {
      mockState.activeThreadId = 'thread-1';

      render(<ThreadPanel currentFile="test.ts" />);

      const items = screen.getAllByTestId('thread-list-item');
      expect(items[0]).toHaveClass('bg-[#37373d]');
    });

    it('closes active thread when close button clicked', () => {
      mockState.activeThreadId = 'thread-1';

      render(<ThreadPanel currentFile="test.ts" />);

      fireEvent.click(screen.getByText('Close'));

      expect(mockSetActiveThread).toHaveBeenCalledWith(null);
    });
  });

  describe('thread grouping', () => {
    it('groups threads by file', () => {
      render(<ThreadPanel currentFile="test.ts" showAllFiles={true} />);

      // Should show file headers
      expect(screen.getByText('test.ts')).toBeInTheDocument();
      expect(screen.getByText('other.ts')).toBeInTheDocument();
    });

    it('sorts threads by line number within groups', () => {
      render(<ThreadPanel currentFile="test.ts" />);

      const items = screen.getAllByTestId('thread-list-item');
      const firstLineText = items[0].textContent;
      const secondLineText = items[1].textContent;

      expect(firstLineText).toContain('Lines 1-5');
      expect(secondLineText).toContain('Lines 10-15');
    });
  });
});

