import { useState, useEffect } from 'react';
import { useCanvasStore, CANVAS_TYPE_META } from '@/store/canvasStore';
import { CanvasHeader } from './CanvasHeader';
import { CodeEditor } from './CodeEditor';
import { TextEditor } from './TextEditor';
import { CanvasPreview } from './CanvasPreview';
import { CanvasToolbar } from './CanvasToolbar';
import { DiffViewer } from './DiffViewer';
// ── Wave 5.2: Specialized renderers ──
import { SlideViewer } from './renderers/SlideViewer';
import { EmailEditor } from './renderers/EmailEditor';
import { MapViewer } from './renderers/MapViewer';
// ── Wave 6.6: Python code execution ──
import { PythonRunPanel } from './PythonRunPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { Code2, Eye, GitCompare, Columns2, Search, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CanvasPanel ()
{
  const type = useCanvasStore( s => s.type );
  const language = useCanvasStore( s => s.language );
  const isStreaming = useCanvasStore( s => s.isStreaming );
  const versions = useCanvasStore( s => s.versions );
  const currentVersionIndex = useCanvasStore( s => s.currentVersionIndex );
  const [ activeTab, setActiveTab ] = useState<string>( 'code' );

  const currentContent = versions[ currentVersionIndex ]?.content || '';

  // Reset to code view when language changes to something non-previewable
  useEffect( () =>
  {
    if ( type === 'CODE' && ![ 'html', 'javascript', 'typescript', 'jsx', 'tsx' ].includes( language ) )
    {
      setActiveTab( 'code' );
    }
    // Default to split view for previewable code
    if ( ( type === 'CODE' || type === 'DATA_VIZ' ) && [ 'html', 'javascript', 'typescript', 'jsx', 'tsx' ].includes( language ) )
    {
      setActiveTab( 'split' );
    }
    // DEEP_RESEARCH defaults to text view
    if ( type === 'DEEP_RESEARCH' || type === 'TEXT' || type === 'DOC' || type === 'LEARNING' || type === 'EMAIL' || type === 'AUTOMATION_PLAN' )
    {
      setActiveTab( 'text' );
    }
  }, [ language, type ] );

  const isPreviewable = (
    type === 'CODE' || type === 'DATA_VIZ'
  ) && (
      language === 'html' ||
      [ 'javascript', 'typescript', 'jsx', 'tsx' ].includes( language )
    );

  const meta = CANVAS_TYPE_META[ type ];

  // ═══ Rich Text types: DEEP_RESEARCH, TEXT, DOC, etc. ═══
  const isRichText = [ 'TEXT', 'DEEP_RESEARCH', 'DOC', 'LEARNING', 'STORYBOOK', 'AUTOMATION_PLAN' ].includes( type );

  // ═══ Wave 5.2: Specialized renderer types ═══
  const isSlides = type === 'SLIDES';
  const isEmail = type === 'EMAIL';
  const isMap = type === 'MAP';
  const hasSpecialRenderer = isSlides || isEmail || isMap;

  return (
    <div
      className={ cn(
        "canvas-glass-frame flex flex-col h-full overflow-hidden",
        isStreaming && "canvas-streaming"
      ) }
      role="region"
      aria-label={ `Canvas: ${ useCanvasStore.getState().title }` }
      aria-live={ isStreaming ? "polite" : "off" }
      aria-busy={ isStreaming }
    >
      <CanvasHeader />
      <CanvasToolbar />

      { /* ─── Wave 5.2: Specialized renderers ─── */ }
      { isSlides ? (
        <div className="flex-1 min-h-0 relative">
          <SlideViewer />
        </div>
      ) : isEmail ? (
        <div className="flex-1 min-h-0 relative">
          <EmailEditor />
        </div>
      ) : isMap ? (
        <div className="flex-1 min-h-0 relative">
          <MapViewer />
        </div>
      ) : /* ─── CODE / DATA_VIZ with preview ─── */
      !isRichText && isPreviewable ? (
        <Tabs value={ activeTab } onValueChange={ setActiveTab } className="flex-1 flex flex-col min-h-0">
          <div className="px-4 py-2 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
            <TabsList className="h-8 bg-white/[0.04] rounded-lg">
              <TabsTrigger value="code" className="text-xs px-3 h-7 data-[state=active]:bg-white/[0.1] rounded-md">
                <Code2 className="w-3.5 h-3.5 mr-1.5" />
                Code
              </TabsTrigger>
              <TabsTrigger value="split" className="text-xs px-3 h-7 data-[state=active]:bg-white/[0.1] rounded-md">
                <Columns2 className="w-3.5 h-3.5 mr-1.5" />
                Split
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs px-3 h-7 data-[state=active]:bg-white/[0.1] rounded-md">
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="diff" className="text-xs px-3 h-7 data-[state=active]:bg-white/[0.1] rounded-md">
                <GitCompare className="w-3.5 h-3.5 mr-1.5" />
                Changes
              </TabsTrigger>
            </TabsList>

            { type === 'DATA_VIZ' && (
              <div className="flex items-center gap-1.5 text-xs text-orange-400/70">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>{ meta.label }</span>
              </div>
            ) }
          </div>

          <div className="flex-1 min-h-0 relative">
            <TabsContent value="code" className="h-full m-0 border-0 data-[state=active]:flex data-[state=active]:flex-col">
              <div className="flex-1 min-h-0"><CodeEditor /></div>
              <PythonRunPanel code={ currentContent } language={ language } />
            </TabsContent>

            { /* SPLIT VIEW: Code + Preview side by side */ }
            <TabsContent value="split" className="h-full m-0 border-0 data-[state=active]:flex">
              <Group orientation="horizontal" className="h-full w-full">
                <Panel defaultSize={ 50 } minSize={ 25 } className="h-full flex flex-col">
                  <div className="flex-1 min-h-0"><CodeEditor /></div>
                  <PythonRunPanel code={ currentContent } language={ language } />
                </Panel>
                <Separator className="w-[2px] bg-white/[0.06] hover:bg-teal-500/30 transition-colors cursor-col-resize" />
                <Panel defaultSize={ 50 } minSize={ 25 } className="h-full">
                  <CanvasPreview />
                </Panel>
              </Group>
            </TabsContent>

            <TabsContent value="preview" className="h-full m-0 border-0 data-[state=active]:block">
              <CanvasPreview />
            </TabsContent>
            <TabsContent value="diff" className="h-full m-0 border-0 data-[state=active]:block">
              <DiffViewer />
            </TabsContent>
          </div>
        </Tabs>
      ) : !isRichText ? (
        /* CODE without preview */
        <div className="flex-1 min-h-0 relative flex flex-col">
          <div className="flex-1 min-h-0">
            <CodeEditor />
          </div>
          <PythonRunPanel code={ currentContent } language={ language } />
        </div>
      ) : (
        /* RICH TEXT: TEXT, DEEP_RESEARCH, DOC, etc. */
        <div className="flex-1 min-h-0 relative">
          { type === 'DEEP_RESEARCH' ? (
            <div className="h-full flex flex-col">
              <div className={ cn(
                "flex items-center gap-2 px-4 py-2 border-b border-white/[0.06]",
                "text-xs font-medium",
              ) } style={ { color: meta.color } }>
                <Search className="w-3.5 h-3.5" />
                <span>{ meta.label } — تقرير بحثي تفاعلي</span>
              </div>
              <div className="flex-1 min-h-0">
                <TextEditor />
              </div>
            </div>
          ) : (
            <TextEditor />
          ) }
        </div>
      ) }
    </div>
  );
}
