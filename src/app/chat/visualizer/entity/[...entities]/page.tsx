/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  /chat/visualizer/entity/[...entities] — Entity Visualizer      ║
 * ║  Full-featured force-directed graph + controls + drawer + info   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useVisualizerStore } from '@/lib/onchain/visualizer-store';
import type { Transfer, TransferFilter } from '@/lib/onchain/visualizer-types';
import { DEFAULT_ENTITY_FILTER } from '@/lib/onchain/visualizer-types';
import VisualizerGraph from '@/components/onchain/VisualizerGraph';
import VisualizerControls from '@/components/onchain/VisualizerControls';
import VisualizerDrawer from '@/components/onchain/VisualizerDrawer';
import VisualizerInputs from '@/components/onchain/VisualizerInputs';

/* ═══════════════════════ Component ══════════════════════════════ */

export default function EntityVisualizerPage() {
  const params = useParams();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const {
    setMode,
    entityState,
    setEntityState,
    setEntityBase,
    setEntityFilter,
    transfers,
    setTransfers,
    isLoading,
    setIsLoading,
    error,
    setError,
    drawerOpen,
  } = useVisualizerStore();

  /* ── Parse entities from URL ── */
  const entities = useMemo(() => {
    const raw = params.entities;
    if (!raw) return [];
    const joined = Array.isArray(raw) ? raw.join(',') : raw;
    return decodeURIComponent(joined)
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
  }, [params.entities]);

  /* ── Initialize mode & base ── */
  useEffect(() => {
    setMode('entity');
    if (entities.length > 0) {
      setEntityBase(entities);
    }
  }, [entities]);

  /* ── Fetch transfers ── */
  useEffect(() => {
    if (entities.length === 0) return;

    const fetchTransfers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const filter: TransferFilter = {
          ...DEFAULT_ENTITY_FILTER,
          ...entityState.filter,
          base: entities,
        };

        const queryParams = new URLSearchParams();
        if (filter.base) queryParams.set('base', filter.base.join(','));
        if (filter.flow) queryParams.set('flow', filter.flow);
        if (filter.usdGte != null) queryParams.set('usdGte', String(filter.usdGte));
        if (filter.usdLte != null) queryParams.set('usdLte', String(filter.usdLte));
        if (filter.sortKey) queryParams.set('sortKey', filter.sortKey);
        if (filter.sortDir) queryParams.set('sortDir', filter.sortDir);
        if (filter.limit != null) queryParams.set('limit', String(filter.limit));
        if (filter.offset != null) queryParams.set('offset', String(filter.offset));
        if (filter.timeGte != null) queryParams.set('timeGte', String(filter.timeGte));
        if (filter.timeLte != null) queryParams.set('timeLte', String(filter.timeLte));
        if (filter.chains?.length) queryParams.set('chains', filter.chains.join(','));

        const res = await fetch(`/api/onchain/transfers?${queryParams.toString()}`);
        const data = await res.json();

        if (data.transfers) {
          setTransfers(data.transfers);
        } else if (data.data?.transfers) {
          setTransfers(data.data.transfers);
        } else {
          setTransfers([]);
        }
      } catch (err: any) {
        setError(err.message ?? 'Failed to fetch transfers');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransfers();
  }, [entities, entityState.filter]);

  /* ── Resize observer ── */
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  /* ── Navigation ── */
  const handleSelectEntity = useCallback(
    (id: string) => {
      const newBase = [...entityState.base, id];
      router.push(`/chat/visualizer/entity/${newBase.join(',')}`);
    },
    [entityState.base, router],
  );

  const handleSelectToken = useCallback(
    (id: string) => {
      router.push(`/chat/visualizer/token/${encodeURIComponent(id)}`);
    },
    [router],
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-60px)] overflow-hidden"
    >
      {/* ── Background ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#264a46] via-[#1d2b28] to-[#141f1f]" />

      {/* ── Graph Layer ── */}
      <VisualizerGraph
        graphMode="entity"
        transfers={transfers}
        width={dimensions.width}
        height={dimensions.height}
      />

      {/* ── Panel (Left) ── */}
      <div
        className="
          absolute inset-0 pointer-events-none z-[1]
          inline-grid
          w-full md:w-1/2 h-full
          p-4 md:pb-28
          max-md:text-[0.7em]
        "
        style={{ gridTemplateRows: 'auto 1fr' }}
      >
        <div className="pointer-events-auto">
          <VisualizerInputs
            onSelectEntity={handleSelectEntity}
            onSelectToken={handleSelectToken}
          />
        </div>
        <div className="pointer-events-auto overflow-hidden">
          <VisualizerDrawer
            graphMode="entity"
            transfers={transfers}
            base={entityState.base}
          />
        </div>
      </div>

      {/* ── Controls (Right) ── */}
      <div
        className="
          absolute z-[1]
          md:top-[6.5em] md:right-0 md:m-4
          max-md:bottom-0 max-md:right-0 max-md:m-4
          flex flex-col gap-4
        "
      >
        <VisualizerControls graphMode="entity" />
      </div>

      {/* ── Loading Overlay ── */}
      {isLoading && (
        <div
          className="absolute inset-0 z-[2] flex items-center justify-center"
          style={{ backdropFilter: 'blur(2px)' }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
            <span className="text-sm text-white/50 font-mono">Loading transfers…</span>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[3]">
          <div
            className="px-4 py-2 rounded-lg text-xs font-mono text-red-300/80"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {error}
          </div>
        </div>
      )}

      {/* ── Watermark ── */}
      <div className="absolute bottom-4 left-4 opacity-[0.06] pointer-events-none max-md:hidden">
        <svg viewBox="0 0 100 100" className="w-28 h-28" fill="none" stroke="currentColor" strokeWidth={0.5}>
          <circle cx="50" cy="50" r="45" className="text-teal-400" />
          <path d="M30 50 L45 35 L70 50 L55 65 Z" className="text-teal-300" strokeWidth={1} />
        </svg>
      </div>
    </div>
  );
}
