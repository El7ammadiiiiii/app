'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useFeatureFlags } from '@/store/featureFlagStore';

/* ─────────────────────────────────────────────────────
 * Wave 6.6 · usePyodide — Python execution via WASM
 * ─────────────────────────────────────────────────────
 *
 * Loads Pyodide in a Web Worker for sandboxed Python
 * code execution. Streams stdout/stderr in real-time.
 *
 * Usage:
 *   const { run, isReady, isRunning, output, error, clear } = usePyodide();
 *   await run('print("Hello from Python!")');
 * ───────────────────────────────────────────────────── */

export interface PyodideOutput {
  type: 'stdout' | 'stderr' | 'result' | 'error';
  text: string;
  timestamp: number;
}

export interface UsePyodideReturn {
  /** Run Python code — returns the result value or null */
  run: (code: string) => Promise<unknown>;
  /** Whether Pyodide WASM is loaded and ready */
  isReady: boolean;
  /** Whether code is currently executing */
  isRunning: boolean;
  /** Accumulated output lines */
  output: PyodideOutput[];
  /** Last error message, if any */
  error: string | null;
  /** Clear output buffer */
  clear: () => void;
  /** Interrupt running execution (best effort) */
  interrupt: () => void;
  /** Whether the feature is enabled via feature flags */
  isEnabled: boolean;
}

let runCounter = 0;

export function usePyodide(): UsePyodideReturn {
  const flags = useFeatureFlags(s => s.flags);
  const isEnabled = flags.code_execution;

  const workerRef = useRef<Worker | null>(null);
  const resolveRef = useRef<((value: unknown) => void) | null>(null);
  const rejectRef = useRef<((reason: Error) => void) | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<PyodideOutput[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize worker
  useEffect(() => {
    if (!isEnabled) return;

    // Use a regular Worker pointing to public/pyodide-worker.js
    const worker = new Worker('/pyodide-worker.js');
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const { type, text, value, message } = e.data;
      const now = Date.now();

      switch (type) {
        case 'ready':
          setIsReady(true);
          break;

        case 'stdout':
          setOutput(prev => [...prev, { type: 'stdout', text, timestamp: now }]);
          break;

        case 'stderr':
          setOutput(prev => [...prev, { type: 'stderr', text, timestamp: now }]);
          break;

        case 'result':
          setIsRunning(false);
          if (value !== null && value !== undefined) {
            setOutput(prev => [...prev, { type: 'result', text: String(value), timestamp: now }]);
          }
          resolveRef.current?.(value);
          resolveRef.current = null;
          rejectRef.current = null;
          break;

        case 'error':
          setIsRunning(false);
          setError(message);
          setOutput(prev => [...prev, { type: 'error', text: message, timestamp: now }]);
          rejectRef.current?.(new Error(message));
          resolveRef.current = null;
          rejectRef.current = null;
          break;
      }
    };

    worker.onerror = (e: ErrorEvent) => {
      setError(e.message);
      setIsRunning(false);
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
      setIsReady(false);
    };
  }, [isEnabled]);

  const run = useCallback(async (code: string): Promise<unknown> => {
    if (!workerRef.current || !isReady) {
      throw new Error('Pyodide not ready');
    }

    const id = `run-${++runCounter}`;
    setIsRunning(true);
    setError(null);

    return new Promise((resolve, reject) => {
      resolveRef.current = resolve;
      rejectRef.current = reject;
      workerRef.current!.postMessage({ type: 'run', code, id });
    });
  }, [isReady]);

  const clear = useCallback(() => {
    setOutput([]);
    setError(null);
  }, []);

  const interrupt = useCallback(() => {
    workerRef.current?.postMessage({ type: 'interrupt' });
  }, []);

  return {
    run,
    isReady,
    isRunning,
    output,
    error,
    clear,
    interrupt,
    isEnabled,
  };
}
