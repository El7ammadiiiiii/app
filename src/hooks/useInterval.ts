import { useEffect, useRef } from 'react';

// useInterval - similar to Dan Abramov's implementation but with cleanup
export default function useInterval(callback: () => void, delay: number | null, deps: any[] = []) {
  const savedCallback = useRef(callback);

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback, ...deps]);

  useEffect(() => {
    if (delay === null) return;
    const id = window.setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
