import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import { useCanvasStore } from '@/store/canvasStore';
import { useEffect, useRef, useCallback } from 'react';

export function TextEditor() {
  const { versions, currentVersionIndex, isStreaming, setSelectedText } = useCanvasStore();
  const content = versions[currentVersionIndex]?.content || '';
  const lastContentRef = useRef<string>('');
  const isStreamingRef = useRef(isStreaming);
  // Wave 4.1: Track content length for append-only streaming (same pattern as CodeEditor)
  const lastContentLengthRef = useRef<number>(0);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight,
      Typography,
    ],
    content: content,
    editable: !isStreaming,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none p-8 min-h-full',
      },
    },
    onSelectionUpdate: ({ editor: ed }) => {
      const { from, to } = ed.state.selection;
      if (from !== to) {
        const selectedText = ed.state.doc.textBetween(from, to, ' ');
        setSelectedText({ start: from, end: to, text: selectedText });
      } else {
        setSelectedText(null);
      }
    },
  });

  // Wave 4.1: Append-only streaming — prevents DOM rebuild + flicker
  // Same strategy as CodeEditor's executeEdits append pattern
  useEffect(() => {
    if (!editor) return;

    if (isStreaming) {
      const lastLen = lastContentLengthRef.current;

      // If new content is longer and starts with the old prefix → append only the delta
      if (content.length > lastLen && content.startsWith(lastContentRef.current)) {
        const delta = content.slice(lastLen);

        if (delta) {
          // Append raw text at end of document via ProseMirror transaction
          const { tr, doc } = editor.state;
          const endPos = doc.content.size - 1; // pos before closing node
          const insertPos = Math.max(endPos, 0);

          // Insert text node at end — no DOM rebuild, no cursor jump
          const textNode = editor.state.schema.text(delta);
          const transaction = tr.insert(insertPos, textNode);
          editor.view.dispatch(transaction);
        }
      } else if (content !== editor.getText()) {
        // Content changed non-incrementally (e.g. version switch) — full replace
        editor.commands.setContent(content, false);
      }

      lastContentLengthRef.current = content.length;
      lastContentRef.current = content;
    } else {
      // Not streaming: normal update only if content actually changed
      if (editor.getHTML() !== content && !editor.isFocused) {
        editor.commands.setContent(content);
      }
      // Reset length tracking for next streaming session
      lastContentLengthRef.current = 0;
      lastContentRef.current = content;
    }
  }, [content, editor, isStreaming]);

  // B.3: Handle inline AI edit request from BubbleMenu
  const handleAiEdit = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;

    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    // Get coordinates for floating toolbar
    const coords = editor.view.coordsAtPos(from);
    window.dispatchEvent(new CustomEvent('canvas:show-inline-edit', {
      detail: {
        x: coords.left,
        y: coords.top - 10,
        text: selectedText,
      }
    }));
  }, [editor]);

  return (
    <div className="h-full overflow-y-auto bg-background">
      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 150, placement: 'top' }}
          className="flex items-center gap-1 bg-background/95 backdrop-blur border border-border rounded-lg shadow-lg px-2 py-1"
        >
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-2 py-1 rounded text-xs font-bold hover:bg-muted transition-colors ${editor.isActive('bold') ? 'bg-muted text-primary' : ''}`}
          >
            B
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-2 py-1 rounded text-xs italic hover:bg-muted transition-colors ${editor.isActive('italic') ? 'bg-muted text-primary' : ''}`}
          >
            I
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={`px-2 py-1 rounded text-xs hover:bg-muted transition-colors ${editor.isActive('highlight') ? 'bg-muted text-primary' : ''}`}
          >
            H
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button
            onClick={handleAiEdit}
            className="px-2 py-1 rounded text-xs hover:bg-primary/10 text-primary transition-colors flex items-center gap-1"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            AI تعديل
          </button>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} className="min-h-full" />
    </div>
  );
}
