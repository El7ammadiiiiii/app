"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import useTimeout from '@/hooks/useTimeout';
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
const SidebarLeft = dynamic( () => import( "./sidebar-left" ).then( mod => mod.SidebarLeft ), { ssr: false } );
const SidebarRight = dynamic( () => import( "./sidebar-right" ).then( mod => mod.SidebarRight ), { ssr: false } );
import { SettingsView } from "@/components/settings";
import { useMounted } from "@/hooks/use-mounted";
import { TopHeader, HEADER_HEIGHT } from "./top-header";
import { useChatStore } from "@/store/chatStore";

// Layout component for the main application
export type SidebarMode = "expanded" | "rail" | "hidden";

interface AppLayoutProps
{
  children?: React.ReactNode;
}

export function AppLayout ( { children }: AppLayoutProps )
{
  const [ sidebarMode, setSidebarMode ] = useState<SidebarMode>( "expanded" );
  const [ rightSidebarOpen, setRightSidebarOpen ] = useState( true );
  const [ showSettings, setShowSettings ] = useState( false );
  const [ showTransition, setShowTransition ] = useState( false );
  const [ layoutStateRestored, setLayoutStateRestored ] = useState( false );
  // mobile sidebar overlay (only used on mobile/tablet)
  const [ mobileSidebarOpen, setMobileSidebarOpen ] = useState( false );
  const mounted = useMounted();
  const pathname = usePathname();
  const router = useRouter();
  const prevPathnameRef = useRef( pathname );
  const { isMobile, isTablet, isDesktop } = useMediaQuery();
  const { createChat, setActiveChat } = useChatStore();

  const SIDEBAR_MODE_KEY = "layout.sidebar.mode";
  const RIGHT_SIDEBAR_STORAGE_KEY = "layout.sidebar.rightOpen";

  // Restore layout state from localStorage
  useEffect( () =>
  {
    const readStoredBool = ( key: string, fallback: boolean ) =>
    {
      try
      {
        const raw = window.localStorage.getItem( key );
        if ( raw === null ) return fallback;
        return raw === "true" || raw === "1";
      } catch
      {
        return fallback;
      }
    };

    const initLayoutState = () =>
    {
      // Migrate old boolean key to new mode key
      try
      {
        const oldKey = "layout.sidebar.leftOpen";
        const oldVal = window.localStorage.getItem( oldKey );
        const newVal = window.localStorage.getItem( SIDEBAR_MODE_KEY );
        if ( oldVal !== null && newVal === null )
        {
          const mode: SidebarMode = oldVal === "true" || oldVal === "1" ? "expanded" : "rail";
          window.localStorage.setItem( SIDEBAR_MODE_KEY, mode );
          window.localStorage.removeItem( oldKey );
        }
      } catch {}

      // Read sidebar mode
      try
      {
        const stored = window.localStorage.getItem( SIDEBAR_MODE_KEY );
        if ( stored === "expanded" || stored === "rail" )
        {
          setSidebarMode( stored );
        } else
        {
          setSidebarMode( "expanded" );
        }
      } catch
      {
        setSidebarMode( "expanded" );
      }

      setRightSidebarOpen( readStoredBool( RIGHT_SIDEBAR_STORAGE_KEY, !( isMobile || isTablet ) ) );
      setLayoutStateRestored( true );
    };

    initLayoutState();
  }, [] ); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist sidebar mode
  useEffect( () =>
  {
    if ( !layoutStateRestored ) return;
    try { window.localStorage.setItem( SIDEBAR_MODE_KEY, sidebarMode ); } catch {}
  }, [ sidebarMode, layoutStateRestored ] );

  // Persist right sidebar
  useEffect( () =>
  {
    if ( !layoutStateRestored ) return;
    try { window.localStorage.setItem( RIGHT_SIDEBAR_STORAGE_KEY, String( rightSidebarOpen ) ); } catch {}
  }, [ rightSidebarOpen, layoutStateRestored ] );

  // Show quick transition overlay on route changes
  useEffect( () =>
  {
    if ( !mounted ) return;
    if ( prevPathnameRef.current !== pathname )
    {
      setShowTransition( true );
      prevPathnameRef.current = pathname;
    }
  }, [ pathname, mounted ] );

  useTimeout( () => setShowTransition( false ), showTransition ? 420 : undefined, [ showTransition ] );

  // Close mobile sidebar on route change
  useEffect( () =>
  {
    setMobileSidebarOpen( false );
  }, [ pathname ] );

  // Keyboard shortcuts (desktop only)
  useEffect( () =>
  {
    const handler = ( e: KeyboardEvent ) =>
    {
      // Ctrl+Shift+S → toggle sidebar
      if ( e.ctrlKey && e.shiftKey && e.key === "S" )
      {
        e.preventDefault();
        if ( isMobile || isTablet )
        {
          setMobileSidebarOpen( prev => !prev );
        } else
        {
          setSidebarMode( prev => prev === "expanded" ? "rail" : "expanded" );
        }
      }
      // Ctrl+K → focus search
      if ( e.ctrlKey && e.key === "k" )
      {
        e.preventDefault();
        if ( isMobile || isTablet )
        {
          setMobileSidebarOpen( true );
        } else if ( sidebarMode === "rail" )
        {
          setSidebarMode( "expanded" );
        }
        // Focus is handled by sidebar component via ref
        setTimeout( () =>
        {
          document.getElementById( "chat-search-input" )?.focus();
        }, 300 );
      }
    };
    window.addEventListener( "keydown", handler );
    return () => window.removeEventListener( "keydown", handler );
  }, [ isMobile, isTablet, sidebarMode ] );

  // Calculate main content margins
  const getMainContentStyle = useCallback( () =>
  {
    if ( isMobile || isTablet )
    {
      return { marginRight: 0, marginLeft: 0 };
    }
    return {
      marginRight: sidebarMode === "expanded" ? 260 : 68,
      marginLeft: rightSidebarOpen ? 260 : 0,
    };
  }, [ isMobile, isTablet, sidebarMode, rightSidebarOpen ] );

  // Toggle handler for sidebar
  const handleSidebarToggle = useCallback( () =>
  {
    if ( isMobile || isTablet )
    {
      setMobileSidebarOpen( prev => !prev );
    } else
    {
      setSidebarMode( prev => prev === "expanded" ? "rail" : "expanded" );
    }
  }, [ isMobile, isTablet ] );

  // New chat handler (for header button)
  const handleNewChat = useCallback( () =>
  {
    const newChat = createChat( "محادثة جديدة" );
    setActiveChat( newChat.id );
    router.push( "/chat" );
    if ( isMobile || isTablet ) setMobileSidebarOpen( false );
  }, [ createChat, setActiveChat, router, isMobile, isTablet ] );

  return (
    <div className="relative min-h-screen overflow-x-hidden text-foreground">
      {/* Transition overlay (Skeleton + Shimmer) */ }
      <AnimatePresence>
        { showTransition && (
          <motion.div
            key="page-transition"
            initial={ { opacity: 0 } }
            animate={ { opacity: 1 } }
            exit={ { opacity: 0 } }
            transition={ { duration: 0.2 } }
            className="fixed inset-0 z-50 flex items-center justify-center theme-bg"
          >
            <div className="w-full max-w-6xl px-4">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-3 space-y-3 hidden md:block">
                  { [ 1, 2, 3, 4, 5 ].map( ( i ) => (
                    <div key={ i } className="h-10 rounded-xl overflow-hidden bg-gray-600/50 shimmer" />
                  ) ) }
                </div>
                <div className="col-span-12 md:col-span-6 space-y-4">
                  <div className="h-12 rounded-2xl bg-gray-600/50 shimmer" />
                  <div className="h-64 rounded-2xl bg-gray-600/50 shimmer" />
                  <div className="grid grid-cols-3 gap-3">
                    { [ 1, 2, 3 ].map( ( i ) => (
                      <div key={ i } className="h-20 rounded-xl bg-gray-600/50 shimmer" />
                    ) ) }
                  </div>
                </div>
                <div className="col-span-3 space-y-3 hidden md:block">
                  { [ 1, 2, 3, 4 ].map( ( i ) => (
                    <div key={ i } className="h-12 rounded-xl bg-gray-600/50 shimmer" />
                  ) ) }
                </div>
              </div>
            </div>
            <style jsx global>{ `
              .shimmer {
                position: relative;
                overflow: hidden;
                background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.14) 37%, rgba(255,255,255,0.06) 63%);
                background-size: 400% 100%;
                animation: shimmer 1.2s ease-in-out infinite;
              }
              @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
              }
            `}</style>
          </motion.div>
        ) }
      </AnimatePresence>

      {/* ═══ Top Header Bar ═══ */ }
      { mounted && (
        <TopHeader
          sidebarMode={ sidebarMode }
          mobileSidebarOpen={ mobileSidebarOpen }
          onToggleSidebar={ handleSidebarToggle }
          rightSidebarOpen={ rightSidebarOpen }
          onToggleRightSidebar={ () => setRightSidebarOpen( !rightSidebarOpen ) }
          isMobile={ isMobile }
          isTablet={ isTablet }
          pathname={ pathname }
          onNewChat={ handleNewChat }
          showTransition={ showTransition }
        />
      ) }

      {/* Left Sidebar */ }
      <div className={ cn( showTransition && "opacity-0 pointer-events-none" ) }>
        { mounted && (
          <SidebarLeft
            mode={ ( isMobile || isTablet ) ? ( mobileSidebarOpen ? "mobile-open" : "hidden" ) : sidebarMode }
            onModeChange={ ( mode ) =>
            {
              if ( mode === "hidden" )
              {
                setMobileSidebarOpen( false );
              } else if ( mode === "mobile-open" )
              {
                setMobileSidebarOpen( true );
              } else
              {
                setSidebarMode( mode );
              }
            } }
            onToggle={ handleSidebarToggle }
            screenSize={ isMobile ? "mobile" : isTablet ? "tablet" : "desktop" }
            onOpenSettings={ () => setShowSettings( true ) }
          />
        ) }
      </div>

      {/* Right Sidebar */ }
      <div className={ cn( showTransition && "opacity-0 pointer-events-none" ) }>
        { mounted && (
          <SidebarRight
            isOpen={ rightSidebarOpen }
            onToggle={ () => setRightSidebarOpen( !rightSidebarOpen ) }
            isMobile={ isMobile || isTablet }
          />
        ) }
      </div>

      {/* Main Content */ }
      <motion.main
        className={ cn(
          "fixed inset-0 flex flex-col transition-all duration-300 z-30",
          showTransition && "opacity-0 pointer-events-none"
        ) }
        style={ { top: HEADER_HEIGHT } }
        animate={ getMainContentStyle() }
        transition={ { type: "spring", stiffness: 300, damping: 30 } }
      >
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden">
          { children }
        </div>
      </motion.main>

      {/* Settings Modal */ }
      <AnimatePresence>
        { showSettings && (
          <SettingsView onClose={ () => setShowSettings( false ) } />
        ) }
      </AnimatePresence>
    </div>
  );
}
