"use client";

/**
 * ── Wave 4.3: VirtualizedMessageList ──
 * 
 * react-window v2 virtualized message list for chat.
 * Only renders messages that are visible in the viewport (+ overscan).
 * Uses useDynamicRowHeight for auto-measured row heights.
 * 
 * Replaces messages.map() in chat-area.tsx for O(visible) instead of O(n) rendering.
 */

import React, { useEffect, CSSProperties, ReactElement, useCallback, memo } from "react";
import { List, useDynamicRowHeight, useListRef } from "react-window";
import { motion, AnimatePresence } from "framer-motion";
import
{
  Share2,
  Star,
  RefreshCw,
  Trash2,
  Maximize2,
  Minimize2,
  Copy,
  Reply,
  Download,
  Folder,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/store/canvasStore";
import { CanvasEntryChip } from "@/components/canvas/CanvasEntryChip";
import { ThinkingDisplay } from "@/components/thinking";
import { StreamingMarkdown } from "@/components/chat/StreamingMarkdown";
import { ContentBlockRenderer } from "@/components/chat/ContentBlockRenderer";
import { ChatSelectionPopover } from "@/components/chat/ChatSelectionPopover";
import { parseTextToBlocks } from "@/types/contentBlocks";
import type { ChatMessage } from "@/store/chatStore";
import type { ChatMode } from "@/config/modelModeConfig";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface VirtualizedMessageListProps
{
  messages: ChatMessage[];
  currentMode: ChatMode;
  streamingMessageId: string | null;
  displayedText: string;
  isCanvasOpen: boolean;
  activeFavoriteMsgId: string | null;
  setActiveFavoriteMsgId: ( id: string | null ) => void;
  pages: Array<{ id: string; name: string }>;
  addItemToPage: ( pageId: string, content: string, type: string ) => void;
  addPage: ( name: string ) => void;
  playSound: ( name: string ) => void;
  openArtifact: ( id: string ) => void;
  handleLengthen: ( content: string ) => void;
  handleShorten: ( content: string ) => void;
  handleSaveAsImage: ( msgId: string ) => void;
  handleRegenerate: ( content: string ) => void;
  handleReply: ( content: string ) => void;
  handleDeleteMessage: ( msgId: string ) => void;
  setShareModal: ( state: { isOpen: boolean; text: string; url?: string } ) => void;
  shouldShowThinkingForMode: ( mode: ChatMode ) => boolean;
  shouldShowReferencesForMode: ( mode: ChatMode ) => boolean;
}

/** Row props passed through react-window v2's rowProps */
interface MessageRowProps
{
  messages: ChatMessage[];
  currentMode: ChatMode;
  streamingMessageId: string | null;
  displayedText: string;
  isCanvasOpen: boolean;
  activeFavoriteMsgId: string | null;
  setActiveFavoriteMsgId: ( id: string | null ) => void;
  pages: Array<{ id: string; name: string }>;
  addItemToPage: ( pageId: string, content: string, type: string ) => void;
  addPage: ( name: string ) => void;
  playSound: ( name: string ) => void;
  openArtifact: ( id: string ) => void;
  handleLengthen: ( content: string ) => void;
  handleShorten: ( content: string ) => void;
  handleSaveAsImage: ( msgId: string ) => void;
  handleRegenerate: ( content: string ) => void;
  handleReply: ( content: string ) => void;
  handleDeleteMessage: ( msgId: string ) => void;
  setShareModal: ( state: { isOpen: boolean; text: string; url?: string } ) => void;
  shouldShowThinkingForMode: ( mode: ChatMode ) => boolean;
  shouldShowReferencesForMode: ( mode: ChatMode ) => boolean;
}

// ═══════════════════════════════════════════════════════════════
// MessageRow — the row component for react-window v2
// ═══════════════════════════════════════════════════════════════

function MessageRow ( {
  index,
  style,
  messages,
  currentMode,
  streamingMessageId,
  displayedText,
  isCanvasOpen,
  activeFavoriteMsgId,
  setActiveFavoriteMsgId,
  pages,
  addItemToPage,
  addPage,
  playSound,
  openArtifact,
  handleLengthen,
  handleShorten,
  handleSaveAsImage,
  handleRegenerate,
  handleReply,
  handleDeleteMessage,
  setShareModal,
  shouldShowThinkingForMode,
  shouldShowReferencesForMode,
}: {
  index: number;
  style: CSSProperties;
  ariaAttributes: any;
} & MessageRowProps ): ReactElement
{
  const msg = messages[ index ];
  if ( !msg ) return <div style={ style } />;

  const messageMode = ( msg.metadata?.reasoning as ChatMode ) || currentMode;
  const showThinking = msg.role === "assistant" && shouldShowThinkingForMode( messageMode );
  const showReferences = msg.role === "assistant" && shouldShowReferencesForMode( messageMode );
  const showWorking = msg.role === "assistant" && streamingMessageId === msg.id;
  const shouldHideContent = msg.role === "assistant" && showWorking && !msg.content;

  return (
    <div style={ style }>
      <div
        className={ cn(
          "flex gap-4 max-w-3xl mx-auto group py-3 px-5",
          msg.role === "user" ? "flex-row-reverse" : "flex-row"
        ) }
      >
        <div className={ cn( "flex flex-col max-w-[85%]", msg.role === "user" ? "items-end" : "items-start" ) }>
          {/* Thinking Display */ }
          { msg.role === "assistant" && ( showThinking || showWorking ) && (
            <ThinkingDisplay
              messageId={ msg.id }
              className="mb-3"
              showThinking={ showThinking }
              showReferences={ showReferences }
              showWorking={ showWorking }
              references={ msg.metadata?.sources }
              mode={ ( msg.metadata?.reasoning as any ) || currentMode }
            />
          ) }

          {/* Message Content */ }
          { !shouldHideContent && (
            <div
              id={ `msg-content-${ msg.id }` }
              className={ cn(
                "px-5 py-3.5 rounded-3xl text-[15px] leading-relaxed shadow-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-lg whitespace-pre-wrap"
                  : "bg-white/[0.05] backdrop-blur-xl border border-white/[0.1] text-foreground rounded-3xl prose prose-sm prose-invert max-w-none"
              ) }
            >
              { msg.role === "assistant" ? (
                showWorking ? (
                  <StreamingMarkdown
                    content={ displayedText }
                    isStreaming={ true }
                  />
                ) : (
                  <ContentBlockRenderer blocks={ parseTextToBlocks( msg.content ) } />
                )
              ) : (
                msg.content
              ) }
            </div>
          ) }

          {/* Canvas Entry Chip */ }
          { msg.role === "assistant" && msg.metadata?.canvasArtifactId && !isCanvasOpen && ( () =>
          {
            const artifact = useCanvasStore.getState().artifacts.find( a => a.id === msg.metadata?.canvasArtifactId );
            return (
              <CanvasEntryChip
                artifactId={ msg.metadata.canvasArtifactId }
                title={ artifact?.title || "Canvas" }
                type={ artifact?.type || "CODE" }
                createdAt={ artifact?.createdAt || Date.now() }
                onOpen={ openArtifact }
              />
            );
          } )() }

          {/* Actions */ }
          <div className={ cn(
            "flex items-center gap-0.5 mt-2.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
            msg.role === "user" ? "flex-row-reverse" : "flex-row"
          ) }>
            { msg.role === "assistant" && (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={ () => handleLengthen( msg.content ) }
                  className="p-1.5 rounded-lg hover:bg-muted/60 dark:hover:bg-white/[0.06] text-muted-foreground/70 hover:text-primary transition-all"
                  title="نص أطول"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={ () => handleShorten( msg.content ) }
                  className="p-1.5 rounded-lg hover:bg-muted/60 dark:hover:bg-white/[0.06] text-muted-foreground/70 hover:text-primary transition-all"
                  title="نص أقصر"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) }
            { msg.role === "assistant" && (
              <button
                onClick={ () => handleSaveAsImage( msg.id ) }
                className="p-1.5 rounded-lg hover:bg-muted/60 dark:hover:bg-white/[0.06] text-muted-foreground/70 hover:text-foreground transition-all"
                title="حفظ كصورة"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            ) }
            { msg.role === "assistant" && (
              <div className="relative">
                <button
                  onClick={ () => setActiveFavoriteMsgId( activeFavoriteMsgId === msg.id ? null : msg.id ) }
                  className={ cn(
                    "p-1.5 rounded-lg hover:bg-muted/60 dark:hover:bg-white/[0.06] text-muted-foreground/70 hover:text-amber-400 transition-all",
                    activeFavoriteMsgId === msg.id && "text-amber-400 bg-muted/60 dark:bg-white/[0.06]"
                  ) }
                  title="مفضلة"
                >
                  <Star className="w-3.5 h-3.5" />
                </button>

                <AnimatePresence>
                  { activeFavoriteMsgId === msg.id && (
                    <motion.div
                      initial={ { opacity: 0, scale: 0.95, y: 5 } }
                      animate={ { opacity: 1, scale: 1, y: 0 } }
                      exit={ { opacity: 0, scale: 0.95, y: 5 } }
                      className="absolute bottom-full mb-2 left-0 z-50 w-48 p-1 rounded-xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-xl"
                    >
                      <div className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider flex justify-between items-center">
                        <span>إضافة إلى...</span>
                        <button
                          onClick={ () => setActiveFavoriteMsgId( null ) }
                          className="hover:text-foreground transition-colors"
                          aria-label="إغلاق قائمة المفضلة"
                          title="إغلاق قائمة المفضلة"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-0.5">
                        { pages.length === 0 ? (
                          <div className="px-2 py-3 text-center">
                            <p className="text-[10px] text-muted-foreground mb-2">لا توجد قوائم</p>
                            <button
                              onClick={ () => addPage( "مفضلة عامة" ) }
                              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              <span>إنشاء "مفضلة عامة"</span>
                            </button>
                          </div>
                        ) : (
                          pages.map( page => (
                            <button
                              key={ page.id }
                              onClick={ () =>
                              {
                                addItemToPage( page.id, msg.content, "chat" );
                                setActiveFavoriteMsgId( null );
                                playSound( "click" );
                              } }
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-foreground/80 hover:bg-muted hover:text-foreground transition-colors"
                            >
                              <Folder className="w-3 h-3 opacity-50" />
                              <span className="truncate">{ page.name }</span>
                            </button>
                          ) )
                        ) }
                      </div>
                    </motion.div>
                  ) }
                </AnimatePresence>
              </div>
            ) }
            <button className="p-1.5 rounded-lg hover:bg-muted/60 dark:hover:bg-white/[0.06] text-muted-foreground/70 hover:text-foreground transition-all" title="نسخ" onClick={ () => navigator.clipboard.writeText( msg.content ) }>
              <Copy className="w-3.5 h-3.5" />
            </button>
            { msg.role === "assistant" && (
              <button
                onClick={ () => handleRegenerate( msg.content ) }
                className="p-1.5 rounded-lg hover:bg-muted/60 dark:hover:bg-white/[0.06] text-muted-foreground/70 hover:text-foreground transition-all"
                title="إعادة توليد"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            ) }
            { msg.role === "assistant" && (
              <button
                onClick={ () => handleReply( msg.content ) }
                className="p-1.5 rounded-lg hover:bg-muted/60 dark:hover:bg-white/[0.06] text-muted-foreground/70 hover:text-foreground transition-all"
                title="رد"
              >
                <Reply className="w-3.5 h-3.5" />
              </button>
            ) }
            { msg.role === "assistant" && (
              <button
                onClick={ () => setShareModal( { isOpen: true, text: msg.content } ) }
                className="p-1.5 rounded-lg hover:bg-muted/60 dark:hover:bg-white/[0.06] text-muted-foreground/70 hover:text-foreground transition-all"
                title="مشاركة"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            ) }
            <button
              onClick={ () => handleDeleteMessage( msg.id ) }
              className="p-1.5 rounded-lg hover:bg-muted/60 dark:hover:bg-white/[0.06] text-muted-foreground/70 hover:text-destructive transition-all"
              title="حذف"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// VirtualizedMessageList — main component
// ═══════════════════════════════════════════════════════════════

export const VirtualizedMessageList = memo( function VirtualizedMessageList ( props: VirtualizedMessageListProps )
{
  const { messages } = props;

  const listRef = useListRef();

  // Dynamic row heights — auto-measured via ResizeObserver
  const dynamicHeight = useDynamicRowHeight( {
    defaultRowHeight: 120,
    key: messages.length,  // reset measurements when message count changes
  } );

  // Auto-scroll to bottom on new messages or streaming content changes
  useEffect( () =>
  {
    if ( messages.length === 0 ) return;
    // Small delay to let DOM measure, then scroll to last row
    const timer = requestAnimationFrame( () =>
    {
      try
      {
        listRef.current?.scrollToRow( {
          index: messages.length - 1,
          align: "end",
          behavior: "smooth",
        } );
      } catch
      {
        // Ignore range errors during rapid updates
      }
    } );
    return () => cancelAnimationFrame( timer );
  }, [ messages.length, props.displayedText, listRef ] );

  if ( messages.length === 0 )
  {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 text-lg">ابدأ محادثة جديدة...</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full" data-chat-messages>
      <ChatSelectionPopover containerSelector="[data-chat-messages]" />
      <List
        listRef={ listRef }
        rowComponent={ MessageRow }
        rowCount={ messages.length }
        rowHeight={ dynamicHeight }
        rowProps={ {
          messages: props.messages,
          currentMode: props.currentMode,
          streamingMessageId: props.streamingMessageId,
          displayedText: props.displayedText,
          isCanvasOpen: props.isCanvasOpen,
          activeFavoriteMsgId: props.activeFavoriteMsgId,
          setActiveFavoriteMsgId: props.setActiveFavoriteMsgId,
          pages: props.pages,
          addItemToPage: props.addItemToPage,
          addPage: props.addPage,
          playSound: props.playSound,
          openArtifact: props.openArtifact,
          handleLengthen: props.handleLengthen,
          handleShorten: props.handleShorten,
          handleSaveAsImage: props.handleSaveAsImage,
          handleRegenerate: props.handleRegenerate,
          handleReply: props.handleReply,
          handleDeleteMessage: props.handleDeleteMessage,
          setShareModal: props.setShareModal,
          shouldShowThinkingForMode: props.shouldShowThinkingForMode,
          shouldShowReferencesForMode: props.shouldShowReferencesForMode,
        } }
        overscanCount={ 5 }
        className="custom-scrollbar"
        style={ { height: "100%", width: "100%" } }
      />
    </div>
  );
} );

export default VirtualizedMessageList;
