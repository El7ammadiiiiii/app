"use client";

import { useState, useEffect } from "react";

/**
 * A simple hook to determine if the component has mounted on the client.
 * This is useful to prevent hydration errors when rendering different content
 * on the server and the client (e.g., based on window size).
 *
 * @returns {boolean} `true` if the component has mounted, otherwise `false`.
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
