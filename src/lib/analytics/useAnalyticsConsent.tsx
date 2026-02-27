import { useCallback, useEffect, useState } from 'react';
import { loadAnalytics } from './loadAnalytics';

const CONSENT_KEY = 'analytics_consent_v1';

export function useAnalyticsConsent() {
  const [consent, setConsent] = useState<boolean>(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(CONSENT_KEY) : null;
      return raw === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (consent) {
      // load analytics in background (best-effort)
      loadAnalytics().catch(() => {});
    }
  }, [consent]);

  const giveConsent = useCallback(() => {
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(CONSENT_KEY, '1');
    } catch {}
    setConsent(true);
  }, []);

  const revokeConsent = useCallback(() => {
    try {
      if (typeof window !== 'undefined') window.localStorage.removeItem(CONSENT_KEY);
    } catch {}
    setConsent(false);
  }, []);

  return { consent, giveConsent, revokeConsent };
}
