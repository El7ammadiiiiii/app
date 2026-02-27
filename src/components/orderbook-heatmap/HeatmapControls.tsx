// ========================================
// Heatmap Controls — Settings Panel
// Exchange selector, symbol, sensitivity, grouping, toggles
// ========================================
'use client';

import React from 'react';
import { useHeatmapStore } from './heatmapStore';
import { EXCHANGE_NAMES, DEFAULT_EXCHANGES } from './types';
import { GROUPING_OPTIONS } from './PriceBinning';

const SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT',
  'LINKUSDT', 'ATOMUSDT', 'NEARUSDT', 'APTUSDT', 'ARBUSDT',
];

export function HeatmapControls() {
  const {
    selectedExchanges,
    selectedSymbol,
    sensitivity,
    grouping,
    resolvedGrouping,
    showVPVR,
    showTrades,
    isConnected,
    exchangeCount,
    lastUpdateTime,
    fps,
    toggleExchange,
    setSelectedSymbol,
    setSensitivity,
    setGrouping,
    setShowVPVR,
    setShowTrades,
    setSelectedExchanges,
  } = useHeatmapStore();

  return (
    <div className="flex flex-col gap-3 p-3 bg-[#141f1f] border border-white/10 rounded-lg text-xs">
      {/* Status Bar */}
      <div className="flex items-center gap-2 text-[10px]">
        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-white/50">
          {isConnected
            ? `Aggregated ${exchangeCount} markets`
            : 'Connecting...'}
        </span>
        {fps > 0 && (
          <span className="text-white/30 ml-auto">{fps} FPS</span>
        )}
      </div>

      {/* Symbol Selector */}
      <div>
        <label className="text-white/40 text-[10px] block mb-1">الزوج</label>
        <select
          value={selectedSymbol}
          onChange={(e) => setSelectedSymbol(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-yellow-500/50"
        >
          {SYMBOLS.map((s) => (
            <option key={s} value={s} className="bg-[#141f1f]">
              {s.replace('USDT', '/USDT')}
            </option>
          ))}
        </select>
      </div>

      {/* Exchange Selector — hidden from user, exchanges work in background */}
      {/* Exchanges are auto-selected via DEFAULT_EXCHANGES */}

      {/* Sensitivity Slider */}
      <div>
        <label className="text-white/40 text-[10px] block mb-1">
          الحساسية: {sensitivity.min.toFixed(0)} – {sensitivity.max.toFixed(0)}
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="range"
            min={0}
            max={200}
            step={1}
            value={sensitivity.min}
            onChange={(e) =>
              setSensitivity({ ...sensitivity, min: Number(e.target.value) })
            }
            className="flex-1 h-1 accent-yellow-500"
          />
          <input
            type="range"
            min={1}
            max={500}
            step={1}
            value={sensitivity.max}
            onChange={(e) =>
              setSensitivity({ ...sensitivity, max: Number(e.target.value) })
            }
            className="flex-1 h-1 accent-yellow-500"
          />
        </div>
      </div>

      {/* Grouping Selector */}
      <div>
        <label className="text-white/40 text-[10px] block mb-1">
          التجميع السعري
          {grouping === 'auto' && resolvedGrouping > 0 && (
            <span className="text-white/20 ml-1">(={resolvedGrouping})</span>
          )}
        </label>
        <div className="flex flex-wrap gap-1">
          {GROUPING_OPTIONS.filter((_, i) => i < 8).map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => setGrouping(opt.value)}
              className={`
                px-2 py-0.5 rounded text-[9px] transition-all
                ${grouping === opt.value
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-white/5 text-white/30 border border-transparent hover:bg-white/10'
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toggle Switches */}
      <div className="flex gap-3">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showVPVR}
            onChange={(e) => setShowVPVR(e.target.checked)}
            className="w-3 h-3 rounded accent-green-500"
          />
          <span className="text-white/50 text-[10px]">VPVR</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showTrades}
            onChange={(e) => setShowTrades(e.target.checked)}
            className="w-3 h-3 rounded accent-green-500"
          />
          <span className="text-white/50 text-[10px]">Trades</span>
        </label>
      </div>

      {/* Last Update */}
      {lastUpdateTime > 0 && (
        <div className="text-[9px] text-white/20 text-center">
          آخر تحديث: {new Date(lastUpdateTime).toLocaleTimeString('ar-SA')}
        </div>
      )}
    </div>
  );
}
