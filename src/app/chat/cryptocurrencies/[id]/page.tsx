import CryptoDetail from '@/components/crypto/CryptoDetail';

export default async function CoinDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CryptoDetail id={id} />;
}
