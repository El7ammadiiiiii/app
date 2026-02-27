"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import useTimeout from '@/hooks/useTimeout';
import { motion, AnimatePresence } from "framer-motion";
import
{
  Star,
  GraduationCap,
  MessageSquare,
  ChevronDown,
  Plus,
  Crown,
  Search,
  Settings,
  LogOut,
  Pin,
  MoreHorizontal,
  Archive,
  Award,
  Trash2,
  Share2,
  Edit3,
  Folder,
  PenLine,
  PanelRightOpen,
  PanelRightClose,
  X,
  FolderPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter, usePathname } from "next/navigation";
import { useChatStore } from "@/store/chatStore";
import { useProjectStore } from "@/store/projectStore";
import { useFavoritesStore } from "@/store/favoritesStore";
import { useSound } from "@/lib/sounds";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { ArchivePanel } from "@/components/archive";
import { ShareModal } from "@/components/share";
import { groupChatsByDate } from "@/lib/chatUtils";
import InfinityLogoSvg from "@/components/ui/InfinityLogoSvg";
import type { SidebarMode } from "./app-layout";
import { HEADER_HEIGHT } from "./top-header";

// Types
interface ShareState
{
  isOpen: boolean;
  id: string;
  title: string;
  type: "chat" | "project";
}

interface SidebarLeftProps
{
  mode: SidebarMode | "mobile-open" | "hidden";
  onModeChange: ( mode: SidebarMode | "mobile-open" | "hidden" ) => void;
  onToggle: () => void;
  screenSize: "mobile" | "tablet" | "desktop";
  onOpenSettings?: () => void;
}

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════
export function SidebarLeft ( { mode, onModeChange, onToggle, screenSize, onOpenSettings }: SidebarLeftProps )
{
  const [ expandedItems, setExpandedItems ] = useState<string[]>( [ "conversations" ] );
  const [ searchQuery, setSearchQuery ] = useState( "" );
  const [ isArchiveOpen, setIsArchiveOpen ] = useState( false );
  const [ openMenuId, setOpenMenuId ] = useState<string | null>( null );
  const [ editingId, setEditingId ] = useState<string | null>( null );
  const [ editingName, setEditingName ] = useState( "" );
  const [ shareModal, setShareModal ] = useState<ShareState>( { isOpen: false, id: "", title: "", type: "chat" } );
  const [ showCreateProject, setShowCreateProject ] = useState( false );
  const sidebarRef = useRef<HTMLDivElement>( null );
  const router = useRouter();
  const pathname = usePathname();
  const { playSound } = useSound();

  // Stores
  const { pages, addPage, removePage } = useFavoritesStore();
  const [ isAddingFavoritePage, setIsAddingFavoritePage ] = useState( false );
  const [ newFavoritePageName, setNewFavoritePageName ] = useState( "" );

  const {
    chats: allChats,
    activeChatId,
    setActiveChat,
    createChat,
    updateChat,
    deleteChat,
    archiveChat,
    pinChat,
  } = useChatStore();

  const { projects } = useProjectStore();

  // Lock body scroll on mobile when sidebar is open
  const isMobileOpen = mode === "mobile-open";
  useBodyScrollLock( isMobileOpen );

  // Swipe to close (mobile only)
  const touchStartX = useRef( 0 );
  const handleTouchStart = ( e: React.TouchEvent ) =>
  {
    touchStartX.current = e.touches[ 0 ].clientX;
  };
  const handleTouchEnd = ( e: React.TouchEvent ) =>
  {
    const deltaX = e.changedTouches[ 0 ].clientX - touchStartX.current;
    // In RTL, swipe right = close (positive deltaX)
    if ( deltaX > 80 )
    {
      onModeChange( "hidden" );
    }
  };

  // Auto-focus new favorite input
  useTimeout( () =>
  {
    document.getElementById( "new-fav-input" )?.focus();
  }, isAddingFavoritePage ? 100 : undefined, [ isAddingFavoritePage ] );

  // Close menu when clicking anywhere
  useEffect( () =>
  {
    if ( !openMenuId ) return;
    const handleClick = () => setOpenMenuId( null );
    document.addEventListener( "click", handleClick );
    return () => document.removeEventListener( "click", handleClick );
  }, [ openMenuId ] );

  const toggleExpand = ( id: string ) =>
  {
    setExpandedItems( prev =>
      prev.includes( id ) ? prev.filter( item => item !== id ) : [ ...prev, id ]
    );
  };

  // Menu actions
  const handleDeleteChat = ( chatId: string ) =>
  {
    deleteChat( chatId );
    setOpenMenuId( null );
    playSound( "click" );
  };

  const handleRenameChat = ( chatId: string, newTitle: string ) =>
  {
    updateChat( chatId, { title: newTitle } );
    setEditingId( null );
    setEditingName( "" );
    playSound( "click" );
  };

  const handleArchiveChat = ( chatId: string ) =>
  {
    archiveChat( chatId );
    setOpenMenuId( null );
    playSound( "click" );
  };

  const handleShare = ( id: string, title: string, type: "chat" | "project" ) =>
  {
    setShareModal( { isOpen: true, id, title, type } );
    setOpenMenuId( null );
    playSound( "click" );
  };

  const handleNewChat = useCallback( () =>
  {
    setIsArchiveOpen( false );
    const newChat = createChat( "محادثة جديدة" );
    setActiveChat( newChat.id );
    if ( screenSize !== "desktop" ) onModeChange( "hidden" );
    playSound( "click" );
  }, [ createChat, setActiveChat, screenSize, onModeChange, playSound ] );

  // Keyboard shortcut: Ctrl+Shift+O for new chat
  useEffect( () =>
  {
    const handler = ( e: KeyboardEvent ) =>
    {
      if ( e.ctrlKey && e.shiftKey && e.key === "O" )
      {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener( "keydown", handler );
    return () => window.removeEventListener( "keydown", handler );
  }, [ handleNewChat ] );

  // Chat groups
  const filteredChats = allChats.filter( chat =>
    !chat.isArchived &&
    ( !searchQuery || chat.title.toLowerCase().includes( searchQuery.toLowerCase() ) )
  );
  const chatGroups = groupChatsByDate( filteredChats );

  const isExpanded = mode === "expanded" || mode === "mobile-open";
  const isRail = mode === "rail";

  // Hidden — render nothing
  if ( mode === "hidden" ) return (
    <>
      <ArchivePanel isOpen={ isArchiveOpen } onClose={ () => setIsArchiveOpen( false ) } userId="anonymous" />
      <ShareModal
        isOpen={ shareModal.isOpen }
        onClose={ () => setShareModal( { isOpen: false, id: "", title: "", type: "chat" } ) }
        title={ shareModal.type === "chat" ? "مشاركة المحادثة" : "مشاركة المشروع" }
        shareUrl={ `https://ccways.com/share/${ shareModal.type }/${ shareModal.id }` }
        shareText={ shareModal.title }
        type={ shareModal.type }
      />
    </>
  );

  // ─────────────────────────── RAIL MODE (68px, desktop only) ───────────────────────────
  if ( isRail )
  {
    return (
      <>
        <aside
          className="fixed right-0 z-50 flex flex-col items-center py-3 gap-1
                     bg-[#264a46] border-l border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.3)]"
          style={ { width: 68, top: HEADER_HEIGHT, height: `calc(100vh - ${HEADER_HEIGHT}px)` } }
        >
          {/* Logo */ }
          <div className="w-10 h-10 rounded-xl bg-[#1a3633] 
                         flex items-center justify-center shadow-lg mb-1
                         select-none cursor-default">
            <InfinityLogoSvg size={ 28 } />
          </div>

          <div className="w-6 h-px bg-white/10 my-1" />

          {/* New chat */ }
          <button
            onClick={ handleNewChat }
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white/60 hover:text-white 
                       hover:bg-white/[0.08] transition-colors touch-target"
            title="دردشة جديدة (Ctrl+Shift+O)"
          >
            <PenLine className="w-[18px] h-[18px]" />
          </button>

          {/* Search */ }
          <button
            onClick={ () =>
            {
              onModeChange( "expanded" );
              setTimeout( () => document.getElementById( "chat-search-input" )?.focus(), 300 );
            } }
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white/60 hover:text-white 
                       hover:bg-white/[0.08] transition-colors touch-target"
            title="البحث (Ctrl+K)"
          >
            <Search className="w-[18px] h-[18px]" />
          </button>

          {/* Spacer */ }
          <div className="flex-1" />

          {/* Settings */ }
          <button
            onClick={ onOpenSettings }
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white 
                       hover:bg-white/[0.08] transition-colors touch-target"
            title="الإعدادات"
          >
            <Settings className="w-[18px] h-[18px]" />
          </button>

          {/* Avatar */ }
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 
                         flex items-center justify-center text-white text-sm font-bold shadow-lg 
                         shadow-emerald-500/25 ring-2 ring-white/10 cursor-pointer mb-1"
            title="Ahmed Ali"
          >
            A
          </div>
        </aside>

        <ArchivePanel isOpen={ isArchiveOpen } onClose={ () => setIsArchiveOpen( false ) } userId="anonymous" />
        <ShareModal
          isOpen={ shareModal.isOpen }
          onClose={ () => setShareModal( { isOpen: false, id: "", title: "", type: "chat" } ) }
          title={ shareModal.type === "chat" ? "مشاركة المحادثة" : "مشاركة المشروع" }
          shareUrl={ `https://ccways.com/share/${ shareModal.type }/${ shareModal.id }` }
          shareText={ shareModal.title }
          type={ shareModal.type }
        />
      </>
    );
  }

  // ─────────────────────── EXPANDED / MOBILE-OPEN MODE ───────────────────────
  return (
    <>
      {/* Mobile Overlay Backdrop */ }
      <AnimatePresence>
        { isMobileOpen && (
          <motion.div
            initial={ { opacity: 0 } }
            animate={ { opacity: 1 } }
            exit={ { opacity: 0 } }
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={ () => onModeChange( "hidden" ) }
          />
        ) }
      </AnimatePresence>

      {/* Sidebar */ }
      <motion.aside
        ref={ sidebarRef }
        initial={ false }
        style={ isMobileOpen ? undefined : { top: HEADER_HEIGHT, height: `calc(100vh - ${HEADER_HEIGHT}px)` } }
        animate={ {
          width: isMobileOpen ? Math.min( window.innerWidth * 0.85, 320 ) : 260,
          x: 0,
          opacity: 1,
        } }
        transition={ { type: "spring", stiffness: 400, damping: 35 } }
        onTouchStart={ isMobileOpen ? handleTouchStart : undefined }
        onTouchEnd={ isMobileOpen ? handleTouchEnd : undefined }
        className={ cn(
          "fixed right-0 z-50 flex flex-col",
          "bg-[#264a46] border-l border-white/10",
          "shadow-[0_0_60px_rgba(0,0,0,0.5)]",
          isMobileOpen ? "top-0 h-full safe-top" : ""
        ) }
      >
        {/* ═════ Header ═════ */ }
        <div className="px-3 pt-3 pb-2 flex items-center gap-2">
          {/* Collapse / Close button */ }
          <button
            onClick={ () =>
            {
              if ( isMobileOpen ) onModeChange( "hidden" );
              else onModeChange( "rail" );
            } }
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/60 hover:text-white 
                       hover:bg-white/[0.08] transition-colors touch-target shrink-0"
            title={ isMobileOpen ? "إغلاق" : "طي القائمة" }
          >
            { isMobileOpen ? <X className="w-5 h-5" /> : <PanelRightClose className="w-5 h-5" /> }
          </button>

          {/* Animated Logo */ }
          <div className="flex items-center select-none">
            <InfinityLogoSvg size={ 32 } className="animate-pulse-glow" />
          </div>

          <div className="flex-1" />

          {/* New chat */ }
          <button
            onClick={ handleNewChat }
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/60 hover:text-white 
                       hover:bg-white/[0.08] transition-colors touch-target"
            title="دردشة جديدة (Ctrl+Shift+O)"
          >
            <PenLine className="w-[18px] h-[18px]" />
          </button>
        </div>

        <div className="mx-3 h-px bg-white/10" />

        {/* ═════ Search ═════ */ }
        <div className="px-3 py-2">
          <div className="relative group">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              id="chat-search-input"
              name="chat-search"
              type="text"
              placeholder="البحث... (Ctrl+K)"
              aria-label="البحث في الدردشات"
              value={ searchQuery }
              onChange={ ( e ) => setSearchQuery( e.target.value ) }
              className="w-full pl-3 pr-9 py-2 rounded-lg 
                       bg-white/5 border border-white/10
                       text-sm text-white/90
                       focus:outline-none focus:border-white/20
                       placeholder:text-white/40 
                       transition-all"
            />
          </div>
        </div>

        {/* ═════ Navigation Sections ═════ */ }
        <div className="flex-1 overflow-y-auto py-2 px-3 space-y-3 custom-scrollbar">

          {/* ─── محادثة جديدة Quick Link ─── */ }
          <button
            onClick={ () => { handleNewChat(); if ( isMobileOpen ) onModeChange( "hidden" ); } }
            className="w-full flex items-center gap-2.5 py-2 px-3 rounded-lg text-sm text-white/80 hover:bg-white/[0.06] transition-colors"
          >
            <PenLine className="w-[18px] h-[18px] opacity-60" />
            <span className="font-medium">محادثة جديدة</span>
          </button>

          <div className="h-px bg-white/10" />

          {/* ─── المشروعات ─── */ }
          <div>
            <div className="flex items-center group/proj">
              <button
                onClick={ () => toggleExpand( "projects" ) }
                className="flex-1 flex items-center gap-2.5 py-2 px-3 rounded-lg text-sm text-white/60 hover:bg-white/[0.04] hover:text-white/80 transition-colors"
              >
                <Folder className="w-4 h-4 opacity-50" />
                <span className="font-medium">المشروعات</span>
                <ChevronDown className={ cn(
                  "w-3.5 h-3.5 mr-auto transition-transform duration-200",
                  expandedItems.includes( "projects" ) && "rotate-180"
                ) } />
              </button>
              <button
                onClick={ ( e ) =>
                {
                  e.stopPropagation();
                  setShowCreateProject( true );
                } }
                className="p-1.5 rounded-lg text-white/30 hover:text-white/80 hover:bg-white/[0.06] 
                           opacity-0 group-hover/proj:opacity-100 transition-all touch-target"
                title="مشروع جديد"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>

            <AnimatePresence>
              { expandedItems.includes( "projects" ) && (
                <motion.div
                  initial={ { opacity: 0, height: 0 } }
                  animate={ { opacity: 1, height: "auto" } }
                  exit={ { opacity: 0, height: 0 } }
                  className="overflow-hidden mr-4 space-y-0.5"
                >
                  { projects.filter( p => !p.isArchived ).length === 0 ? (
                    <div className="text-center py-2 text-white/30 text-xs">
                      لا توجد مشروعات
                    </div>
                  ) : (
                    projects.filter( p => !p.isArchived ).map( ( project ) => (
                      <button
                        key={ project.id }
                        onClick={ () =>
                        {
                          // Select project to filter chats
                          useProjectStore.getState().setActiveProject( project.id );
                          if ( isMobileOpen ) onModeChange( "hidden" );
                        } }
                        className={ cn(
                          "w-full flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-sm transition-colors",
                          useProjectStore.getState().activeProjectId === project.id
                            ? "bg-white/10 text-white/90"
                            : "text-white/60 hover:bg-white/[0.04] hover:text-white/80"
                        ) }
                      >
                        <span>{ project.emoji }</span>
                        <span className="truncate flex-1">{ project.name }</span>
                        <span className="text-[10px] text-white/30">{ project.chatIds.length }</span>
                      </button>
                    ) )
                  ) }
                  <button
                    onClick={ () => setShowCreateProject( true ) }
                    className="w-full flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-xs text-white/40 
                               hover:bg-white/[0.04] hover:text-white/60 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>مشروع جديد</span>
                  </button>
                </motion.div>
              ) }
            </AnimatePresence>
          </div>

          <div className="h-px bg-white/10" />

          {/* ─── المفضلة ─── */ }
          <div>
            <div className="flex items-center group/fav">
              <button
                onClick={ () => toggleExpand( "favorites" ) }
                className="flex-1 flex items-center gap-2.5 py-2 px-3 rounded-lg text-sm text-white/60 hover:bg-white/[0.04] hover:text-white/80 transition-colors"
              >
                <Star className="w-4 h-4 opacity-50" />
                <span className="font-medium">المفضلة</span>
                <ChevronDown className={ cn(
                  "w-3.5 h-3.5 mr-auto transition-transform duration-200",
                  expandedItems.includes( "favorites" ) && "rotate-180"
                ) } />
              </button>
              <button
                onClick={ ( e ) =>
                {
                  e.stopPropagation();
                  if ( !expandedItems.includes( "favorites" ) ) toggleExpand( "favorites" );
                  setIsAddingFavoritePage( true );
                } }
                className="p-1.5 rounded-lg text-white/30 hover:text-white/80 hover:bg-white/[0.06] 
                           opacity-0 group-hover/fav:opacity-100 transition-all"
                title="إضافة صفحة مفضلة"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <AnimatePresence>
              { expandedItems.includes( "favorites" ) && (
                <motion.div
                  initial={ { opacity: 0, height: 0 } }
                  animate={ { opacity: 1, height: "auto" } }
                  exit={ { opacity: 0, height: 0 } }
                  className="overflow-hidden mr-4 space-y-0.5"
                >
                  { isAddingFavoritePage && (
                    <div className="px-2 py-1">
                      <input
                        id="new-fav-input"
                        type="text"
                        value={ newFavoritePageName }
                        onChange={ ( e ) => setNewFavoritePageName( e.target.value ) }
                        onKeyDown={ ( e ) =>
                        {
                          if ( e.key === "Enter" && newFavoritePageName.trim() )
                          {
                            addPage( newFavoritePageName.trim() );
                            setNewFavoritePageName( "" );
                            setIsAddingFavoritePage( false );
                            playSound( "click" );
                          } else if ( e.key === "Escape" )
                          {
                            setIsAddingFavoritePage( false );
                            setNewFavoritePageName( "" );
                          }
                        } }
                        onBlur={ () =>
                        {
                          if ( newFavoritePageName.trim() )
                          {
                            addPage( newFavoritePageName.trim() );
                            playSound( "click" );
                          }
                          setNewFavoritePageName( "" );
                          setIsAddingFavoritePage( false );
                        } }
                        placeholder="اسم الصفحة..."
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/80 focus:outline-none focus:border-white/20"
                      />
                    </div>
                  ) }

                  { pages.length === 0 && !isAddingFavoritePage ? (
                    <div className="text-center py-2 text-white/30 text-xs">
                      لا توجد صفحات مفضلة
                    </div>
                  ) : (
                    pages.map( ( page ) => (
                      <div key={ page.id } className="group relative">
                        <button
                          onClick={ () =>
                          {
                            router.push( `/favorites/${ page.id }` );
                            if ( isMobileOpen ) onModeChange( "hidden" );
                          } }
                          className={ cn(
                            "w-full flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-sm transition-colors",
                            pathname === `/favorites/${ page.id }`
                              ? "bg-white/10 text-white/90 font-medium"
                              : "text-white/60 hover:bg-white/[0.04] hover:text-white/80"
                          ) }
                        >
                          <Folder className={ cn( "w-3.5 h-3.5", pathname === `/favorites/${ page.id }` ? "opacity-100" : "opacity-60" ) } />
                          <span className="truncate">{ page.name }</span>
                          <span className="mr-auto text-[10px] opacity-40">{ page.items.length }</span>
                        </button>
                        <button
                          onClick={ ( e ) =>
                          {
                            e.stopPropagation();
                            if ( confirm( "هل أنت متأكد من حذف هذه الصفحة؟" ) )
                            {
                              removePage( page.id );
                            }
                          } }
                          className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded-md text-white/20 hover:text-red-400 hover:bg-red-500/10 
                                     opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) )
                  ) }
                </motion.div>
              ) }
            </AnimatePresence>
          </div>

          <div className="h-px bg-white/10" />

          {/* ─── معهد CCWAYS ─── */ }
          <div>
            <button
              onClick={ () => toggleExpand( "CCWAYS-institute" ) }
              className="w-full flex items-center gap-2.5 py-2 px-3 rounded-lg text-sm text-white/60 hover:bg-white/[0.04] hover:text-white/80 transition-colors"
            >
              <GraduationCap className="w-4 h-4 opacity-60" />
              <span>معهد CCWAYS</span>
              <ChevronDown className={ cn(
                "w-3.5 h-3.5 mr-auto transition-transform",
                expandedItems.includes( "CCWAYS-institute" ) && "rotate-180"
              ) } />
            </button>

            <AnimatePresence>
              { expandedItems.includes( "CCWAYS-institute" ) && (
                <motion.div
                  initial={ { opacity: 0, height: 0 } }
                  animate={ { opacity: 1, height: "auto" } }
                  exit={ { opacity: 0, height: 0 } }
                  className="overflow-hidden mr-4 space-y-0.5"
                >
                  <button className="w-full flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-sm text-white/60 hover:bg-white/[0.04] hover:text-white/80 transition-colors">
                    <Award className="w-3.5 h-3.5 opacity-60" />
                    <span>شهاداتي</span>
                  </button>
                  <button
                    onClick={ () => toggleExpand( "institute-chats" ) }
                    className="w-full flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-sm text-white/60 hover:bg-white/[0.04] hover:text-white/80 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5 opacity-60" />
                    <span>محادثات المعهد</span>
                    <ChevronDown className={ cn( "w-3 h-3 mr-auto transition-transform", expandedItems.includes( "institute-chats" ) && "rotate-180" ) } />
                  </button>
                  <AnimatePresence>
                    { expandedItems.includes( "institute-chats" ) && (
                      <motion.div
                        initial={ { opacity: 0, height: 0 } }
                        animate={ { opacity: 1, height: "auto" } }
                        exit={ { opacity: 0, height: 0 } }
                        className="overflow-hidden mr-4 space-y-0.5"
                      >
                        <div className="text-center py-2 text-white/30 text-xs">لا توجد محادثات بعد</div>
                      </motion.div>
                    ) }
                  </AnimatePresence>
                </motion.div>
              ) }
            </AnimatePresence>
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* ─── دردشاتك — Grouped by Date ─── */ }
          <div>
            <div className="flex items-center justify-between py-1 mb-1 px-3">
              <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">دردشاتك</span>
              <button
                onClick={ () => setIsArchiveOpen( true ) }
                className="p-1 rounded-md text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
                title="الأرشيف"
              >
                <Archive className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3">
              { chatGroups.length === 0 ? (
                <div className="text-center py-3 text-white/30">
                  <p className="text-xs">لا توجد محادثات بعد</p>
                </div>
              ) : (
                chatGroups.map( ( group ) => (
                  <div key={ group.label }>
                    <div className="px-3 py-1">
                      <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">{ group.label }</span>
                    </div>
                    <div className="space-y-0.5">
                      { group.chats.slice( 0, 30 ).map( ( chat ) => (
                        <div key={ chat.id } className="relative group">
                          { editingId === `chat-${ chat.id }` ? (
                            <div className="flex items-center gap-2 py-2 px-3">
                              <input
                                type="text"
                                value={ editingName }
                                onChange={ ( e ) => setEditingName( e.target.value ) }
                                onKeyDown={ ( e ) =>
                                {
                                  if ( e.key === "Enter" ) handleRenameChat( chat.id, editingName );
                                  if ( e.key === "Escape" ) { setEditingId( null ); setEditingName( "" ); }
                                } }
                                onBlur={ () => handleRenameChat( chat.id, editingName ) }
                                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2.5 py-1 text-sm text-white/90 focus:outline-none"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div className="flex items-center w-full">
                              <div
                                onClick={ () =>
                                {
                                  setActiveChat( chat.id );
                                  if ( isMobileOpen ) onModeChange( "hidden" );
                                } }
                                className={ cn(
                                  "flex-1 flex items-center gap-2 py-2 px-3 rounded-lg text-sm transition-colors text-right cursor-pointer",
                                  activeChatId === chat.id
                                    ? "bg-white/10 text-white/90"
                                    : "text-white/60 hover:bg-white/[0.04] hover:text-white/80"
                                ) }
                              >
                                { chat.isPinned && <span className="text-xs">📌</span> }
                                <span className="truncate flex-1">{ chat.title }</span>
                              </div>
                              <button
                                type="button"
                                onClick={ ( e ) =>
                                {
                                  e.stopPropagation();
                                  setOpenMenuId( openMenuId === `chat-${ chat.id }` ? null : `chat-${ chat.id }` );
                                } }
                                className={ cn(
                                  "p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/80 transition-all touch-target",
                                  screenSize === "desktop" ? "opacity-0 group-hover:opacity-100" : "opacity-100"
                                ) }
                                aria-label="خيارات المحادثة"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </div>
                          ) }

                          {/* Context menu */ }
                          <AnimatePresence>
                            { openMenuId === `chat-${ chat.id }` && (
                              <motion.div
                                initial={ { opacity: 0, scale: 0.96, y: -4 } }
                                animate={ { opacity: 1, scale: 1, y: 0 } }
                                exit={ { opacity: 0, scale: 0.96, y: -4 } }
                                transition={ { duration: 0.15 } }
                                className="absolute left-0 top-full mt-1.5 z-50 overlay-dropdown rounded-xl p-1 min-w-[160px]"
                              >
                                <button
                                  onClick={ () => { pinChat( chat.id ); setOpenMenuId( null ); playSound( "click" ); } }
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm overlay-text overlay-item rounded-lg"
                                >
                                  <Pin className="w-3.5 h-3.5" />
                                  <span>{ chat.isPinned ? "إلغاء التثبيت" : "تثبيت" }</span>
                                </button>
                                <button
                                  onClick={ () => handleArchiveChat( chat.id ) }
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm overlay-text overlay-item rounded-lg"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                  <span>أرشفة</span>
                                </button>
                                <button
                                  onClick={ () => { setEditingId( `chat-${ chat.id }` ); setEditingName( chat.title ); setOpenMenuId( null ); } }
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm overlay-text overlay-item rounded-lg"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>إعادة التسمية</span>
                                </button>
                                <button
                                  onClick={ () => handleShare( chat.id, chat.title, "chat" ) }
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm overlay-text overlay-item rounded-lg"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                  <span>المشاركة</span>
                                </button>
                                <div className="overlay-divider h-px my-1" />
                                <button
                                  onClick={ () => handleDeleteChat( chat.id ) }
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>الحذف</span>
                                </button>
                              </motion.div>
                            ) }
                          </AnimatePresence>
                        </div>
                      ) ) }
                    </div>
                  </div>
                ) )
              ) }
            </div>
          </div>

        </div>

        {/* ═════ Footer ═════ */ }
        <div className="p-3 border-t border-white/[0.06] safe-bottom">
          <div className="flex items-center gap-3">
            {/* Avatar */ }
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 
                           flex items-center justify-center text-white text-sm font-bold shadow-lg 
                           shadow-emerald-500/25 ring-2 ring-white/10 shrink-0">
              A
            </div>
            {/* Name */ }
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white/90 truncate">Ahmed Ali</span>
                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              </div>
              <span className="text-[11px] text-white/40 truncate block">ahmed@ccways.com</span>
            </div>
            {/* Settings */ }
            <button
              onClick={ onOpenSettings }
              className="p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors touch-target shrink-0"
              title="الإعدادات"
            >
              <Settings className="w-4 h-4" />
            </button>
            {/* Logout */ }
            <button
              className="p-2 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors touch-target shrink-0"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Archive Panel */ }
      <ArchivePanel
        isOpen={ isArchiveOpen }
        onClose={ () => setIsArchiveOpen( false ) }
        userId="anonymous"
      />

      {/* Share Modal */ }
      <ShareModal
        isOpen={ shareModal.isOpen }
        onClose={ () => setShareModal( { isOpen: false, id: "", title: "", type: "chat" } ) }
        title={ shareModal.type === "chat" ? "مشاركة المحادثة" : "مشاركة المشروع" }
        shareUrl={ `https://ccways.com/share/${ shareModal.type }/${ shareModal.id }` }
        shareText={ shareModal.title }
        type={ shareModal.type }
      />

      {/* Create Project Modal (lazy) */ }
      { showCreateProject && (
        <CreateProjectInline onClose={ () => setShowCreateProject( false ) } />
      ) }
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// Inline Create Project Modal (lightweight, no separate file needed initially)
// ═══════════════════════════════════════════════════════════════
function CreateProjectInline ( { onClose }: { onClose: () => void } )
{
  const [ name, setName ] = useState( "" );
  const [ emoji, setEmoji ] = useState( "📁" );
  const [ color, setColor ] = useState( "#264a46" );
  const [ instructions, setInstructions ] = useState( "" );
  const { createProject } = useProjectStore();
  const { playSound } = useSound();

  const colors = [ "#264a46", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f97316" ];
  const emojis = [ "📁", "🚀", "💡", "📊", "🎯", "🔬", "📝", "⚡" ];

  const handleCreate = () =>
  {
    if ( !name.trim() ) return;
    createProject( name.trim(), emoji, color, instructions.trim() );
    playSound( "click" );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={ onClose } />
      <motion.div
        initial={ { opacity: 0, scale: 0.95 } }
        animate={ { opacity: 1, scale: 1 } }
        exit={ { opacity: 0, scale: 0.95 } }
        className="relative w-full max-w-lg rounded-2xl bg-[#1d2b28] border border-white/10 shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto safe-bottom"
      >
        {/* Header */ }
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-lg font-bold text-white/90">إنشاء مشروع</h2>
          <button onClick={ onClose } className="p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors touch-target">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */ }
        <div className="px-6 py-4 space-y-4">
          {/* Emoji + Color */ }
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              { emojis.slice( 0, 8 ).map( ( e ) => (
                <button
                  key={ e }
                  onClick={ () => setEmoji( e ) }
                  className={ cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all touch-target",
                    emoji === e ? "bg-white/15 ring-2 ring-white/20" : "hover:bg-white/[0.06]"
                  ) }
                >
                  { e }
                </button>
              ) ) }
            </div>
          </div>

          {/* Color selector */ }
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">اللون:</span>
            { colors.map( ( c ) => (
              <button
                key={ c }
                onClick={ () => setColor( c ) }
                className={ cn(
                  "w-7 h-7 rounded-full transition-all touch-target",
                  color === c ? "ring-2 ring-white/40 ring-offset-2 ring-offset-[#1d2b28]" : "hover:scale-110"
                ) }
                style={ { backgroundColor: c } }
              />
            ) ) }
          </div>

          {/* Name input */ }
          <div>
            <label className="block text-xs text-white/40 mb-1.5">اسم المشروع</label>
            <input
              type="text"
              value={ name }
              onChange={ ( e ) => setName( e.target.value ) }
              onKeyDown={ ( e ) => e.key === "Enter" && handleCreate() }
              placeholder="مثال: تحليل البيتكوين"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/90 
                         placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors"
              autoFocus
            />
          </div>

          {/* Instructions */ }
          <div>
            <label className="block text-xs text-white/40 mb-1.5">تعليمات المشروع (اختياري)</label>
            <textarea
              value={ instructions }
              onChange={ ( e ) => setInstructions( e.target.value ) }
              placeholder="أخبر CCWAYS عن مشروعك..."
              rows={ 3 }
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/90 
                         placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer */ }
        <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
          <button
            onClick={ onClose }
            className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={ handleCreate }
            disabled={ !name.trim() }
            className="px-5 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-teal-600 to-teal-700 
                       text-white hover:from-teal-500 hover:to-teal-600 transition-all
                       disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-teal-900/30"
          >
            إنشاء مشروع
          </button>
        </div>
      </motion.div>
    </div>
  );
}
