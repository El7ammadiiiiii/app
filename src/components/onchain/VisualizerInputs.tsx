/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  Visualizer Inputs — Search with Autocomplete Suggestions       ║
 * ║  Supports entity, address, and token search                     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useVisualizerStore } from '@/lib/onchain/visualizer-store';
import { shortenAddress } from '@/lib/onchain/visualizer-types';

/* ═══════════════════════ Suggestion Types ═══════════════════════ */

interface Suggestion {
  type: 'entity' | 'address' | 'token';
  id: string;
  label: string;
  subtitle?: string;
}

/* ═══════════════════════ Props ══════════════════════════════════ */

interface VisualizerInputsProps {
  onSelectEntity: (id: string) => void;
  onSelectToken?: (id: string) => void;
  autoFocus?: boolean;
}

/* ═══════════════════════ Component ══════════════════════════════ */

export default function VisualizerInputs({
  onSelectEntity,
  onSelectToken,
  autoFocus = false,
}: VisualizerInputsProps) {
  const { drawerOpen, toggleDrawer, entityState } = useVisualizerStore();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  /* ── Search API ── */
  const searchApi = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const res = await fetch(
        `/api/onchain/intelligence/search?q=${encodeURIComponent(q)}`,
      );
      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        const results: Suggestion[] = data.data.slice(0, 8).map((item: any) => ({
          type: item.type === 'token' ? 'token' : item.address ? 'address' : 'entity',
          id: item.id ?? item.address ?? item.name,
          label: item.name ?? shortenAddress(item.address ?? ''),
          subtitle: item.type ?? item.chain,
        }));
        setSuggestions(results);
      }
    } catch {
      setSuggestions([]);
    }
  }, []);

  /* ── Debounced search ── */
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => searchApi(query), 250);
    } else {
      setSuggestions([]);
    }
    return () => clearTimeout(debounceRef.current);
  }, [query, searchApi]);

  /* ── Key handling ── */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        selectSuggestion(suggestions[selectedIndex]);
      } else if (query.trim()) {
        // Raw address or entity ID
        onSelectEntity(query.trim());
        setQuery('');
        setShowSuggestions(false);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (s: Suggestion) => {
    if (s.type === 'token' && onSelectToken) {
      onSelectToken(s.id);
    } else {
      onSelectEntity(s.id);
    }
    setQuery('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  /* ── Active filter bubbles ── */
  const base = entityState.base;
  const hasBubbles = base.length > 0;

  return (
    <div className="flex flex-col gap-2">
      {/* ── Input Row ── */}
      <div className="flex items-center gap-2">
        {/* Toggle drawer button */}
        <button
          onClick={toggleDrawer}
          className="
            shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md
            text-xs font-mono text-white/60 hover:text-white/90
            transition-all duration-200 cursor-pointer
          "
          style={{
            backgroundColor: 'rgba(29, 62, 59, 0.5)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(20, 184, 166, 0.15)',
          }}
        >
          <span>{drawerOpen ? 'Less Info' : 'More Info'}</span>
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              drawerOpen ? 'rotate-90' : ''
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Search input */}
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder="Add entity, address, or token…"
            autoFocus={autoFocus}
            className="
              w-full px-3 py-2 rounded-md text-sm font-mono
              text-white/90 placeholder:text-white/25
              outline-none transition-all duration-200
              focus:ring-1 focus:ring-teal-400/30
            "
            style={{
              backgroundColor: 'rgba(29, 62, 59, 0.4)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(20, 184, 166, 0.12)',
            }}
          />

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              className="
                absolute left-0 right-0 top-full mt-1 z-50
                rounded-lg overflow-hidden
                max-h-64 overflow-y-auto
              "
              style={{
                backgroundColor: 'rgba(29, 62, 59, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(20, 184, 166, 0.2)',
                boxShadow: `
                  0 8px 32px rgba(0, 0, 0, 0.4),
                  0 0 12px rgba(20, 184, 166, 0.1)
                `,
              }}
            >
              {suggestions.map((s, i) => (
                <button
                  key={`${s.type}-${s.id}`}
                  onMouseDown={() => selectSuggestion(s)}
                  className={`
                    w-full flex items-center gap-2.5 px-3 py-2
                    text-left text-sm font-mono cursor-pointer
                    transition-colors duration-100
                    ${i === selectedIndex ? 'bg-teal-400/10' : 'hover:bg-white/5'}
                  `}
                >
                  {/* Type badge */}
                  <span
                    className="
                      shrink-0 text-[9px] font-bold uppercase px-1.5 py-0.5
                      rounded tracking-wider
                    "
                    style={{
                      backgroundColor:
                        s.type === 'entity'
                          ? 'rgba(99, 102, 241, 0.2)'
                          : s.type === 'token'
                            ? 'rgba(234, 179, 8, 0.2)'
                            : 'rgba(20, 184, 166, 0.2)',
                      color:
                        s.type === 'entity'
                          ? '#818cf8'
                          : s.type === 'token'
                            ? '#fbbf24'
                            : '#5eead4',
                    }}
                  >
                    {s.type}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-white/80 truncate">{s.label}</span>
                    {s.subtitle && (
                      <span className="text-[10px] text-white/30">{s.subtitle}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Filter Bubbles ── */}
      {hasBubbles && (
        <div className="flex flex-wrap gap-1.5">
          {base.map((id) => {
            const isNegation = id.startsWith('!');
            const displayId = isNegation ? id.slice(1) : id;

            return (
              <span
                key={id}
                className={`
                  inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                  text-[10px] font-mono
                  ${isNegation ? 'text-red-400/80' : 'text-teal-300/80'}
                `}
                style={{
                  backgroundColor: isNegation
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'rgba(20, 184, 166, 0.1)',
                  border: `1px solid ${
                    isNegation ? 'rgba(239, 68, 68, 0.2)' : 'rgba(20, 184, 166, 0.15)'
                  }`,
                }}
              >
                {isNegation && <span className="text-red-400">✕</span>}
                <span className="truncate max-w-[120px]">
                  {shortenAddress(displayId, 6)}
                </span>
                <button
                  onClick={() => {
                    const store = useVisualizerStore.getState();
                    store.setEntityBase(store.entityState.base.filter((b) => b !== id));
                  }}
                  className="ml-0.5 text-white/30 hover:text-white/60 transition-colors"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
