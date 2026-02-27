// ========================================
// /chat/orderbook-heatmap — Order Book Heatmap Page
// ========================================
'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamic import — WebGL doesn't work server-side
const OrderBookHeatmap = dynamic(
  () => import('@/components/orderbook-heatmap/OrderBookHeatmap').then(m => m.OrderBookHeatmap),
  { ssr: false }
);
const HeatmapControls = dynamic(
  () => import('@/components/orderbook-heatmap/HeatmapControls').then(m => m.HeatmapControls),
  { ssr: false }
);

export default function OrderBookHeatmapPage() {
  return (
    <div className="flex flex-col h-full w-full gap-0 overflow-hidden" style={{ background: 'linear-gradient(54deg, #264a46, #1d2b28, #183e3a, #1a3232, #141f1f)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#141f1f]/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 via-yellow-500 to-green-500 flex items-center justify-center">
            <span className="text-white text-sm font-bold">OB</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Order Book Heatmap</h1>
            <p className="text-[10px] text-white/40">خريطة حرارية لعمق الأوردر بوك — تجميع متعدد البورصات</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Heatmap Canvas (main area) */}
        <div className="flex-1 relative">
          <OrderBookHeatmap />
        </div>

        {/* Controls Panel (right sidebar) */}
        <div className="w-64 border-l border-white/5 overflow-y-auto bg-[#141f1f]/50">
          <HeatmapControls />
        </div>
      </div>
    </div>
  );
}
