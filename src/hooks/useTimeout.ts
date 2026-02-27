"use client";

import { useEffect, useRef } from "react";

export default function useTimeout(callback: () => void, delay?: number | undefined, deps: any[] = []) {
  const savedCallback = useRef(callback);
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay == null) return;
    const id = window.setTimeout(() => savedCallback.current(), delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, ...(deps || [])]);
}
