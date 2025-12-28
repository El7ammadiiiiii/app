import { useState, useEffect } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { CanvasHeader } from './CanvasHeader';
import { CodeEditor } from './CodeEditor';
import { TextEditor } from './TextEditor';
import { CanvasPreview } from './CanvasPreview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code2, Eye } from 'lucide-react';

export function CanvasPanel() {
  const { type, language } = useCanvasStore();
  const [activeTab, setActiveTab] = useState<string>('code');

  // Reset to code view when language changes to something non-previewable
  useEffect(() => {
    if (type === 'CODE' && !['html', 'javascript', 'typescript', 'jsx', 'tsx'].includes(language)) {
      setActiveTab('code');
    }
  }, [language, type]);

  const isPreviewable = type === 'CODE' && (
    language === 'html' || 
    ['javascript', 'typescript', 'jsx', 'tsx'].includes(language)
  );

  return (
    <div className="flex flex-col h-full border-l border-border bg-background shadow-xl overflow-hidden">
      <CanvasHeader />
      
      {type === 'CODE' ? (
        isPreviewable ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-2 border-b border-border bg-muted/40 flex items-center justify-between">
              <TabsList className="h-8">
                <TabsTrigger value="code" className="text-xs px-3 h-7">
                  <Code2 className="w-3.5 h-3.5 mr-1.5" />
                  Code
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs px-3 h-7">
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Preview
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="flex-1 min-h-0 relative">
              <TabsContent value="code" className="h-full m-0 border-0 data-[state=active]:block">
                <CodeEditor />
              </TabsContent>
              <TabsContent value="preview" className="h-full m-0 border-0 data-[state=active]:block">
                <CanvasPreview />
              </TabsContent>
            </div>
          </Tabs>
        ) : (
          <div className="flex-1 min-h-0 relative">
            <CodeEditor />
          </div>
        )
      ) : (
        <div className="flex-1 min-h-0 relative">
          <TextEditor />
        </div>
      )}
    </div>
  );
}
