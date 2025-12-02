import { useMemo } from 'react';

interface DiffViewerProps {
  diff: string;
  className?: string;
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'header';
  content: string;
  lineNumber?: number;
}

/**
 * Parse a diff string into structured lines
 */
function parseDiff(diff: string): DiffLine[] {
  const lines = diff.split('\n');
  const result: DiffLine[] = [];
  let oldLineNum = 0;
  let newLineNum = 0;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      // Parse hunk header
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (match) {
        oldLineNum = parseInt(match[1], 10);
        newLineNum = parseInt(match[2], 10);
      }
      result.push({ type: 'header', content: line });
    } else if (line.startsWith('+')) {
      result.push({
        type: 'added',
        content: line.slice(1),
        lineNumber: newLineNum++,
      });
    } else if (line.startsWith('-')) {
      result.push({
        type: 'removed',
        content: line.slice(1),
        lineNumber: oldLineNum++,
      });
    } else if (line.startsWith(' ')) {
      result.push({
        type: 'unchanged',
        content: line.slice(1),
        lineNumber: newLineNum++,
      });
      oldLineNum++;
    } else if (line.trim() !== '') {
      // Treat as unchanged if no prefix
      result.push({
        type: 'unchanged',
        content: line,
      });
    }
  }

  return result;
}

/**
 * GitHub-style diff viewer component
 */
export default function DiffViewer({ diff, className = '' }: DiffViewerProps) {
  const parsedDiff = useMemo(() => parseDiff(diff), [diff]);

  if (!diff || diff.trim() === '') {
    return null;
  }

  return (
    <div
      className={`rounded border border-thread-border overflow-hidden ${className}`}
      data-testid="diff-viewer"
    >
      <div className="bg-[#161b22] px-3 py-2 border-b border-thread-border">
        <span className="text-xs text-gray-400 font-medium">Suggested changes</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <tbody>
            {parsedDiff.map((line, index) => (
              <DiffLineRow key={index} line={line} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface DiffLineRowProps {
  line: DiffLine;
}

function DiffLineRow({ line }: DiffLineRowProps) {
  const getBgColor = () => {
    switch (line.type) {
      case 'added':
        return 'bg-[#1a2e1a]';
      case 'removed':
        return 'bg-[#2e1a1a]';
      case 'header':
        return 'bg-[#1e2a3a]';
      default:
        return 'bg-transparent';
    }
  };

  const getTextColor = () => {
    switch (line.type) {
      case 'added':
        return 'text-[#7ee787]';
      case 'removed':
        return 'text-[#f85149]';
      case 'header':
        return 'text-[#79c0ff]';
      default:
        return 'text-gray-300';
    }
  };

  const getPrefix = () => {
    switch (line.type) {
      case 'added':
        return '+';
      case 'removed':
        return '-';
      case 'header':
        return '';
      default:
        return ' ';
    }
  };

  if (line.type === 'header') {
    return (
      <tr className={getBgColor()}>
        <td colSpan={3} className={`px-3 py-1 ${getTextColor()}`}>
          {line.content}
        </td>
      </tr>
    );
  }

  return (
    <tr className={`${getBgColor()} hover:brightness-110`}>
      <td className="w-8 px-2 py-0.5 text-right text-gray-500 select-none border-r border-[#30363d]">
        {line.type === 'removed' && line.lineNumber}
      </td>
      <td className="w-8 px-2 py-0.5 text-right text-gray-500 select-none border-r border-[#30363d]">
        {line.type === 'added' && line.lineNumber}
        {line.type === 'unchanged' && line.lineNumber}
      </td>
      <td className={`px-3 py-0.5 ${getTextColor()} whitespace-pre`}>
        <span className="select-none mr-2">{getPrefix()}</span>
        {line.content}
      </td>
    </tr>
  );
}

/**
 * Simple inline diff display (without line numbers)
 */
export function InlineDiff({ diff, className = '' }: DiffViewerProps) {
  if (!diff || diff.trim() === '') {
    return null;
  }

  const lines = diff.split('\n');

  return (
    <div
      className={`rounded border border-thread-border overflow-hidden font-mono text-xs ${className}`}
      data-testid="inline-diff"
    >
      <pre className="p-2 overflow-x-auto">
        {lines.map((line, index) => {
          let className = 'text-gray-300';
          if (line.startsWith('+')) {
            className = 'text-[#7ee787] bg-[#1a2e1a]';
          } else if (line.startsWith('-')) {
            className = 'text-[#f85149] bg-[#2e1a1a]';
          } else if (line.startsWith('@@')) {
            className = 'text-[#79c0ff] bg-[#1e2a3a]';
          }

          return (
            <div key={index} className={`${className} px-1`}>
              {line}
            </div>
          );
        })}
      </pre>
    </div>
  );
}

