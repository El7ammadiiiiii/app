/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Wave 3.3: Next.js Edge Middleware — Rate Limiting + Auth Guard
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Protects AI API routes (/api/chat/*, /api/canvas/*) with:
 * 1. IP-based sliding-window rate limiter (in-memory, ~60 req/min default)
 * 2. Optional Firebase ID token verification header (X-Firebase-Token)
 * 
 * Edge-compatible — runs before every matched request with zero cold-start.
 * For production scale, swap the Map-based store with Upstash Redis.
 */

import { NextRequest, NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════
// Config
// ═══════════════════════════════════════════════════════════════

/** Max requests per sliding window per IP */
const RATE_LIMIT_MAX = 60;

/** Sliding window duration in milliseconds (1 minute) */
const RATE_LIMIT_WINDOW_MS = 60_000;

/** Require Firebase auth token? Set true once auth is fully wired. */
const REQUIRE_AUTH_TOKEN = false;

// ═══════════════════════════════════════════════════════════════
// In-memory sliding-window rate limiter
// ═══════════════════════════════════════════════════════════════

interface RateBucket
{
  timestamps: number[];
}

/**
 * In-memory store — lives as long as the edge worker.
 * For serverless (Vercel), each isolate has its own map,
 * which is acceptable for moderate traffic.
 * For stricter enforcement → use Upstash Redis adapter.
 */
const ipBuckets = new Map<string, RateBucket>();

/** Periodic cleanup every 5 minutes to prevent memory leaks */
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60_000;

function cleanupBuckets ()
{
  const now = Date.now();
  if ( now - lastCleanup < CLEANUP_INTERVAL_MS ) return;
  lastCleanup = now;

  for ( const [ ip, bucket ] of ipBuckets )
  {
    bucket.timestamps = bucket.timestamps.filter( t => now - t < RATE_LIMIT_WINDOW_MS );
    if ( bucket.timestamps.length === 0 ) ipBuckets.delete( ip );
  }
}

function isRateLimited ( ip: string ): { limited: boolean; remaining: number; resetMs: number }
{
  cleanupBuckets();

  const now = Date.now();
  let bucket = ipBuckets.get( ip );

  if ( !bucket )
  {
    bucket = { timestamps: [] };
    ipBuckets.set( ip, bucket );
  }

  // Remove timestamps outside the sliding window
  bucket.timestamps = bucket.timestamps.filter( t => now - t < RATE_LIMIT_WINDOW_MS );

  if ( bucket.timestamps.length >= RATE_LIMIT_MAX )
  {
    const oldest = bucket.timestamps[ 0 ] || now;
    const resetMs = RATE_LIMIT_WINDOW_MS - ( now - oldest );
    return { limited: true, remaining: 0, resetMs };
  }

  // Record this request
  bucket.timestamps.push( now );
  const remaining = RATE_LIMIT_MAX - bucket.timestamps.length;

  return { limited: false, remaining, resetMs: 0 };
}

// ═══════════════════════════════════════════════════════════════
// Middleware
// ═══════════════════════════════════════════════════════════════

export function middleware ( request: NextRequest )
{
  const { pathname } = request.nextUrl;

  // ── Rate Limiting ──
  const forwarded = request.headers.get( "x-forwarded-for" );
  const ip = forwarded?.split( "," )[ 0 ]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const { limited, remaining, resetMs } = isRateLimited( ip );

  if ( limited )
  {
    return new NextResponse(
      JSON.stringify( {
        error: "Too many requests",
        message: "تجاوزت الحد المسموح من الطلبات. حاول بعد قليل.",
        retryAfterMs: resetMs,
      } ),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String( Math.ceil( resetMs / 1000 ) ),
          "X-RateLimit-Limit": String( RATE_LIMIT_MAX ),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // ── Optional Auth Token Check ──
  if ( REQUIRE_AUTH_TOKEN )
  {
    const token = request.headers.get( "x-firebase-token" ) || request.headers.get( "authorization" )?.replace( "Bearer ", "" );

    if ( !token )
    {
      return new NextResponse(
        JSON.stringify( {
          error: "Unauthorized",
          message: "مطلوب توكن مصادقة. يرجى تسجيل الدخول.",
        } ),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Note: Full Firebase Admin token verification cannot run on Edge Runtime.
    // For now, we just check token presence. For production:
    // - Use a route handler that verifies via Firebase Admin SDK
    // - Or use Upstash Redis + pre-verified session tokens
  }

  // ── Pass through with rate-limit headers ──
  const response = NextResponse.next();
  response.headers.set( "X-RateLimit-Limit", String( RATE_LIMIT_MAX ) );
  response.headers.set( "X-RateLimit-Remaining", String( remaining ) );

  return response;
}

// ═══════════════════════════════════════════════════════════════
// Route Matcher — only protect AI API routes
// ═══════════════════════════════════════════════════════════════

export const config = {
  matcher: [
    "/api/chat/:path*",
    "/api/canvas/:path*",
  ],
};
