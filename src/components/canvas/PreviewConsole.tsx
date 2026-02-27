/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PREVIEW CONSOLE COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * console لمعاينة الأكواد مع عرض logs وerrors
 * مثل نظام Claude Canvas
 * 
 * @version 1.0.0
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

interface LogEntry
{
    id: string;
    type: 'log' | 'error' | 'warn' | 'info';
    message: string;
    timestamp: number;
    count: number;
}

interface PreviewConsoleProps
{
    isOpen: boolean;
    onClose: () => void;
}

export function PreviewConsole ( { isOpen, onClose }: PreviewConsoleProps )
{
    const [ logs, setLogs ] = useState<LogEntry[]>( [] );
    const [ filter, setFilter ] = useState<'all' | 'log' | 'error' | 'warn' | 'info'>( 'all' );
    const logsEndRef = useRef<HTMLDivElement>( null );

    // Listen to iframe console messages
    useEffect( () =>
    {
        const handleMessage = ( event: MessageEvent ) =>
        {
            if ( event.data.type === 'console' )
            {
                const { method, args } = event.data;
                const message = args.map( ( arg: any ) =>
                    typeof arg === 'object' ? JSON.stringify( arg, null, 2 ) : String( arg )
                ).join( ' ' );

                addLog( method, message );
            }
        };

        window.addEventListener( 'message', handleMessage );
        return () => window.removeEventListener( 'message', handleMessage );
    }, [] );

    const addLog = ( type: LogEntry[ 'type' ], message: string ) =>
    {
        setLogs( prev =>
        {
            // Check if same message exists recently
            const recent = prev.find( log =>
                log.message === message &&
                log.type === type &&
                Date.now() - log.timestamp < 1000
            );

            if ( recent )
            {
                // Increment count
                return prev.map( log =>
                    log.id === recent.id
                        ? { ...log, count: log.count + 1, timestamp: Date.now() }
                        : log
                );
            }

            // Add new log
            return [ ...prev, {
                id: `log_${ Date.now() }_${ Math.random() }`,
                type,
                message,
                timestamp: Date.now(),
                count: 1,
            } ];
        } );
    };

    const clearLogs = () => setLogs( [] );

    const filteredLogs = filter === 'all'
        ? logs
        : logs.filter( log => log.type === filter );

    // Auto-scroll to bottom
    useEffect( () =>
    {
        logsEndRef.current?.scrollIntoView( { behavior: 'smooth' } );
    }, [ logs ] );

    const getIcon = ( type: LogEntry[ 'type' ] ) =>
    {
        switch ( type )
        {
            case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'warn': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
            case 'info': return <Info className="w-4 h-4 text-blue-500" />;
            default: return <Terminal className="w-4 h-4 text-muted-foreground" />;
        }
    };

    const getTextColor = ( type: LogEntry[ 'type' ] ) =>
    {
        switch ( type )
        {
            case 'error': return 'text-red-400';
            case 'warn': return 'text-yellow-400';
            case 'info': return 'text-blue-400';
            default: return 'text-foreground';
        }
    };

    if ( !isOpen ) return null;

    return (
        <div className="h-64 border-t border-border bg-background flex flex-col">
            {/* Header */ }
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/40">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Terminal className="w-4 h-4" />
                        Console
                        { logs.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-xs bg-primary/20 text-primary">
                                { logs.length }
                            </span>
                        ) }
                    </div>

                    {/* Filters */ }
                    <div className="flex items-center gap-1">
                        { ( [ 'all', 'log', 'error', 'warn', 'info' ] as const ).map( ( f ) => (
                            <button
                                key={ f }
                                onClick={ () => setFilter( f ) }
                                className={ `
                  px-2 py-1 rounded text-xs transition-colors
                  ${ filter === f
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted' }
                `}
                            >
                                { f.charAt( 0 ).toUpperCase() + f.slice( 1 ) }
                                { f !== 'all' && (
                                    <span className="ml-1 opacity-70">
                                        ({ logs.filter( l => l.type === f ).length })
                                    </span>
                                ) }
                            </button>
                        ) ) }
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={ clearLogs }
                        className="p-1.5 hover:bg-muted rounded transition-colors"
                        title="Clear Console"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={ onClose }
                        className="p-1.5 hover:bg-destructive/20 hover:text-destructive rounded transition-colors"
                        title="Close Console"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Logs */ }
            <div className="flex-1 overflow-auto p-2 space-y-1 font-mono text-xs">
                { filteredLogs.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                            <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No console output</p>
                        </div>
                    </div>
                ) : (
                    filteredLogs.map( ( log ) => (
                        <div
                            key={ log.id }
                            className="flex items-start gap-2 p-2 rounded hover:bg-muted/50 transition-colors"
                        >
                            <div className="shrink-0 mt-0.5">
                                { getIcon( log.type ) }
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className={ `whitespace-pre-wrap break-words ${ getTextColor( log.type ) }` }>
                                    { log.message }
                                    { log.count > 1 && (
                                        <span className="ml-2 px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
                                            { log.count }
                                        </span>
                                    ) }
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-1">
                                    { new Date( log.timestamp ).toLocaleTimeString() }
                                </div>
                            </div>
                        </div>
                    ) )
                ) }
                <div ref={ logsEndRef } />
            </div>
        </div>
    );
}
