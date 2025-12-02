import { useState, useCallback } from 'react';
import CodeEditor from './components/CodeEditor';
import FileUpload from './components/FileUpload';
import ThreadPanel from './components/ThreadPanel';
import { ThreadProvider, useThreads } from './context/ThreadContext';
import { SelectionRange } from './utils/selectionUtils';

interface FileData {
  name: string;
  content: string;
  language: string;
}

function AppContent() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [selection, setSelection] = useState<SelectionRange | null>(null);
  const [showThreadPanel, setShowThreadPanel] = useState(true);

  const { createThread, setActiveThread } = useThreads();

  const handleFilesUploaded = useCallback((newFiles: FileData[]) => {
    setFiles(prev => {
      const updated = [...prev, ...newFiles];
      // If this is the first file(s) being added, set active index to 0
      if (prev.length === 0 && newFiles.length > 0) {
        setActiveFileIndex(0);
      }
      return updated;
    });
  }, []);

  const handleCodeChange = useCallback((newCode: string) => {
    setFiles(prev => {
      if (prev.length === 0 || activeFileIndex >= prev.length) {
        return prev;
      }
      const updated = [...prev];
      updated[activeFileIndex] = {
        ...updated[activeFileIndex],
        content: newCode,
      };
      return updated;
    });
  }, [activeFileIndex]);

  const handleSelectionChange = useCallback((newSelection: SelectionRange | null) => {
    setSelection(newSelection);
  }, []);

  const handleCloseFile = useCallback((index: number) => {
    setFiles(prev => {
      const updated = prev.filter((_, i) => i !== index);
      // Adjust active file index if needed
      setActiveFileIndex(currentIndex => {
        if (updated.length === 0) return 0;
        if (index < currentIndex) return currentIndex - 1;
        if (index === currentIndex && currentIndex >= updated.length) {
          return updated.length - 1;
        }
        return currentIndex;
      });
      return updated;
    });
  }, []);

  const handleAskAI = useCallback(() => {
    const currentFile = files[activeFileIndex];
    if (!selection || !currentFile) return;

    const thread = createThread({
      file: currentFile.name,
      range: {
        startLine: selection.startLine,
        endLine: selection.endLine,
      },
      selectedCode: selection.selectedText,
      initialComment: 'Review this code and suggest improvements.',
    });

    setActiveThread(thread.id);
    setShowThreadPanel(true);
  }, [selection, createThread, setActiveThread, files, activeFileIndex]);

  const activeFile = files[activeFileIndex];

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3c3c3c]">
        <h1 className="text-lg font-semibold text-white">AI Code Review Assistant</h1>
        <div className="flex items-center gap-4">
          {selection && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Selected: Lines {selection.startLine}-{selection.endLine}</span>
              <button
                className="px-3 py-1 bg-accent hover:bg-accent-hover text-white rounded text-sm transition-colors"
                onClick={handleAskAI}
              >
                Ask AI
              </button>
            </div>
          )}
          <button
            className={`p-2 rounded hover:bg-[#3c3c3c] ${showThreadPanel ? 'text-accent' : 'text-gray-400'}`}
            onClick={() => setShowThreadPanel(!showThreadPanel)}
            title={showThreadPanel ? 'Hide thread panel' : 'Show thread panel'}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - File list */}
        <aside className="w-64 bg-[#252526] border-r border-[#3c3c3c] flex flex-col">
          <div className="p-3 border-b border-[#3c3c3c]">
            <h2 className="text-sm font-medium text-gray-300 uppercase tracking-wide">Files</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-[#2a2d2e] ${
                  index === activeFileIndex ? 'bg-[#37373d]' : ''
                }`}
                onClick={() => setActiveFileIndex(index)}
              >
                <span className="text-sm text-gray-300 truncate">{file.name}</span>
                <button
                  className="text-gray-500 hover:text-gray-300 text-xs"
                  onClick={e => {
                    e.stopPropagation();
                    handleCloseFile(index);
                  }}
                >
                  x
                </button>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-[#3c3c3c]">
            <FileUpload onFilesUploaded={handleFilesUploaded} />
          </div>
        </aside>

        {/* Editor area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {files.length > 0 ? (
            <>
              {/* Tab bar */}
              <div className="flex bg-[#252526] border-b border-[#3c3c3c] overflow-x-auto">
                {files.map((file, index) => (
                  <div
                    key={`tab-${file.name}-${index}`}
                    className={`flex items-center gap-2 px-4 py-2 cursor-pointer border-r border-[#3c3c3c] ${
                      index === activeFileIndex
                        ? 'bg-[#1e1e1e] text-white'
                        : 'bg-[#2d2d2d] text-gray-400 hover:bg-[#37373d]'
                    }`}
                    onClick={() => setActiveFileIndex(index)}
                  >
                    <span className="text-sm">{file.name}</span>
                    <button
                      className="text-gray-500 hover:text-gray-300 text-xs"
                      onClick={e => {
                        e.stopPropagation();
                        handleCloseFile(index);
                      }}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
              {/* Code editor */}
              <div className="flex-1 overflow-hidden">
                <CodeEditor
                  code={activeFile.content}
                  language={activeFile.language}
                  onChange={handleCodeChange}
                  onSelectionChange={handleSelectionChange}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-xl text-gray-400 mb-4">No files open</h2>
                <p className="text-gray-500 mb-6">
                  Upload files or paste code to get started
                </p>
                <FileUpload onFilesUploaded={handleFilesUploaded} variant="large" />
              </div>
            </div>
          )}
        </main>

        {/* Thread panel */}
        {showThreadPanel && (
          <aside className="w-80 bg-[#252526] border-l border-[#3c3c3c]">
            <ThreadPanel currentFile={activeFile?.name || null} />
          </aside>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <ThreadProvider>
      <AppContent />
    </ThreadProvider>
  );
}

export default App;
