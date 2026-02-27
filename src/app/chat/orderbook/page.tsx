import { VerticalOrderBook } from "@/components/orderbook/VerticalOrderBook";

export default function OrderBookPage() {
  return (
    <div className="h-full w-full text-white overflow-hidden" style={{ background: 'linear-gradient(54deg, #264a46, #1d2b28, #183e3a, #1a3232, #141f1f)' }}>
      <VerticalOrderBook />
    </div>
  );
}
