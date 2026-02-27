import { NextRequest } from 'next/server';
import { proxyGet } from '@/lib/onchain/serverProxy';

export async function GET(req: NextRequest) {
  return proxyGet(req, '/ccways/chains');
}
