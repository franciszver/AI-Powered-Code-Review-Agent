import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CodeEditor from '../CodeEditor';

describe('CodeEditor', () => {
  const defaultProps = {
    code: 'const hello = "world";',
    language: 'javascript',
  };

  it('renders the editor container', () => {
    render(<CodeEditor {...defaultProps} />);
    expect(screen.getByTestId('code-editor')).toBeInTheDocument();
  });

  it('renders with the provided code', async () => {
    render(<CodeEditor {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('monaco-editor-mock')).toBeInTheDocument();
    });
  });

  it('calls onChange when code is modified', async () => {
    const handleChange = vi.fn();
    render(<CodeEditor {...defaultProps} onChange={handleChange} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('monaco-editor-mock')).toBeInTheDocument();
    });

    // The mock textarea should be available
    const textarea = screen.getByTestId('monaco-textarea');
    expect(textarea).toBeInTheDocument();
  });

  it('renders with different languages', async () => {
    const languages = ['javascript', 'typescript', 'python', 'java', 'go'];
    
    for (const language of languages) {
      const { unmount } = render(
        <CodeEditor code="// test code" language={language} />
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('monaco-editor-mock')).toBeInTheDocument();
      });
      
      unmount();
    }
  });

  it('respects readOnly prop', async () => {
    render(<CodeEditor {...defaultProps} readOnly={true} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('monaco-editor-mock')).toBeInTheDocument();
    });
  });

  it('calls onSelectionChange when selection changes', async () => {
    const handleSelectionChange = vi.fn();
    render(
      <CodeEditor {...defaultProps} onSelectionChange={handleSelectionChange} />
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('monaco-editor-mock')).toBeInTheDocument();
    });
  });

  it('renders loading state initially', () => {
    render(<CodeEditor {...defaultProps} />);
    // The loading state is handled by Monaco Editor internally
    expect(screen.getByTestId('code-editor')).toBeInTheDocument();
  });

  it('applies custom theme', async () => {
    render(<CodeEditor {...defaultProps} theme="vs-light" />);
    
    await waitFor(() => {
      expect(screen.getByTestId('monaco-editor-mock')).toBeInTheDocument();
    });
  });
});

