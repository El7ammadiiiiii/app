"use client";

import * as React from "react";
import { motion, useDragControls, AnimatePresence } from "framer-motion";
import
  {
    Bell,
    Shield,
    User,
    Moon,
    Sun,
    Monitor,
    Volume2,
    VolumeX,
    Zap,
    GripHorizontal,
    X,
    ChevronUp,
    ChevronDown,
  } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

// ═══════════════════════════════════════════════════════════════
// Quick Access Bar - Slack/Superhuman Style Floating Bar
// ═══════════════════════════════════════════════════════════════
interface QuickAccessBarProps
{
  onNavigate?: ( section: string ) => void;
  className?: string;
}

export function QuickAccessBar ( { onNavigate, className }: QuickAccessBarProps )
{
  const [ isExpanded, setIsExpanded ] = React.useState( false );
  const [ isVisible, setIsVisible ] = React.useState( true );
  const [ position, setPosition ] = React.useState( { x: 0, y: 0 } );
  const dragControls = useDragControls();
  const { theme, setTheme } = useTheme();
  const [ soundEnabled, setSoundEnabled ] = React.useState( true );

  // Quick actions
  const quickActions = [
    {
      id: "theme",
      icon: theme === "dark" ? Moon : theme === "light" ? Sun : Monitor,
      label: "تبديل المظهر",
      action: () =>
      {
        const themes = [ "light", "normal", "dark" ];
        const currentIndex = themes.indexOf( theme || "normal" );
        setTheme( themes[ ( currentIndex + 1 ) % themes.length ] );
      },
      active: false,
    },
    {
      id: "sound",
      icon: soundEnabled ? Volume2 : VolumeX,
      label: soundEnabled ? "كتم الصوت" : "تفعيل الصوت",
      action: () => setSoundEnabled( !soundEnabled ),
      active: soundEnabled,
    },
    {
      id: "notifications",
      icon: Bell,
      label: "الإشعارات",
      action: () => onNavigate?.( "notifications" ),
    },
    {
      id: "privacy",
      icon: Shield,
      label: "الخصوصية",
      action: () => onNavigate?.( "privacy" ),
    },
    {
      id: "account",
      icon: User,
      label: "الحساب",
      action: () => onNavigate?.( "account" ),
    },
  ];

  if ( !isVisible )
  {
    return (
      <motion.button
        type="button"
        aria-label="فتح شريط الإعدادات السريعة"
        title="فتح شريط الإعدادات السريعة"
        initial={ { opacity: 0, scale: 0.8 } }
        animate={ { opacity: 1, scale: 1 } }
        className={ cn(
          "fixed bottom-4 left-4 z-40",
          "w-10 h-10 rounded-full",
          "bg-primary text-primary-foreground",
          "shadow-lg hover:shadow-xl transition-shadow",
          "flex items-center justify-center"
        ) }
        onClick={ () => setIsVisible( true ) }
        whileHover={ { scale: 1.05 } }
        whileTap={ { scale: 0.95 } }
      >
        <Zap className="w-5 h-5" />
      </motion.button>
    );
  }

  return (
    <motion.div
      drag
      dragControls={ dragControls }
      dragMomentum={ false }
      dragElastic={ 0.1 }
      onDragEnd={ ( _, info ) =>
      {
        setPosition( { x: position.x + info.offset.x, y: position.y + info.offset.y } );
      } }
      initial={ { opacity: 0, x: 0, y: 20, scale: 0.9 } }
      animate={ { opacity: 1, x: position.x, y: position.y, scale: 1 } }
      className={ cn(
        "fixed bottom-4 left-4 z-40",
        "glass-lite glass-lite--strong",
        "rounded-2xl shadow-2xl",
        "overflow-hidden",
        className
      ) }
    >
      {/* Drag Handle */ }
      <div
        onPointerDown={ ( e ) => dragControls.start( e ) }
        className={ cn(
          "flex items-center justify-between px-3 py-1.5",
          "overlay-header cursor-grab active:cursor-grabbing"
        ) }
      >
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <GripHorizontal className="w-3.5 h-3.5" />
          <span className="text-[10px] font-medium uppercase tracking-wide">إعدادات سريعة</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={ isExpanded ? "طي لوحة الإعدادات السريعة" : "توسيع لوحة الإعدادات السريعة" }
            title={ isExpanded ? "طي لوحة الإعدادات السريعة" : "توسيع لوحة الإعدادات السريعة" }
            onClick={ () => setIsExpanded( !isExpanded ) }
            className="p-1 rounded hover:bg-white/10 transition-colors text-muted-foreground"
          >
            { isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" /> }
          </button>
          <button
            type="button"
            aria-label="إغلاق شريط الإعدادات السريعة"
            title="إغلاق شريط الإعدادات السريعة"
            onClick={ () => setIsVisible( false ) }
            className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Actions */ }
      <div className={ cn(
        "flex items-center gap-1 p-2",
        isExpanded && "flex-wrap max-w-[200px]"
      ) }>
        { quickActions.map( ( action, index ) => (
          <motion.button
            type="button"
            aria-label={ action.label }
            title={ action.label }
            key={ action.id }
            initial={ { opacity: 0, scale: 0.8 } }
            animate={ { opacity: 1, scale: 1 } }
            transition={ { delay: index * 0.05 } }
            onClick={ action.action }
            className={ cn(
              "relative group",
              "w-9 h-9 rounded-xl flex items-center justify-center",
              "transition-all duration-200",
              action.active
                ? "bg-primary/10 text-primary"
                : "bg-white/10 text-muted-foreground hover:bg-white/15 hover:text-foreground"
            ) }
            whileHover={ { scale: 1.1 } }
            whileTap={ { scale: 0.9 } }
          >
            <action.icon className="w-4 h-4" />

            {/* Tooltip */ }
            <div className={ cn(
              "absolute bottom-full left-1/2 -translate-x-1/2 mb-2",
              "px-2 py-1 rounded-md text-[10px] font-medium",
              "overlay-popover",
              "opacity-0 group-hover:opacity-100 pointer-events-none",
              "transition-opacity whitespace-nowrap"
            ) }>
              { action.label }
            </div>
          </motion.button>
        ) ) }
      </div>

      {/* Expanded View */ }
      <AnimatePresence>
        { isExpanded && (
          <motion.div
            initial={ { height: 0, opacity: 0 } }
            animate={ { height: "auto", opacity: 1 } }
            exit={ { height: 0, opacity: 0 } }
            className="border-t border-[var(--overlay-border)] overflow-hidden"
          >
            <div className="p-2 space-y-1">
              { quickActions.map( ( action ) => (
                <button
                  type="button"
                  key={ action.id }
                  onClick={ action.action }
                  className={ cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-right",
                    "text-xs transition-colors",
                    action.active
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-white/10 text-muted-foreground hover:text-foreground"
                  ) }
                >
                  <action.icon className="w-3.5 h-3.5" />
                  <span>{ action.label }</span>
                </button>
              ) ) }
            </div>
          </motion.div>
        ) }
      </AnimatePresence>
    </motion.div>
  );
}
