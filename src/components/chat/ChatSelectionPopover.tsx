'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 7.3 — Chat Selection Popover
 * ═══════════════════════════════════════════════════════════════
 *
 * Floating popover that appears when the user selects text inside
 * an assistant message. Provides contextual quick-actions:
 *   • اشرح (Explain)
 *   • ترجم (Translate)
 *   • اقتبس (Quote)
 *   • ابحث  (Search)
 *
 * Glassmorphism design consistent with CCWAYS UI language.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Languages, Quote, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectionAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** Fired with the selected text */
  onAction: (selectedText: string) => void;
}

export interface ChatSelectionPopoverProps {
  /** CSS selector that scopes where selections are tracked */
  containerSelector?: string;
  /** Override default actions */
  actions?: SelectionAction[];
  /** Called when any action fires — useful for injecting into chat input */
  onActionFired?: (actionId: string, selectedText: string) => void;
}

const DEFAULT_ACTIONS: Omit<SelectionAction, 'onAction'>[] = [
  { id: 'explain', label: 'اشرح', icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: 'translate', label: 'ترجم', icon: <Languages className="w-3.5 h-3.5" /> },
  { id: 'quote', label: 'اقتبس', icon: <Quote className="w-3.5 h-3.5" /> },
  { id: 'search', label: 'ابحث', icon: <Search className="w-3.5 h-3.5" /> },
];

export function ChatSelectionPopover({
  containerSelector = '[data-chat-messages]',
  actions,
  onActionFired,
}: ChatSelectionPopoverProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearHideTimer();
    setVisible(false);
    setSelectedText('');
  }, [clearHideTimer]);

  // ── Listen for selection changes ──
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        // Delay hiding to allow click on popover buttons
        clearHideTimer();
        hideTimerRef.current = setTimeout(hide, 200);
        return;
      }

      const text = selection.toString().trim();
      if (text.length < 2) return;

      // Check selection is within assistant message container
      const range = selection.getRangeAt(0);
      const container = document.querySelector(containerSelector);
      if (!container || !container.contains(range.commonAncestorContainer)) return;

      // Only trigger on assistant messages (not user bubbles)
      const messageEl = range.commonAncestorContainer.parentElement?.closest?.(
        '[id^="msg-content-"]'
      );
      if (!messageEl) return;

      // Position popover above selection
      const rect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      setSelectedText(text);
      setPosition({
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.top - containerRect.top - 12,
      });

      clearHideTimer();
      setVisible(true);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      clearHideTimer();
    };
  }, [containerSelector, hide, clearHideTimer]);

  // ── Dismiss on Escape or click outside ──
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        // Don't hide immediately — selection change handler will handle it
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [visible, hide]);

  const handleAction = useCallback(
    (actionId: string) => {
      if (!selectedText) return;

      // Fire custom event for chat area to pick up
      const event = new CustomEvent('chat:selection-action', {
        detail: { actionId, selectedText },
      });
      window.dispatchEvent(event);

      onActionFired?.(actionId, selectedText);
      hide();
      window.getSelection()?.removeAllRanges();
    },
    [selectedText, onActionFired, hide]
  );

  const resolvedActions = actions || DEFAULT_ACTIONS.map((a) => ({
    ...a,
    onAction: () => handleAction(a.id),
  }));

  return (
    <AnimatePresence>
      {visible && selectedText && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, y: 6, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.97 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className={cn(
            'absolute z-50 pointer-events-auto',
            'flex items-center gap-0.5 px-1.5 py-1',
            'bg-black/70 backdrop-blur-xl',
            'border border-white/[0.12] rounded-xl',
            'shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
          )}
          style={{
            left: position.x,
            top: position.y,
            transform: 'translate(-50%, -100%)',
          }}
          onMouseEnter={clearHideTimer}
          onMouseLeave={() => {
            hideTimerRef.current = setTimeout(hide, 300);
          }}
        >
          {resolvedActions.map((action) => (
            <button
              key={action.id}
              onClick={() => {
                if ('onAction' in action && typeof action.onAction === 'function') {
                  action.onAction(selectedText);
                }
                handleAction(action.id);
              }}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
                'text-xs font-medium text-white/80',
                'hover:bg-white/[0.12] hover:text-white',
                'transition-all duration-150',
                'focus:outline-none focus:ring-1 focus:ring-white/20'
              )}
              title={action.label}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}

          {/* Arrow */}
          <div
            className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full w-0 h-0"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid rgba(0,0,0,0.7)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
