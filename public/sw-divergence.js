/**
 * 🚀 Service Worker for Divergence Scanner
 * Implements Stale-While-Revalidate with 5-minute TTL
 * Provides offline support with cached results
 * 
 * @author CCWAYS Team
 * @version 1.0.0
 */

const CACHE_NAME = 'divergence-cache-v1';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// URLs to cache
const DIVERGENCE_API_PATTERNS = [
  '/api/v2/divergences',
  '/api/divergences'
];

// Install event - activate immediately
self.addEventListener( 'install', ( event ) =>
{
  self.skipWaiting();
} );

// Activate event - claim all clients
self.addEventListener( 'activate', ( event ) =>
{
  event.waitUntil(
    Promise.all( [
      self.clients.claim(),
      // Clean up old caches
      caches.keys().then( keys =>
      {
        return Promise.all(
          keys.filter( key => key !== CACHE_NAME ).map( key => caches.delete( key ) )
        );
      } )
    ] )
  );
} );

// Fetch event - intercept divergence API calls
self.addEventListener( 'fetch', ( event ) =>
{
  const url = new URL( event.request.url );

  // Only handle divergence API requests
  const isDivergenceAPI = DIVERGENCE_API_PATTERNS.some( pattern =>
    url.pathname.includes( pattern )
  );

  if ( isDivergenceAPI && event.request.method === 'GET' )
  {
    event.respondWith( staleWhileRevalidate( event.request ) );
  }
} );

/**
 * Stale-While-Revalidate Strategy
 * 1. Return cached response immediately if valid (< 5 min old)
 * 2. Fetch fresh data in background
 * 3. Update cache with fresh data
 * 4. If offline, return any cached data
 */
async function staleWhileRevalidate ( request )
{
  const cache = await caches.open( CACHE_NAME );
  const cachedResponse = await cache.match( request );

  // Check if we have a valid cached response
  if ( cachedResponse )
  {
    const cachedTime = cachedResponse.headers.get( 'x-cached-at' );
    const age = cachedTime ? Date.now() - parseInt( cachedTime, 10 ) : Infinity;

    if ( age < CACHE_TTL )
    {
      // Cache is fresh - return it and update in background
      fetchAndCache( request, cache ).catch( () => { } );
      return cachedResponse;
    }
  }

  // Cache is stale or missing - try network first
  try
  {
    const networkResponse = await fetchAndCache( request, cache );
    return networkResponse;
  } catch ( error )
  {
    // Network failed - return any cached data (even if stale)
    if ( cachedResponse )
    {
      console.log( '[SW] Offline - returning cached divergence data' );
      return cachedResponse;
    }

    // No cache available - return empty array response
    console.log( '[SW] Offline - no cached data available' );
    return new Response( JSON.stringify( [] ), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Offline': 'true'
      }
    } );
  }
}

/**
 * Fetch from network and cache the response
 */
async function fetchAndCache ( request, cache )
{
  const response = await fetch( request );

  // Only cache successful responses
  if ( response.ok )
  {
    // Clone response since it can only be read once
    const responseClone = response.clone();

    // Create new response with cache timestamp header
    const body = await responseClone.blob();
    const headers = new Headers( response.headers );
    headers.set( 'x-cached-at', Date.now().toString() );

    const cachedResponse = new Response( body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    } );

    // Store in cache
    await cache.put( request, cachedResponse );
    console.log( '[SW] Cached divergence data' );
  }

  return response;
}

// Message handler for cache control
self.addEventListener( 'message', ( event ) =>
{
  if ( event.data && event.data.type === 'CLEAR_CACHE' )
  {
    caches.delete( CACHE_NAME ).then( () =>
    {
      console.log( '[SW] Cache cleared' );
      event.ports[ 0 ]?.postMessage( { success: true } );
    } );
  }

  if ( event.data && event.data.type === 'GET_CACHE_STATUS' )
  {
    caches.open( CACHE_NAME ).then( async ( cache ) =>
    {
      const keys = await cache.keys();
      event.ports[ 0 ]?.postMessage( {
        cacheCount: keys.length,
        cacheName: CACHE_NAME
      } );
    } );
  }
} );
