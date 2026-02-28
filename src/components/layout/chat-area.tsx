"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import
{
  Share2,
  Star,
  RefreshCw,
  Trash2,
  Maximize2,
  Minimize2,
  Bot,
  Copy,
  Reply,
  GraduationCap,
  Search,
  Activity,
  Database,
  Code2,
  X,
  Download,
  Paperclip,
  Folder,
  Plus,
  MoreHorizontal,
  Pin,
  Archive,
  Flag,
  FolderInput,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvasParser } from "@/hooks/useCanvasParser";
import { useAutoCanvasDetector } from "@/hooks/useAutoCanvasDetector";
import { useToolCallCanvasHandler } from "@/hooks/useToolCallCanvasHandler";
import { useCanvasStore, CanvasType } from "@/store/canvasStore";
import { CanvasEntryChip } from "@/components/canvas/CanvasEntryChip";
import { useChatStore } from "@/store/chatStore";
import { useFavoritesStore } from "@/store/favoritesStore";
import { ShareModal } from "@/components/share/ShareModal";
import { ConfirmModal } from "@/components/settings";
import { useSound } from "@/lib/sounds";
import { useMounted } from "@/hooks/use-mounted";
import { toPng } from "html-to-image";
// Chat types imported from store
import { DeepResearchPanel } from "@/components/deep-research";
import { WebSearchPanel } from "@/components/web-search";
import { ChatInputBox } from "@/components/chat/ChatInputBox";
import { createOCRSystemMessage, type OCRContext } from "@/services/ocrService";
import { buildSystemPrompt, detectLanguage } from "@/config/systemPrompts";
// Thinking System
import { ThinkingDisplay } from "@/components/thinking";
import { useThinkingStore } from "@/store/thinkingStore";
import { ThinkingLevel, type ChatbotModel } from "@/types/thinking";
import { type ChatMode, type ThinkingDepth, analyzeQueryComplexity, modelSupportsToolCalling } from "@/config/modelModeConfig";
import { AltraPipelineView } from "@/components/chat/AltraPipelineView";
import { useAltraStore } from "@/stores/altraStore";

// ── Wave 1: Markdown rendering (now handled in VirtualizedMessageList) ──
// CSS for katex + highlight.js imported in globals.css

// ── Wave 2: Streaming Markdown with word-fade ──
import { StreamingMarkdown } from "@/components/chat/StreamingMarkdown";
import { useTokenSmoother } from "@/hooks/useTokenSmoother";

// ── Wave 4.3: Virtualized message list ──
import { VirtualizedMessageList } from "@/components/chat/VirtualizedMessageList";

// Message interface is defined in projectStore
type MessageRole = "user" | "assistant";

interface DemoMessage
{
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

const DEMO_MESSAGES: DemoMessage[] = [
  {
    id: "demo-msg-1",
    role: "user" as MessageRole,
    content: "مرحباً، أريد تحليلاً لسوق العملات الرقمية اليوم.",
    timestamp: Date.now() - 100000,
  },
  {
    id: "demo-msg-2",
    role: "assistant" as MessageRole,
    content: "أهلاً بك! بالتأكيد. يشهد السوق اليوم تقلبات ملحوظة مع اتجاه عام للصعود في العملات الرئيسية.\n\n**أبرز النقاط:**\n- **Bitcoin (BTC):** يتداول فوق مستوى 65,000$ مع دعم قوي.\n- **Ethereum (ETH):** يظهر إشارات إيجابية بعد التحديث الأخير.\n\nهل تود التركيز على عملة محددة؟",
    timestamp: Date.now() - 80000,
  },
  {
    id: "demo-msg-3",
    role: "user" as MessageRole,
    content: "نعم، ماذا عن Solana؟",
    timestamp: Date.now() - 60000,
  },
  {
    id: "demo-msg-4",
    role: "assistant" as MessageRole,
    content: "عملة **Solana (SOL)** تظهر أداءً ممتازاً:\n\n1. **السعر الحالي:** 145$\n2. **حجم التداول:** مرتفع بنسبة 15% عن الأمس.\n3. **المؤشرات الفنية:** مؤشر RSI يشير إلى منطقة شراء قوية.\n\nأنصح بمراقبة مستوى المقاومة عند 150$.",
    timestamp: Date.now() - 40000,
  }
];

interface ChatAreaProps
{
  activeAgent: "general" | "institute";
  onAgentChange: ( agent: "general" | "institute" ) => void;
}

export function ChatArea ( { }: ChatAreaProps )
{
  const [ showPlusMenu, setShowPlusMenu ] = useState( false );
  const [ isAgentMenuOpen, setIsAgentMenuOpen ] = useState( false );
  const [ isTopMenuOpen, setIsTopMenuOpen ] = useState( false );
  const topMenuRef = useRef<HTMLDivElement>( null );
  const [ isReportOpen, setIsReportOpen ] = useState( false );
  const [ reportText, setReportText ] = useState( "" );
  const [ reportConsent, setReportConsent ] = useState( false );
  const [ isDeepResearchOpen, setIsDeepResearchOpen ] = useState( false );
  const [ isWebSearchOpen, setIsWebSearchOpen ] = useState( false );
  const [ shareModal, setShareModal ] = useState<{ isOpen: boolean; text: string; url?: string }>( { isOpen: false, text: "" } );
  const [ showMoreMenu, setShowMoreMenu ] = useState( false );
  const [ showDeleteConfirm, setShowDeleteConfirm ] = useState( false );
  const [ moveModalOpen, setMoveModalOpen ] = useState( false );
  const moreMenuRef = useRef<HTMLDivElement>( null );
  const overlayActive = showPlusMenu || isAgentMenuOpen || showMoreMenu;
  const plusMenuRef = useRef<HTMLDivElement>( null );
  const agentMenuRef = useRef<HTMLDivElement>( null );
  const plusButtonRef = useRef<HTMLButtonElement>( null );
  const agentButtonRef = useRef<HTMLButtonElement>( null );
  const messagesEndRef = useRef<HTMLDivElement>( null );
  const mounted = useMounted();

  // Favorites Store
  const { pages, addItemToPage, addPage } = useFavoritesStore();
  const [ activeFavoriteMsgId, setActiveFavoriteMsgId ] = useState<string | null>( null );

  // Chat Store Integration
  const {
    chats,
    getActiveChat,
    addMessage,
    updateMessage,
    updateChat,
    createChat,
    setActiveChat,
    deleteChat,
    activeChatId,
    pinChat,
    archiveChat,
  } = useChatStore();

  // Canvas Parser Integration
  const { processChunk, chatContent, reset: resetCanvasParser, currentArtifactId } = useCanvasParser();
  const { checkAndOpen: checkAutoCanvas } = useAutoCanvasDetector();
  const { handleToolEvent: handleCanvasToolEvent, reset: resetToolHandler } = useToolCallCanvasHandler( activeChatId || undefined );
  const [ streamingMessageId, setStreamingMessageId ] = useState<string | null>( null );
  const [ isEditingCanvas, setIsEditingCanvas ] = useState( false );

  // ── Wave 2.1: Token Smoother for streaming pacing ──
  const { displayedText, feedText, finishStream, reset: resetSmoother } = useTokenSmoother();

  // Sync chatContent to store + feed token smoother
  useEffect( () =>
  {
    if ( streamingMessageId && activeChatId )
    {
      updateMessage( activeChatId, streamingMessageId, { content: chatContent } );
      feedText( chatContent );
    }
  }, [ chatContent, streamingMessageId, activeChatId, updateMessage, feedText ] );

  const { playSound } = useSound();

  // Thinking System State
  const [ selectedChatbotModel, setSelectedChatbotModel ] = useState<ChatbotModel>( 'Gemini 2.5' );
  const [ activeTools, setActiveTools ] = useState<string[]>( [] );
  const [ currentMode, setCurrentMode ] = useState<ChatMode>( "normal chat" );
  const { startSession, addStep, completeSession } = useThinkingStore();

  const shouldShowThinkingForMode = ( mode: ChatMode ) =>
  {
    return mode !== "normal chat";
  };

  const shouldShowReferencesForMode = ( mode: ChatMode ) =>
  {
    return [ "thinking", "deep research", "agent", "cways altra" ].includes( mode );
  };

  const getDefaultReferencesForMode = ( mode: ChatMode ) =>
  {
    if ( !shouldShowReferencesForMode( mode ) ) return [];
    return [];
  };

  // ═══ Unified: map auto ThinkingDepth → visual ThinkingLevel ═══
  const depthToThinkingLevel = ( depth: ThinkingDepth ): ThinkingLevel =>
  {
    switch ( depth )
    {
      case "min": return ThinkingLevel.MINIMAL;
      case "standard": return ThinkingLevel.LOW;
      case "extended": return ThinkingLevel.MEDIUM;
      case "max": return ThinkingLevel.HIGH;
      default: return ThinkingLevel.MEDIUM;
    }
  };

  const getModeThinkingPlan = ( mode: ChatMode, task: string ) =>
  {
    const autoDepth = analyzeQueryComplexity( task, mode );
    const level = depthToThinkingLevel( autoDepth );

    // Normal chat skips visual thinking animation
    if ( mode === "normal chat" )
    {
      return { levels: [ level ], runThinking: false };
    }

    // High-complexity tasks get a two-phase animation (HIGH → MEDIUM)
    if ( level === ThinkingLevel.HIGH && ( mode === "agent" || mode === "coder" || mode === "deep research" ) )
    {
      return { levels: [ ThinkingLevel.HIGH, ThinkingLevel.MEDIUM ], runThinking: true };
    }

    return { levels: [ level ], runThinking: true };
  };

  const openCanvas = useCanvasStore( s => s.openCanvas );
  const closeCanvas = useCanvasStore( s => s.closeCanvas );
  const isCanvasOpen = useCanvasStore( s => s.isOpen );
  const isModeActive = useCanvasStore( s => s.isModeActive );
  const activeModeType = useCanvasStore( s => s.activeModeType );
  const enableMode = useCanvasStore( s => s.enableMode );
  const disableMode = useCanvasStore( s => s.disableMode );
  const openArtifact = useCanvasStore( s => s.openArtifact );

  // استخدم الرسائل من المحادثة النشطة
  const activeChat = useChatStore( state => state.chats.find( c => c.id === state.activeChatId ) ) || null;

  const conversationLink =
    typeof window !== "undefined" && activeChatId
      ? `${ window.location.origin }/chat/${ activeChatId }`
      : activeChatId
        ? `/chat/${ activeChatId }`
        : "";

  // Listen for Canvas inline edit submissions from CanvasInlineEditToolbar
  useEffect( () =>
  {
    const handleInlineEditSubmit = ( event: Event ) =>
    {
      const customEvent = event as CustomEvent<{ prompt: string; text: string }>;
      const { prompt: editPrompt, text: selectedText } = customEvent.detail;

      if ( editPrompt && selectedText && activeChatId )
      {
        handleCanvasEditRequest( activeChatId, editPrompt, selectedText );
      }
    };

    window.addEventListener( 'canvas:inline-edit-submit', handleInlineEditSubmit );
    return () =>
    {
      window.removeEventListener( 'canvas:inline-edit-submit', handleInlineEditSubmit );
    };
  }, [ activeChatId ] );

  useEffect( () =>
  {
    const handleClickOutside = ( event: MouseEvent ) =>
    {
      const target = event.target as Node;

      if ( showPlusMenu && !plusMenuRef.current?.contains( target ) && !plusButtonRef.current?.contains( target ) )
      {
        setShowPlusMenu( false );
      }

      if ( isAgentMenuOpen && !agentMenuRef.current?.contains( target ) && !agentButtonRef.current?.contains( target ) )
      {
        setIsAgentMenuOpen( false );
      }

      if ( isTopMenuOpen && topMenuRef.current && !topMenuRef.current.contains( target ) )
      {
        setIsTopMenuOpen( false );
      }

      if ( showMoreMenu && moreMenuRef.current && !moreMenuRef.current.contains( target ) )
      {
        setShowMoreMenu( false );
      }
    };

    document.addEventListener( "mousedown", handleClickOutside );
    return () => document.removeEventListener( "mousedown", handleClickOutside );
  }, [ showPlusMenu, isAgentMenuOpen, isTopMenuOpen, showMoreMenu ] );

  // Listen to header bar button events (share + more)
  useEffect( () =>
  {
    const onHeaderShare = () =>
    {
      setShareModal( { isOpen: true, text: "شاهد هذه المحادثة على CCCWAYS" } );
    };
    const onHeaderMore = () =>
    {
      setShowMoreMenu( prev => !prev );
    };

    window.addEventListener( "header:share", onHeaderShare );
    window.addEventListener( "header:more", onHeaderMore );
    return () =>
    {
      window.removeEventListener( "header:share", onHeaderShare );
      window.removeEventListener( "header:more", onHeaderMore );
    };
  }, [] );

  // Wave 7.3: Listen for text-selection popover actions
  useEffect( () =>
  {
    const onSelectionAction = ( event: Event ) =>
    {
      const { actionId, selectedText } = ( event as CustomEvent ).detail as { actionId: string; selectedText: string };
      if ( !selectedText ) return;

      const prompts: Record<string, string> = {
        explain: `اشرح لي هذا النص بشكل مبسط:\n\n"${ selectedText }"`,
        translate: `ترجم هذا النص إلى الإنجليزية:\n\n"${ selectedText }"`,
        quote: `> ${ selectedText }`,
        search: `ابحث عن مزيد من المعلومات حول:\n\n"${ selectedText }"`,
      };

      const prompt = prompts[ actionId ];
      if ( prompt )
      {
        if ( actionId === 'quote' )
        {
          navigator.clipboard.writeText( prompt );
          playSound( 'click' );
        } else
        {
          handleSend( prompt );
        }
      }
    };

    window.addEventListener( 'chat:selection-action', onSelectionAction );
    return () => window.removeEventListener( 'chat:selection-action', onSelectionAction );
  }, [] );

  // استخدم الرسائل من المحادثة النشطة (بدون fallback ديمو تلقائي)
  const messages = activeChat?.messages ?? [];

  // Wave 4.3: Auto-scroll is now handled inside VirtualizedMessageList

  const ensureActiveChatId = () =>
  {
    // Read the freshest store state to avoid stale props
    let chatId = useChatStore.getState().activeChatId;
    if ( chatId ) return chatId;

    const newChat = createChat( "محادثة جديدة" );
    setActiveChat( newChat.id );
    return newChat.id;
  };

  const sendUnifiedChatMessage = async ( messageId: string, opts?: { model?: any; mode?: any; thinkingDepth?: ThinkingDepth } ) =>
  {
    try
    {
      const state = useChatStore.getState();
      const chat = state.getActiveChat();
      const model = ( opts?.model ?? 'gemini3 pro' );
      const mode = ( opts?.mode ?? 'normal chat' ) as ChatMode;

      // Build messages with 5-layer system prompt
      const useFC = modelSupportsToolCalling( model );
      const rawMessages = ( chat?.messages ?? [] )
        .filter( ( m: any ) => m?.content && m.content !== '...' )
        .map( ( m: any ) => ( {
          role: m.role,
          content: m.content,
        } ) );

      // Build active canvas context for follow-up awareness
      const canvasState = useCanvasStore.getState();
      const activeCanvasContext = canvasState.isOpen && canvasState.activeArtifactId
        ? `\n\n## Active Canvas Context\nالمستخدم يعمل حالياً على Canvas بعنوان '${ canvasState.title }' من نوع ${ canvasState.type }.
الـ identifier هو: "${ canvasState.activeArtifactId }"
إذا أراد المستخدم تعديل هذا الـ Canvas، استخدم command="update" identifier="${ canvasState.activeArtifactId }".
إذا أراد شيئاً جديداً، استخدم command="create".
المحتوى الحالي:\n\n${ ( canvasState.versions[ canvasState.currentVersionIndex ]?.content || '' ).slice( 0, 4000 ) }`
        : '';

      // Build the full 5-layer system prompt
      // Detect user's language from the last message for dynamic response language
      const lastUserMsg = rawMessages.filter( ( m: { role: string } ) => m.role === 'user' ).pop();
      const userLanguage = detectLanguage( lastUserMsg?.content || '' );

      const systemPrompt = buildSystemPrompt( model, mode, useFC, {
        activeCanvasContext,
        userLanguage,
      } );

      const payloadMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...rawMessages,
      ];

      const response = await fetch( '/api/chat/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify( {
          model,
          mode,
          messages: payloadMessages,
          stream: true,
          ...( opts?.thinkingDepth && { thinkingDepth: opts.thinkingDepth } ),
        } ),
      } );

      if ( !response.ok )
      {
        const errText = await response.text();
        throw new Error( `Chat API failed (${ response.status }): ${ errText }` );
      }

      // B.2: Wave 7.2 — Typed block-event SSE streaming
      const reader = response.body?.getReader();
      if ( reader )
      {
        const decoder = new TextDecoder();
        let sseBuffer = '';

        while ( true )
        {
          const { done, value } = await reader.read();
          if ( done ) break;

          sseBuffer += decoder.decode( value, { stream: true } );
          const lines = sseBuffer.split( '\n' );
          sseBuffer = lines.pop() || '';

          for ( const line of lines )
          {
            if ( line.startsWith( 'data: ' ) )
            {
              const data = line.slice( 6 );
              if ( data === '[DONE]' ) continue;

              try
              {
                const parsed = JSON.parse( data );

                // ── Wave 7.2: typed block-event dispatch ──
                if ( parsed.type && typeof parsed.data === 'object' )
                {
                  switch ( parsed.type )
                  {
                    case 'text_delta':
                      processChunk( parsed.data.content ?? '' );
                      break;
                    case 'thinking_delta':
                      // Thinking content handled by ThinkingDisplay — do not pipe into chat text
                      break;
                    case 'tool_call_start':
                    case 'tool_call_delta':
                    case 'tool_call_end':
                      // Canvas Function Calling — open_canvas tool
                      if ( !handleCanvasToolEvent( parsed ) ) {
                        console.debug( `[SSE] ${ parsed.type }:`, parsed.data );
                      }
                      break;
                    case 'canvas_action':
                      // Canvas commands via block events
                      processChunk( parsed.data.content ?? '' );
                      break;
                    case 'error':
                      console.error( '[SSE] Stream error:', parsed.data.message );
                      processChunk( `⚠️ ${ parsed.data.message }` );
                      break;
                    case 'message_start':
                      break;
                    case 'message_done':
                      // End Canvas streaming if ULTRA_RESEARCH is active
                      {
                        const cs = useCanvasStore.getState();
                        if ( cs.isOpen && cs.type === 'ULTRA_RESEARCH' && cs.isStreaming ) {
                          cs.setIsStreaming( false );
                        }
                      }
                      break;
                  }
                  continue;
                }

                // ── Legacy fallback: raw provider format ──
                const chunkText = parsed?.content ?? parsed?.choices?.[ 0 ]?.delta?.content ?? '';
                if ( chunkText )
                {
                  processChunk( chunkText );
                }
              } catch
              {
                // Non-JSON line — might be raw text, pass it through
                if ( data.trim() )
                {
                  processChunk( data );
                }
              }
            }
          }
        }
      }
      else
      {
        // Fallback: no reader available, read as JSON
        const data: any = await response.json();
        const assistantText = data?.content ?? data?.text ?? data?.message ?? '';
        if ( assistantText )
        {
          processChunk( assistantText );
        } else
        {
          processChunk( 'عذراً، لم يصل نص الرد من المزوّد.' );
        }
      }

        // Auto-canvas fallback: if parser didn't detect XML tags, check thresholds
        setTimeout( () =>
        {
          if ( !currentArtifactId.current )
          {
            // Use chatContent from parser as the full text for auto-detection
            const fullText = chatContent || '';
            const artifactId = checkAutoCanvas( fullText, messageId );
            if ( artifactId && activeChatId )
            {
              updateMessage( activeChatId, messageId, {
                metadata: { canvasArtifactId: artifactId },
              } );
            }
          } else if ( currentArtifactId.current && activeChatId )
          {
            updateMessage( activeChatId, messageId, {
              metadata: { canvasArtifactId: currentArtifactId.current },
            } );
          }
        }, 100 );

    } catch ( error )
    {
      console.error( 'Unified chat error:', error );
      processChunk( '\n\nعذراً، حدث خطأ أثناء الاتصال بالمزوّد. تحقق من إعداد المفاتيح في السيرفر.' );
    } finally
    {
      setStreamingMessageId( null );
      finishStream();
      // Wave 3.1: Final Firestore sync after streaming completes
      if ( activeChatId )
      {
        const finalChat = useChatStore.getState().chats.find( c => c.id === activeChatId );
        if ( finalChat )
        {
          import( "@/lib/services/firestoreChatService" ).then( ( { FirestoreChatService } ) =>
          {
            FirestoreChatService.saveChat( finalChat );
          } );
        }
      }
    }
  };

  const handleSend = ( inputMessage?: string, options?: { ocrContext?: OCRContext, model?: any, mode?: any } ) =>
  {
    const messageToSend = inputMessage || "";
    if ( !messageToSend.trim() ) return;

    // === AUTO DEPTH: compute thinking depth from message complexity ===
    const selectedModeEarly = ( options?.mode as ChatMode ) || "normal chat";
    const autoThinkingDepth = analyzeQueryComplexity( messageToSend.trim(), selectedModeEarly );

    // Disable canvas mode when sending
    if ( isModeActive )
    {
      disableMode();
    }

    // Ensure there is an active chat to write into
    const ensuredChatId = ensureActiveChatId();
    if ( ensuredChatId )
    {
      // Auto-name chat if it's the first message
      const latestChat = useChatStore.getState().getActiveChat();
      if ( latestChat && latestChat.messages.length === 0 )
      {
        const newTitle = messageToSend.trim().slice( 0, 30 );
        updateChat( ensuredChatId, { title: newTitle } );
      }

      // Add OCR system message if context exists
      if ( options?.ocrContext )
      {
        const ocrSystemMessage = createOCRSystemMessage( options.ocrContext );
        addMessage( ensuredChatId, {
          role: "system" as any,
          content: ocrSystemMessage,
        } );
      }

      // Add user message
      addMessage( ensuredChatId, {
        role: "user",
        content: messageToSend.trim(),
      } );

      // === NEW MODE-BASED LOGIC ===
      const selectedMode = ( options?.mode as ChatMode ) || "normal chat";
      setCurrentMode( selectedMode );

      // Add placeholder assistant message
      const assistantMsg = addMessage( ensuredChatId, {
        role: "assistant",
        content: "...",
        metadata: {
          model: options?.model,
          reasoning: selectedMode,
          sources: getDefaultReferencesForMode( selectedMode ),
        },
      } );

      // Reset parser state for this assistant message
      resetCanvasParser();
      resetToolHandler();
      resetSmoother();
      setStreamingMessageId( assistantMsg.id );

      const thinkingPlan = getModeThinkingPlan( selectedMode, messageToSend.trim() );
      const runThinkingSequence = async () =>
      {
        if ( !thinkingPlan.runThinking ) return;

        startSession( assistantMsg.id, selectedChatbotModel, thinkingPlan.levels[ 0 ], messageToSend.trim() );

        for ( let i = 0; i < thinkingPlan.levels.length; i++ )
        {
          const level = thinkingPlan.levels[ i ];
          const isLast = i === thinkingPlan.levels.length - 1;
          await startThinkingStream( assistantMsg.id, messageToSend.trim(), level, {
            skipComplete: !isLast,
            mode: selectedMode,
            depth: autoThinkingDepth,
          } );
        }
      };

      void runThinkingSequence();

      // Handle based on selected mode
      if ( selectedMode === "thinking" )
      {
        // Thinking Mode - عرض خطوات التفكير
        sendUnifiedChatMessage( assistantMsg.id, { model: options?.model, mode: selectedMode, thinkingDepth: autoThinkingDepth } );
      }
      else if ( selectedMode === "deep research" )
      {
        // Deep Research Mode — Canvas-native: النموذج يفتح canvas DEEP_RESEARCH تلقائيًا عبر XML tags
        sendUnifiedChatMessage( assistantMsg.id, { model: options?.model, mode: selectedMode, thinkingDepth: autoThinkingDepth } );
      }
      else if ( selectedMode === "cways altra" )
      {
        // ALTRA Mode - محرك استدلال متقدم — فتح Canvas + تفعيل Streaming
        handleOpenAltra();
        useCanvasStore.getState().setIsStreaming( true );
        sendUnifiedChatMessage( assistantMsg.id, { model: options?.model, mode: selectedMode, thinkingDepth: autoThinkingDepth } );
      }
      else
      {
        // Normal Chat, Agent, Coder modes
        sendUnifiedChatMessage( assistantMsg.id, { model: options?.model, mode: selectedMode, thinkingDepth: autoThinkingDepth } );
      }

      playSound( "click" );
    }

    setShowPlusMenu( false );
    setIsAgentMenuOpen( false );
  };

  // Handle inserting deep research results into chat
  const handleInsertResearch = ( content: string, researchData?: any ) =>
  {
    if ( activeChatId )
    {
      const citations = researchData?.result?.citations || researchData?.citations || [];
      const sources = citations
        .map( ( c: any ) =>
        {
          const title = c?.title || '';
          const url = c?.url || '';
          if ( title && url ) return `${ title } — ${ url }`;
          return title || url;
        } )
        .filter( Boolean );

      // Add research result as assistant message
      addMessage( activeChatId, {
        role: "assistant",
        content: content,
        metadata: {
          reasoning: "deep research",
          sources,
        },
      } );
      playSound( "click" );
    }
  };

  // Handle inserting web search results into chat
  const handleInsertWebSearch = ( content: string, meta?: { sources?: string[] } ) =>
  {
    if ( activeChatId )
    {
      addMessage( activeChatId, {
        role: "assistant",
        content: content,
        metadata: {
          reasoning: "deep research",
          sources: meta?.sources || [],
        },
      } );
      playSound( "click" );
    }
  };

  // Start thinking stream via API — mode-aware
  const startThinkingStream = async ( messageId: string, query: string, level: ThinkingLevel, options?: { skipComplete?: boolean; mode?: string; depth?: string } ) =>
  {
    try
    {
      const response = await fetch( '/api/chat/thinking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify( { messageId, query, level, mode: options?.mode, depth: options?.depth } ),
      } );

      if ( !response.body ) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while ( true )
      {
        const { done, value } = await reader.read();
        if ( done ) break;

        const chunk = decoder.decode( value );
        const lines = chunk.split( '\n' ).filter( line => line.trim().startsWith( 'data:' ) );

        for ( const line of lines )
        {
          const data = JSON.parse( line.replace( 'data: ', '' ) );

          if ( data.type === 'step' && data.data.step )
          {
            const { phase, content, duration } = data.data.step;
            addStep( messageId, phase, content, duration );
          } else if ( data.type === 'complete' )
          {
            if ( !options?.skipComplete )
            {
              completeSession( messageId );
            }
          }
        }
      }
    } catch ( error )
    {
      console.error( 'Thinking stream error:', error );
    }
  };

  // Activate Agent mode
  const handleActivateAgent = ( agentType: AgentType ) =>
  {
    setActiveAgentType( agentType );
    setActiveToolType( null );
    playSound( 'click' );
  };

  // Activate Tool mode (Research/Search)
  const handleActivateTool = ( toolType: ToolType ) =>
  {
    setActiveToolType( toolType );
    setActiveAgentType( null );
    playSound( 'click' );
  };

  // Handle opening Research with search&think mode
  const handleOpenResearch = () =>
  {
    handleActivateTool( ToolType.RESEARCH );
    setIsDeepResearchOpen( true );
  };

  // Handle opening Search with search&think mode
  const handleOpenSearch = () =>
  {
    handleActivateTool( ToolType.SEARCH );
    setIsWebSearchOpen( true );
  };

  // Handle opening ALTRA mode — now routes through Canvas with ULTRA_RESEARCH type
  const handleOpenAltra = () =>
  {
    const canvasState = useCanvasStore.getState();
    const chatId = activeChatId || `chat_${Date.now()}`;
    canvasState.createArtifact({
      title: 'تحليل Altra المتقدم',
      type: 'ULTRA_RESEARCH' as CanvasType,
      language: 'markdown',
      content: '',
      chatId,
    });
  };

  // Toggle Canvas Mode - تفعيل/إيقاف وضع Canvas (Gemini Style)
  const handleToggleCanvasMode = ( type: CanvasType = 'CODE_EDITOR' ) =>
  {
    if ( isModeActive && activeModeType === type )
    {
      disableMode();
    } else
    {
      enableMode( type );
    }
    setShowPlusMenu( false );
    playSound( 'click' );
  };

  // Handle edit request from canvas message
  const handleCanvasEditRequest = async ( messageId: string, editPrompt: string, selectedText?: string ) =>
  {
    if ( !activeChatId ) return;

    setIsEditingCanvas( true );
    const { content, language, id: canvasId, selectedModel } = useCanvasStore.getState();

    try
    {
      const response = await fetch( '/api/canvas/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify( {
          canvasId: canvasId || 'temp',
          currentContent: content,
          selectedText,
          editPrompt,
          model: selectedModel || 'gemini-2.0-flash-exp'
        } )
      } );

      if ( !response.ok ) throw new Error( 'Canvas edit failed' );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let editedContent = '';

      if ( reader )
      {
        while ( true )
        {
          const { done, value } = await reader.read();
          if ( done ) break;

          const chunk = decoder.decode( value, { stream: true } );
          const lines = chunk.split( '\n' );

          for ( const line of lines )
          {
            if ( line.startsWith( 'data: ' ) )
            {
              const data = line.slice( 6 );
              if ( data === '[DONE]' ) continue;

              try
              {
                const parsed = JSON.parse( data );
                if ( parsed.content )
                {
                  editedContent += parsed.content;
                  // Update canvas in real-time
                  useCanvasStore.getState().updateContent( editedContent );
                }
              } catch ( e )
              {
                console.error( 'Failed to parse SSE:', e );
              }
            }
          }
        }
      }

      // Add version to history
      useCanvasStore.getState().addVersion( {
        content: editedContent,
        timestamp: Date.now(),
        version: useCanvasStore.getState().versions.length + 1
      } );

      playSound( 'success' );
    } catch ( error )
    {
      console.error( 'Canvas edit error:', error );
      playSound( 'error' );
    } finally
    {
      setIsEditingCanvas( false );
    }

  };

  // Create new chat
  const _handleCreateChat = () =>
  {
    // Close any open modals
    closeCreateModal();
    closeQuickSwitcher();
    closeSettings();
    setIsTopMenuOpen( false );
    setShowPlusMenu( false );

    const newChat = createChat( "محادثة جديدة" );
    setActiveChat( newChat.id );
    playSound( "click" );
  };

  // Delete current chat
  const _handleDeleteChat = () =>
  {
    if ( !activeChatId ) return;
    deleteChat( activeChatId );
    setActiveChat( null );
    setIsTopMenuOpen( false );
  };

  // Share chat to social media
  const _shareCurrentChat = ( channel: "whatsapp" | "email" | "twitter" | "instagram" ) =>
  {
    if ( !activeChatId || !conversationLink ) return;
    const text = `مشاركة محادثة #${ activeChatId }`;

    const openWindow = ( url: string ) =>
    {
      if ( typeof window !== "undefined" )
      {
        window.open( url, "_blank", "noopener,noreferrer" );
      }
    };

    switch ( channel )
    {
      case "whatsapp":
        openWindow( `https://wa.me/?text=${ encodeURIComponent( `${ text }\n${ conversationLink }` ) }` );
        break;
      case "email":
        openWindow( `mailto:?subject=${ encodeURIComponent( text ) }&body=${ encodeURIComponent( conversationLink ) }` );
        break;
      case "twitter":
        openWindow( `https://twitter.com/intent/tweet?text=${ encodeURIComponent( `${ text } ${ conversationLink }` ) }` );
        break;
      case "instagram":
        openWindow( `https://www.instagram.com/?url=${ encodeURIComponent( conversationLink ) }` );
        break;
      default:
        break;
    }
    setIsTopMenuOpen( false );
  };

  const handleSaveAsImage = async ( messageId: string ) =>
  {
    const element = document.getElementById( `msg-content-${ messageId }` );
    if ( !element ) return;

    try
    {
      const dataUrl = await toPng( element, {
        backgroundColor: '#1a1a1a', // Dark background for better visibility
        style: {
          padding: '20px',
          borderRadius: '12px',
        }
      } );

      const link = document.createElement( 'a' );
      link.download = `cccways-chat-${ messageId.slice( 0, 8 ) }.png`;
      link.href = dataUrl;
      link.click();
      playSound( "click" );
    } catch ( err )
    {
      console.error( 'Failed to save image:', err );
    }
  };

  const handleDeleteMessage = ( messageId: string ) =>
  {
    if ( !activeChatId || !activeChat ) return;
    const newMessages = activeChat.messages.filter( m => m.id !== messageId );
    updateChat( activeChatId, { messages: newMessages } );
    playSound( "click" );
  };

  const handleLengthen = ( content: string ) =>
  {
    handleSend( `أعد كتابة هذا النص بشكل مطول وأكثر تفصيلاً:\n\n"${ content }"` );
  };

  const handleShorten = ( content: string ) =>
  {
    handleSend( `لخص هذا النص واجعله أقصر:\n\n"${ content }"` );
  };

  const handleRegenerate = ( content: string ) =>
  {
    handleSend( `أعد صياغة هذا النص بشكل أفضل:\n\n"${ content }"` );
  };

  const handleReply = ( content: string ) =>
  {
    // For now, we'll just copy to clipboard with a quote, 
    // as full reply integration requires ChatInputBox refactoring
    navigator.clipboard.writeText( `> ${ content }\n\n` );
    playSound( "click" );
  };

  const handleReportSubmit = () =>
  {
    if ( !reportText.trim() || !reportConsent ) return;

    setReportText( "" );
    setReportConsent( false );
    setIsReportOpen( false );
    setIsTopMenuOpen( false );
  };

  const _closeCanvasMenu = () => { };

  if ( !mounted )
  {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 text-lg">Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* More Menu Dropdown — triggered from header */ }
      <AnimatePresence>
        { showMoreMenu && (
          <div
            className="fixed inset-0 z-[60]"
            onClick={ () => setShowMoreMenu( false ) }
          >
            <motion.div
              initial={ { opacity: 0, scale: 0.95, y: -5 } }
              animate={ { opacity: 1, scale: 1, y: 0 } }
              exit={ { opacity: 0, scale: 0.95, y: -5 } }
              transition={ { duration: 0.15 } }
              onClick={ ( e ) => e.stopPropagation() }
              className="fixed left-3 top-[52px] z-[61] overlay-dropdown rounded-xl p-1 min-w-[200px] shadow-2xl"
            >
                  {/* Move to Project */ }
                  <button
                    onClick={ () =>
                    {
                      setMoveModalOpen( true );
                      setShowMoreMenu( false );
                    } }
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] overlay-text overlay-item rounded-lg"
                  >
                    <FolderInput className="w-4 h-4" />
                    <span>نقل إلى مشروع</span>
                  </button>

                  {/* Pin Chat */ }
                  <button
                    onClick={ () =>
                    {
                      if ( activeChatId )
                      {
                        pinChat( activeChatId );
                        playSound( "click" );
                      }
                      setShowMoreMenu( false );
                    } }
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] overlay-text overlay-item rounded-lg"
                  >
                    <Pin className="w-4 h-4" />
                    <span>{ activeChat?.isPinned ? "إلغاء التثبيت" : "تثبيت الدردشة" }</span>
                  </button>

                  {/* Archive */ }
                  <button
                    onClick={ () =>
                    {
                      if ( activeChatId )
                      {
                        archiveChat( activeChatId );
                        setActiveChat( null );
                        playSound( "click" );
                      }
                      setShowMoreMenu( false );
                    } }
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] overlay-text overlay-item rounded-lg"
                  >
                    <Archive className="w-4 h-4" />
                    <span>{ activeChat?.isArchived ? "إلغاء الأرشفة" : "أرشفة" }</span>
                  </button>

                  <div className="overlay-divider h-px my-1 mx-2" />

                  {/* Report */ }
                  <button
                    onClick={ () =>
                    {
                      setIsReportOpen( true );
                      setShowMoreMenu( false );
                    } }
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] overlay-text overlay-item rounded-lg"
                  >
                    <Flag className="w-4 h-4" />
                    <span>إبلاغ</span>
                  </button>

                  {/* Delete */ }
                  <button
                    onClick={ () =>
                    {
                      setShowDeleteConfirm( true );
                      setShowMoreMenu( false );
                    } }
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>حذف</span>
                  </button>
            </motion.div>
          </div>
        ) }
      </AnimatePresence>

      {/* Report dialog - Refined */ }
      <AnimatePresence>
        { isReportOpen && (
          <motion.div
            initial={ { opacity: 0 } }
            animate={ { opacity: 1 } }
            exit={ { opacity: 0 } }
            className="fixed inset-0 z-50 flex items-center justify-center px-4 theme-bg"
          >
            <motion.div
              initial={ { scale: 0.96, opacity: 0, y: 10 } }
              animate={ { scale: 1, opacity: 1, y: 0 } }
              exit={ { scale: 0.96, opacity: 0, y: 10 } }
              transition={ { duration: 0.2 } }
              className="w-full max-w-lg rounded-3xl border border-white/[0.08] shadow-2xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] p-5 space-y-4 theme-card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold">الإبلاغ عن مشكلة</div>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">سيتم إرفاق رابط المحادثة وبيانات حسابك تلقائياً</p>
                </div>
                <button onClick={ () => setIsReportOpen( false ) } className="p-2 rounded-2xl hover:bg-muted/60 dark:hover:bg-white/[0.06] text-muted-foreground hover:text-foreground transition-colors">✕</button>
              </div>

              <div className="text-sm text-muted-foreground">رابط المحادثة: <span className="text-primary break-all">{ conversationLink || "غير متوفر" }</span></div>

              <textarea
                value={ reportText }
                onChange={ ( e ) => setReportText( e.target.value ) }
                rows={ 4 }
                className="w-full rounded-2xl border border-border/50 dark:border-white/[0.08] bg-muted/30 dark:bg-white/[0.03] p-3.5 text-sm leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all resize-none"
                placeholder="اكتب الشكوى بالتفصيل..."
              />

              <label className="flex items-center gap-2.5 text-[13px] text-muted-foreground cursor-pointer select-none">
                <input
                  id="report-consent-checkbox"
                  name="report-consent"
                  type="checkbox"
                  checked={ reportConsent }
                  onChange={ ( e ) => setReportConsent( e.target.checked ) }
                  className="w-4 h-4 rounded border-border accent-primary"
                />
                أوافق على أن يطّلع مسؤول النظام على محتوى المحادثة للتحقق
              </label>

              <div className="flex justify-end gap-2 pt-1">
                <button onClick={ () => setIsReportOpen( false ) } className="btn-professional ghost px-4 py-2.5 rounded-2xl border border-border/50 dark:border-white/[0.08] text-[13px] font-medium hover:bg-muted/60 dark:hover:bg-white/[0.06] transition-colors">إلغاء</button>
                <button
                  onClick={ handleReportSubmit }
                  disabled={ !reportText.trim() || !reportConsent }
                  className={ cn(
                    "btn-professional solid px-5 py-2.5 rounded-2xl text-[13px] font-semibold transition-all",
                    reportText.trim() && reportConsent
                      ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5"
                      : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                  ) }
                >
                  إرسال البلاغ
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) }
      </AnimatePresence>

      {/* Messages Area - Wave 4.3: Virtualized */ }
      <div className={ cn(
        "flex-1 min-h-0",
        "pt-1"
      ) }>
        <VirtualizedMessageList
          messages={ messages }
          currentMode={ currentMode }
          streamingMessageId={ streamingMessageId }
          displayedText={ displayedText }
          isCanvasOpen={ isCanvasOpen }
          activeFavoriteMsgId={ activeFavoriteMsgId }
          setActiveFavoriteMsgId={ setActiveFavoriteMsgId }
          pages={ pages }
          addItemToPage={ addItemToPage }
          addPage={ addPage }
          playSound={ playSound }
          openArtifact={ openArtifact }
          handleLengthen={ handleLengthen }
          handleShorten={ handleShorten }
          handleSaveAsImage={ handleSaveAsImage }
          handleRegenerate={ handleRegenerate }
          handleReply={ handleReply }
          handleDeleteMessage={ handleDeleteMessage }
          setShareModal={ setShareModal }
          shouldShowThinkingForMode={ shouldShowThinkingForMode }
          shouldShowReferencesForMode={ shouldShowReferencesForMode }
        />
      </div>

      {/* Input Area - New ChatInputBox Component */ }
      <div className="input-container mt-auto z-40 shrink-0">
        <ChatInputBox
          onSend={ handleSend }
          onToggleMode={ () => handleToggleCanvasMode( 'CODE_EDITOR' ) }
          onOpenDeepResearch={ handleOpenResearch }
          onOpenWebSearch={ handleOpenSearch }
          onOpenAltra={ handleOpenAltra }
        />
      </div>

      {/* Deep Research Panel */ }
      <DeepResearchPanel
        isOpen={ isDeepResearchOpen }
        onClose={ () =>
        {
          setIsDeepResearchOpen( false );
          if ( activeToolType === ToolType.RESEARCH )
          {
            setActiveToolType( null );
          }
        } }
        onInsertToChat={ handleInsertResearch }
        userId="anonymous"
      />

      {/* Web Search Panel */ }
      <WebSearchPanel
        isOpen={ isWebSearchOpen }
        onClose={ () =>
        {
          setIsWebSearchOpen( false );
          if ( activeToolType === ToolType.SEARCH )
          {
            setActiveToolType( null );
          }
        } }
        onInsertToChat={ handleInsertWebSearch }
      />

      {/* ALTRA now renders through Canvas ULTRA_RESEARCH — AltraPipelineView deprecated */}

      {/* Share Modal */ }
      <ShareModal
        isOpen={ shareModal.isOpen }
        onClose={ () => setShareModal( { ...shareModal, isOpen: false } ) }
        shareText={ shareModal.text }
        shareUrl={ shareModal.url }
      />

      {/* Delete Confirmation Modal */ }
      <ConfirmModal
        isOpen={ showDeleteConfirm }
        onClose={ () => setShowDeleteConfirm( false ) }
        onConfirm={ () =>
        {
          if ( activeChatId )
          {
            deleteChat( activeChatId );
            setActiveChat( null );
            playSound( "click" );
          }
          setShowDeleteConfirm( false );
        } }
        title="حذف المحادثة"
        message="هل أنت متأكد من حذف هذه المحادثة؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="حذف"
        cancelText="إلغاء"
        variant="danger"
      />
    </div>
  );
}

export default ChatArea;
