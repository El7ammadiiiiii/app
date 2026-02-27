/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  Visualizer Drawer — Legend, Flow Filters, Transaction List     ║
 * ║  Premium glass panel with animated transitions                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

'use client';

import React from 'react';
import { useVisualizerStore } from '@/lib/onchain/visualizer-store';
import {
  LEGEND_CATEGORIES,
  ENTITY_TYPE_COLORS,
  type FlowDirection,
  type Transfer,
} from '@/lib/onchain/visualizer-types';
import VisualizerInfo from './VisualizerInfo';

/* ═══════════════════════ Flow Button ════════════════════════════ */

function FlowButton({
  flow,
  current,
  onClick,
}: {
  flow: FlowDirection;
  current: FlowDirection;
  onClick: (f: FlowDirection) => void;
}) {
  const labels: Record<FlowDirection, string> = {
    all: 'All',
    in: 'Inflow',
    out: 'Outflow',
    self: 'Self',
  };

  const colors: Record<FlowDirection, string> = {
    all: 'rgba(255, 255, 255, 0.7)',
    in: '#22c55e',
    out: '#ef4444',
    self: '#eab308',
  };

  const isActive = current === flow;

  return (
    <button
      onClick={() => onClick(flow)}
      className={`
        px-2.5 py-1 rounded text-xs font-mono transition-all duration-200
        ${isActive ? 'ring-1 ring-teal-400/50' : 'hover:bg-white/5'}
      `}
      style={{
        color: isActive ? colors[flow] : 'rgba(255, 255, 255, 0.4)',
        backgroundColor: isActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
      }}
    >
      {labels[flow]}
    </button>
  );
}

/* ═══════════════════════ Props ══════════════════════════════════ */

interface VisualizerDrawerProps {
  graphMode: 'entity' | 'token';
  transfers: Transfer[];
  base?: string[];
}

/* ═══════════════════════ Component ══════════════════════════════ */

export default function VisualizerDrawer({
  graphMode,
  transfers,
  base,
}: VisualizerDrawerProps) {
  const {
    drawerOpen,
    hiddenTypes,
    toggleEntityType,
    flowDirection,
    setFlowDirection,
    infoObject,
  } = useVisualizerStore();

  return (
    <div
      className="origin-top transition-all duration-300 ease-in-out overflow-hidden"
      style={{
        transform: drawerOpen ? 'scaleY(1)' : 'scaleY(0)',
        maxHeight: drawerOpen ? '100%' : '0',
        opacity: drawerOpen ? 1 : 0,
      }}
    >
      {/* ── Legend + Info Grid ── */}
      <div
        className="grid gap-x-6 gap-y-2 p-3 rounded-lg mt-2"
        style={{
          gridTemplateColumns: '1fr auto 1fr',
          backgroundColor: 'rgba(29, 62, 59, 0.6)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(20, 184, 166, 0.12)',
          boxShadow: '0 0 12px rgba(20, 184, 166, 0.08)',
        }}
      >
        {/* Left: Explorer / Info */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-teal-400/70 tracking-wider uppercase">
            Explorer
          </span>
          <div className="text-xs">
            <VisualizerInfo
              object={infoObject}
              base={graphMode === 'entity' ? base : undefined}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-white/8 self-stretch" />

        {/* Right: Filter Controls */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-mono text-teal-400/70 tracking-wider uppercase">
            Filter Transfers
          </span>

          {/* Entity type toggles */}
          <div className="flex flex-col gap-1">
            {LEGEND_CATEGORIES.map((cat) => {
              const isHidden = cat.types.some((t) => hiddenTypes[t]);
              const dotColor =
                cat.name === 'All'
                  ? 'rgba(255, 255, 255, 0.8)'
                  : ENTITY_TYPE_COLORS[cat.types[0]] ?? '#42444B';

              return (
                <button
                  key={cat.name}
                  onClick={() => toggleEntityType(cat.types)}
                  className={`
                    flex items-center gap-2 px-1.5 py-0.5 rounded
                    text-xs font-mono text-left transition-all duration-200
                    hover:bg-white/5 cursor-pointer
                  `}
                  style={{ opacity: isHidden ? 0.35 : 1 }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: dotColor }}
                  />
                  <span className="text-white/70">{cat.name}</span>
                  <svg
                    className="w-3 h-3 ml-auto opacity-40"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 .894 1.447l-5.894 11.789V20a1 1 0 0 1-.553.894l-4 2A1 1 0 0 1 9 22v-5.764L3.106 4.447A1 1 0 0 1 3 4z" />
                  </svg>
                </button>
              );
            })}
          </div>

          {/* Flow direction */}
          <div className="flex gap-1 mt-1">
            {(['all', 'in', 'out', 'self'] as FlowDirection[]).map((f) => (
              <FlowButton
                key={f}
                flow={f}
                current={flowDirection}
                onClick={setFlowDirection}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Transactions ── */}
      <div className="mt-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-teal-900/50">
        {transfers.slice(0, 25).map((tx, i) => {
          const fromLabel =
            tx.fromAddress.knownEntity?.name ??
            tx.fromAddress.userEntity?.name ??
            `${tx.fromAddress.address.slice(0, 6)}…${tx.fromAddress.address.slice(-4)}`;
          const toLabel =
            tx.toAddress.knownEntity?.name ??
            tx.toAddress.userEntity?.name ??
            `${tx.toAddress.address.slice(0, 6)}…${tx.toAddress.address.slice(-4)}`;
          const usd = tx.historicalUSD ?? 0;
          const usdStr = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
            maximumFractionDigits: 2,
          }).format(usd);

          return (
            <div
              key={tx.id ?? i}
              className="
                flex items-center gap-2 px-2 py-1.5 text-xs font-mono
                text-white/60 hover:bg-white/3 cursor-pointer
                transition-colors border-b border-white/3 last:border-0
              "
              onClick={() => useVisualizerStore.getState().setInfoObject(tx)}
            >
              <span className="truncate flex-1">{fromLabel}</span>
              <span className="text-teal-400/50">→</span>
              <span className="truncate flex-1">{toLabel}</span>
              <span className="text-right min-w-[60px] text-white/40">{usdStr}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
