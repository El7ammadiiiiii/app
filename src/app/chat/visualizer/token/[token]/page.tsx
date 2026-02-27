/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  /chat/visualizer/token/[token] — Token Visualizer              ║
 * ║  Balance-weighted force graph with top holders                  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useVisualizerStore } from '@/lib/onchain/visualizer-store';
import type { TokenHolder, Transfer, TransferFilter } from '@/lib/onchain/visualizer-types';
import { DEFAULT_TOKEN_FILTER } from '@/lib/onchain/visualizer-types';
import VisualizerGraph from '@/components/onchain/VisualizerGraph';
import VisualizerControls from '@/components/onchain/VisualizerControls';
import VisualizerDrawer from '@/components/onchain/VisualizerDrawer';
import VisualizerInputs from '@/components/onchain/VisualizerInputs';

/* ═══════════════════════ Component ══════════════════════════════ */

export default function TokenVisualizerPage() {
  const params = useParams();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [holders, setHolders] = useState<TokenHolder[]>([]);

  const {
    setMode,
    tokenState,
    setTokenState,
    setTokenFilter,
    setTokenHolders,
    transfers,
    setTransfers,
    isLoading,
    setIsLoading,
    error,
    setError,
  } = useVisualizerStore();

  /* ── Parse token from URL ── */
  const tokenId = useMemo(() => {
    const raw = params.token;
    if (!raw) return '';
    return decodeURIComponent(Array.isArray(raw) ? raw[0] : raw);
  }, [params.token]);

  /* ── Initialize mode ── */
  useEffect(() => {
    setMode('token');
  }, []);

  /* ── Fetch token holders ── */
  useEffect(() => {
    if (!tokenId) return;

    const fetchHolders = async () => {
      try {
        // Determine if tokenId is address:chain or pricingID
        const isAddressFormat = tokenId.includes(':');
        const endpoint = isAddressFormat
          ? `/api/onchain/token/holders?address=${tokenId.split(':')[0]}&chain=${tokenId.split(':')[1]}`
          : `/api/onchain/token/holders?pricingID=${tokenId}`;

        const res = await fetch(endpoint);
        const data = await res.json();

        const fetchedHolders: TokenHolder[] =
          data.data?.addressTopHolders ?? data.addressTopHolders ?? [];

        // Take top 50 holders (desktop)
        const topHolders = fetchedHolders.slice(0, 50);
        setHolders(topHolders);
        setTokenHolders(topHolders);

        // Set base to holder addresses
        const base = topHolders.map((h: TokenHolder) => h.address.address);
        setTokenFilter({
          ...DEFAULT_TOKEN_FILTER,
          base,
          tokens: [isAddressFormat ? tokenId.split(':')[0] : tokenId],
        });
      } catch {
        // holders fetch failed — continue without them
      }
    };

    fetchHolders();
  }, [tokenId]);

  /* ── Fetch transfers ── */
  useEffect(() => {
    if (!tokenId || !tokenState.filter.base?.length) return;

    const fetchTransfers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const filter = tokenState.filter;
        const queryParams = new URLSearchParams();
        if (filter.base) queryParams.set('base', filter.base.join(','));
        if (filter.flow) queryParams.set('flow', filter.flow);
        if (filter.tokens?.length) queryParams.set('tokens', filter.tokens.join(','));
        if (filter.sortKey) queryParams.set('sortKey', filter.sortKey);
        if (filter.sortDir) queryParams.set('sortDir', filter.sortDir);
        if (filter.limit != null) queryParams.set('limit', String(filter.limit));
        if (filter.offset != null) queryParams.set('offset', String(filter.offset));

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
  }, [tokenId, tokenState.filter]);

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
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-60px)] overflow-hidden"
    >
      {/* ── Background ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#264a46] via-[#1d2b28] to-[#141f1f]" />

      {/* ── Graph Layer ── */}
      {tokenState.filter.base && tokenState.filter.base.length > 0 && (
        <VisualizerGraph
          graphMode="token"
          transfers={transfers}
          holders={holders}
          width={dimensions.width}
          height={dimensions.height}
        />
      )}

      {/* ── Panel ── */}
      <div
        className="
          absolute inset-0 pointer-events-none z-[1]
          w-full md:w-1/2 h-full p-4
          max-md:text-[0.7em]
        "
      >
        <div className="pointer-events-auto">
          <VisualizerInputs
            onSelectEntity={handleSelectEntity}
            onSelectToken={handleSelectToken}
          />
        </div>
        <div className="pointer-events-auto overflow-hidden mt-2">
          <VisualizerDrawer graphMode="token" transfers={transfers} />
        </div>
      </div>

      {/* ── Controls (bottom for token mode, matching cways-tracker) ── */}
      <div
        className="
          absolute z-[1] bottom-0 right-0 m-4
        "
      >
        <VisualizerControls graphMode="token" />
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div
          className="absolute inset-0 z-[2] flex items-center justify-center"
          style={{ backdropFilter: 'blur(2px)' }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
            <span className="text-sm text-white/50 font-mono">Loading token data…</span>
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
    </div>
  );
}
