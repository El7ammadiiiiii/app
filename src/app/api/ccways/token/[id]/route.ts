import { NextRequest } from 'next/server';
import { proxyGet } from '@/lib/onchain/serverProxy';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyGet(req, `/ccways/token/${id}`);
}
