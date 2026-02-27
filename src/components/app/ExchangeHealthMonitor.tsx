/**
 * 🏥 Exchange Health Monitor - مراقب صحة المنصات
 * يعرض حالة الـ 12 منصة والمنصة النشطة حالياً مع دعم التبديل التلقائي
 * @author CCWAYS Team
 */

"use client";

import React, { useEffect, useState } from 'react';
import { exchangeOrchestrator, ExchangeStatus } from '@/lib/services/ExchangeOrchestrator';
import { useIntegrationStore } from '@/store/integrationStore';

export const ExchangeHealthMonitor: React.FC = () => {
  const [statuses, setStatuses] = useState<ExchangeStatus[]>([]);
  const [activeExchange, setActiveExchange] = useState<string>('bybit');
  const { selectedExchanges } = useIntegrationStore();

  useEffect(() => {
    const updateStatus = () => {
      setStatuses(exchangeOrchestrator.getStatusReport());
      setActiveExchange(exchangeOrchestrator.getActiveExchange());
    };

    // تحديث كل 5 ثوانٍ
    const interval = setInterval(updateStatus, 5000);
    updateStatus();

    return () => clearInterval(interval);
  }, [selectedExchanges]);

  return (
    <div className="p-4 bg-black/40 border-b border-white/10 backdrop-blur-md">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          نظام التبديل التلقائي (12 منصة متوازية)
        </h3>
        <div className="text-xs text-gray-400">
          النشطة حالياً: <span className="text-orange-400 font-mono uppercase">{activeExchange}</span>
        </div>
      </div>

      <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
        {statuses.map((status) => (
          <div 
            key={status.id}
            className={`flex flex-col items-center p-1 rounded border transition-all ${
              status.id === activeExchange 
                ? 'border-orange-500 bg-orange-500/10 shadow-[0_0_10px_rgba(249,115,22,0.2)]' 
                : 'border-white/5 bg-white/5'
            }`}
            title={`Latency: ${status.latency}ms | Errors: ${status.errorCount}`}
          >
            <div className="text-[10px] uppercase font-bold mb-1 truncate w-full text-center">
              {status.id}
            </div>
            <div className={`h-1.5 w-full rounded-full ${status.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
          </div>
        ))}
      </div>
    </div>
  );
};
