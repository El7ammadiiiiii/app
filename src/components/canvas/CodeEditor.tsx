import Editor, { Monaco } from '@monaco-editor/react';
import { useCanvasStore } from '@/store/canvasStore';
import { useTheme } from 'next-themes';
import { useRef, useEffect } from 'react';
import * as monaco from 'monaco-editor';

export function CodeEditor ()
{
  const {
    versions,
    currentVersionIndex,
    language,
    isStreaming,
    updateContent,
    setSelectedText,
    editMode,
    files,
    activeFileId,
    exportSettings
  } = useCanvasStore();

  const { theme } = useTheme();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>( null );
  const monacoRef = useRef<Monaco | null>( null );
  // B.2: Track content length for append-only streaming (prevents cursor jump)
  const lastContentLengthRef = useRef<number>( 0 );
  const isStreamingRef = useRef( false );

  const activeFile = files.find( f => f.id === activeFileId );
  const content = activeFile?.content || versions[ currentVersionIndex ]?.content || '';
  const currentLanguage = activeFile?.language || language;

  // B.2: appendWhenPossible — during streaming, append delta only to prevent cursor jump
  useEffect( () =>
  {
    isStreamingRef.current = isStreaming;

    if ( isStreaming && editorRef.current )
    {
      const editor = editorRef.current;
      const model = editor.getModel();
      if ( !model ) return;

      const currentModelValue = model.getValue();
      const lastLen = lastContentLengthRef.current;

      if ( content.length > lastLen && content.startsWith( currentModelValue.slice( 0, Math.min( lastLen, currentModelValue.length ) ) ) )
      {
        // Append only the new delta
        const delta = content.slice( lastLen );
        if ( delta )
        {
          const lastLine = model.getLineCount();
          const lastCol = model.getLineMaxColumn( lastLine );
          editor.executeEdits( 'streaming-append', [ {
            range: new ( monacoRef.current!.Range )( lastLine, lastCol, lastLine, lastCol ),
            text: delta,
            forceMoveMarkers: false,
          } ] );
        }
      }
      else if ( content !== currentModelValue )
      {
        // Content changed non-incrementally, fall back to full setValue
        model.setValue( content );
      }

      lastContentLengthRef.current = content.length;
    }
    else if ( !isStreaming )
    {
      lastContentLengthRef.current = 0;
    }
  }, [ content, isStreaming ] );

  // Handle editor mount
  const handleEditorDidMount = ( editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: Monaco ) =>
  {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;

    // B.3: Context menu + floating toolbar for AI editing
    editor.addAction( {
      id: 'ask-ai-to-edit',
      label: 'تعديل بالذكاء الاصطناعي',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      keybindings: [ monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyE ],
      run: ( ed ) =>
      {
        const selection = ed.getSelection();
        if ( selection && !selection.isEmpty() )
        {
          const selectedText = ed.getModel()?.getValueInRange( selection );
          if ( selectedText )
          {
            // Get position for floating toolbar
            const pos = ed.getScrolledVisiblePosition( selection.getStartPosition() );
            const editorDom = ed.getDomNode();
            const rect = editorDom?.getBoundingClientRect();

            if ( pos && rect )
            {
              window.dispatchEvent( new CustomEvent( 'canvas:show-inline-edit', {
                detail: {
                  x: rect.left + pos.left,
                  y: rect.top + pos.top,
                  text: selectedText,
                }
              } ) );
            }

            setSelectedText( {
              start: ed.getModel()!.getOffsetAt( selection.getStartPosition() ),
              end: ed.getModel()!.getOffsetAt( selection.getEndPosition() ),
              text: selectedText
            } );
          }
        }
      },
    } );

    // Track selection changes — show floating toolbar on selection
    editor.onDidChangeCursorSelection( ( e ) =>
    {
      const selection = e.selection;
      const model = editor.getModel();
      if ( model && !selection.isEmpty() )
      {
        const selectedText = model.getValueInRange( selection );
        setSelectedText( {
          start: model.getOffsetAt( selection.getStartPosition() ),
          end: model.getOffsetAt( selection.getEndPosition() ),
          text: selectedText
        } );
      } else
      {
        setSelectedText( null );
      }
    } );
  };

  // Handle content change (user typing)
  const handleChange = ( value: string | undefined ) =>
  {
    if ( value !== undefined && !isStreamingRef.current )
    {
      updateContent( value, false );
      lastContentLengthRef.current = value.length;
    }
  };

  return (
    <div className="h-full w-full bg-[#1e1e1e]">
      <Editor
        height="100%"
        defaultLanguage="typescript"
        language={ currentLanguage }
        // B.2: During streaming, don't pass value prop — we handle it via executeEdits
        value={ isStreaming ? undefined : content }
        theme={ theme === 'dark' ? 'vs-dark' : 'light' }
        onChange={ handleChange }
        onMount={ handleEditorDidMount }
        options={ {
          minimap: { enabled: true },
          fontSize: exportSettings.fontSize,
          wordWrap: 'on',
          readOnly: isStreaming,
          padding: { top: 20 },
          fontFamily: 'JetBrains Mono, monospace',
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          contextmenu: true,
          lineNumbers: exportSettings.includeLineNumbers ? 'on' : 'off',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          formatOnPaste: true,
          formatOnType: true,
        } }
      />
    </div>
  );
}
