"use client";

import { useEffect, useRef } from "react";

/**
 * Locks body scroll when `locked` is true.
 * iOS-safe: uses position:fixed + scroll-position preservation.
 */
export function useBodyScrollLock(locked: boolean) {
  const scrollYRef = useRef(0);

  useEffect(() => {
    if (!locked) return;

    // Save current scroll position
    scrollYRef.current = window.scrollY;

    const body = document.body;
    const html = document.documentElement;

    // iOS requires position:fixed to truly prevent background scrolling
    const prevBodyStyle = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    const prevHtmlOverflow = html.style.overflow;

    body.style.position = "fixed";
    body.style.top = `-${scrollYRef.current}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";

    return () => {
      body.style.position = prevBodyStyle.position;
      body.style.top = prevBodyStyle.top;
      body.style.left = prevBodyStyle.left;
      body.style.right = prevBodyStyle.right;
      body.style.width = prevBodyStyle.width;
      body.style.overflow = prevBodyStyle.overflow;
      html.style.overflow = prevHtmlOverflow;

      // Restore scroll position
      window.scrollTo(0, scrollYRef.current);
    };
  }, [locked]);
}
