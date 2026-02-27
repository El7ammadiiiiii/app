/**
 * GET /api/onchain/token/holders?address=...&chain=... or ?pricingID=...
 * Proxy to backend for token top holders
 */

import { NextRequest } from 'next/server';
import { proxyGet } from '@/lib/onchain/serverProxy';

export async function GET(req: NextRequest) {
  return proxyGet(req, '/onchain/token/holders');
}
