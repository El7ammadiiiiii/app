/**
 * 🗄️ Crawler Cache Service
 * Provides Firebase-backed caching for crawler API routes.
 *
 * Two strategies:
 * - Technical analysis (scanners): Replace on update (handled by firebaseMemoryService)
 * - Crawler/news pages: Retain history, update every 4 hours
 *
 * Collections: crawler_cache/{collectionName}/snapshots/{timestamp}
 * Latest:      crawler_cache/{collectionName}/latest (single doc, overwritten)
 *
 * @author CCWAYS Team
 */

import { db } from '../firebase/client';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

/* ─── Default TTLs ─── */
const FOUR_HOURS = 4 * 60 * 60 * 1000;   // 4h for crawler pages
const TWO_HOURS  = 2 * 60 * 60 * 1000;   // 2h for news
const ONE_HOUR   = 1 * 60 * 60 * 1000;   // 1h for fast-changing data

export const CRAWLER_CACHE_KEYS = {
  news:              { key: 'news',              ttl: TWO_HOURS  },
  staking_rewards:   { key: 'staking_rewards',   ttl: FOUR_HOURS },
  chain_explorer:    { key: 'chain_explorer',    ttl: FOUR_HOURS },
  etf_data:          { key: 'etf_data',          ttl: FOUR_HOURS },
  top_holders:       { key: 'top_holders',       ttl: FOUR_HOURS },
  stablecoins:       { key: 'stablecoins',       ttl: FOUR_HOURS },
  polygon_analytics: { key: 'polygon_analytics', ttl: FOUR_HOURS },
  defillama:         { key: 'defillama',         ttl: FOUR_HOURS },
  cryptoquant_studio:{ key: 'cryptoquant_studio',ttl: FOUR_HOURS },
  whales:            { key: 'whales',            ttl: ONE_HOUR   },
} as const;

type CacheKey = keyof typeof CRAWLER_CACHE_KEYS;

interface CacheDoc {
  data: any;
  fetchedAt: number;
  expiresAt: number;
  source: string;
  createdAt: any; // serverTimestamp
}

async function ensureAuth(): Promise<boolean> {
  if ( !db ) return false;
  try {
    const { ensureAnonymousAuth } = await import( '../firebase/client' );
    const user = await ensureAnonymousAuth();
    return !!user;
  } catch {
    return false;
  }
}

export const CrawlerCacheService = {

  /**
   * Save a snapshot to Firestore (retains history).
   * Writes to both `latest` (overwritten each time) and `snapshots/{timestamp}` (append-only).
   */
  async saveSnapshot(
    cacheKey: CacheKey,
    data: any,
    source: string = 'api',
  ): Promise<void> {
    if ( !db ) return;
    const authed = await ensureAuth();
    if ( !authed ) return;

    const config = CRAWLER_CACHE_KEYS[ cacheKey ];
    const now = Date.now();
    const payload: CacheDoc = {
      data,
      fetchedAt: now,
      expiresAt: now + config.ttl,
      source,
      createdAt: serverTimestamp(),
    };

    try {
      // Write latest (overwrite)
      const latestRef = doc( db, 'crawler_cache', config.key );
      await setDoc( latestRef, payload, { merge: false } );

      // Write history snapshot (append)
      const snapRef = doc(
        collection( db, 'crawler_cache', config.key, 'snapshots' ),
        String( now ),
      );
      await setDoc( snapRef, payload );
    } catch ( err ) {
      console.error( `[CrawlerCache] saveSnapshot(${ cacheKey }) error:`, err );
    }
  },

  /**
   * Get the latest cached data. Returns null if expired or missing.
   */
  async getLatest( cacheKey: CacheKey ): Promise<{ data: any; fetchedAt: number } | null> {
    if ( !db ) return null;
    const authed = await ensureAuth();
    if ( !authed ) return null;

    try {
      const config = CRAWLER_CACHE_KEYS[ cacheKey ];
      const latestRef = doc( db, 'crawler_cache', config.key );
      const snap = await getDoc( latestRef );

      if ( !snap.exists() ) return null;
      const cached = snap.data() as CacheDoc;

      // Check expiry
      if ( Date.now() > cached.expiresAt ) return null;

      return { data: cached.data, fetchedAt: cached.fetchedAt };
    } catch ( err ) {
      console.error( `[CrawlerCache] getLatest(${ cacheKey }) error:`, err );
      return null;
    }
  },

  /**
   * Check if cache is still valid (not expired).
   */
  async isFresh( cacheKey: CacheKey ): Promise<boolean> {
    const latest = await this.getLatest( cacheKey );
    return latest !== null;
  },

  /**
   * Get-or-fetch pattern: returns cached data if fresh, otherwise calls fetchFn,
   * saves the result, and returns it.
   *
   * @example
   * const data = await CrawlerCacheService.getCachedOrFetch('news', async () => {
   *   const res = await fetch('/api/news');
   *   return res.json();
   * });
   */
  async getCachedOrFetch<T = any>(
    cacheKey: CacheKey,
    fetchFn: () => Promise<T>,
    source: string = 'api',
  ): Promise<T> {
    // Try cache first
    const cached = await this.getLatest( cacheKey );
    if ( cached ) return cached.data as T;

    // Cache miss/expired → fetch fresh
    const freshData = await fetchFn();

    // Save to cache (fire-and-forget)
    this.saveSnapshot( cacheKey, freshData, source ).catch( () => {} );

    return freshData;
  },

  /**
   * Get historical snapshots for a cache key (for trend analysis / history pages).
   * Returns newest-first, up to `maxCount`.
   */
  async getHistory(
    cacheKey: CacheKey,
    maxCount: number = 50,
  ): Promise<Array<{ data: any; fetchedAt: number }>> {
    if ( !db ) return [];
    const authed = await ensureAuth();
    if ( !authed ) return [];

    try {
      const config = CRAWLER_CACHE_KEYS[ cacheKey ];
      const snapshotsRef = collection( db, 'crawler_cache', config.key, 'snapshots' );
      const q = query( snapshotsRef, orderBy( 'fetchedAt', 'desc' ), limit( maxCount ) );
      const snap = await getDocs( q );

      return snap.docs.map( d => {
        const doc = d.data() as CacheDoc;
        return { data: doc.data, fetchedAt: doc.fetchedAt };
      });
    } catch ( err ) {
      console.error( `[CrawlerCache] getHistory(${ cacheKey }) error:`, err );
      return [];
    }
  },
};

export default CrawlerCacheService;
