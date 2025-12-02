import { useRef, useState, useCallback, DragEvent, ChangeEvent } from 'react';
import { detectLanguageFromFilename, detectLanguageFromContent } from '../utils/selectionUtils';

interface FileData {
  name: string;
  content: string;
  language: string;
}

interface FileUploadProps {
  onFilesUploaded: (files: FileData[]) => void;
  variant?: 'default' | 'large';
}

export default function FileUpload({ onFilesUploaded, variant = 'default' }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (fileList: FileList) => {
    const files: FileData[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
      // Skip non-text files
      if (!file.type.startsWith('text/') && !isCodeFile(file.name)) {
        console.warn(`Skipping non-text file: ${file.name}`);
        continue;
      }

      try {
        const content = await readFileContent(file);
        const language = detectLanguageFromFilename(file.name) || detectLanguageFromContent(content);
        
        files.push({
          name: file.name,
          content,
          language,
        });
      } catch (error) {
        console.error(`Error reading file ${file.name}:`, error);
      }
    }

    if (files.length > 0) {
      onFilesUploaded(files);
    }
  }, [onFilesUploaded]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleFileInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  }, [processFiles]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  if (variant === 'large') {
    return (
      <div
        className={`drop-zone p-8 rounded-lg cursor-pointer transition-all ${
          isDragOver ? 'drag-over' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        data-testid="file-upload-large"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.hpp,.cs,.go,.rs,.rb,.php,.html,.css,.scss,.json,.xml,.yaml,.yml,.md,.sql,.sh,.bash"
          className="hidden"
          onChange={handleFileInput}
        />
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-gray-300 mb-2">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-gray-500 text-sm">
            Supports common code file formats
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`drop-zone p-3 rounded cursor-pointer transition-all ${
        isDragOver ? 'drag-over' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      data-testid="file-upload"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.hpp,.cs,.go,.rs,.rb,.php,.html,.css,.scss,.json,.xml,.yaml,.yml,.md,.sql,.sh,.bash"
        className="hidden"
        onChange={handleFileInput}
      />
      <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span>Add files</span>
      </div>
    </div>
  );
}

/**
 * Reads file content as text
 */
function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Checks if a file is a code file based on extension
 */
function isCodeFile(filename: string): boolean {
  const codeExtensions = [
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
    '.py', '.pyw', '.pyx',
    '.java', '.kt', '.kts', '.scala', '.groovy',
    '.c', '.h', '.cpp', '.cc', '.cxx', '.hpp', '.hxx',
    '.cs',
    '.go',
    '.rs',
    '.rb', '.erb',
    '.php',
    '.html', '.htm', '.css', '.scss', '.sass', '.less',
    '.json', '.xml', '.yaml', '.yml',
    '.md', '.markdown',
    '.sql',
    '.sh', '.bash', '.zsh', '.fish', '.ps1',
    '.dockerfile',
    '.ini', '.toml', '.conf', '.cfg',
  ];

  const lowerName = filename.toLowerCase();
  return codeExtensions.some(ext => lowerName.endsWith(ext)) || 
         lowerName === 'dockerfile' ||
         lowerName === 'makefile';
}

