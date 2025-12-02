import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: vi.fn(({ value, onChange, onMount, loading }) => {
    // Simulate editor mount
    if (onMount) {
      const mockEditor = {
        updateOptions: vi.fn(),
        onDidChangeCursorSelection: vi.fn(),
        focus: vi.fn(),
        getModel: vi.fn(() => ({
          getValue: () => value,
          setValue: vi.fn(),
          getLineCount: () => value?.split('\n').length || 0,
          getLineMaxColumn: vi.fn(() => 100),
          getValueInRange: vi.fn(() => ''),
        })),
        getPosition: vi.fn(() => ({ lineNumber: 1, column: 1 })),
        setPosition: vi.fn(),
      };
      const mockMonaco = {};
      setTimeout(() => onMount(mockEditor, mockMonaco), 0);
    }

    return (
      <div data-testid="monaco-editor-mock">
        <textarea
          data-testid="monaco-textarea"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={false}
        />
        {loading}
      </div>
    );
  }),
  Editor: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

