/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DIFF VIEWER COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * عرض الفروقات بين versions
 * مثل نظام Claude Canvas
 * 
 * @version 1.0.0
 */

'use client';

import { useState } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { useTheme } from 'next-themes';
import { Split, Maximize2 } from 'lucide-react';

export function DiffViewer ()
{
    const { versions, currentVersionIndex } = useCanvasStore();
    const { theme } = useTheme();
    const [ splitView, setSplitView ] = useState( true );

    const currentVersion = versions[ currentVersionIndex ];
    const previousVersion = versions[ currentVersionIndex - 1 ];

    if ( !currentVersion || !previousVersion )
    {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground p-8 text-center">
                <div>
                    <Maximize2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">لا توجد versions سابقة للمقارنة</p>
                    <p className="text-xs mt-2">قم بإنشاء تعديلات جديدة لرؤية الفروقات</p>
                </div>
            </div>
        );
    }

    const newStyles = {
        variables: {
            dark: {
                diffViewerBackground: '#1e1e1e',
                diffViewerColor: '#e0e0e0',
                addedBackground: '#1a472a',
                addedColor: '#a1f5a1',
                removedBackground: '#4a1a1a',
                removedColor: '#f5a1a1',
                wordAddedBackground: '#2d6b3d',
                wordRemovedBackground: '#6b2d2d',
                addedGutterBackground: '#1a472a',
                removedGutterBackground: '#4a1a1a',
                gutterBackground: '#2d2d2d',
                gutterColor: '#858585',
                highlightBackground: '#3d3d3d',
                highlightGutterBackground: '#4d4d4d',
            },
            light: {
                diffViewerBackground: '#ffffff',
                diffViewerColor: '#212529',
                addedBackground: '#d4fcdb',
                addedColor: '#24292e',
                removedBackground: '#ffd7d5',
                removedColor: '#24292e',
                wordAddedBackground: '#a4f5b4',
                wordRemovedBackground: '#f5a4a4',
                addedGutterBackground: '#d4fcdb',
                removedGutterBackground: '#ffd7d5',
                gutterBackground: '#f6f8fa',
                gutterColor: '#6a737d',
                highlightBackground: '#fff5b1',
                highlightGutterBackground: '#ffeeaa',
            },
        },
    };

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Toolbar */ }
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/40">
                <div className="flex items-center gap-4">
                    <div className="text-sm">
                        <span className="text-muted-foreground">Comparing: </span>
                        <span className="font-mono text-destructive">v{ previousVersion.version }</span>
                        <span className="mx-2 text-muted-foreground">→</span>
                        <span className="font-mono text-green-500">v{ currentVersion.version }</span>
                    </div>
                </div>

                <button
                    onClick={ () => setSplitView( !splitView ) }
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs hover:bg-background transition-colors"
                >
                    <Split className="w-3.5 h-3.5" />
                    { splitView ? 'Unified View' : 'Split View' }
                </button>
            </div>

            {/* Diff Content */ }
            <div className="flex-1 overflow-auto">
                <ReactDiffViewer
                    oldValue={ previousVersion.content }
                    newValue={ currentVersion.content }
                    splitView={ splitView }
                    compareMethod={ DiffMethod.WORDS }
                    useDarkTheme={ theme === 'dark' }
                    styles={ newStyles }
                    leftTitle={ `Version ${ previousVersion.version }` }
                    rightTitle={ `Version ${ currentVersion.version } (Current)` }
                    showDiffOnly={ false }
                />
            </div>
        </div>
    );
}
