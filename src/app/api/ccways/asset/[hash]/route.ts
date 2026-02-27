import { NextRequest } from 'next/server';
import { proxyGet } from '@/lib/onchain/serverProxy';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  const { hash } = await params;
  return proxyGet(req, `/ccways/asset/${hash}`);
}
