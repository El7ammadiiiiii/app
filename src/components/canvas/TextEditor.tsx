import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import { useCanvasStore } from '@/store/canvasStore';
import { useEffect } from 'react';

export function TextEditor() {
  const { versions, currentVersionIndex, isStreaming } = useCanvasStore();
  const content = versions[currentVersionIndex]?.content || '';

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
  });

  useEffect(() => {
    if (editor && content) {
       // Check if content is different to avoid cursor jumps
       // This is a naive check, for production streaming we need better diffing
       if (editor.getHTML() !== content && !editor.isFocused) {
         editor.commands.setContent(content);
       } else if (isStreaming) {
         // If streaming, we force update? Or append?
         // For now, let's just set content.
         editor.commands.setContent(content);
       }
    }
  }, [content, editor, isStreaming]);

  return (
    <div className="h-full overflow-y-auto bg-background">
      <EditorContent editor={editor} className="min-h-full" />
    </div>
  );
}
