import { useRef, useCallback, useEffect } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { getSelectionRange, SelectionRange } from '../utils/selectionUtils';

interface CodeEditorProps {
  code: string;
  language: string;
  onChange?: (value: string) => void;
  onSelectionChange?: (selection: SelectionRange | null) => void;
  readOnly?: boolean;
  theme?: string;
}

export default function CodeEditor({
  code,
  language,
  onChange,
  onSelectionChange,
  readOnly = false,
  theme = 'vs-dark',
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const onSelectionChangeRef = useRef(onSelectionChange);

  // Keep the ref updated with the latest callback
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  const handleEditorDidMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Configure editor options
    editor.updateOptions({
      minimap: { enabled: true },
      lineNumbers: 'on',
      glyphMargin: true,
      folding: true,
      lineDecorationsWidth: 10,
      lineNumbersMinChars: 4,
      renderLineHighlight: 'all',
      scrollBeyondLastLine: false,
      automaticLayout: true,
      fontSize: 14,
      fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
      tabSize: 2,
      wordWrap: 'on',
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
    });

    // Listen for selection changes
    editor.onDidChangeCursorSelection((e) => {
      if (onSelectionChangeRef.current) {
        const selection = getSelectionRange(e.selection, editor.getModel());
        onSelectionChangeRef.current(selection);
      }
    });

    // Focus the editor
    editor.focus();
  }, []);

  const handleChange: OnChange = useCallback((value) => {
    if (onChange && value !== undefined) {
      onChange(value);
    }
  }, [onChange]);

  // Update editor content when code prop changes
  useEffect(() => {
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model && model.getValue() !== code) {
        // Preserve cursor position
        const position = editorRef.current.getPosition();
        model.setValue(code);
        if (position) {
          editorRef.current.setPosition(position);
        }
      }
    }
  }, [code]);

  return (
    <div className="h-full w-full" data-testid="code-editor">
      <Editor
        height="100%"
        width="100%"
        language={language}
        value={code}
        theme={theme}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          domReadOnly: readOnly,
        }}
        loading={
          <div className="flex items-center justify-center h-full bg-editor-bg">
            <div className="text-gray-400">Loading editor...</div>
          </div>
        }
      />
    </div>
  );
}

