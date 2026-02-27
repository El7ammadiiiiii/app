/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  Visualizer Controls — 5-Mode Toolbar with Keyboard Shortcuts   ║
 * ║  Premium glass design with #1d3e3b blur + edge glow             ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

'use client';

import React, { useEffect } from 'react';
import { useVisualizerStore } from '@/lib/onchain/visualizer-store';
import {
  CONTROL_MODES,
  TOKEN_CONTROL_MODES,
  MODE_CONFIG,
  type ControlMode,
} from '@/lib/onchain/visualizer-types';

/* ═══════════════════════ Cursor SVG (Default mode) ═════════════ */

function DefaultCursorIcon() {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="currentColor"
      className="w-5 h-5 opacity-50 group-hover:opacity-100
                 transition-opacity"
    >
      <path d="M123.193 29.635L121 406.18l84.31-82.836 65.87 159.02 67.5-27.96-65.87-159.02L391 294.342z" />
    </svg>
  );
}

/* ═══════════════════════ Props ══════════════════════════════════ */

interface VisualizerControlsProps {
  /** 'entity' uses all 5 modes, 'token' uses 3 */
  graphMode: 'entity' | 'token';
}

/* ═══════════════════════ Component ══════════════════════════════ */

export default function VisualizerControls({ graphMode }: VisualizerControlsProps) {
  const { controlMode, setControlMode } = useVisualizerStore();
  const modes = graphMode === 'entity' ? CONTROL_MODES : TOKEN_CONTROL_MODES;

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      for (const mode of modes) {
        if (e.key.toLowerCase() === MODE_CONFIG[mode].key.toLowerCase()) {
          setControlMode(mode);
          e.preventDefault();
          return;
        }
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [modes, setControlMode]);

  return (
    <div
      className="
        pointer-events-auto flex flex-col gap-2.5 p-1.5 rounded-lg
        md:flex-col max-md:flex-row max-md:gap-2.5
        relative overflow-hidden
      "
      style={{
        backgroundColor: 'rgba(29, 62, 59, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: `
          0 0 1px rgba(20, 184, 166, 0.4),
          0 0 8px rgba(20, 184, 166, 0.15),
          inset 0 0.5px 0 rgba(255, 255, 255, 0.08)
        `,
        border: '1px solid rgba(20, 184, 166, 0.2)',
      }}
    >
      {modes.map((mode) => {
        const config = MODE_CONFIG[mode];
        const isActive = controlMode === mode;

        return (
          <button
            key={mode}
            onClick={() => setControlMode(mode)}
            title={config.label}
            className={`
              group relative w-9 h-9 p-1.5 rounded-md
              flex items-center justify-center
              transition-all duration-200 cursor-pointer
              ${
                isActive
                  ? 'border border-teal-400/60 bg-teal-400/10 shadow-[0_0_6px_rgba(20,184,166,0.3)]'
                  : 'border border-transparent hover:bg-white/5'
              }
            `}
          >
            {config.icon ? (
              <img
                src={config.icon}
                alt={config.label}
                className={`
                  w-5 h-5 transition-opacity
                  ${isActive ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'}
                `}
              />
            ) : (
              <DefaultCursorIcon />
            )}

            {/* Tooltip */}
            <div
              className="
                absolute right-full mr-2.5 top-1/2 -translate-y-1/2
                px-2.5 py-1 rounded-md text-xs text-white/90 font-mono
                whitespace-nowrap opacity-0 pointer-events-none
                group-hover:opacity-100 transition-opacity
                max-md:hidden
              "
              style={{
                backgroundColor: 'rgba(29, 62, 59, 0.9)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(20, 184, 166, 0.2)',
              }}
            >
              {config.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}
