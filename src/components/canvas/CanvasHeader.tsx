import { useState } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { ChevronLeft, ChevronRight, X, Copy, Check, Share2, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function CanvasHeader() {
  const { title, versions, currentVersionIndex, setVersion, closeCanvas } = useCanvasStore();
  const currentVersion = versions[currentVersionIndex];
  
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyContent = async () => {
    if (currentVersion?.content) {
      await navigator.clipboard.writeText(currentVersion.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Generate a simulated public link
  const shareUrl = `https://nexus.ai/share/${title.toLowerCase().replace(/\s+/g, '-')}-${currentVersion?.version || 1}`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <>
      <div className="flex items-center justify-between p-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-14">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h2 className="font-semibold text-sm">{title}</h2>
            {currentVersion && (
              <span className="text-[10px] text-muted-foreground">
                {new Date(currentVersion.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
          
          {versions.length > 0 && (
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 border border-border/50">
               <button 
                 disabled={currentVersionIndex >= versions.length - 1} 
                 onClick={() => setVersion(currentVersionIndex + 1)}
                 className="p-1 hover:bg-background rounded-md disabled:opacity-30 transition-colors"
               >
                 <ChevronRight className="w-3.5 h-3.5" />
               </button>
               <span className="text-[11px] font-mono px-2 min-w-[2rem] text-center">
                 v{currentVersion?.version}
               </span>
               <button 
                 disabled={currentVersionIndex <= 0} 
                 onClick={() => setVersion(currentVersionIndex - 1)}
                 className="p-1 hover:bg-background rounded-md disabled:opacity-30 transition-colors"
               >
                 <ChevronLeft className="w-3.5 h-3.5" />
               </button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsShareOpen(true)}
            className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button onClick={closeCanvas} className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isShareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-background border border-border rounded-xl shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Share Canvas</h3>
              <button onClick={() => setIsShareOpen(false)} className="p-1 hover:bg-muted rounded-md transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Public Link</label>
                <div className="flex gap-2">
                  <div className="flex-1 h-9 px-3 py-1 rounded-md border border-input bg-muted/50 text-sm flex items-center text-muted-foreground truncate select-all">
                    {shareUrl}
                  </div>
                  <Button size="sm" variant="outline" onClick={handleCopyLink} className="shrink-0">
                    {linkCopied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <LinkIcon className="w-3.5 h-3.5 mr-1.5" />}
                    {linkCopied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                 <Button className="w-full" onClick={handleCopyContent}>
                    {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? 'Content Copied' : 'Copy Content to Clipboard'}
                 </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
