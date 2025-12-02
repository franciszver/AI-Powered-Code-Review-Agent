import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DiffViewer, { InlineDiff } from '../DiffViewer';

describe('DiffViewer', () => {
  const sampleDiff = `@@ -1,3 +1,3 @@
 const x = 1;
-const y = 2;
+const y: number = 2;
 const z = 3;`;

  it('renders diff content', () => {
    render(<DiffViewer diff={sampleDiff} />);
    
    expect(screen.getByTestId('diff-viewer')).toBeInTheDocument();
    expect(screen.getByText('Suggested changes')).toBeInTheDocument();
  });

  it('renders added lines with + prefix', () => {
    render(<DiffViewer diff={sampleDiff} />);
    
    expect(screen.getByText('+')).toBeInTheDocument();
    expect(screen.getByText('const y: number = 2;')).toBeInTheDocument();
  });

  it('renders removed lines with - prefix', () => {
    render(<DiffViewer diff={sampleDiff} />);
    
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getByText('const y = 2;')).toBeInTheDocument();
  });

  it('renders unchanged lines', () => {
    render(<DiffViewer diff={sampleDiff} />);
    
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    expect(screen.getByText('const z = 3;')).toBeInTheDocument();
  });

  it('renders hunk headers', () => {
    render(<DiffViewer diff={sampleDiff} />);
    
    expect(screen.getByText('@@ -1,3 +1,3 @@')).toBeInTheDocument();
  });

  it('returns null for empty diff', () => {
    const { container } = render(<DiffViewer diff="" />);
    
    expect(container.firstChild).toBeNull();
  });

  it('returns null for whitespace-only diff', () => {
    const { container } = render(<DiffViewer diff="   " />);
    
    expect(container.firstChild).toBeNull();
  });

  it('applies custom className', () => {
    render(<DiffViewer diff={sampleDiff} className="custom-class" />);
    
    expect(screen.getByTestId('diff-viewer')).toHaveClass('custom-class');
  });
});

describe('InlineDiff', () => {
  const sampleDiff = `- const old = 1;
+ const new = 1;`;

  it('renders inline diff content', () => {
    render(<InlineDiff diff={sampleDiff} />);
    
    expect(screen.getByTestId('inline-diff')).toBeInTheDocument();
  });

  it('renders added lines with green color', () => {
    render(<InlineDiff diff={sampleDiff} />);
    
    const addedLine = screen.getByText('+ const new = 1;');
    expect(addedLine).toBeInTheDocument();
  });

  it('renders removed lines with red color', () => {
    render(<InlineDiff diff={sampleDiff} />);
    
    const removedLine = screen.getByText('- const old = 1;');
    expect(removedLine).toBeInTheDocument();
  });

  it('returns null for empty diff', () => {
    const { container } = render(<InlineDiff diff="" />);
    
    expect(container.firstChild).toBeNull();
  });

  it('applies custom className', () => {
    render(<InlineDiff diff={sampleDiff} className="custom-class" />);
    
    expect(screen.getByTestId('inline-diff')).toHaveClass('custom-class');
  });
});

