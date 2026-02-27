/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  /chat/visualizer — Main Visualizer Page                        ║
 * ║  Routes to Entity, Token, or Empty mode via searchParams/path   ║
 * ║  Premium glass UI with #1d3e3b blur + teal edge glow            ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useVisualizerStore } from '@/lib/onchain/visualizer-store';
import VisualizerInputs from '@/components/onchain/VisualizerInputs';

/* ═══════════════════════ Empty Visualizer ═══════════════════════ */

export default function VisualizerPage() {
  const router = useRouter();
  const { reset } = useVisualizerStore();

  useEffect(() => {
    reset();
  }, []);

  const handleSelectEntity = useCallback(
    (id: string) => {
      router.push(`/chat/visualizer/entity/${encodeURIComponent(id)}`);
    },
    [router],
  );

  const handleSelectToken = useCallback(
    (id: string) => {
      router.push(`/chat/visualizer/token/${encodeURIComponent(id)}`);
    },
    [router],
  );

  return (
    <div className="relative w-full h-[calc(100vh-60px)] overflow-hidden">
      {/* ── Background ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#264a46] via-[#1d2b28] to-[#141f1f]" />

      {/* ── Panel ── */}
      <div className="absolute inset-0 pointer-events-none z-[1]">
        <div className="pointer-events-auto p-4 w-full md:w-1/2 max-md:text-[0.7em]">
          <VisualizerInputs
            onSelectEntity={handleSelectEntity}
            onSelectToken={handleSelectToken}
            autoFocus
          />
        </div>
      </div>

      {/* ── Empty State ── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
        {/* Watermark logo */}
        <div className="opacity-[0.06] select-none">
          <svg
            viewBox="0 0 100 100"
            className="w-48 h-48"
            fill="none"
            stroke="currentColor"
            strokeWidth={0.5}
          >
            <circle cx="50" cy="50" r="45" className="text-teal-400" />
            <path
              d="M30 50 L45 35 L70 50 L55 65 Z"
              className="text-teal-300"
              strokeWidth={1}
            />
            <circle cx="45" cy="35" r="3" fill="currentColor" className="text-teal-400" />
            <circle cx="70" cy="50" r="3" fill="currentColor" className="text-teal-400" />
            <circle cx="55" cy="65" r="3" fill="currentColor" className="text-teal-400" />
            <circle cx="30" cy="50" r="3" fill="currentColor" className="text-teal-400" />
          </svg>
        </div>

        <p className="text-sm text-white/20 font-mono text-center max-w-sm px-4">
          Search in the top left corner to visualize entity flows and token holdings
        </p>
      </div>
    </div>
  );
}
