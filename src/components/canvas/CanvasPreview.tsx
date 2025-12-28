import { useEffect, useState } from 'react';
import { useCanvasStore } from '@/store/canvasStore';

export function CanvasPreview() {
  const { versions, currentVersionIndex, language } = useCanvasStore();
  const content = versions[currentVersionIndex]?.content || '';
  const [srcDoc, setSrcDoc] = useState('');

  useEffect(() => {
    if (!content) {
      setSrcDoc('');
      return;
    }

    if (language === 'html') {
      setSrcDoc(content);
    } else if (['javascript', 'typescript', 'jsx', 'tsx'].includes(language)) {
      // Handle React/JS content by wrapping it in a runner
      // We replace 'export default' to capture the component
      const processedContent = content
        .replace(/export\s+default\s+(?:function|class)\s+(\w+)/, 'window.App = $1; function $1')
        .replace(/export\s+default\s+/, 'window.App = ');

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
    #root { height: 100vh; width: 100vw; overflow: auto; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useRef, useMemo, useCallback } = React;
    const { createRoot } = ReactDOM;
    
    window.React = React;
    window.ReactDOM = ReactDOM;

    try {
      ${processedContent}
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
      setSrcDoc(html);
    } else {
      setSrcDoc('');
    }
  }, [content, language]);

  if (!srcDoc) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Preview not available for this language
      </div>
    );
  }

  return (
    <iframe
      srcDoc={srcDoc}
      className="w-full h-full border-none bg-white"
      title="Preview"
      sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin allow-top-navigation"
    />
  );
}
