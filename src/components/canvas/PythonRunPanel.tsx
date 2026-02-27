'use client';

import { memo, useCallback, useRef, useEffect } from 'react';
import { Play, Square, Trash2, Loader2, Terminal } from 'lucide-react';
import { usePyodide, type PyodideOutput } from '@/hooks/usePyodide';

/* ─────────────────────────────────────────────────────
 * Wave 6.6 · Python Execution Panel
 * ─────────────────────────────────────────────────────
 * Renders a "Run" button + stdout/stderr console below
 * the CodeEditor when the language is Python.
 * ───────────────────────────────────────────────────── */

interface Props {
  code: string;
  language: string;
}

export const PythonRunPanel = memo(function PythonRunPanel({ code, language }: Props) {
  const { run, isReady, isRunning, output, error, clear, interrupt, isEnabled } = usePyodide();
  const outputEndRef = useRef<HTMLDivElement>(null);

  // Only show for Python code
  const isPython = language === 'python' || language === 'py';

  // Auto-scroll output
  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  const handleRun = useCallback(async () => {
    try {
      await run(code);
    } catch {
      // Error is already captured in the hook
    }
  }, [run, code]);

  if (!isEnabled || !isPython) return null;

  return (
    <div className="border-t border-white/[0.06] bg-[#1a1a2e]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] font-medium text-muted-foreground">
            Python Console
          </span>
          {!isReady && (
            <span className="text-[10px] text-yellow-500 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              جاري تحميل Pyodide...
            </span>
          )}
          {isReady && (
            <span className="text-[10px] text-green-400">● جاهز</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {output.length > 0 && (
            <button
              onClick={clear}
              className="p-1 hover:bg-white/10 rounded text-muted-foreground hover:text-foreground transition-colors"
              title="مسح المخرجات"
              aria-label="مسح المخرجات"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {isRunning ? (
            <button
              onClick={interrupt}
              className="flex items-center gap-1 px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-md text-[11px] font-medium transition-colors"
              aria-label="إيقاف التنفيذ"
            >
              <Square className="w-3 h-3" />
              إيقاف
            </button>
          ) : (
            <button
              onClick={handleRun}
              disabled={!isReady || !code.trim()}
              className="flex items-center gap-1 px-2.5 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-md text-[11px] font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="تشغيل الكود"
            >
              <Play className="w-3 h-3" />
              تشغيل
            </button>
          )}
        </div>
      </div>

      {/* Output console */}
      {output.length > 0 && (
        <div
          className="max-h-48 overflow-y-auto p-3 font-mono text-xs leading-relaxed"
          role="log"
          aria-label="مخرجات Python"
          aria-live="polite"
        >
          {output.map((line, i) => (
            <OutputLine key={i} line={line} />
          ))}
          <div ref={outputEndRef} />
        </div>
      )}

      {/* Error banner */}
      {error && output.length === 0 && (
        <div className="px-3 py-2 text-xs text-red-400 font-mono bg-red-500/5">
          {error}
        </div>
      )}
    </div>
  );
});

/** Individual output line with color coding */
const OutputLine = memo(function OutputLine({ line }: { line: PyodideOutput }) {
  const colorMap: Record<string, string> = {
    stdout: 'text-green-300',
    stderr: 'text-yellow-400',
    result: 'text-cyan-300',
    error: 'text-red-400',
  };

  const prefixMap: Record<string, string> = {
    stdout: '',
    stderr: '⚠ ',
    result: '→ ',
    error: '✗ ',
  };

  return (
    <div className={`${colorMap[line.type] || 'text-foreground'} whitespace-pre-wrap break-all`}>
      {prefixMap[line.type]}{line.text}
    </div>
  );
});
