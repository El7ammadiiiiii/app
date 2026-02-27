"use client";

import { useState, useEffect, useCallback } from "react";

export type Breakpoint = "mobile" | "tablet" | "desktop";

interface MediaQueryResult {
  /** < 640px */
  isMobile: boolean;
  /** 640px – 1023px */
  isTablet: boolean;
  /** ≥ 1024px */
  isDesktop: boolean;
  /** Current active breakpoint */
  breakpoint: Breakpoint;
  /** Exact viewport width */
  width: number;
}

const MOBILE_MAX = 640;
const TABLET_MAX = 1024;

function getBreakpoint(w: number): Breakpoint {
  if (w < MOBILE_MAX) return "mobile";
  if (w < TABLET_MAX) return "tablet";
  return "desktop";
}

/**
 * Unified media-query hook replacing scattered `window.innerWidth` checks.
 * SSR-safe: defaults to desktop until mounted.
 */
export function useMediaQuery(): MediaQueryResult {
  const [state, setState] = useState<MediaQueryResult>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    breakpoint: "desktop",
    width: 1280,
  });

  const update = useCallback(() => {
    const w = window.innerWidth;
    const bp = getBreakpoint(w);
    setState({
      isMobile: bp === "mobile",
      isTablet: bp === "tablet",
      isDesktop: bp === "desktop",
      breakpoint: bp,
      width: w,
    });
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  return state;
}
