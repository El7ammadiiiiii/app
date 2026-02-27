'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { readFavoriteIds, subscribeFavorites, toggleFavoriteId } from '@/lib/crypto-favorites';
import { Star } from 'lucide-react';
import { fastApiClient } from '@/lib/services/fastApiClient';

interface CryptoProject {
	id: string;
	name: string;
	symbol: string;
	image?: string;
	logo_url?: string;
	logo_id?: string;
	rank?: number;
	price?: number;
	market_cap?: number;
	total_volume?: number;
	fdv?: number;
	price_change_1h?: number;
	price_change_24h?: number;
	price_change_7d?: number;
	price_change_30d?: number;
	price_change_60d?: number;
	price_change_90d?: number;
	price_change_ytd?: number;
	high_24h?: number;
	low_24h?: number;
	sparkline_7d?: number[];
	circulating_supply?: number;
	total_supply?: number;
	max_supply?: number;
	volume_7d?: number;
	volume_30d?: number;
	total_value_locked?: number;
	sector?: string;
}

type SortField =
	| 'rank'
	| 'name'
	| 'price'
	| 'price_change_1h'
	| 'price_change_24h'
	| 'price_change_7d'
	| 'price_change_30d'
	| 'price_change_60d'
	| 'price_change_90d'
	| 'price_change_ytd'
	| 'high_24h'
	| 'low_24h'
	| 'total_volume'
	| 'volume_mcap_ratio'
	| 'circulating_supply'
	| 'total_supply'
	| 'max_supply'
	| 'dominance'
	| 'market_cap'
	| 'fdv'
	| 'mcap_fdv_ratio';

type SortDir = 'asc' | 'desc';

type ColumnKey =
	| 'price_high_24h'
	| 'price_low_24h'
	| 'price_change_1h'
	| 'price_change_24h'
	| 'price_change_7d'
	| 'price_change_30d'
	| 'price_change_60d'
	| 'price_change_90d'
	| 'price_change_ytd'
	| 'market_cap'
	| 'fdv'
	| 'total_volume'
	| 'volume_7d'
	| 'volume_30d'
	| 'volume_mcap'
	| 'circulating_supply'
	| 'total_supply'
	| 'max_supply'
	| 'chart_24h'
	| 'chart_7d'
	| 'chart_30d'
	| 'chart_60d'
	| 'chart_90d'
	| 'dominance'
	| 'tvl';

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
	price_high_24h: true,
	price_low_24h: true,
	price_change_1h: true,
	price_change_24h: true,
	price_change_7d: true,
	price_change_30d: true,
	price_change_60d: false,
	price_change_90d: false,
	price_change_ytd: false,
	market_cap: true,
	fdv: true,
	total_volume: true,
	volume_7d: false,
	volume_30d: false,
	volume_mcap: true,
	circulating_supply: true,
	total_supply: false,
	max_supply: false,
	chart_24h: false,
	chart_7d: true,
	chart_30d: false,
	chart_60d: false,
	chart_90d: false,
	dominance: false,
	tvl: false,
};

export default function CryptoTable() {
	const [projects, setProjects] = useState<CryptoProject[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState('');
	const [sectorFilter, setSectorFilter] = useState('all');
	const [sortField, setSortField] = useState<SortField>('rank');
	const [sortDir, setSortDir] = useState<SortDir>('asc');
	const [rowSize, setRowSize] = useState<50 | 100 | 300>(100);
	const [page, setPage] = useState(1);
	const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
	const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
	const [showCustomize, setShowCustomize] = useState(false);
	const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);
	const [draftColumns, setDraftColumns] = useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS);
	const panelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setFavoriteIds(readFavoriteIds());
		const unsubscribe = subscribeFavorites(() => setFavoriteIds(readFavoriteIds()));
		return unsubscribe;
	}, []);

	useEffect(() => {
		let cancelled = false;
		const cacheBust = `?v=${Date.now()}`;

		const load = async () => {
			// Build a lightweight symbol -> CoinGecko id index (so aggregator rows can link to detail pages)
			const symbolToId = new Map<string, string>();
			try {
				const res = await fetch(`/data/cryptocurrencies.json${cacheBust}`, { cache: 'no-store' });
				if (res.ok) {
					const list = await res.json();
					if (Array.isArray(list)) {
						for (const item of list) {
							const sym = (item?.symbol || '').toString().toUpperCase();
							const id = (item?.id || '').toString();
							if (sym && id && !symbolToId.has(sym)) symbolToId.set(sym, id);
						}
					}
				}
			} catch {
				// ignore
			}

			const normalize = (p: any): CryptoProject => {
				const rawSymbol = (p?.symbol || p?.pair_symbol || '').toString();
				const symbol = rawSymbol.toUpperCase();
				const mappedId = symbolToId.get(symbol);
				const incomingId = (p?.id || '').toString();
				const incomingIdLower = incomingId.toLowerCase();
				const looksLikePair = incomingIdLower.endsWith('usdt') || incomingIdLower.includes('-usdt') || incomingIdLower.includes('usdt');

				// Prefer mapped CoinGecko id; otherwise accept incoming id only if it doesn't look like a trading pair
				const id = mappedId || (!looksLikePair ? incomingId : '');
				const price = p?.price ?? p?.current_price ?? p?.currentPrice ?? p?.lastPrice;

				return {
					...p,
					id: id || undefined,
					symbol: symbol || p?.symbol,
					price,
				};
			};

			// PRIMARY: FastAPI aggregated markets from 36+ exchanges
			try {
				const resp = await fastApiClient.getMarkets(500) as any;
				if (resp?.success && Array.isArray(resp.data) && resp.data.length > 0) {
					const normalized = resp.data.map(normalize);
					if (!cancelled) {
						setProjects(normalized);
						setLoading(false);
					}
					return;
				}
			} catch {
				// fallback below
			}

			// FALLBACK: static JSON files
			try {
				const res = await fetch(`/data/coingecko-markets.json${cacheBust}`, { cache: 'no-store' });
				if (!res.ok) throw new Error('coingecko markets not found');
				const data = await res.json();
				if (!cancelled) {
					setProjects((Array.isArray(data) ? data : []).map(normalize));
					setLoading(false);
				}
				return;
			} catch {
				// last fallback below
			}

			try {
				const res = await fetch(`/data/cryptocurrencies.json${cacheBust}`, { cache: 'no-store' });
				const data = await res.json();
				if (!cancelled) {
					setProjects((Array.isArray(data) ? data : []).slice(0, 5000).map(normalize));
					setLoading(false);
				}
			} catch {
				if (!cancelled) setLoading(false);
			}
		};

		load();
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		const onClickOutside = (event: MouseEvent) => {
			if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
				setShowCustomize(false);
			}
		};
		document.addEventListener('mousedown', onClickOutside);
		return () => document.removeEventListener('mousedown', onClickOutside);
	}, []);

	useEffect(() => {
		setPage(1);
	}, [search, sectorFilter, rowSize, showFavoritesOnly]);

	const sectors = useMemo(() => {
		const values = new Set<string>();
		projects.forEach((p) => p.sector && values.add(p.sector));
		return ['all', ...Array.from(values).sort((a, b) => a.localeCompare(b))];
	}, [projects]);

	const filtered = useMemo(() => {
		let list = [...projects];
		const totalMarketCap = list.reduce((sum, p) => sum + (p.market_cap || 0), 0);

		if (search.trim()) {
			const q = search.toLowerCase();
			list = list.filter((p) =>
				p.name?.toLowerCase().includes(q) ||
				p.symbol?.toLowerCase().includes(q) ||
				p.id?.toLowerCase().includes(q) ||
				p.sector?.toLowerCase().includes(q)
			);
		}

		if (sectorFilter !== 'all') {
			list = list.filter((p) => p.sector === sectorFilter);
		}

		const sortValue = (project: CryptoProject) => {
			const ratio = (project.market_cap || 0) / Math.max(1, project.fdv || 0);
			const dominance = totalMarketCap > 0 ? ((project.market_cap || 0) / totalMarketCap) * 100 : 0;
			const volumeMcap = (project.market_cap || 0) > 0 ? ((project.total_volume || 0) / (project.market_cap || 1)) * 100 : 0;
			switch (sortField) {
				case 'mcap_fdv_ratio': return ratio;
				case 'dominance': return dominance;
				case 'volume_mcap_ratio': return volumeMcap;
				case 'price_change_60d': return project.price_change_60d ?? 0;
				case 'price_change_90d': return project.price_change_90d ?? 0;
				case 'price_change_ytd': return project.price_change_ytd ?? 0;
				case 'high_24h': return project.high_24h ?? 0;
				case 'low_24h': return project.low_24h ?? 0;
				default: return (project as any)[sortField] ?? 0;
			}
		};

		list.sort((a, b) => {
			const av = sortValue(a);
			const bv = sortValue(b);

			const left = typeof av === 'string' ? av.toLowerCase() : av;
			const right = typeof bv === 'string' ? bv.toLowerCase() : bv;

			if (left < right) return sortDir === 'asc' ? -1 : 1;
			if (left > right) return sortDir === 'asc' ? 1 : -1;
			return 0;
		});

		return list.sort((a, b) => Number(favoriteIds.has(b.id)) - Number(favoriteIds.has(a.id)));
	}, [projects, search, sectorFilter, sortField, sortDir, favoriteIds]);

	const visibleProjects = useMemo(
		() => (showFavoritesOnly ? filtered.filter((p) => favoriteIds.has(p.id)) : filtered),
		[showFavoritesOnly, filtered, favoriteIds]
	);
	const totalPages = Math.max(1, Math.ceil(visibleProjects.length / rowSize));
	const pageStart = (page - 1) * rowSize;
	const paged = visibleProjects.slice(pageStart, pageStart + rowSize);

	const toggleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
			return;
		}
		setSortField(field);
		setSortDir(field === 'name' ? 'asc' : 'desc');
	};

	const toggleFavorite = (id: string) => {
		toggleFavoriteId(id);
		setFavoriteIds(readFavoriteIds());
	};

	const toggleColumn = (key: ColumnKey) => {
		setDraftColumns((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	const applyColumns = () => {
		setVisibleColumns(draftColumns);
		setShowCustomize(false);
	};

	const cancelColumns = () => {
		setDraftColumns(visibleColumns);
		setShowCustomize(false);
	};

	const formatPrice = (value?: number) => {
		if (!value && value !== 0) return '—';
		if (value >= 1) return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
		return `$${value.toFixed(6)}`;
	};

	const formatCompact = (value?: number) => {
		if (!value && value !== 0) return '—';
		if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
		if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
		if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
		if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
		return `$${value.toFixed(0)}`;
	};

	const formatSupply = (value?: number) => {
		if (!value && value !== 0) return '—';
		if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
		if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
		if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
		return value.toLocaleString();
	};

	const modalGroups: Array<{ title: string; items: Array<{ key: ColumnKey; label: string }> }> = [
		{ title: 'Price', items: [{ key: 'price_high_24h', label: '24h high' }, { key: 'price_low_24h', label: '24h low' }] },
		{
			title: 'Price Change',
			items: [
				{ key: 'price_change_1h', label: '1h %' },
				{ key: 'price_change_24h', label: '24h %' },
				{ key: 'price_change_7d', label: '7d %' },
				{ key: 'price_change_30d', label: '30d %' },
				{ key: 'price_change_60d', label: '60d %' },
				{ key: 'price_change_90d', label: '90d %' },
				{ key: 'price_change_ytd', label: 'YTD %' },
			],
		},
		{ title: 'Market Cap', items: [{ key: 'market_cap', label: 'Market Cap' }, { key: 'fdv', label: 'Fully Diluted Mcap' }] },
		{
			title: 'Volume',
			items: [
				{ key: 'total_volume', label: 'Volume(24h)' },
				{ key: 'volume_7d', label: 'Volume(7d)' },
				{ key: 'volume_30d', label: 'Volume(30d)' },
				{ key: 'volume_mcap', label: 'Volume / Mcap' },
			],
		},
		{
			title: 'Supply',
			items: [
				{ key: 'circulating_supply', label: 'Circulating Supply' },
				{ key: 'total_supply', label: 'Total Supply' },
				{ key: 'max_supply', label: 'Max Supply' },
			],
		},
		{
			title: 'Charts',
			items: [
				{ key: 'chart_24h', label: '24h Chart' },
				{ key: 'chart_7d', label: '7d Chart' },
				{ key: 'chart_30d', label: '30d Chart' },
				{ key: 'chart_60d', label: '60d Chart' },
				{ key: 'chart_90d', label: '90d Chart' },
			],
		},
		{ title: 'Others', items: [{ key: 'dominance', label: 'Dominance %' }, { key: 'tvl', label: 'Total Value Locked' }] },
	];

	const Change = ({ value }: { value?: number }) => {
		if (value === undefined || value === null) return <span className="text-gray-500">—</span>;
		const positive = value >= 0;
		return <span className={positive ? 'text-emerald-400' : 'text-red-400'}>{positive ? '▲' : '▼'} {Math.abs(value).toFixed(1)}%</span>;
	};

	const SortMark = ({ field }: { field: SortField }) => {
		if (sortField !== field) return <span className="text-gray-600 ml-1">⇅</span>;
		return <span className="text-teal-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
	};

	const getImage = (p: CryptoProject) => {
		if (p.image) return p.image;
		if (p.logo_url) return p.logo_url;
		if (p.logo_id) return `https://asset-images.messari.io/images/${p.logo_id}/64.png`;
		return '';
	};

	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center py-20 gap-4" dir="ltr">
				<div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
				<span className="text-gray-400">Loading cryptocurrencies...</span>
			</div>
		);
	}

	return (
		<div className="space-y-4" dir="ltr">
			<div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
				<div className="flex items-center gap-2">
					<button
						onClick={() => setShowFavoritesOnly((prev) => !prev)}
						className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all text-xs font-medium ${
							showFavoritesOnly
								? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40'
								: 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
						}`}
						title={showFavoritesOnly ? 'Show all coins' : 'Show favorites only'}
					>
						<span>المفضلة</span>
						<Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-yellow-400 text-yellow-400' : 'text-yellow-400'}`} />
					</button>

					<select
						value={sectorFilter}
						onChange={(e) => setSectorFilter(e.target.value)}
						className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500/50"
					>
						{sectors.map((sector) => (
							<option key={sector} value={sector} className="bg-[#1d2b28]">
								{sector === 'all' ? 'All Sectors' : sector}
							</option>
						))}
					</select>
				</div>

				<div className="flex items-center gap-2 md:w-auto w-full md:justify-end">
					<div className="relative md:w-[340px] w-full">
						<span className="absolute left-3 top-2.5 text-gray-500 text-sm">🔍</span>
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search name, symbol, sector..."
							className="w-full bg-white/[0.05] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50"
						/>
					</div>

					<div className="relative">
						<button
							onClick={() => {
								setDraftColumns(visibleColumns);
								setShowCustomize((v) => !v);
							}}
							className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-500/35 bg-blue-500/10 text-sm text-blue-200 hover:bg-blue-500/15 transition"
						>
							<span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-500/20 text-blue-300">▦</span>
							<span>Columns</span>
						</button>

						{showCustomize && (
							<div
								ref={panelRef}
								className="absolute z-50 mt-2 right-0 w-[760px] max-w-[94vw] rounded-xl border border-white/25 bg-[#618f88] text-white p-0 shadow-2xl overflow-hidden"
							>
								<div className="px-5 py-4 bg-black/10 border-b border-white/20">
									<div className="text-lg font-semibold text-white">Columns</div>
								</div>
								<div className="max-h-[70vh] overflow-y-auto">
									{modalGroups.map((group) => (
										<div key={group.title} className="grid grid-cols-[160px_1fr] gap-4 px-6 py-4 border-b border-white/20">
											<div className="text-[23px] leading-8 text-white/90 font-semibold">{group.title}</div>
											<div className="flex flex-wrap gap-2">
												{group.items.map((item) => (
													<ChipToggle
														key={item.key}
														label={item.label}
														active={draftColumns[item.key]}
														onClick={() => toggleColumn(item.key)}
													/>
												))}
											</div>
										</div>
									))}
								</div>
								<div className="px-5 py-4 bg-black/10 border-t border-white/20 flex items-center justify-between">
									<div className="inline-flex items-center gap-2">
										<span className="text-xs text-white/80">Rows:</span>
										{[50, 100, 300].map((n) => (
											<button
												key={n}
												onClick={() => setRowSize(n as 50 | 100 | 300)}
												className={`px-2.5 py-1 rounded-md text-xs border ${
													rowSize === n
														? 'bg-blue-600 border-blue-600 text-white'
														: 'bg-white/15 border-white/25 text-white hover:bg-white/25'
												}`}
											>
												{n}
											</button>
										))}
									</div>
									<div className="flex items-center gap-3">
										<button onClick={cancelColumns} className="px-4 py-2 rounded-lg text-white hover:bg-white/10">Cancel</button>
										<button onClick={applyColumns} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Apply Changes</button>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			<div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02]">
				<table className="w-full text-left border-collapse min-w-[1800px]">
					<thead className="bg-white/[0.04] text-gray-400 text-xs uppercase tracking-wide">
						<tr>
							<th className="p-3 w-10 text-center">★</th>
							<th className="p-3 w-14 cursor-pointer" onClick={() => toggleSort('rank')}>#<SortMark field="rank" /></th>
							<th className="p-3 cursor-pointer" onClick={() => toggleSort('name')}>Coin<SortMark field="name" /></th>
							<th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('price')}>Price<SortMark field="price" /></th>
							{visibleColumns.price_high_24h && <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('high_24h')}>24h high<SortMark field="high_24h" /></th>}
							{visibleColumns.price_low_24h && <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('low_24h')}>24h low<SortMark field="low_24h" /></th>}
							{visibleColumns.price_change_1h && <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('price_change_1h')}>1h<SortMark field="price_change_1h" /></th>}
							{visibleColumns.price_change_24h && <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('price_change_24h')}>24h<SortMark field="price_change_24h" /></th>}
							{visibleColumns.price_change_7d && <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('price_change_7d')}>7d<SortMark field="price_change_7d" /></th>}
							{visibleColumns.price_change_30d && <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('price_change_30d')}>30d<SortMark field="price_change_30d" /></th>}
							{visibleColumns.price_change_60d && <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('price_change_60d')}>60d<SortMark field="price_change_60d" /></th>}
							{visibleColumns.price_change_90d && <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('price_change_90d')}>90d<SortMark field="price_change_90d" /></th>}
							{visibleColumns.price_change_ytd && <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('price_change_ytd')}>YTD<SortMark field="price_change_ytd" /></th>}
							{visibleColumns.total_volume && <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('total_volume')}>24h Volume<SortMark field="total_volume" /></th>}
							{visibleColumns.market_cap && <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('market_cap')}>Market Cap<SortMark field="market_cap" /></th>}
							{visibleColumns.fdv && <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('fdv')}>FDV<SortMark field="fdv" /></th>}
							{visibleColumns.volume_7d && <th className="p-3 text-right">Volume(7d)</th>}
							{visibleColumns.volume_30d && <th className="p-3 text-right">Volume(30d)</th>}
							{visibleColumns.volume_mcap && <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('volume_mcap_ratio')}>Volume / Mcap<SortMark field="volume_mcap_ratio" /></th>}
							{visibleColumns.circulating_supply && <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('circulating_supply')}>Circulating Supply<SortMark field="circulating_supply" /></th>}
							{visibleColumns.total_supply && <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('total_supply')}>Total Supply<SortMark field="total_supply" /></th>}
							{visibleColumns.max_supply && <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('max_supply')}>Max Supply<SortMark field="max_supply" /></th>}
							{visibleColumns.chart_24h && <th className="p-3 text-right">24h Chart</th>}
							{visibleColumns.chart_7d && <th className="p-3 text-right">7d Chart</th>}
							{visibleColumns.chart_30d && <th className="p-3 text-right">30d Chart</th>}
							{visibleColumns.chart_60d && <th className="p-3 text-right">60d Chart</th>}
							{visibleColumns.chart_90d && <th className="p-3 text-right">90d Chart</th>}
							{visibleColumns.dominance && <th className="p-3 text-right cursor-pointer" onClick={() => toggleSort('dominance')}>Dominance %<SortMark field="dominance" /></th>}
							{visibleColumns.tvl && <th className="p-3 text-right">Total Value Locked</th>}
						</tr>
					</thead>

					<tbody className="divide-y divide-white/[0.06]">
						{paged.map((proj, idx) => {
							const img = getImage(proj);
							const spark = proj.sparkline_7d || [];
							const ratio = (proj.market_cap || 0) > 0 ? ((proj.total_volume || 0) / (proj.market_cap || 1)) * 100 : 0;
							const allMcap = filtered.reduce((sum, item) => sum + (item.market_cap || 0), 0);
							const dominance = allMcap > 0 ? ((proj.market_cap || 0) / allMcap) * 100 : 0;
							const vol7d = proj.volume_7d ?? ((proj.total_volume || 0) * 7);
							const vol30d = proj.volume_30d ?? ((proj.total_volume || 0) * 30);
							const detailId = proj.id && !proj.id.startsWith('unknown-') ? proj.id : undefined;
							const rowKey = detailId || `row-${pageStart + idx}`;

							return (
								<tr key={`${rowKey}-${pageStart + idx}`} className="hover:bg-white/[0.04] transition-colors">
									<td className="p-3 text-center">
										<button
											onClick={() => detailId && toggleFavorite(detailId)}
											disabled={!detailId}
											className={`inline-flex items-center justify-center w-6 h-6 rounded border text-xs ${
												favoriteIds.has(detailId || '')
													? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
												: `border-white/15 bg-white/[0.03] ${detailId ? 'text-gray-500 hover:text-gray-200' : 'text-gray-700 cursor-not-allowed opacity-60'}`
											}`}
											title={!detailId ? 'No CoinGecko id available' : (favoriteIds.has(detailId) ? 'Remove favorite' : 'Add favorite')}
										>
											{detailId && favoriteIds.has(detailId) ? '★' : '☆'}
										</button>
									</td>

									<td className="p-3 font-mono text-sm text-gray-300">{proj.rank || pageStart + idx + 1}</td>

									<td className="p-3">
										{detailId ? (
											<Link href={`/chat/cryptocurrencies/${detailId}`} className="flex items-center gap-2.5 group">
											{img ? (
												<img src={img} alt={proj.symbol} className="w-6 h-6 rounded-full bg-white/10" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
											) : (
												<div className="w-6 h-6 rounded-full bg-teal-900/30 flex items-center justify-center text-[10px] text-teal-300 font-bold">
													{proj.symbol?.[0] || '?'}
												</div>
											)}
											<div>
												<div className="font-semibold text-white group-hover:text-teal-300 transition-colors">{proj.name}</div>
												<div className="text-xs text-gray-500 uppercase">{proj.symbol}</div>
											</div>
											</Link>
										) : (
											<div className="flex items-center gap-2.5 opacity-90">
												{img ? (
													<img src={img} alt={proj.symbol} className="w-6 h-6 rounded-full bg-white/10" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
												) : (
													<div className="w-6 h-6 rounded-full bg-teal-900/30 flex items-center justify-center text-[10px] text-teal-300 font-bold">
														{proj.symbol?.[0] || '?'}
													</div>
												)}
												<div>
													<div className="font-semibold text-white">{proj.name}</div>
													<div className="text-xs text-gray-500 uppercase">{proj.symbol}</div>
												</div>
											</div>
										)}
									</td>

									<td className="p-3 text-right font-mono text-sm">{formatPrice(proj.price)}</td>
									{visibleColumns.price_high_24h && <td className="p-3 text-right font-mono text-sm">{formatPrice(proj.high_24h)}</td>}
									{visibleColumns.price_low_24h && <td className="p-3 text-right font-mono text-sm">{formatPrice(proj.low_24h)}</td>}
									{visibleColumns.price_change_1h && <td className="p-3 text-right font-mono text-sm"><Change value={proj.price_change_1h} /></td>}
									{visibleColumns.price_change_24h && <td className="p-3 text-right font-mono text-sm"><Change value={proj.price_change_24h} /></td>}
									{visibleColumns.price_change_7d && <td className="p-3 text-right font-mono text-sm"><Change value={proj.price_change_7d} /></td>}
									{visibleColumns.price_change_30d && <td className="p-3 text-right font-mono text-sm"><Change value={proj.price_change_30d} /></td>}
									{visibleColumns.price_change_60d && <td className="p-3 text-right font-mono text-sm"><Change value={proj.price_change_60d} /></td>}
									{visibleColumns.price_change_90d && <td className="p-3 text-right font-mono text-sm"><Change value={proj.price_change_90d} /></td>}
									{visibleColumns.price_change_ytd && <td className="p-3 text-right font-mono text-sm"><Change value={proj.price_change_ytd} /></td>}
									{visibleColumns.total_volume && <td className="p-3 text-right font-mono text-sm">{formatCompact(proj.total_volume)}</td>}
									{visibleColumns.market_cap && <td className="p-3 text-right font-mono text-sm">{formatCompact(proj.market_cap)}</td>}
									{visibleColumns.fdv && <td className="p-3 text-right font-mono text-sm">{formatCompact(proj.fdv)}</td>}
									{visibleColumns.volume_7d && <td className="p-3 text-right font-mono text-sm">{formatCompact(vol7d)}</td>}
									{visibleColumns.volume_30d && <td className="p-3 text-right font-mono text-sm">{formatCompact(vol30d)}</td>}
									{visibleColumns.volume_mcap && <td className="p-3 text-right font-mono text-sm">{ratio ? `${ratio.toFixed(2)}%` : '—'}</td>}
									{visibleColumns.circulating_supply && <td className="p-3 text-right font-mono text-sm">{formatSupply(proj.circulating_supply)}</td>}
									{visibleColumns.total_supply && <td className="p-3 text-right font-mono text-sm">{formatSupply(proj.total_supply)}</td>}
									{visibleColumns.max_supply && <td className="p-3 text-right font-mono text-sm">{formatSupply(proj.max_supply ?? undefined)}</td>}
									{visibleColumns.chart_24h && <td className="p-3 text-right"><MiniSparkline values={spark.slice(Math.max(0, spark.length - 24))} /></td>}
									{visibleColumns.chart_7d && <td className="p-3 text-right"><MiniSparkline values={spark} /></td>}
									{visibleColumns.chart_30d && <td className="p-3 text-right"><MiniSparkline values={spark} /></td>}
									{visibleColumns.chart_60d && <td className="p-3 text-right"><MiniSparkline values={spark} /></td>}
									{visibleColumns.chart_90d && <td className="p-3 text-right"><MiniSparkline values={spark} /></td>}
									{visibleColumns.dominance && <td className="p-3 text-right font-mono text-sm">{dominance ? `${dominance.toFixed(2)}%` : '—'}</td>}
									{visibleColumns.tvl && <td className="p-3 text-right font-mono text-sm">{formatCompact(proj.total_value_locked)}</td>}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			<div className="flex items-center justify-center gap-2 pt-1">
				<button
					onClick={() => setPage((p) => Math.max(1, p - 1))}
					disabled={page === 1}
					className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-sm text-gray-300 border border-white/[0.08] disabled:opacity-40"
				>
					Prev
				</button>
				<span className="text-sm text-gray-400">Page {page} / {totalPages} ({visibleProjects.length} coin{visibleProjects.length === 1 ? '' : 's'})</span>
				<button
					onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
					disabled={page === totalPages}
					className="px-3 py-1.5 rounded-lg bg-white/[0.05] text-sm text-gray-300 border border-white/[0.08] disabled:opacity-40"
				>
					Next
				</button>
			</div>
		</div>
	);
}

function ChipToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
	return (
		<button
			onClick={onClick}
			className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[15px] leading-none font-semibold border shadow-sm transition ${
				active
					? 'bg-[#dbe7ff] text-[#3565ea] border-[#c8d8ff] hover:bg-[#d3e2ff]'
					: 'bg-white/25 text-white border-white/30 hover:bg-white/35'
			}`}
			type="button"
		>
			<span>{label}</span>
			{active && (
				<span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#4f75f0] text-white text-[11px]">×</span>
			)}
		</button>
	);
}

function MiniSparkline({ values }: { values: number[] }) {
	if (!values || values.length < 2) return <span className="text-gray-500 text-xs">—</span>;

	const width = 120;
	const height = 36;
	const min = Math.min(...values);
	const max = Math.max(...values);
	const range = Math.max(1e-9, max - min);

	const points = values
		.map((v, i) => {
			const x = (i / (values.length - 1)) * (width - 2) + 1;
			const y = height - ((v - min) / range) * (height - 6) - 3;
			return `${x},${y}`;
		})
		.join(' ');

	const positive = values[values.length - 1] >= values[0];
	const stroke = positive ? '#4ade80' : '#f87171';

	return (
		<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="inline-block align-middle">
			<polyline points={points} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}
