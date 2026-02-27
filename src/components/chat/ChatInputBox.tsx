"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getModeConfig, getEnabledTools, type ChatMode, type ModelName } from "@/config/modelModeConfig";
import { useCanvasStore } from "@/store/canvasStore";
import { useOCRStore, createContextBadge, createContextStats } from "@/store/ocrStore";
import { needsOCR, fileToBase64, analyzeExtractedText, type OCRContext } from "@/services/ocrService";
import { VideoGeneratorTool } from "@/components/tools/VideoGeneratorTool";
import { ImageGeneratorTool } from "@/components/tools/ImageGeneratorTool";
import { OCRTool } from "@/components/tools/OCRTool";
import { useDeepResearchStore } from "@/stores/deepResearchStore";

// ── Wave 2.3: TipTap Rich Input ──
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import Placeholder from "@tiptap/extension-placeholder";

// ── Wave 5.1: Canvas Create Button ──
import { CanvasCreateButton } from "@/components/canvas/CanvasCreateButton";


// ==================== SVG Icons ====================
const PlusIcon = () => (
  <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const SlidersIcon = () => (
  <svg className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <line x1="4" x2="4" y1="21" y2="14" /><line x1="4" x2="4" y1="10" y2="3" /><line x1="12" x2="12" y1="21" y2="12" /><line x1="12" x2="12" y1="8" y2="3" /><line x1="20" x2="20" y1="21" y2="16" /><line x1="20" x2="20" y1="12" y2="3" /><line x1="2" x2="6" y1="14" y2="14" /><line x1="10" x2="14" y1="8" y2="8" /><line x1="18" x2="22" y1="16" y2="16" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const MicIcon = () => (
  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1 1.93c-3.94-.49-7-3.85-7-7.93V7h2v1c0 2.76 2.24 5 5 5s5-2.24 5-5V7h2v1c0 4.08-3.06 7.44-7 7.93V18h3v2H9v-2h3v-2.07z" />
  </svg>
);

const SendIcon = () => (
  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

const PaperclipIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const ImageIcon = () => (
  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
  </svg>
);

const PaletteIcon = () => (
  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
  </svg>
);

const DriveIcon = () => (
  <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M7.71 3.5L1.15 15l3.43 6h4.28l-3.43-6 6.56-11.5H7.71zm5.58 0L6.71 15l3.43 6h4.28L20.99 9.5h-4.29l-3.42 6-3.43-6 3.43-6h-4.29zm5.58 0L12.3 15l3.43 6h4.28l6.56-11.5h-4.28l-3.43 6v-6h-.01z" />
  </svg>
);

const BookOpenIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const FrameIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <line x1="22" x2="2" y1="6" y2="6" /><line x1="22" x2="2" y1="18" y2="18" /><line x1="6" x2="6" y1="2" y2="22" /><line x1="18" x2="18" y1="2" y2="22" />
  </svg>
);

const BrainIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" /><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" /><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" /><path d="M17.599 6.5a3 3 0 0 0 .399-1.375" /><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" /><path d="M3.477 10.896a4 4 0 0 1 .585-.396" /><path d="M19.938 10.5a4 4 0 0 1 .585.396" /><path d="M6 18a4 4 0 0 1-1.967-.516" /><path d="M19.967 17.484A4 4 0 0 1 18 18" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
  </svg>
);

const DeepResearchIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /><path d="M11 8v6" /><path d="M8 11h6" />
  </svg>
);

// OCR Icon
const ScanTextIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    <path d="M7 8h8" />
    <path d="M7 12h10" />
    <path d="M7 16h6" />
  </svg>
);

const VideoIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const ImageIconGenerate = () => (
  <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

const CameraIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" />
  </svg>
);

const UploadIcon = () => (
  <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
  </svg>
);

const XIcon = () => (
  <svg className="size-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
);

const BotIcon = () => (
  <svg className="size-3" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5 2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5 2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0-2.5-2.5z" />
  </svg>
);

// ==================== Types ====================
interface UploadedFile
{
  id: string;
  name: string;
  size: string;
  type: string;
}

interface ActiveTool
{
  id: string;
  name: string;
}

interface ChatInputBoxProps
{
  onSend: ( message: string, options?: { files?: File[], ocrContext?: OCRContext, model?: ModelName, mode?: ChatMode } ) => void;
  isModeActive?: boolean;
  onToggleMode?: () => void;
  onDisableMode?: () => void;
  onOpenDeepResearch?: () => void;
  onOpenWebSearch?: () => void;
  onOpenAltra?: () => void;
}

// ==================== Component ====================
export function ChatInputBox ( {
  onSend,
  onToggleMode,
  onOpenDeepResearch,
  onOpenWebSearch,
}: ChatInputBoxProps )
{
  // Canvas Store for auto-activation in coder mode
  const { enableMode, disableMode, isModeActive } = useCanvasStore();

  // OCR Store
  const { addContext, getActiveContext, removeContext, isProcessing, setProcessing } = useOCRStore();
  const [ ocrBadge, setOcrBadge ] = useState<string | null>( null );
  const [ ocrStats, setOcrStats ] = useState<string | null>( null );

  // Deep Research Store
  const {
    startResearch,
    isResearching,
    openPanel: openDeepResearchPanel,
    progress: researchProgress
  } = useDeepResearchStore();

  const DEFAULT_CHAT_MODE = "normal chat";
  const CHAT_MODE_OPTIONS = [
    "normal chat",
    "thinking",
    "deep research",   // بحث عميق متعدد المصادر
    "agent",
    "coder",
    "cways altra"      // محرك استدلال متقدم
  ] as const;
  const DEFAULT_AGENT_MODEL = "GPT 5";

  // النماذج العامة - 15 نموذج لجميع الأنماط ما عدا coder
  const GENERAL_MODEL_OPTIONS = [
    "Gemini 3 Pro",
    "Gemini 3 Flash",
    "Gemini 3.1 Pro",
    "GPT 5.2",
    "GPT 5",
    "Claude Opus 4.6",
    "Claude Sonnet 4.6",
    "Claude Haiku 4.5",
    "Grok-4.1",
    "Fast Grok",
    "GPT-5.1",
    "Qwen3-Max",
    "Deepseek V3.1",
    "Mistral-Medium-3",
    "Llama 4",
    "Amazon-Nova",
  ] as const;

  // نماذج البرمجة - 10 نماذج متخصصة لوضع coder
  const CODER_MODEL_OPTIONS = [
    "GPT 5.2 Codex",
    "GPT 5.3 Codex",
    "GPT 5.1 Codex Max",
    "Codestral-2",
    "Qwen3 Coder",
    "Deepseek Coder",
    "Llama Coder",
    "Claude Sonnet 4.6 Coder",
    "Kimi K2.5 Coder",
    "Grok Coder",
    "Gemini 3 Coder",
  ] as const;

  const [ message, setMessage ] = useState( "" );
  const [ isRecording, setIsRecording ] = useState( false );
  const [ showPlusMenu, setShowPlusMenu ] = useState( false );
  const [ showToolsMenu, setShowToolsMenu ] = useState( false );
  const [ showAgentMenu, setShowAgentMenu ] = useState( false );
  const [ showChatbotMenu, setShowChatbotMenu ] = useState( false );
  const [ showImageSubmenu, setShowImageSubmenu ] = useState( false );
  const [ showVideoGenerator, setShowVideoGenerator ] = useState( false );
  const [ showImageGenerator, setShowImageGenerator ] = useState( false );
  const [ showOCRTool, setShowOCRTool ] = useState( false );
  const [ selectedAgent, setSelectedAgent ] = useState( DEFAULT_AGENT_MODEL );
  const [ selectedChatbot, setSelectedChatbot ] = useState( DEFAULT_CHAT_MODE );

  const [ uploadedFiles, setUploadedFiles ] = useState<UploadedFile[]>( [] );
  const [ uploadedImages, setUploadedImages ] = useState<UploadedFile[]>( [] );
  const [ activeTools, setActiveTools ] = useState<ActiveTool[]>( [] );

  const textareaRef = useRef<HTMLTextAreaElement>( null );
  const plusMenuRef = useRef<HTMLDivElement>( null );
  const toolsMenuRef = useRef<HTMLDivElement>( null );
  const agentMenuRef = useRef<HTMLDivElement>( null );
  const chatbotMenuRef = useRef<HTMLDivElement>( null );
  const fileInputRef = useRef<HTMLInputElement>( null );
  const imageInputRef = useRef<HTMLInputElement>( null );

  // ── Wave 2.3: TipTap Editor ──
  const editor = useEditor( {
    immediatelyRender: false,
    extensions: [
      StarterKit.configure( {
        heading: false,
        horizontalRule: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      } ),
      Highlight,
      Typography,
      Placeholder.configure( {
        placeholder: "...إسأل CCWAYS",
      } ),
    ],
    editorProps: {
      attributes: {
        class: "w-full bg-transparent border-none outline-none resize-none text-[15px] leading-7 text-foreground min-h-[40px] max-h-[200px] overflow-y-auto focus:outline-none",
        dir: "rtl",
        "aria-label": "اكتب رسالتك هنا",
      },
      handleKeyDown: ( _view, event ) =>
      {
        if ( event.key === "Enter" && !event.shiftKey )
        {
          event.preventDefault();
          handleTipTapSend();
          return true;
        }
        return false;
      },
    },
    onUpdate: ( { editor: e } ) =>
    {
      setMessage( e.getText() );
    },
  } );

  const handleTipTapSend = useCallback( () =>
  {
    const text = editor?.getText()?.trim();
    if ( !text ) return;

    const config = getModeConfig( selectedAgent as ModelName, selectedChatbot as ChatMode );
    if ( config?.enabledTools && config.enabledTools.length > 0 )
    {
      const autoTools = config.enabledTools.map( tool => ( {
        id: `${ tool }-${ Date.now() }`,
        name: tool
      } ) );
      const allTools = [ ...activeTools ];
      autoTools.forEach( autoTool =>
      {
        if ( !allTools.some( t => t.name === autoTool.name ) )
        {
          allTools.push( autoTool );
        }
      } );
      setActiveTools( allTools );
    }

    const activeContext = getActiveContext();
    onSend( text, {
      ocrContext: activeContext || undefined,
      model: selectedAgent as ModelName,
      mode: selectedChatbot as ChatMode,
    } );
    editor?.commands.clearContent();
    setMessage( "" );
    setUploadedImages( [] );
    if ( activeContext )
    {
      setOcrBadge( null );
      setOcrStats( null );
    }
  }, [ editor, selectedAgent, selectedChatbot, activeTools, onSend, getActiveContext, setOcrBadge, setOcrStats ] );

  // Auto-resize textarea
  useEffect( () =>
  {
    if ( textareaRef.current )
    {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min( scrollHeight, 240 ) + "px";
    }
  }, [ message ] );

  // Auto-activate Canvas when coder mode is selected and auto-switch models
  useEffect( () =>
  {
    // تفعيل Canvas تلقائياً عند اختيار وضع coder
    if ( selectedChatbot === "coder" && !isModeActive )
    {
      enableMode( "CODE" );
    }

    // تغيير النموذج إذا غير متوافق
    if ( selectedChatbot === "coder" )
    {
      // إذا كان النموذج الحالي ليس من نماذج البرمجة، انتقل لأول نموذج برمجة
      if ( !CODER_MODEL_OPTIONS.includes( selectedAgent as any ) )
      {
        setSelectedAgent( CODER_MODEL_OPTIONS[ 0 ] );
      }
    } else
    {
      // إذا كان النموذج الحالي ليس من النماذج العامة، انتقل لأول نموذج عام
      if ( !GENERAL_MODEL_OPTIONS.includes( selectedAgent as any ) )
      {
        setSelectedAgent( GENERAL_MODEL_OPTIONS[ 0 ] );
      }
    }
  }, [ selectedChatbot ] );

  // Close menus on outside click
  useEffect( () =>
  {
    const handleClickOutside = ( event: MouseEvent | TouchEvent ) =>
    {
      const target = event.target as Node;
      if ( plusMenuRef.current && !plusMenuRef.current.contains( target ) )
      {
        setShowPlusMenu( false );
        setShowImageSubmenu( false );
      }
      if ( toolsMenuRef.current && !toolsMenuRef.current.contains( target ) )
      {
        setShowToolsMenu( false );
      }
      if ( agentMenuRef.current && !agentMenuRef.current.contains( target ) )
      {
        setShowAgentMenu( false );
      }
      if ( chatbotMenuRef.current && !chatbotMenuRef.current.contains( target ) )
      {
        setShowChatbotMenu( false );
      }
    };

    document.addEventListener( "mousedown", handleClickOutside );
    document.addEventListener( "touchstart", handleClickOutside );
    return () =>
    {
      document.removeEventListener( "mousedown", handleClickOutside );
      document.removeEventListener( "touchstart", handleClickOutside );
    };
  }, [] );

  const handleSend = () =>
  {
    if ( message.trim() )
    {
      // الحصول على التكوين الحالي
      const config = getModeConfig( selectedAgent as ModelName, selectedChatbot as ChatMode );

      // تحديث الأدوات المفعّلة تلقائياً
      if ( config?.enabledTools && config.enabledTools.length > 0 )
      {
        const autoTools = config.enabledTools.map( tool => ( {
          id: `${ tool }-${ Date.now() }`,
          name: tool
        } ) );

        // دمج الأدوات التلقائية مع الأدوات المضافة يدوياً
        const allTools = [ ...activeTools ];
        autoTools.forEach( autoTool =>
        {
          if ( !allTools.some( t => t.name === autoTool.name ) )
          {
            allTools.push( autoTool );
          }
        } );
        setActiveTools( allTools );
      }

      // Get active OCR context
      const activeContext = getActiveContext();

      onSend( message.trim(), {
        ocrContext: activeContext || undefined,
        model: selectedAgent as ModelName,
        mode: selectedChatbot as ChatMode,
      } );
      setMessage( "" );
      setUploadedImages( [] );

      // Clear OCR context after sending
      if ( activeContext )
      {
        setOcrBadge( null );
        setOcrStats( null );
      }
    }
  };

  const handleKeyDown = ( e: React.KeyboardEvent<HTMLTextAreaElement> ) =>
  {
    if ( e.key === "Enter" && !e.shiftKey )
    {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async ( e: React.ChangeEvent<HTMLInputElement> ) =>
  {
    const files = e.target.files;
    if ( !files || files.length === 0 ) return;

    const file = files[ 0 ];

    // 🔍 كشف إذا كان يحتاج OCR
    if ( needsOCR( file.type ) )
    {
      setProcessing( true );

      try
      {
        // تحويل إلى base64
        const base64 = await fileToBase64( file );

        // استدعاء API
        const response = await fetch( '/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify( {
            images: { base64, type: file.type },
            mode: 'single'
          } )
        } );

        const result = await response.json();

        if ( result.success )
        {
          // تحليل النص
          const stats = analyzeExtractedText( result.text );

          // إنشاء سياق OCR
          const context: OCRContext = {
            id: `ocr-${ Date.now() }`,
            text: result.text,
            filename: file.name,
            pageCount: result.pages || 1,
            wordCount: stats.wordCount,
            estimatedTokens: stats.estimatedTokens,
            extractedAt: Date.now(),
            confidence: result.confidence || 0.95
          };

          // حفظ في Store
          addContext( context );

          // عرض Badge
          setOcrBadge( createContextBadge( context ) );
          setOcrStats( createContextStats( context ) );
        } else
        {
          console.error( 'OCR failed:', result.error );
        }
      } catch ( error )
      {
        console.error( 'OCR processing error:', error );
      } finally
      {
        setProcessing( false );
      }
    } else
    {
      // ملفات عادية (غير OCR)
      const newFiles = [ file ].map( ( f ) => ( {
        id: Date.now().toString() + Math.random() + f.name,
        name: f.name,
        size: ( f.size / 1024 ).toFixed( 2 ) + " KB",
        type: f.type,
      } ) );
      setUploadedFiles( ( prev ) => [ ...prev, ...newFiles ] );
    }

    e.target.value = "";
  };

  const handleImageUpload = ( e: React.ChangeEvent<HTMLInputElement> ) =>
  {
    const files = e.target.files;
    if ( files && files.length > 0 )
    {
      const newFiles = Array.from( files )
        .filter( ( file ) => file.type.startsWith( "image/" ) )
        .map( ( file ) => ( {
          id: Date.now().toString() + Math.random() + file.name,
          name: file.name,
          size: ( file.size / 1024 ).toFixed( 2 ) + " KB",
          type: file.type,
        } ) );
      if ( newFiles.length > 0 )
      {
        setUploadedImages( ( prev ) => [ ...prev, ...newFiles ] );
      }
    }
    e.target.value = "";
  };

  const removeFile = ( fileId: string ) => setUploadedFiles( ( prev ) => prev.filter( ( f ) => f.id !== fileId ) );
  const removeImage = ( imageId: string ) => setUploadedImages( ( prev ) => prev.filter( ( f ) => f.id !== imageId ) );
  const removeTool = ( toolId: string ) => setActiveTools( ( prev ) => prev.filter( ( t ) => t.id !== toolId ) );

  const addTool = ( toolName: string ) =>
  {
    setActiveTools( [ { id: Date.now().toString(), name: toolName } ] );
  };

  const getToolIcon = ( name: string ) =>
  {
    switch ( name )
    {
      case "Canvas": return <FrameIcon />;
      case "Thinking": return <BrainIcon />;
      case "Research": return <BookOpenIcon />;
      case "Deep Research": return <DeepResearchIcon />;
      case "Search": return <GlobeIcon />;
      case "Canva": return <PaletteIcon />;
      default: return null;
    }
  };

  const getFileIcon = ( fileName: string ) =>
  {
    const ext = fileName.split( "." ).pop()?.toLowerCase();
    if ( [ "jpg", "jpeg", "png", "gif", "svg", "webp" ].includes( ext || "" ) )
    {
      return <ImageIcon />;
    }
    return <PaperclipIcon />;
  };

  return (
    <div className="w-full safe-bottom">
      {/* Hidden file inputs */ }
      <label htmlFor="chat-attachments" className="sr-only">Attach files</label>
      <input id="chat-attachments" ref={ fileInputRef } type="file" multiple className="hidden" onChange={ handleFileUpload } accept="*/*" />
      <label htmlFor="chat-images" className="sr-only">Upload images</label>
      <input id="chat-images" ref={ imageInputRef } type="file" multiple className="hidden" onChange={ handleImageUpload } accept="image/*" />

      {/* Main Container */ }
      <div className="bg-gradient-to-b from-white/[0.08] via-[#081820]/95 to-[#081820] backdrop-blur-2xl rounded-t-2xl border-t border-white/[0.08] hover:border-white/[0.12] focus-within:border-primary/30 focus-within:shadow-[0_0_30px_rgba(13,148,136,0.15)] animate-shimmer overflow-visible transition-all duration-300">
        {/* OCR Processing Indicator */ }
        { isProcessing && (
          <div className="px-3 pt-2 pb-1 border-b border-white/[0.06]">
            <div className="inline-flex items-center gap-2 text-xs text-blue-400">
              <div className="animate-spin h-3 w-3 border-2 border-blue-400 border-t-transparent rounded-full" />
              <span>⏳ جاري استخراج النص من المستند...</span>
            </div>
          </div>
        ) }

        {/* OCR Context Badge */ }
        { ocrBadge && !isProcessing && (
          <div className="px-3 pt-2 pb-1 border-b border-white/[0.06]">
            <div className="inline-flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs">
              <span className="text-blue-300 font-medium">{ ocrBadge }</span>
              { ocrStats && <span className="text-blue-400/60">{ ocrStats }</span> }
              <button
                onClick={ () =>
                {
                  const activeContext = getActiveContext();
                  if ( activeContext )
                  {
                    removeContext( activeContext.id );
                  }
                  setOcrBadge( null );
                  setOcrStats( null );
                } }
                className="text-blue-400/60 hover:text-blue-300 transition-colors"
                aria-label="Remove OCR context"
              >
                <XIcon />
              </button>
            </div>
          </div>
        ) }

        {/* Top Bar - Files Display */ }
        { ( uploadedFiles.length > 0 || uploadedImages.length > 0 || selectedAgent !== DEFAULT_AGENT_MODEL || selectedChatbot !== DEFAULT_CHAT_MODE ) && (
          <div className="px-3 pt-2 pb-1 border-b border-white/[0.06]">
            <div className="flex items-start justify-between gap-2">
              {/* Files/Images */ }
              { ( uploadedFiles.length > 0 || uploadedImages.length > 0 ) && (
                <div className="flex items-center gap-2 flex-wrap">
                  { uploadedFiles.map( ( file ) => (
                    <div key={ file.id } className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/[0.05] rounded text-[10px] hover:bg-white/[0.08] transition-colors">
                      { getFileIcon( file.name ) }
                      <span className="text-foreground font-medium max-w-[120px] truncate">{ file.name }</span>
                      <button onClick={ () => removeFile( file.id ) } className="text-muted-foreground hover:text-foreground" aria-label={ `Remove file ${ file.name }` }><XIcon /></button>
                    </div>
                  ) ) }
                  { uploadedImages.map( ( file ) => (
                    <div key={ file.id } className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/[0.05] rounded text-[10px] hover:bg-white/[0.08] transition-colors">
                      <ImageIcon />
                      <span className="text-foreground font-medium max-w-[120px] truncate">{ file.name }</span>
                      <button onClick={ () => removeImage( file.id ) } className="text-muted-foreground hover:text-foreground" aria-label={ `Remove image ${ file.name }` }><XIcon /></button>
                    </div>
                  ) ) }
                </div>
              ) }
              {/* Active Agent/Chatbot Badge */ }
              { ( selectedAgent !== DEFAULT_AGENT_MODEL || selectedChatbot !== DEFAULT_CHAT_MODE ) && (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white/[0.05] rounded-md">
                  <BotIcon />
                  <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                    { selectedAgent !== DEFAULT_AGENT_MODEL && selectedChatbot !== DEFAULT_CHAT_MODE
                      ? `${ selectedChatbot } • ${ selectedAgent }`
                      : ( selectedAgent !== DEFAULT_AGENT_MODEL ? selectedAgent : selectedChatbot ) }
                  </span>
                </div>
              ) }
            </div>
          </div>
        ) }

        {/* Main Input Area */ }
        <div className="p-3">
          {/* TipTap Rich Editor (Wave 2.3) */ }
          <div className="w-full mb-2 tiptap-input">
            <EditorContent editor={ editor } />
          </div>

          {/* Action Buttons Row */ }
          <div className="flex items-center justify-between gap-2">
            {/* Left: Plus + Tools + Active Tools */ }
            <div className="flex items-center gap-1.5 flex-1">
              {/* Plus Button */ }
              <div ref={ plusMenuRef } className="relative">
                <button
                  type="button"
                  onClick={ () => setShowPlusMenu( !showPlusMenu ) }
                  className={ cn( "inline-flex items-center justify-center size-9 rounded-lg transition-colors", showPlusMenu ? "text-foreground bg-white/[0.1]" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]" ) }
                  aria-label="Toggle attachments menu"
                  aria-haspopup="menu"
                  aria-expanded={ showPlusMenu ? "true" : "false" }
                >
                  <PlusIcon />
                </button>

                {/* Plus Menu */ }
                { showPlusMenu && (
                  <div className="absolute right-0 bottom-full mb-2 w-40 overlay-dropdown rounded-xl z-50">
                    <div className="py-1">
                      <button onClick={ () => { fileInputRef.current?.click(); setShowPlusMenu( false ); } } className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs overlay-text overlay-item transition-colors">
                        <PaperclipIcon /><span>Attach</span>
                      </button>

                      <div className="relative" onMouseEnter={ () => setShowImageSubmenu( true ) } onMouseLeave={ () => setShowImageSubmenu( false ) }>
                        <button className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs overlay-text overlay-item transition-colors">
                          <div className="flex items-center gap-2"><ImageIcon /><span>Image</span></div>
                          <ChevronRightIcon />
                        </button>
                        { showImageSubmenu && (
                          <div className="absolute right-full top-0 mr-1 w-44 overlay-dropdown rounded-xl z-50">
                            <div className="py-1">
                              <button onClick={ () => { setShowPlusMenu( false ); } } className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs overlay-text overlay-item">
                                <CameraIcon /><span>Take Photo</span>
                              </button>
                              <button onClick={ () => { imageInputRef.current?.click(); setShowPlusMenu( false ); } } className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs overlay-text overlay-item">
                                <UploadIcon /><span>Upload from Device</span>
                              </button>
                            </div>
                          </div>
                        ) }
                      </div>

                      <button onClick={ () => { addTool( "Canva" ); setShowPlusMenu( false ); } } className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs overlay-text overlay-item transition-colors">
                        <PaletteIcon /><span>Canva</span>
                      </button>
                      <button onClick={ () => setShowPlusMenu( false ) } className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs overlay-text overlay-item transition-colors">
                        <DriveIcon /><span>Google Drive</span>
                      </button>
                      <button onClick={ () => setShowPlusMenu( false ) } className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs overlay-text overlay-item transition-colors">
                        <BookOpenIcon /><span>NotebookLM</span>
                      </button>
                    </div>
                  </div>
                ) }
              </div>

              {/* Tools Button */ }
              <div ref={ toolsMenuRef } className="relative">
                <button
                  onClick={ () => setShowToolsMenu( !showToolsMenu ) }
                  className={ cn( "inline-flex items-center justify-center size-9 rounded-lg transition-colors", showToolsMenu ? "text-foreground bg-white/[0.1]" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]" ) }
                  aria-label="Toggle tools menu"
                  aria-haspopup="menu"
                  aria-expanded={ showToolsMenu }
                >
                  <SlidersIcon />
                </button>

                {/* Tools Menu */ }
                { showToolsMenu && (
                  <div className="absolute right-0 bottom-full mb-2 w-[154px] overlay-dropdown rounded-xl z-50">
                    <div className="py-1">
                      <button onClick={ () => { addTool( "Canvas" ); onToggleMode?.(); setShowToolsMenu( false ); } } className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs overlay-text overlay-item">
                        <FrameIcon /><span>Canvas</span>
                      </button>
                      <button onClick={ () => { setShowOCRTool( true ); setShowToolsMenu( false ); } } className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs overlay-text overlay-item">
                        <ScanTextIcon /><span>OCR Tool</span>
                      </button>
                      <button onClick={ () => { setShowVideoGenerator( true ); setShowToolsMenu( false ); } } className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs overlay-text overlay-item">
                        <VideoIcon /><span>Generate Video</span>
                      </button>
                      <button onClick={ () => { setShowImageGenerator( true ); setShowToolsMenu( false ); } } className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs overlay-text overlay-item">
                        <ImageIconGenerate /><span>Generate Image</span>
                      </button>
                    </div>
                  </div>
                ) }
              </div>

              {/* Active Tools Pills */ }
              { activeTools.map( ( tool ) => (
                <div key={ tool.id } className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-lg text-xs">
                  <span className="text-primary">{ getToolIcon( tool.name ) }</span>
                  <span className="text-primary font-medium">{ tool.name }</span>
                  <button onClick={ () => removeTool( tool.id ) } className="text-primary/60 hover:text-primary" aria-label={ `Remove tool ${ tool.name }` }><XIcon /></button>
                </div>
              ) ) }

              {/* Wave 5.1: Canvas Create Button */}
              <CanvasCreateButton />
            </div>

            {/* Right: Chatbot + Agent + Mic/Send */ }
            <div className="flex items-center gap-2">
              {/* Chatbot Selector */ }
              <div ref={ chatbotMenuRef } className="relative">
                <button
                  onClick={ () => setShowChatbotMenu( !showChatbotMenu ) }
                  className={ cn( "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", showChatbotMenu ? "text-foreground bg-white/[0.1]" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]" ) }
                >
                  <span className="capitalize">{ selectedChatbot }</span><ChevronDownIcon />
                </button>
                { showChatbotMenu && (
                  <div className="absolute right-0 bottom-full mb-2 w-40 overlay-dropdown rounded-xl z-50">
                    <div className="py-1">
                    { CHAT_MODE_OPTIONS.map( ( mode ) => (
                        <button
                          key={ mode }
                          onClick={ () =>
                          {
                            setSelectedChatbot( mode );
                            setShowChatbotMenu( false );
                          } }
                          className="w-full flex items-center px-2.5 py-1.5 text-xs overlay-text overlay-item"
                        >
                          <span className="capitalize">{ mode }</span>
                        </button>
                      ) ) }
                    </div>
                  </div>
                ) }
              </div>

              {/* Agent Selector */ }
              <div ref={ agentMenuRef } className="relative">
                <button
                  onClick={ () => setShowAgentMenu( !showAgentMenu ) }
                  className={ cn( "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", showAgentMenu ? "text-foreground bg-white/[0.1]" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]" ) }
                >
                  <span className="capitalize">{ selectedAgent }</span><ChevronDownIcon />
                </button>
                { showAgentMenu && (
                  <div className="absolute left-0 bottom-full mb-2 w-44 overlay-dropdown rounded-xl z-50 overflow-hidden max-h-[60vh]">
                    <div className="py-1 max-h-[calc(60vh-8px)] overflow-y-auto custom-scrollbar">
                      { ( selectedChatbot === "coder" ? CODER_MODEL_OPTIONS : GENERAL_MODEL_OPTIONS ).map( ( agent ) => (
                        <button key={ agent } onClick={ () => { setSelectedAgent( agent ); setShowAgentMenu( false ); } } className="w-full flex items-center px-2.5 py-1.5 text-xs overlay-text overlay-item truncate">
                          <span className="capitalize">{ agent }</span>
                        </button>
                      ) ) }
                    </div>
                  </div>
                ) }
              </div>

              {/* Mic / Send Button */ }
              { !message.trim() ? (
                <button
                  onClick={ () => setIsRecording( !isRecording ) }
                  className={ cn( "inline-flex items-center justify-center size-9 rounded-xl transition-all duration-200", isRecording ? "bg-destructive text-destructive-foreground animate-pulse shadow-lg shadow-destructive/30" : "hover:bg-muted/60 dark:hover:bg-white/[0.06] text-muted-foreground/70 hover:text-foreground" ) }
                  title="تحويل الصوت لنص"
                  aria-label="تحويل الصوت لنص"
                >
                  <MicIcon />
                </button>
              ) : (
                <button
                  onClick={ handleSend }
                  className="inline-flex items-center justify-center size-9 rounded-xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 transition-all"
                  title="إرسال"
                  aria-label="إرسال الرسالة"
                >
                  <SendIcon />
                </button>
              ) }
            </div>
          </div>
        </div>
      </div>

      {/* Video Generator Tool Modal */ }
      { showVideoGenerator && (
        <VideoGeneratorTool onClose={ () => setShowVideoGenerator( false ) } />
      ) }

      {/* Image Generator Tool Modal */ }
      { showImageGenerator && (
        <ImageGeneratorTool onClose={ () => setShowImageGenerator( false ) } />
      ) }

      {/* OCR Tool Modal */ }
      { showOCRTool && (
        <OCRTool onClose={ () => setShowOCRTool( false ) } />
      ) }
    </div>
  );
}

export default ChatInputBox;
