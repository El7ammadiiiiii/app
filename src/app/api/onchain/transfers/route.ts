/**
 * GET /api/onchain/transfers
 * Proxy to backend for fetching transfers (entity & token visualizer)
 */

import { NextRequest } from 'next/server';
import { proxyGet } from '@/lib/onchain/serverProxy';

export async function GET(req: NextRequest) {
  return proxyGet(req, '/onchain/transfers');
}
