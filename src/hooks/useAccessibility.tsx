"use client";

/**
 * ═══════════════════════════════════════════════════════════════
 * Wave 6.4 — Accessibility Utilities & Keyboard Navigation
 * ═══════════════════════════════════════════════════════════════
 * Reusable ARIA helpers and keyboard navigation hooks.
 */

import { useCallback, useEffect, useRef } from "react";

// ═══ Focus Trap — keeps focus within a container (modals/panels) ═══
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusable = container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    first.focus();

    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [isActive]);

  return containerRef;
}

// ═══ Arrow Key Navigation — for menus and lists ═══
export function useArrowKeyNavigation(
  itemCount: number,
  options?: { orientation?: "horizontal" | "vertical"; wrap?: boolean }
) {
  const currentIndex = useRef(0);
  const orientation = options?.orientation || "vertical";
  const wrap = options?.wrap ?? true;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, onSelect?: (index: number) => void) => {
      const prevKey = orientation === "vertical" ? "ArrowUp" : "ArrowRight";
      const nextKey = orientation === "vertical" ? "ArrowDown" : "ArrowLeft";

      if (e.key === nextKey) {
        e.preventDefault();
        if (currentIndex.current < itemCount - 1) {
          currentIndex.current++;
        } else if (wrap) {
          currentIndex.current = 0;
        }
      } else if (e.key === prevKey) {
        e.preventDefault();
        if (currentIndex.current > 0) {
          currentIndex.current--;
        } else if (wrap) {
          currentIndex.current = itemCount - 1;
        }
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect?.(currentIndex.current);
      } else if (e.key === "Home") {
        e.preventDefault();
        currentIndex.current = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        currentIndex.current = itemCount - 1;
      }

      return currentIndex.current;
    },
    [itemCount, orientation, wrap]
  );

  return { handleKeyDown, currentIndex };
}

// ═══ Announce to Screen Readers (aria-live) ═══
let announceContainer: HTMLDivElement | null = null;

export function announceToScreenReader(message: string, priority: "polite" | "assertive" = "polite") {
  if (typeof document === "undefined") return;

  if (!announceContainer) {
    announceContainer = document.createElement("div");
    announceContainer.setAttribute("role", "status");
    announceContainer.setAttribute("aria-live", priority);
    announceContainer.setAttribute("aria-atomic", "true");
    announceContainer.className = "sr-only";
    Object.assign(announceContainer.style, {
      position: "absolute",
      width: "1px",
      height: "1px",
      padding: "0",
      margin: "-1px",
      overflow: "hidden",
      clip: "rect(0, 0, 0, 0)",
      whiteSpace: "nowrap",
      border: "0",
    });
    document.body.appendChild(announceContainer);
  }

  announceContainer.setAttribute("aria-live", priority);
  // Clear then set to trigger announcement
  announceContainer.textContent = "";
  requestAnimationFrame(() => {
    if (announceContainer) announceContainer.textContent = message;
  });
}

// ═══ Skip to Main Content Link ═══
export function SkipToContent({ targetId = "main-content" }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-teal-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
    >
      تخطي إلى المحتوى الرئيسي
    </a>
  );
}

// ═══ Roving Tabindex Hook — for toolbar buttons ═══
export function useRovingTabindex<T extends HTMLElement>(itemCount: number) {
  const itemRefs = useRef<(T | null)[]>([]);
  const activeIndex = useRef(0);

  const setRef = useCallback((index: number) => (el: T | null) => {
    itemRefs.current[index] = el;
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    let newIndex = activeIndex.current;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        newIndex = (activeIndex.current + 1) % itemCount;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        newIndex = (activeIndex.current - 1 + itemCount) % itemCount;
        break;
      case "Home":
        e.preventDefault();
        newIndex = 0;
        break;
      case "End":
        e.preventDefault();
        newIndex = itemCount - 1;
        break;
      default:
        return;
    }

    activeIndex.current = newIndex;
    itemRefs.current[newIndex]?.focus();
  }, [itemCount]);

  const getTabIndex = useCallback((index: number) => (
    index === activeIndex.current ? 0 : -1
  ), []);

  return { setRef, handleKeyDown, getTabIndex };
}
