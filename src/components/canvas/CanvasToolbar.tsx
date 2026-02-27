/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CANVAS TOOLBAR
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * شريط أدوات متقدم مع Format, Files, Theme
 * مثل نظام Claude Canvas
 * 
 * @version 1.0.0
 */

'use client';

import { useState } from 'react';
import { useCanvasStore, type CanvasFile } from '@/store/canvasStore';
import
{
    Wand2,
    Plus,
    X,
    FileCode,
    Sun,
    Moon,
    ZoomIn,
    ZoomOut,
    Settings,
    Loader2,
    Sparkles
} from 'lucide-react';
import { useTheme } from 'next-themes';

export function CanvasToolbar ()
{
    const {
        files,
        activeFileId,
        switchFile,
        addFile,
        removeFile,
        updateFile,
        exportSettings,
        updateExportSettings,
        selectedModel,
        setSelectedModel,
        type,
        language
    } = useCanvasStore();

    const { theme, setTheme } = useTheme();
    const [ formatting, setFormatting ] = useState( false );
    const [ showFileInput, setShowFileInput ] = useState( false );
    const [ newFileName, setNewFileName ] = useState( '' );
    const [ showModelMenu, setShowModelMenu ] = useState( false );

    // Available AI Models for Canvas
    const CANVAS_MODELS = [
        { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', icon: '💎' },
        { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', icon: '⚡' },
        { id: 'gpt-5.2-2025-12-11', name: 'GPT 5.2', icon: '🤖' },
        { id: 'gpt-5.1-2025-11-13', name: 'GPT 5.1', icon: '🔮' },
        { id: 'gpt-5-mini-2025-08-07', name: 'GPT 5 Mini', icon: '🎯' },
        { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', icon: '👑' },
        { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', icon: '🎨' },
        { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', icon: '🎭' },
        { id: 'grok-4-1-fast-reasoning', name: 'Grok 4.1 Fast', icon: '🚀' },
        { id: 'qwen3-max', name: 'Qwen3 Max', icon: '🌟' },
        { id: 'kimi-k2.5', name: 'Kimi K2.5', icon: '🦋' },
        { id: 'DeepSeek-V3.2', name: 'DeepSeek V3.2', icon: '🧠' },
        { id: 'mistral-medium-3', name: 'Mistral Medium 3', icon: '🌊' },
        { id: 'llama-4-maverick', name: 'Llama 4', icon: '🦙' },
        { id: 'nova-2-pro-v1', name: 'Amazon Nova', icon: '☁️' },
        // Coding-specialized models
        { id: 'gpt-5.2-codex', name: 'GPT 5.2 Codex', icon: '💻' },
        { id: 'gpt-5.3-codex', name: 'GPT 5.3 Codex', icon: '🧬' },
        { id: 'gpt-5.1-codex-max', name: 'GPT 5.1 Codex Max', icon: '⚙️' },
        { id: 'codestral-2', name: 'Codestral 2', icon: '🔧' },
        { id: 'Qwen3-Coder-Plus', name: 'Qwen3 Coder', icon: '📝' },
        { id: 'DeepSeek-V3.2-Speciale', name: 'DeepSeek Coder', icon: '🔬' },
        { id: 'llama-3.3-70b-versatile', name: 'Llama Coder', icon: '🦙' },
        { id: 'claude-sonnet-4-6-coder', name: 'Claude Sonnet 4.6 Coder', icon: '🎯' },
        { id: 'kimi-k2.5-CODE', name: 'Kimi K2.5 Coder', icon: '🎨' },
        { id: 'grok-code-fast-1', name: 'Grok Coder', icon: '⚡' },
        { id: 'gemini-3-coder', name: 'Gemini 3 Coder', icon: '💠' },
    ];

    // Format Code with Prettier (lazy-loaded)
    const handleFormat = async () =>
    {
        const activeFile = files.find( f => f.id === activeFileId );
        if ( !activeFile || activeFile.type !== 'CODE' ) return;

        setFormatting( true );
        try
        {
            // Lazy import — only load ~100KB of Prettier when user clicks Format
            const [ prettier, parserTypeScript, parserBabel, parserHtml, parserCss, parserMarkdown ] = await Promise.all( [
                import( 'prettier' ),
                import( 'prettier/parser-typescript' ),
                import( 'prettier/parser-babel' ),
                import( 'prettier/parser-html' ),
                import( 'prettier/parser-postcss' ),
                import( 'prettier/parser-markdown' ),
            ] );

            const parserMap: Record<string, any> = {
                typescript: 'typescript',
                javascript: 'babel',
                jsx: 'babel',
                tsx: 'typescript',
                html: 'html',
                css: 'css',
                markdown: 'markdown',
            };

            const pluginMap: Record<string, any> = {
                typescript: parserTypeScript.default || parserTypeScript,
                babel: parserBabel.default || parserBabel,
                html: parserHtml.default || parserHtml,
                css: parserCss.default || parserCss,
                markdown: parserMarkdown.default || parserMarkdown,
            };

            const parser = parserMap[ activeFile.language ];
            if ( !parser )
            {
                console.warn( 'No formatter for language:', activeFile.language );
                return;
            }

            const prettierModule = prettier.default || prettier;
            const formatted = await prettierModule.format( activeFile.content, {
                parser,
                plugins: [ pluginMap[ parser ] ],
                semi: true,
                singleQuote: true,
                tabWidth: 2,
                trailingComma: 'es5',
            } );

            updateFile( activeFile.id, formatted );
        } catch ( error )
        {
            console.error( 'Format error:', error );
        } finally
        {
            setFormatting( false );
        }
    };

    // Add New File
    const handleAddFile = () =>
    {
        if ( !newFileName.trim() ) return;

        const newFile: CanvasFile = {
            id: `file_${ Date.now() }`,
            name: newFileName,
            language: 'typescript',
            content: '',
            type: 'CODE',
        };

        addFile( newFile );
        setNewFileName( '' );
        setShowFileInput( false );
    };

    // Font Size Controls
    const handleFontSizeChange = ( delta: number ) =>
    {
        const newSize = Math.max( 10, Math.min( 24, exportSettings.fontSize + delta ) );
        updateExportSettings( { fontSize: newSize } );
    };

    return (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/40">
            {/* File Tabs */ }
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-1 overflow-x-auto">
                    { files.map( ( file ) => (
                        <button
                            key={ file.id }
                            onClick={ () => switchFile( file.id ) }
                            className={ `
                group flex items-center gap-2 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors
                ${ activeFileId === file.id
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50' }
              `}
                        >
                            <FileCode className="w-3.5 h-3.5" />
                            <span>{ file.name }</span>
                            { files.length > 1 && (
                                <button
                                    onClick={ ( e ) =>
                                    {
                                        e.stopPropagation();
                                        removeFile( file.id );
                                    } }
                                    className="opacity-0 group-hover:opacity-100 hover:bg-destructive/20 rounded p-0.5 transition-opacity"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            ) }
                        </button>
                    ) ) }
                </div>

                {/* Add File Button */ }
                { showFileInput ? (
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={ newFileName }
                            onChange={ ( e ) => setNewFileName( e.target.value ) }
                            onKeyDown={ ( e ) => e.key === 'Enter' && handleAddFile() }
                            placeholder="filename.tsx"
                            className="px-2 py-1 text-sm rounded border border-border bg-background w-32"
                            autoFocus
                        />
                        <button
                            onClick={ handleAddFile }
                            className="p-1 hover:bg-green-500/20 rounded text-green-500"
                        >
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={ () =>
                            {
                                setShowFileInput( false );
                                setNewFileName( '' );
                            } }
                            className="p-1 hover:bg-destructive/20 rounded text-destructive"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={ () => setShowFileInput( true ) }
                        className="p-1.5 hover:bg-background rounded transition-colors text-muted-foreground hover:text-foreground"
                        title="Add File"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                ) }
            </div>

            {/* Toolbar Actions */ }
            <div className="flex items-center gap-1">
                {/* AI Model Selector */ }
                <div className="relative">
                    <button
                        onClick={ () => setShowModelMenu( !showModelMenu ) }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs hover:bg-background transition-colors"
                        title="Select AI Model"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                        <span className="text-muted-foreground">
                            { CANVAS_MODELS.find( m => m.id === selectedModel )?.name || 'Select Model' }
                        </span>
                    </button>

                    { showModelMenu && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg z-50">
                            <div className="py-1">
                                { CANVAS_MODELS.map( ( model ) => (
                                    <button
                                        key={ model.id }
                                        onClick={ () =>
                                        {
                                            setSelectedModel( model.id );
                                            setShowModelMenu( false );
                                        } }
                                        className={ `
                      w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent transition-colors
                      ${ selectedModel === model.id ? 'bg-accent text-accent-foreground' : '' }
                    `}
                                    >
                                        <span className="text-base">{ model.icon }</span>
                                        <span>{ model.name }</span>
                                        { selectedModel === model.id && (
                                            <span className="ml-auto text-green-500">✓</span>
                                        ) }
                                    </button>
                                ) ) }
                            </div>
                        </div>
                    ) }
                </div>

                <div className="w-px h-4 bg-border mx-1" />

                { type === 'CODE' && (
                    <button
                        onClick={ handleFormat }
                        disabled={ formatting }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs hover:bg-background transition-colors disabled:opacity-50"
                        title="Format Code"
                    >
                        { formatting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Wand2 className="w-3.5 h-3.5" />
                        ) }
                        <span>Format</span>
                    </button>
                ) }

                <div className="w-px h-4 bg-border mx-1" />

                {/* Font Size */ }
                <button
                    onClick={ () => handleFontSizeChange( -2 ) }
                    className="p-1.5 hover:bg-background rounded transition-colors"
                    title="Decrease Font"
                >
                    <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-muted-foreground px-2 font-mono">
                    { exportSettings.fontSize }px
                </span>
                <button
                    onClick={ () => handleFontSizeChange( 2 ) }
                    className="p-1.5 hover:bg-background rounded transition-colors"
                    title="Increase Font"
                >
                    <ZoomIn className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-4 bg-border mx-1" />

                {/* Theme Toggle */ }
                <button
                    onClick={ () => setTheme( theme === 'dark' ? 'light' : 'dark' ) }
                    className="p-1.5 hover:bg-background rounded transition-colors"
                    title="Toggle Theme"
                >
                    { theme === 'dark' ? (
                        <Sun className="w-3.5 h-3.5" />
                    ) : (
                        <Moon className="w-3.5 h-3.5" />
                    ) }
                </button>

                <button
                    className="p-1.5 hover:bg-background rounded transition-colors"
                    title="Settings"
                >
                    <Settings className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
