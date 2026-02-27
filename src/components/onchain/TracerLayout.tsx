/**
 * TracerLayout — Mobile-first responsive layout (matches cways-tracker Tracer)
 *
 * Desktop (≥768px): flex-row → sidebar (30em) | graph (flex-grow)
 * Mobile  (<768px): block    → toolbar, graph (full), sidebar (overlay)
 *
 * Both desktop + mobile toolbars render in DOM; CSS toggles visibility.
 */

"use client";

import React from "react";
import { useTracerStore } from "@/lib/onchain/tracer-store";

interface TracerLayoutProps {
  desktopToolbar: React.ReactNode;
  mobileToolbar: React.ReactNode;
  sidebar: React.ReactNode;
  graph: React.ReactNode;
  flowPanel?: React.ReactNode;
  toggleMenu?: React.ReactNode;
}

export function TracerLayout({
  desktopToolbar,
  mobileToolbar,
  sidebar,
  graph,
  flowPanel,
  toggleMenu,
}: TracerLayoutProps) {
  const sidebarOpen = useTracerStore((s) => s.sidebarOpen);
  const toggleSidebar = useTracerStore((s) => s.toggleSidebar);

  return (
    <div
      className="relative flex h-full w-full overflow-hidden font-mono"
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
    >
      {/* ───── Desktop Toolbar (hidden on mobile) ───── */}
      <div className="hidden md:flex absolute top-0 left-0 right-0 z-20 items-center justify-between px-4 h-10"
        style={{
          background: 'rgba(29,62,59,0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(20,184,166,0.15)',
          boxShadow: '0 1px 12px rgba(20,184,166,0.08)',
        }}
      >
        {desktopToolbar}
      </div>

      {/* ───── Mobile Toolbar (hidden on desktop) ───── */}
      <div className="flex md:hidden absolute top-0 left-0 right-0 z-20 items-center justify-center px-2 h-10"
        style={{
          background: 'rgba(29,62,59,0.9)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(20,184,166,0.15)',
          boxShadow: '0 1px 12px rgba(20,184,166,0.08)',
        }}
      >
        {mobileToolbar}
      </div>

      {/* ───── Main Content Area (below toolbar) ───── */}
      <div className="flex w-full h-full pt-10 flex-col md:flex-row">
        {/* ── Sidebar: fixed width on desktop, overlay on mobile ── */}

        {/* Desktop sidebar */}
        <div
          className="hidden md:flex flex-col flex-shrink-0 w-[30em] h-full overflow-y-auto"
          style={{
            background: 'rgba(29,62,59,0.75)',
            backdropFilter: 'blur(20px)',
            borderRight: '1px solid rgba(20,184,166,0.12)',
            boxShadow: 'inset -1px 0 0 rgba(20,184,166,0.06)',
          }}
        >
          {sidebar}
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-30 pt-10">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={toggleSidebar}
            />
            {/* Sidebar panel */}
            <div
              className="relative z-10 w-full overflow-y-auto max-h-[70vh] rounded-b-2xl text-[1.2em]"
              style={{
                background: 'rgba(29,62,59,0.92)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(20,184,166,0.15)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 1px 12px rgba(20,184,166,0.08)',
              }}
            >
              {sidebar}
              {/* Collapse button */}
              <div className="flex justify-center py-2">
                <button
                  onClick={toggleSidebar}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-white text-lg transition-colors"
                  style={{ background: 'rgba(20,184,166,0.25)', border: '1px solid rgba(20,184,166,0.3)' }}
                  aria-label="Close sidebar"
                >
                  ▲
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Graph Container: fills remaining space ── */}
        <div className="relative flex-grow h-full overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a3232 0%, #141f1f 40%, #0f1a1a 100%)' }}>
          {graph}

          {/* Desktop watermark */}
          <div className="hidden md:flex absolute top-2 left-1/2 -translate-x-1/2 z-10 items-center gap-2 opacity-15 pointer-events-none select-none">
            <img src="/icons/tracer/logo_watermark_2.svg" alt="" className="h-6" />
            <span className="text-slate-400 text-sm font-light tracking-widest">CCWAYS</span>
          </div>

          {/* Mobile watermark (smaller) */}
          <div className="flex md:hidden absolute top-2 left-1/2 -translate-x-1/2 z-10 items-center gap-1 opacity-15 pointer-events-none select-none">
            <img src="/icons/tracer/logo_watermark_2.svg" alt="" className="h-4" />
            <span className="text-slate-400 text-xs font-light tracking-widest">CCWAYS</span>
          </div>

          {/* Flow Panel (desktop: absolute bottom-right, mobile: bottom-sheet) */}
          {flowPanel && (
            <>
              {/* Desktop flow panel */}
              <div className="hidden md:block absolute bottom-0 right-4 z-10 w-[50em] max-h-[50em]">
                {flowPanel}
              </div>
              {/* Mobile flow panel */}
              <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 max-h-[60vh] bg-[#0f172a] border-t border-slate-700/50 rounded-t-2xl overflow-y-auto">
                {flowPanel}
              </div>
            </>
          )}

          {/* Toggle Menu */}
          {toggleMenu && (
            <>
              {/* Desktop: bottom center (under chart) */}
              <div className="hidden md:flex absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex-row gap-1.5">
                {toggleMenu}
              </div>
              {/* Mobile: horizontal bottom */}
              <div className="flex md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex-row gap-1.5">
                {toggleMenu}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ───── Mobile sidebar toggle (chevron at bottom-left on mobile) ───── */}
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed bottom-4 left-4 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-500 active:scale-95 transition-all"
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? "▼" : "▲"}
      </button>
    </div>
  );
}
