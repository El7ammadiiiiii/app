// app/api/whales/route.ts
/**
 * 🐋 Crypto Whales API
 * Fetches top token holders using multiple data sources
 * 
 * Note: Etherscan tokenholderlist requires PRO subscription ($199/month)
 * Alternative: Using demo data that simulates realistic holder distributions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokenById, ALL_TOKENS } from '@/lib/whales/tokens';
import type { WhalesApiResponse, TokenHolder } from '@/lib/whales/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔑 CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';

// Chain-specific API URLs
const CHAIN_API_URLS: Record<number, string> = {
  1: 'https://api.etherscan.io/api',
  56: 'https://api.bscscan.com/api',
  137: 'https://api.polygonscan.com/api',
  42161: 'https://api.arbiscan.io/api',
  10: 'https://api-optimistic.etherscan.io/api',
  8453: 'https://api.basescan.org/api',
  43114: 'https://api.snowtrace.io/api',
  250: 'https://api.ftmscan.com/api',
};

// Cache for holders data (TTL: 1 hour)
const holdersCache = new Map<string, { data: TokenHolder[]; timestamp: number; totalSupply?: string; source: string }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 DEMO DATA - Realistic top holder patterns
// ═══════════════════════════════════════════════════════════════════════════════
function generateDemoHolders ( contractAddress: string, symbol: string ): TokenHolder[]
{
  // Generate deterministic addresses based on contract for consistency
  const seed = contractAddress.slice( 2, 10 );
  const seedNum = parseInt( seed, 16 );
  const holders: TokenHolder[] = [];

  // Known exchange/protocol address patterns
  const knownPatterns = [
    { prefix: '0x28C6c0', name: 'Binance' },
    { prefix: '0x21a31E', name: 'Coinbase' },
    { prefix: '0xF97722', name: 'Kraken' },
    { prefix: '0x1B2950', name: 'OKX' },
    { prefix: '0x47ac0F', name: 'Treasury' },
    { prefix: '0x88940e', name: 'Whale 1' },
    { prefix: '0x5E3918', name: 'Whale 2' },
    { prefix: '0x3f5CE5', name: 'Smart Contract' },
    { prefix: '0xDC76CD', name: 'Bitfinex' },
    { prefix: '0x742d35', name: 'Gemini' },
  ];

  for ( let i = 0; i < 100; i++ )
  {
    const pattern = knownPatterns[ i % knownPatterns.length ];
    const hexIndex = ( seedNum + i * 17 ) % 0xFFFFFFFF;

    // Generate realistic address
    const midPart = hexIndex.toString( 16 ).padStart( 8, '0' );
    const endPart = ( ( seedNum * ( i + 1 ) ) % 0xFFFFFFFF ).toString( 16 ).padStart( 8, '0' );
    const address = `${ pattern.prefix }${ midPart }${ endPart }`.slice( 0, 42 ).toLowerCase();

    // Calculate share using Zipf-like distribution (realistic for token holders)
    let share: number;
    if ( i === 0 ) share = 8 + ( seedNum % 10 );
    else if ( i < 3 ) share = 5 + ( ( seedNum + i ) % 5 );
    else if ( i < 10 ) share = 2 + ( ( seedNum + i ) % 3 );
    else if ( i < 30 ) share = 0.5 + ( ( seedNum + i ) % 150 ) / 100;
    else if ( i < 60 ) share = 0.1 + ( ( seedNum + i ) % 40 ) / 100;
    else share = 0.01 + ( ( seedNum + i ) % 10 ) / 100;

    // Generate balance based on share (assuming 1B total supply with 18 decimals)
    const totalSupplyBase = BigInt( '1000000000' ); // 1 billion
    const decimals = BigInt( '1000000000000000000' ); // 10^18
    const balance = ( totalSupplyBase * decimals * BigInt( Math.floor( share * 100 ) ) ) / BigInt( 10000 );

    holders.push( {
      rank: i + 1,
      address,
      balance: balance.toString(),
      balanceFormatted: Number( share ) * 10000000, // Simplified
      share: Math.round( share * 100 ) / 100,
    } );
  }

  return holders;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 FETCH TOP HOLDERS
// ═══════════════════════════════════════════════════════════════════════════════
async function fetchTopHolders (
  contractAddress: string,
  chainId: number,
  symbol: string
): Promise<{ holders: TokenHolder[]; totalSupply?: string; source: string }>
{
  const cacheKey = `${ chainId }-${ contractAddress }`;
  const cached = holdersCache.get( cacheKey );

  // Return cached if fresh
  if ( cached && Date.now() - cached.timestamp < CACHE_TTL_MS )
  {
    return { holders: cached.data, totalSupply: cached.totalSupply, source: cached.source };
  }

  // Try Etherscan API if we have a PRO key
  const baseUrl = CHAIN_API_URLS[ chainId ];

  if ( baseUrl && ETHERSCAN_API_KEY && ETHERSCAN_API_KEY.length > 10 )
  {
    try
    {
      const url = new URL( baseUrl );
      url.searchParams.set( 'module', 'token' );
      url.searchParams.set( 'action', 'tokenholderlist' );
      url.searchParams.set( 'contractaddress', contractAddress );
      url.searchParams.set( 'page', '1' );
      url.searchParams.set( 'offset', '100' );
      url.searchParams.set( 'apikey', ETHERSCAN_API_KEY );

      console.log( `[whales] Trying Etherscan for ${ symbol } on chain ${ chainId }` );

      const res = await fetch( url.toString(), {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      } );

      if ( res.ok )
      {
        const data = await res.json();

        if ( data.status === '1' && Array.isArray( data.result ) && data.result.length > 0 )
        {
          const rawHolders = data.result;
          let totalBalance = BigInt( 0 );

          for ( const h of rawHolders )
          {
            try { totalBalance += BigInt( h.TokenHolderQuantity || '0' ); }
            catch { }
          }

          const holders: TokenHolder[] = rawHolders.map( ( h: any, idx: number ) =>
          {
            const balance = h.TokenHolderQuantity || '0';
            let balanceBigInt = BigInt( 0 );
            try { balanceBigInt = BigInt( balance ); } catch { }

            const share = totalBalance > BigInt( 0 )
              ? Number( ( balanceBigInt * BigInt( 10000 ) ) / totalBalance ) / 100
              : 0;

            return {
              rank: idx + 1,
              address: h.TokenHolderAddress || '',
              balance,
              balanceFormatted: Number( balanceBigInt ) / 1e18,
              share,
            };
          } );

          // Cache successful response
          holdersCache.set( cacheKey, {
            data: holders,
            timestamp: Date.now(),
            totalSupply: totalBalance.toString(),
            source: 'Etherscan PRO API',
          } );

          console.log( `[whales] Success! Got ${ holders.length } holders from Etherscan` );
          return { holders, totalSupply: totalBalance.toString(), source: 'Etherscan PRO API' };
        }
        else
        {
          console.log( `[whales] Etherscan returned: ${ data.message || 'No data' }` );
        }
      }
    } catch ( err: any )
    {
      console.log( `[whales] Etherscan failed: ${ err.message }` );
    }
  }

  // Fallback to demo data
  console.log( `[whales] Using demo data for ${ symbol } on chain ${ chainId }` );
  const demoHolders = generateDemoHolders( contractAddress, symbol );

  // Cache demo data
  holdersCache.set( cacheKey, {
    data: demoHolders,
    timestamp: Date.now(),
    totalSupply: '1000000000000000000000000000',
    source: 'Demo Data',
  } );

  return {
    holders: demoHolders,
    totalSupply: '1000000000000000000000000000',
    source: 'Demo Data (Etherscan PRO API required for live data)'
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🌐 API HANDLER
// ═══════════════════════════════════════════════════════════════════════════════
export async function GET ( request: NextRequest )
{
  const { searchParams } = new URL( request.url );

  const tokenId = searchParams.get( 'tokenId' );
  const pageStr = searchParams.get( 'page' ) || '1';
  const pageSizeStr = searchParams.get( 'pageSize' ) || '25';

  // Validate
  if ( !tokenId )
  {
    return NextResponse.json(
      { error: 'Missing tokenId parameter' },
      { status: 400 }
    );
  }

  const token = getTokenById( tokenId );
  if ( !token )
  {
    return NextResponse.json(
      { error: 'Token not found', message: `No token with id: ${ tokenId }` },
      { status: 404 }
    );
  }

  const page = Math.max( 1, parseInt( pageStr, 10 ) || 1 );
  const pageSize = Math.min( 100, Math.max( 1, parseInt( pageSizeStr, 10 ) || 25 ) );

  try
  {
    const { holders, totalSupply, source } = await fetchTopHolders(
      token.contractAddress,
      token.chainId,
      token.symbol
    );

    // Paginate
    const totalHolders = holders.length;
    const totalPages = Math.ceil( totalHolders / pageSize );
    const clampedPage = Math.min( page, totalPages || 1 );
    const startIdx = ( clampedPage - 1 ) * pageSize;
    const endIdx = startIdx + pageSize;
    const pagedHolders = holders.slice( startIdx, endIdx );

    const response: WhalesApiResponse = {
      tokenId: token.id,
      symbol: token.symbol,
      name: token.name,
      chainId: token.chainId,
      chainName: token.chainName,
      contractAddress: token.contractAddress,
      holders: pagedHolders,
      totalHolders,
      totalSupply,
      page: clampedPage,
      pageSize,
      totalPages,
      lastUpdated: new Date().toISOString(),
      source,
    };

    return NextResponse.json( response );
  } catch ( err: any )
  {
    console.error( '[whales] Handler error:', err.message );
    return NextResponse.json(
      { error: 'Failed to fetch holders', message: err.message },
      { status: 500 }
    );
  }
}
