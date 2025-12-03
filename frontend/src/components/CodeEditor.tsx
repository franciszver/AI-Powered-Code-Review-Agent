import { useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { getSelectionRange, SelectionRange } from '../utils/selectionUtils';

// Issue detected by AI scan
export interface CodeIssue {
  id: string;
  startLine: number;
  endLine: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

// Methods exposed to parent via ref
export interface CodeEditorHandle {
  setIssueMarkers: (issues: CodeIssue[]) => void;
  clearIssueMarkers: () => void;
  goToLine: (line: number) => void;
  selectLines: (startLine: number, endLine: number) => void;
}

interface CodeEditorProps {
  code: string;
  language: string;
  onChange?: (value: string) => void;
  onSelectionChange?: (selection: SelectionRange | null) => void;
  onIssueClick?: (issue: CodeIssue) => void;
  readOnly?: boolean;
  theme?: string;
}

const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor({
  code,
  language,
  onChange,
  onSelectionChange,
  onIssueClick,
  readOnly = false,
  theme = 'vs-dark',
}, ref) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const decorationsRef = useRef<string[]>([]);
  const issuesRef = useRef<CodeIssue[]>([]);

  // Keep the ref updated with the latest callback
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    setIssueMarkers: (issues: CodeIssue[]) => {
      if (!editorRef.current || !monacoRef.current) return;
      
      issuesRef.current = issues;
      const monaco = monacoRef.current;
      const editor = editorRef.current;
      
      // Create decorations for each issue
      const decorations = issues.map(issue => ({
        range: new monaco.Range(issue.startLine, 1, issue.endLine, 1),
        options: {
          isWholeLine: true,
          glyphMarginClassName: `issue-glyph-${issue.severity}`,
          glyphMarginHoverMessage: { value: `**${issue.severity.toUpperCase()}**: ${issue.message}` },
          className: `issue-line-${issue.severity}`,
          overviewRuler: {
            color: issue.severity === 'error' ? '#f85149' : issue.severity === 'warning' ? '#d29922' : '#58a6ff',
            position: monaco.editor.OverviewRulerLane.Right,
          },
        },
      }));
      
      // Apply decorations
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
    },
    
    clearIssueMarkers: () => {
      if (!editorRef.current) return;
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
      issuesRef.current = [];
    },
    
    goToLine: (line: number) => {
      if (!editorRef.current) return;
      editorRef.current.revealLineInCenter(line);
      editorRef.current.setPosition({ lineNumber: line, column: 1 });
      editorRef.current.focus();
    },
    
    selectLines: (startLine: number, endLine: number) => {
      if (!editorRef.current || !monacoRef.current) return;
      const monaco = monacoRef.current;
      const model = editorRef.current.getModel();
      if (!model) return;
      
      const endColumn = model.getLineMaxColumn(endLine);
      editorRef.current.setSelection(new monaco.Selection(startLine, 1, endLine, endColumn));
      editorRef.current.revealLineInCenter(startLine);
      editorRef.current.focus();
    },
  }), []);

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

    // Listen for glyph margin clicks (issue markers)
    editor.onMouseDown((e) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const lineNumber = e.target.position?.lineNumber;
        if (lineNumber && onIssueClick) {
          // Find the issue at this line
          const issue = issuesRef.current.find(
            i => lineNumber >= i.startLine && lineNumber <= i.endLine
          );
          if (issue) {
            onIssueClick(issue);
          }
        }
      }
    });

    // Focus the editor
    editor.focus();
  }, [onIssueClick]);

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
});

export default CodeEditor;

