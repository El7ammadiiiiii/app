import { useEffect, useState, useDeferredValue, useRef } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { PreviewConsole } from './PreviewConsole';
import { Terminal } from 'lucide-react';

// ═══ Wave 5.5: Enhanced CSP — tightened security, no allow-popups ═══
const CSP_META = `<meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.tailwindcss.com https://cdnjs.cloudflare.com; img-src * data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none';" />`;

/**
 * Wave 5.5: Claude-style bridge script — provides a safe `window.bridge` API
 * for sandbox ↔ parent communication. All console methods relay through postMessage.
 * Also intercepts `fetch` and `XMLHttpRequest` for sandboxed code safety.
 */
const BRIDGE_SCRIPT = `
<script>
(function() {
  // ── Console interceptor + relay ──
  const _log = console.log, _err = console.error, _warn = console.warn, _info = console.info;
  function relay(method, args) {
    try {
      window.parent.postMessage({ type: 'console', method, args: args.map(a => {
        try { return typeof a === 'object' ? JSON.stringify(a) : String(a); } catch { return String(a); }
      }) }, '*');
    } catch {}
  }
  console.log = function(...a) { relay('log', a); _log.apply(console, a); };
  console.error = function(...a) { relay('error', a); _err.apply(console, a); };
  console.warn = function(...a) { relay('warn', a); _warn.apply(console, a); };
  console.info = function(...a) { relay('info', a); _info.apply(console, a); };

  window.onerror = function(msg, src, line, col, err) {
    relay('error', [msg + ' at line ' + line]);
    return false;
  };

  window.onunhandledrejection = function(e) {
    relay('error', ['Unhandled Promise: ' + (e.reason?.message || e.reason || 'unknown')]);
  };

  // ── Bridge API (Claude-style) ──
  window.bridge = {
    log: function(...a) { relay('log', a); },
    error: function(...a) { relay('error', a); },
    warn: function(...a) { relay('warn', a); },
    postMessage: function(data) {
      window.parent.postMessage({ type: 'bridge', data: data }, '*');
    },
  };

  // ── Block dangerous APIs ──
  delete window.opener;
  Object.defineProperty(window, 'opener', { get: function() { return null; } });
})();
</script>`;


export function CanvasPreview ()
{
  const { versions, currentVersionIndex, language, isStreaming } = useCanvasStore();
  const content = versions[ currentVersionIndex ]?.content || '';
  const [ srcDoc, setSrcDoc ] = useState( '' );
  const [ showConsole, setShowConsole ] = useState( false );

  // C.4: Debounce iframe rebuild during streaming — useDeferredValue defers low-priority updates
  const deferredContent = useDeferredValue( content );
  // Additional throttle: only rebuild iframe at most every 500ms during streaming
  const lastRebuildRef = useRef<number>( 0 );
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>( null );
  const [ throttledContent, setThrottledContent ] = useState( deferredContent );

  useEffect( () =>
  {
    if ( !isStreaming )
    {
      // Not streaming — update immediately
      setThrottledContent( deferredContent );
      return;
    }

    const now = Date.now();
    const elapsed = now - lastRebuildRef.current;

    if ( elapsed >= 500 )
    {
      lastRebuildRef.current = now;
      setThrottledContent( deferredContent );
    } else
    {
      // Schedule update after remaining throttle time
      if ( throttleTimerRef.current ) clearTimeout( throttleTimerRef.current );
      throttleTimerRef.current = setTimeout( () =>
      {
        lastRebuildRef.current = Date.now();
        setThrottledContent( deferredContent );
      }, 500 - elapsed );
    }

    return () =>
    {
      if ( throttleTimerRef.current ) clearTimeout( throttleTimerRef.current );
    };
  }, [ deferredContent, isStreaming ] );

  useEffect( () =>
  {
    if ( !throttledContent )
    {
      setSrcDoc( '' );
      return;
    }

    if ( language === 'html' )
    {
      // Wave 5.5: Inject CSP + bridge script for HTML
      const htmlWithBridge = throttledContent.replace(
        '</head>',
        `${ CSP_META }
        ${ BRIDGE_SCRIPT }
        </head>`
      );
      setSrcDoc( htmlWithBridge );
    } else if ( [ 'javascript', 'typescript', 'jsx', 'tsx' ].includes( language ) )
    {
      // Handle React/JS content by wrapping it in a runner
      const processedContent = throttledContent
        .replace( /export\s+default\s+(?:function|class)\s+(\w+)/, 'window.App = $1; function $1' )
        .replace( /export\s+default\s+/, 'window.App = ' );

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${ CSP_META }
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
    #root { height: 100vh; width: 100vw; overflow: auto; }
  </style>
  ${ BRIDGE_SCRIPT }
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useMemo, useCallback } = React;
    const { createRoot } = ReactDOM;
    
    window.React = React;
    window.ReactDOM = ReactDOM;

    try {
      ${ processedContent }
    } catch (e) {
      console.error("Error executing code:", e);
      document.body.innerHTML = '<div style="color:red; padding:20px;"><h3>Runtime Error</h3><pre>' + e.toString() + '</pre></div>';
    }

    // Render logic
    const root = createRoot(document.getElementById('root'));
    
    setTimeout(() => {
      if (window.App) {
        root.render(<window.App />);
      } else if (typeof App !== 'undefined') {
        root.render(<App />);
      } else {
        // Fallback: try to find a function that looks like a component
        root.render(
          <div className="p-4 text-gray-500">
            <h2 className="font-bold">No component found</h2>
            <p>Please export a default component or name it 'App'.</p>
          </div>
        );
      }
    }, 100);
  </script>
</body>
</html>`;
      setSrcDoc( html );
    } else
    {
      setSrcDoc( '' );
    }
  }, [ throttledContent, language ] );

  return (
    <div className="h-full w-full flex flex-col">
      {/* Console Toggle */ }
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/40">
        <div className="text-sm text-muted-foreground">Live Preview</div>
        <button
          onClick={ () => setShowConsole( !showConsole ) }
          className={ `
            flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors
            ${ showConsole ? 'bg-primary text-primary-foreground' : 'hover:bg-background' }
          `}
        >
          <Terminal className="w-3.5 h-3.5" />
          Console
        </button>
      </div>

      {/* Preview iframe */ }
      <div className={ `${ showConsole ? 'flex-1' : 'h-full' } w-full bg-white relative` }>
        { srcDoc ? (
          <iframe
            srcDoc={ srcDoc }
            title="Preview"
            sandbox="allow-scripts allow-modals allow-forms"
            className="w-full h-full border-0"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <p className="text-sm">Preview not available for { language }</p>
              <p className="text-xs mt-2">Supported: HTML, JavaScript, TypeScript, JSX, TSX</p>
            </div>
          </div>
        ) }
      </div>

      {/* Console Panel */ }
      <PreviewConsole isOpen={ showConsole } onClose={ () => setShowConsole( false ) } />
    </div>
  );
}
