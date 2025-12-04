import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InlineThread from '../InlineThread';
import { ThreadProvider } from '../../context/ThreadContext';
import { Thread } from '../../types/thread';

const mockThread: Thread = {
  id: 'thread-1',
  file: 'test.ts',
  range: { startLine: 1, endLine: 5 },
  selectedCode: 'const x = 1;\nconst y = 2;',
  comments: [
    {
      id: 'comment-1',
      author: 'user',
      text: 'What does this do?',
      timestamp: new Date('2024-01-01T10:00:00'),
    },
    {
      id: 'comment-2',
      author: 'ai',
      text: 'This declares two constants.',
      timestamp: new Date('2024-01-01T10:01:00'),
      diff: '- const x = 1;\n+ const x: number = 1;',
    },
  ],
  createdAt: new Date('2024-01-01T10:00:00'),
  updatedAt: new Date('2024-01-01T10:01:00'),
  resolved: false,
};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock window.confirm
vi.spyOn(window, 'confirm').mockImplementation(() => true);

const renderWithProvider = (thread: Thread, onClose?: () => void) => {
  return render(
    <ThreadProvider storageKey="test-threads">
      <InlineThread thread={thread} onClose={onClose} />
    </ThreadProvider>
  );
};

describe('InlineThread', () => {
  it('renders thread with line range', () => {
    renderWithProvider(mockThread);
    
    expect(screen.getByText('Lines 1-5')).toBeInTheDocument();
  });

  it('renders all comments', () => {
    renderWithProvider(mockThread);
    
    expect(screen.getByText('What does this do?')).toBeInTheDocument();
    expect(screen.getByText('This declares two constants.')).toBeInTheDocument();
  });

  it('renders AI comments with diff suggestions', () => {
    renderWithProvider(mockThread);
    
    expect(screen.getByText('Suggested change:')).toBeInTheDocument();
  });

  it('shows author labels for comments', () => {
    renderWithProvider(mockThread);
    
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('shows resolved badge when thread is resolved', () => {
    const resolvedThread = { ...mockThread, resolved: true };
    renderWithProvider(resolvedThread);
    
    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });

  it('shows selected code preview', () => {
    renderWithProvider(mockThread);
    
    // Use getAllByText since the code appears in both the preview and the diff
    const codeElements = screen.getAllByText(/const x = 1/);
    expect(codeElements.length).toBeGreaterThan(0);
  });

  it('collapses and expands thread content', () => {
    renderWithProvider(mockThread);
    
    // Initially expanded
    expect(screen.getByText('What does this do?')).toBeInTheDocument();
    
    // Click collapse button
    const collapseButton = screen.getByLabelText('Collapse thread');
    fireEvent.click(collapseButton);
    
    // Content should be hidden
    expect(screen.queryByText('What does this do?')).not.toBeInTheDocument();
    
    // Click expand button
    const expandButton = screen.getByLabelText('Expand thread');
    fireEvent.click(expandButton);
    
    // Content should be visible again
    expect(screen.getByText('What does this do?')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    renderWithProvider(mockThread, onClose);
    
    const closeButton = screen.getByTitle('Close');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('hides comment form when thread is resolved', () => {
    const resolvedThread = { ...mockThread, resolved: true };
    renderWithProvider(resolvedThread);
    
    expect(screen.queryByPlaceholderText('Add a comment...')).not.toBeInTheDocument();
  });

  it('shows comment form when thread is not resolved', () => {
    renderWithProvider(mockThread);
    
    expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
  });

  it('has disabled submit button when comment is empty', () => {
    renderWithProvider(mockThread);
    
    const submitButton = screen.getByRole('button', { name: 'Comment' });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when comment has text', () => {
    renderWithProvider(mockThread);
    
    const textarea = screen.getByPlaceholderText('Add a comment...');
    fireEvent.change(textarea, { target: { value: 'New comment' } });
    
    const submitButton = screen.getByRole('button', { name: 'Comment' });
    expect(submitButton).not.toBeDisabled();
  });
});

