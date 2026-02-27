/**
 * Wave 6.6 — Pyodide Web Worker
 * Runs Python code in a sandboxed WASM environment.
 *
 * Communication protocol:
 *   Main → Worker: { type: 'run', code: string, id: string }
 *   Worker → Main: { type: 'stdout', text: string, id: string }
 *   Worker → Main: { type: 'stderr', text: string, id: string }
 *   Worker → Main: { type: 'result', value: any, id: string }
 *   Worker → Main: { type: 'error', message: string, id: string }
 *   Worker → Main: { type: 'ready' }
 *   Main → Worker: { type: 'interrupt' }
 */

/* global importScripts, loadPyodide */

let pyodide = null;
let isReady = false;

// Load Pyodide from CDN
async function initPyodide() {
  try {
    importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js');
    pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
      stdout: (text) => {
        self.postMessage({ type: 'stdout', text, id: self._currentRunId });
      },
      stderr: (text) => {
        self.postMessage({ type: 'stderr', text, id: self._currentRunId });
      },
    });

    // Pre-load commonly used packages
    await pyodide.loadPackage(['micropip']);

    isReady = true;
    self.postMessage({ type: 'ready' });
  } catch (err) {
    self.postMessage({ type: 'error', message: `Pyodide init failed: ${err.message}`, id: 'init' });
  }
}

// Run Python code
async function runCode(code, id) {
  if (!isReady || !pyodide) {
    self.postMessage({ type: 'error', message: 'Pyodide not ready', id });
    return;
  }

  self._currentRunId = id;

  try {
    // Install any packages mentioned in `# pip: package1, package2` comments
    const pipMatch = code.match(/^#\s*pip:\s*(.+)$/m);
    if (pipMatch) {
      const packages = pipMatch[1].split(',').map(p => p.trim()).filter(Boolean);
      if (packages.length > 0) {
        const micropip = pyodide.pyimport('micropip');
        for (const pkg of packages) {
          try {
            await micropip.install(pkg);
          } catch (e) {
            self.postMessage({ type: 'stderr', text: `⚠ Failed to install ${pkg}: ${e.message}\n`, id });
          }
        }
      }
    }

    const result = await pyodide.runPythonAsync(code);

    // Convert Python result to JS
    let value = null;
    if (result !== undefined && result !== null) {
      try {
        value = result.toJs ? result.toJs({ dict_converter: Object.fromEntries }) : result;
      } catch {
        value = String(result);
      }
    }

    self.postMessage({ type: 'result', value, id });
  } catch (err) {
    const msg = err.message || String(err);
    // Clean up Pyodide traceback for readability
    const cleanMsg = msg.includes('PythonError')
      ? msg.split('\n').filter(l => !l.startsWith('  File "<exec>"')).join('\n')
      : msg;
    self.postMessage({ type: 'error', message: cleanMsg, id });
  }
}

// Message handler
self.onmessage = async function(e) {
  const { type, code, id } = e.data;

  switch (type) {
    case 'run':
      await runCode(code, id);
      break;
    case 'interrupt':
      // Pyodide doesn't support true interrupts yet,
      // but we can signal the caller
      self.postMessage({ type: 'error', message: 'Execution interrupted', id: self._currentRunId });
      break;
    default:
      break;
  }
};

// Auto-init on worker creation
initPyodide();
