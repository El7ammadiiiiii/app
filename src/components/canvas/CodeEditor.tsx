import Editor from '@monaco-editor/react';
import { useCanvasStore } from '@/store/canvasStore';
import { useTheme } from 'next-themes';

export function CodeEditor() {
  const { versions, currentVersionIndex, language, isStreaming } = useCanvasStore();
  const { theme } = useTheme();
  const content = versions[currentVersionIndex]?.content || '';

  return (
    <div className="h-full w-full bg-[#1e1e1e]">
      <Editor
        height="100%"
        defaultLanguage="typescript"
        language={language}
        value={content}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          wordWrap: 'on',
          readOnly: isStreaming,
          padding: { top: 20 },
          fontFamily: 'JetBrains Mono, monospace',
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
        }}
      />
    </div>
  );
}
