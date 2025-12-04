import { useState, useCallback, useRef } from 'react';
import CodeEditor, { CodeEditorHandle, CodeIssue } from './components/CodeEditor';
import FileUpload from './components/FileUpload';
import ThreadPanel from './components/ThreadPanel';
import { ThreadProvider, useThreads } from './context/ThreadContext';
import { SelectionRange } from './utils/selectionUtils';
import { scanFile } from './services/apiService';

interface FileData {
  name: string;
  content: string;
  language: string;
}

interface FileIssues {
  [fileName: string]: CodeIssue[];
}

function AppContent() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [selection, setSelection] = useState<SelectionRange | null>(null);
  const [showThreadPanel, setShowThreadPanel] = useState(true);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('untitled.js');
  const [isScanning, setIsScanning] = useState(false);
  const [fileIssues, setFileIssues] = useState<FileIssues>({});
  
  const editorRef = useRef<CodeEditorHandle>(null);

  const { createThread, setActiveThread } = useThreads();

  const handleNewFile = useCallback(() => {
    const extension = newFileName.split('.').pop() || 'js';
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      cs: 'csharp',
      go: 'go',
      rs: 'rust',
      rb: 'ruby',
      php: 'php',
      html: 'html',
      css: 'css',
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      sql: 'sql',
    };
    const language = languageMap[extension] || 'plaintext';
    
    setFiles(prev => [...prev, { name: newFileName, content: '// Paste your code here\n', language }]);
    setActiveFileIndex(files.length);
    setShowNewFileModal(false);
    setNewFileName('untitled.js');
  }, [newFileName, files.length]);

  const loadDemoFiles = useCallback(() => {
    const demoFiles: FileData[] = [
      {
        name: 'buggy-calculator.js',
        language: 'javascript',
        content: `// Calculator with intentional bugs for demo
class Calculator {
  constructor() {
    this.result = 0;
  }

  add(a, b) {
    return a + b;
  }

  subtract(a, b) {
    return a - b;
  }

  // Bug: Division by zero not handled
  divide(a, b) {
    return a / b;
  }

  // Bug: Wrong operator used
  multiply(a, b) {
    return a + b;  // Should be a * b
  }

  // Bug: No input validation
  power(base, exponent) {
    let result = 1;
    for (let i = 0; i < exponent; i++) {
      result *= base;
    }
    return result;
  }

  // Bug: Potential floating point issues
  percentage(value, percent) {
    return value * percent / 100;
  }

  // Bug: Memory leak - never cleared
  history = [];
  
  addToHistory(operation) {
    this.history.push({
      operation,
      timestamp: new Date(),
      result: this.result
    });
  }
}

// Usage with potential issues
const calc = new Calculator();
console.log(calc.divide(10, 0));      // Infinity - no error handling
console.log(calc.multiply(5, 3));     // Returns 8 instead of 15
console.log(calc.power(-2, 0.5));     // NaN - doesn't handle fractional exponents
`,
      },
      {
        name: 'user-service.ts',
        language: 'typescript',
        content: `// User service with security and performance issues
interface User {
  id: string;
  email: string;
  password: string;  // Bug: Storing plain text password
  role: string;
}

class UserService {
  private users: User[] = [];

  // Bug: SQL injection vulnerability (simulated)
  async findUserByEmail(email: string): Promise<User | undefined> {
    // This would be vulnerable in a real DB query
    const query = \`SELECT * FROM users WHERE email = '\${email}'\`;
    console.log(query);
    return this.users.find(u => u.email === email);
  }

  // Bug: No password hashing
  async createUser(email: string, password: string): Promise<User> {
    const user: User = {
      id: Math.random().toString(),  // Bug: Not a proper UUID
      email,
      password,  // Bug: Plain text password
      role: 'user'
    };
    this.users.push(user);
    return user;
  }

  // Bug: Exposing sensitive data
  async getAllUsers(): Promise<User[]> {
    return this.users;  // Returns passwords too!
  }

  // Bug: No authorization check
  async deleteUser(userId: string): Promise<boolean> {
    const index = this.users.findIndex(u => u.id === userId);
    if (index > -1) {
      this.users.splice(index, 1);
      return true;
    }
    return false;
  }

  // Bug: Timing attack vulnerability
  async validatePassword(email: string, password: string): Promise<boolean> {
    const user = await this.findUserByEmail(email);
    if (!user) return false;
    return user.password === password;  // Direct comparison is vulnerable
  }
}

export default UserService;
`,
      },
      {
        name: 'api-handler.py',
        language: 'python',
        content: `# API handler with various issues
# NOTE: This is a DEMO FILE with INTENTIONALLY FAKE credentials for testing
import json
import os

# Bug: Hardcoded credentials (FAKE - for demo only)
DATABASE_PASSWORD = "admin123"
API_KEY = "sk-1234567890abcdef"

class APIHandler:
    def __init__(self):
        self.cache = {}
    
    # Bug: No input sanitization
    def handle_request(self, user_input):
        # Dangerous: eval on user input
        result = eval(user_input)
        return result
    
    # Bug: No error handling
    def fetch_data(self, url):
        import requests
        response = requests.get(url)
        return response.json()
    
    # Bug: Race condition potential
    def update_counter(self):
        current = self.cache.get('counter', 0)
        # Time gap here allows race condition
        self.cache['counter'] = current + 1
        return self.cache['counter']
    
    # Bug: Memory leak - unbounded cache
    def cache_result(self, key, value):
        self.cache[key] = value
        # Never clears old entries
    
    # Bug: Logging sensitive data
    def authenticate(self, username, password):
        print(f"Login attempt: {username} / {password}")
        # ... authentication logic
        return True
    
    # Bug: No rate limiting
    def process_payment(self, amount, card_number):
        print(f"Processing payment of \${amount}")
        # Could be called unlimited times
        return {"status": "success", "card": card_number}

# Bug: Global mutable state
handler = APIHandler()
`,
      },
    ];
    setFiles(demoFiles);
    setActiveFileIndex(0);
  }, []);

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
      let newActiveIndex = activeFileIndex;
      if (updated.length === 0) {
        newActiveIndex = 0;
      } else if (index < activeFileIndex) {
        newActiveIndex = activeFileIndex - 1;
      } else if (index === activeFileIndex && activeFileIndex >= updated.length) {
        newActiveIndex = updated.length - 1;
      }
      
      setActiveFileIndex(newActiveIndex);
      
      // Clear markers and re-apply for new active file
      if (editorRef.current) {
        editorRef.current.clearIssueMarkers();
        const newActiveFile = updated[newActiveIndex];
        if (newActiveFile && fileIssues[newActiveFile.name]) {
          setTimeout(() => {
            editorRef.current?.setIssueMarkers(fileIssues[newActiveFile.name]);
          }, 0);
        }
      }
      
      return updated;
    });
  }, [activeFileIndex, fileIssues]);

  // Scan file for issues using AI
  const handleScanFile = useCallback(async () => {
    const currentFile = files[activeFileIndex];
    if (!currentFile || isScanning) return;

    setIsScanning(true);
    try {
      const result = await scanFile({
        code: currentFile.content,
        language: currentFile.language,
        fileName: currentFile.name,
      });

      console.log('Scan result:', result);
      console.log('Issues found:', result.issues);

      // Add file name to each issue for tracking
      const issuesWithFile = result.issues.map(issue => ({
        ...issue,
        fileName: currentFile.name,
      }));

      // Store issues for this file
      setFileIssues(prev => ({
        ...prev,
        [currentFile.name]: issuesWithFile,
      }));

      // Show issues in editor (use issuesWithFile to include file name)
      if (editorRef.current && issuesWithFile.length > 0) {
        console.log('Setting issue markers for', issuesWithFile.length, 'issues');
        editorRef.current.setIssueMarkers(issuesWithFile);
      } else {
        console.log('No issues to display or editor not ready');
      }
    } catch (error) {
      console.error('Failed to scan file:', error);
      // Show error to user
      alert('Failed to scan file. Please check if the backend is running.');
    } finally {
      setIsScanning(false);
    }
  }, [files, activeFileIndex, isScanning]);

  // Handle clicking on an issue marker
  const handleIssueClick = useCallback((issue: CodeIssue) => {
    // Get the file this issue belongs to (from issue.fileName or fall back to current file)
    const issueFileName = (issue as CodeIssue & { fileName?: string }).fileName;
    const targetFile = issueFileName 
      ? files.find(f => f.name === issueFileName) 
      : files[activeFileIndex];
    
    if (!targetFile) {
      console.error('Could not find file for issue:', issue);
      return;
    }

    // If issue is for a different file, switch to that file first
    if (issueFileName && issueFileName !== files[activeFileIndex]?.name) {
      const fileIndex = files.findIndex(f => f.name === issueFileName);
      if (fileIndex >= 0) {
        setActiveFileIndex(fileIndex);
      }
    }

    // Select the issue lines and trigger Ask AI
    if (editorRef.current) {
      editorRef.current.selectLines(issue.startLine, issue.endLine);
    }

    // Create a thread for this issue using the correct file's content
    const thread = createThread({
      file: targetFile.name,
      range: {
        startLine: issue.startLine,
        endLine: issue.endLine,
      },
      selectedCode: targetFile.content.split('\n').slice(issue.startLine - 1, issue.endLine).join('\n'),
      initialComment: `Review this code: ${issue.message}`,
    });

    setActiveThread(thread.id);
    setShowThreadPanel(true);
  }, [files, activeFileIndex, createThread, setActiveThread]);

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

  // Clear and re-apply issue markers when switching files
  const handleFileChange = useCallback((index: number) => {
    setActiveFileIndex(index);
    // Clear selection when switching files
    setSelection(null);
    // Clear active thread (will show threads for new file)
    setActiveThread(null);
    // Clear existing markers
    if (editorRef.current) {
      editorRef.current.clearIssueMarkers();
    }
    // Apply markers for the new file (after state update)
    const newFile = files[index];
    if (newFile && fileIssues[newFile.name] && editorRef.current) {
      setTimeout(() => {
        editorRef.current?.setIssueMarkers(fileIssues[newFile.name]);
      }, 0);
    }
  }, [files, fileIssues, setActiveThread]);

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3c3c3c]">
        <h1 className="text-lg font-semibold text-white">AI Code Review Assistant</h1>
        <div className="flex items-center gap-4">
          {/* Scan File Button */}
          {activeFile && (
            <button
              className={`px-3 py-1 text-white rounded text-sm transition-colors flex items-center gap-2 ${
                isScanning 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-orange-600 hover:bg-orange-700'
              }`}
              onClick={handleScanFile}
              disabled={isScanning}
              title="Scan file for potential issues"
            >
              {isScanning ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Scanning...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Scan File
                </>
              )}
            </button>
          )}
          {/* Issue Count Badge */}
          {activeFile && fileIssues[activeFile.name]?.length > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <span className="px-2 py-0.5 bg-red-600 text-white rounded-full text-xs font-medium">
                {fileIssues[activeFile.name].length} {fileIssues[activeFile.name].length === 1 ? 'issue' : 'issues'}
              </span>
            </div>
          )}
          {/* Selection Info and Ask AI */}
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
          <div className="p-3 border-b border-[#3c3c3c] flex justify-between items-center">
            <h2 className="text-sm font-medium text-gray-300 uppercase tracking-wide">Files</h2>
            <button
              className="text-gray-400 hover:text-white p-1 hover:bg-[#3c3c3c] rounded"
              onClick={() => setShowNewFileModal(true)}
              title="New file"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-[#2a2d2e] ${
                  index === activeFileIndex ? 'bg-[#37373d]' : ''
                }`}
                onClick={() => handleFileChange(index)}
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
                    onClick={() => handleFileChange(index)}
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
                  ref={editorRef}
                  code={activeFile.content}
                  language={activeFile.language}
                  onChange={handleCodeChange}
                  onSelectionChange={handleSelectionChange}
                  onIssueClick={handleIssueClick}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-xl text-gray-400 mb-4">No files open</h2>
                <p className="text-gray-500 mb-6">
                  Upload files or create a new file to get started
                </p>
                <div className="flex flex-col gap-4 items-center">
                  <FileUpload onFilesUploaded={handleFilesUploaded} variant="large" />
                  <div className="text-gray-500 text-sm">or</div>
                  <div className="flex gap-3">
                    <button
                      className="px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors flex items-center gap-2"
                      onClick={() => setShowNewFileModal(true)}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create New File
                    </button>
                    <button
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                      onClick={loadDemoFiles}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Load Demo Files
                    </button>
                  </div>
                </div>
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

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#252526] rounded-lg p-6 w-96 border border-[#3c3c3c]">
            <h3 className="text-lg font-medium text-white mb-4">New File</h3>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="Enter file name (e.g., example.js)"
              className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-white focus:outline-none focus:border-accent"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNewFile();
                if (e.key === 'Escape') setShowNewFileModal(false);
              }}
            />
            <p className="text-gray-500 text-xs mt-2">
              File extension determines syntax highlighting (js, ts, py, etc.)
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                onClick={() => setShowNewFileModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded transition-colors"
                onClick={handleNewFile}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
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
