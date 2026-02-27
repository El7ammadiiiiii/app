/**
 * GET /api/onchain/intelligence/search?q=...
 * Proxy to backend for entity/address/token search
 */

import { NextRequest } from 'next/server';
import { proxyGet } from '@/lib/onchain/serverProxy';

export async function GET(req: NextRequest) {
  return proxyGet(req, '/onchain/intelligence/search');
}
