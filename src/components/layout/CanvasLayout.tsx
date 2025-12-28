"use client";

import { Panel, Group, Separator } from 'react-resizable-panels';
import { useCanvasStore } from '@/store/canvasStore';
import { CanvasPanel } from '@/components/canvas/CanvasPanel';
import { ReactNode, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface CanvasLayoutProps {
  children: ReactNode;
}

export function CanvasLayout({ children }: CanvasLayoutProps) {
  const { isOpen } = useCanvasStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <>{children}</>;

  return (
    <Group orientation="horizontal" className="h-full w-full">
      <Panel defaultSize={isOpen ? 30 : 100} minSize={20} className="h-full transition-all duration-300 ease-in-out">
        {children}
      </Panel>
      
      {isOpen && (
        <>
          <Separator className="w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize active:bg-primary" />
          <Panel defaultSize={70} minSize={30} maxSize={80} className="h-full">
             <CanvasPanel />
          </Panel>
        </>
      )}
    </Group>
  );
}
