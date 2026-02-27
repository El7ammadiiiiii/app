import { NextRequest } from 'next/server';
import { proxyPost } from '@/lib/onchain/serverProxy';

export async function POST(req: NextRequest) {
  return proxyPost(req, '/ccways/expand');
}
