export function isAnalyticsAvailable(): boolean {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // If explicitly blocked, bail out early
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (window.__analyticsBlocked) return false;
  // If we lazily loaded analytics we can trust the globals are present
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (window.__analyticsLoaded) return typeof window.gtag === 'function' || typeof window.ga === 'function';
  // Otherwise, analytics not yet loaded; avoid calling
  return false;
}

export function safeGtag(...args: any[]) {
  if (!isAnalyticsAvailable()) return;
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return window.gtag(...args);
  } catch (e) {
    // swallow errors from blocked analytics
    // eslint-disable-next-line no-console
    console.warn('gtag call failed (analytics blocked?):', e);
    // mark blocked to avoid future attempts
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.__analyticsBlocked = true;
  }
}

export function safeConfig(config: Record<string, any>) {
  if (!isAnalyticsAvailable()) return;
  safeGtag('config', config);
}

export function safeEvent(eventName: string, params?: Record<string, any>) {
  if (!isAnalyticsAvailable()) return;
  safeGtag('event', eventName, params || {});
}
