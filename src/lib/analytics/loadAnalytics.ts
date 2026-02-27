import { getAnalytics } from 'firebase/analytics';
import { getFirebaseApp } from '../firebase/client';

// Loads Firebase Analytics lazily and sets global flags for availability.
export async function loadAnalytics(): Promise<import('firebase/analytics').Analytics | null> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (window.__analyticsBlocked) return null;
  try {
    const app = getFirebaseApp();
    if (!app) return null;
    const analytics = getAnalytics(app);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.__analyticsLoaded = true;
    return analytics;
  } catch (e) {
    // Mark blocked to avoid future attempts
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.__analyticsBlocked = true;
    // eslint-disable-next-line no-console
    console.warn('loadAnalytics: failed to initialize analytics:', e);
    return null;
  }
}
