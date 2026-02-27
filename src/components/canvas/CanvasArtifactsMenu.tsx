"use client";

import { useState, useRef, useEffect, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Code2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvasStore, type CanvasArtifact, type CanvasType, CANVAS_TYPE_META } from "@/store/canvasStore";
import { getCanvasIcon } from "./canvasIcons";

interface CanvasArtifactsMenuProps
{
  chatId: string | null;
}

/**
 * ChatGPT-style dropdown in the header showing all canvas artifacts for the current chat.
 * Only renders the trigger button when artifacts exist.
 */
export const CanvasArtifactsMenu = memo( function CanvasArtifactsMenu ( {
  chatId,
}: CanvasArtifactsMenuProps )
{
  const [ isOpen, setIsOpen ] = useState( false );
  const menuRef = useRef<HTMLDivElement>( null );

  const allArtifacts = useCanvasStore( state => state.artifacts );
  const artifacts = useMemo( () =>
    chatId ? allArtifacts.filter( a => a.chatId === chatId ) : [],
    [ allArtifacts, chatId ]
  );

  const openArtifact = useCanvasStore( state => state.openArtifact );

  // Close on click outside
  useEffect( () =>
  {
    if ( !isOpen ) return;
    const handleClick = ( e: MouseEvent ) =>
    {
      if ( menuRef.current && !menuRef.current.contains( e.target as Node ) )
      {
        setIsOpen( false );
      }
    };
    document.addEventListener( "mousedown", handleClick );
    return () => document.removeEventListener( "mousedown", handleClick );
  }, [ isOpen ] );

  // Close on Escape
  useEffect( () =>
  {
    if ( !isOpen ) return;
    const handleKey = ( e: KeyboardEvent ) =>
    {
      if ( e.key === "Escape" ) setIsOpen( false );
    };
    window.addEventListener( "keydown", handleKey );
    return () => window.removeEventListener( "keydown", handleKey );
  }, [ isOpen ] );

  // Don't render if no artifacts
  if ( artifacts.length === 0 ) return null;

  return (
    <div ref={ menuRef } className="relative">
      {/* Trigger Button */}
      <motion.button
        type="button"
        whileTap={ { scale: 0.9 } }
        onClick={ () => setIsOpen( prev => !prev ) }
        className={ cn(
          "h-9 rounded-xl flex items-center justify-center gap-1 px-2",
          "text-white/60 hover:text-white",
          "hover:bg-white/[0.08] transition-colors touch-target",
          isOpen && "bg-white/[0.08] text-white"
        ) }
        title="فتح أداة Canvas"
        aria-label="فتح أداة Canvas"
        aria-expanded={ isOpen }
      >
        <Code2 className="w-[18px] h-[18px]" />
        <ChevronDown className={ cn(
          "w-3 h-3 transition-transform duration-200",
          isOpen && "rotate-180"
        ) } />
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        { isOpen && (
          <motion.div
            initial={ { opacity: 0, scale: 0.95, y: -4 } }
            animate={ { opacity: 1, scale: 1, y: 0 } }
            exit={ { opacity: 0, scale: 0.95, y: -4 } }
            transition={ { duration: 0.15, ease: "easeOut" } }
            className={ cn(
              "absolute top-full mt-2 left-0 z-[60]",
              "min-w-[220px] max-w-[280px]",
              "rounded-2xl py-1.5",
              "bg-[#1d2b28]/95 backdrop-blur-xl",
              "border border-white/[0.1]",
              "shadow-[0_8px_40px_rgba(0,0,0,0.5)]",
              "overflow-y-auto max-h-[320px] custom-scrollbar"
            ) }
            role="menu"
            aria-orientation="vertical"
          >
            { artifacts.map( ( artifact ) => (
              <ArtifactMenuItem
                key={ artifact.id }
                artifact={ artifact }
                onSelect={ () =>
                {
                  openArtifact( artifact.id );
                  setIsOpen( false );
                } }
              />
            ) ) }
          </motion.div>
        ) }
      </AnimatePresence>
    </div>
  );
} );

// ─── Individual menu item ───
function ArtifactMenuItem ( {
  artifact,
  onSelect,
}: {
  artifact: CanvasArtifact;
  onSelect: () => void;
} )
{
  const Icon = getCanvasIcon( artifact.type );
  const meta = CANVAS_TYPE_META[ artifact.type ];

  return (
    <button
      type="button"
      role="menuitem"
      onClick={ onSelect }
      className={ cn(
        "w-full flex items-center gap-2.5 px-3 py-2",
        "text-sm text-white/70 hover:text-white hover:bg-white/[0.06]",
        "transition-colors duration-100"
      ) }
    >
      <Icon className="w-4 h-4 shrink-0" style={ { color: meta?.color } } />
      <span className="block max-w-[200px] truncate font-medium">
        { artifact.title }
      </span>
    </button>
  );
}
