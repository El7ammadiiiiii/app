'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { fastApiClient } from '@/lib/services/fastApiClient';
import { readFavoriteIds, subscribeFavorites, toggleFavoriteId } from '@/lib/crypto-favorites';
import { Star, Search, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────
interface CMCCoin {
	id: number;
	name: string;
	symbol: string;
	slug: string;
	type: number;
	type_name: string;
	rank: number;
	logo: string;
	logo_128: string;
	url: string;
	addresses: Array<{ address: string; blockchain: string; chain: string }>;
}

interface CMCResponse {
	total: number;
	page: number;
	per_page: number;
	pages: number;
	data: CMCCoin[];
}

type SortField = 'rank' | 'name' | 'symbol' | 'type_name';
type SortDir = 'asc' | 'desc';

// ── Helpers ───────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('en-US');

function getLogoUrl(coin: CMCCoin): string {
	if (coin.logo_128) return coin.logo_128;
	if (coin.logo) return coin.logo;
	// CMC CDN fallback
	return `https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.id}.png`;
}

const TYPE_LABELS: Record<number, { label: string; color: string }> = {
	1: { label: 'Coin', color: 'text-blue-400 bg-blue-900/30 border-blue-600/30' },
	2: { label: 'Token', color: 'text-green-400 bg-green-900/30 border-green-600/30' },
	3: { label: 'Derivative', color: 'text-purple-400 bg-purple-900/30 border-purple-600/30' },
};

// ── Component ─────────────────────────────────────────────────────
export default function CMCCoinsTable() {
	const [coins, setCoins] = useState<CMCCoin[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState<CMCCoin[] | null>(null);
	const [searching, setSearching] = useState(false);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalCoins, setTotalCoins] = useState(0);
	const [perPage] = useState(100);
	const [typeFilter, setTypeFilter] = useState<number | undefined>(undefined);
	const [sortField, setSortField] = useState<SortField>('rank');
	const [sortDir, setSortDir] = useState<SortDir>('asc');
	const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
	const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

	// ── Favorites tracking ──
	useEffect(() => {
		setFavoriteIds(readFavoriteIds());
		const unsub = subscribeFavorites(() => setFavoriteIds(readFavoriteIds()));
		return unsub;
	}, []);

	// ── Load page ──
	const loadPage = useCallback(async (p: number) => {
		setLoading(true);
		try {
			const resp = await fastApiClient.getCMCCoins(p, perPage, typeFilter) as CMCResponse;
			if (resp?.data) {
				setCoins(resp.data);
				setTotalPages(resp.pages || 1);
				setTotalCoins(resp.total || 0);
				setPage(resp.page || p);
			}
		} catch (e) {
			console.error('Failed to load CMC coins:', e);
		} finally {
			setLoading(false);
		}
	}, [perPage, typeFilter]);

	useEffect(() => {
		setSearchResults(null);
		setSearchQuery('');
		loadPage(1);
	}, [loadPage]);

	// ── Search with debounce ──
	const handleSearch = useCallback((q: string) => {
		setSearchQuery(q);
		if (searchTimeout.current) clearTimeout(searchTimeout.current);
		if (!q.trim()) {
			setSearchResults(null);
			setSearching(false);
			return;
		}
		setSearching(true);
		searchTimeout.current = setTimeout(async () => {
			try {
				const resp = await fastApiClient.searchCMCCoins(q, 50) as { results: CMCCoin[] };
				setSearchResults(resp?.results || []);
			} catch {
				setSearchResults([]);
			} finally {
				setSearching(false);
			}
		}, 300);
	}, []);

	// ── Sort ──
	const handleSort = (field: SortField) => {
		if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
		else { setSortField(field); setSortDir('asc'); }
	};

	const displayCoins = useMemo(() => {
		const list = searchResults ?? coins;
		return [...list].sort((a, b) => {
			const dir = sortDir === 'asc' ? 1 : -1;
			if (sortField === 'name') return a.name.localeCompare(b.name) * dir;
			if (sortField === 'symbol') return a.symbol.localeCompare(b.symbol) * dir;
			if (sortField === 'type_name') return (a.type_name || '').localeCompare(b.type_name || '') * dir;
			return ((a.rank || 9999) - (b.rank || 9999)) * dir;
		});
	}, [coins, searchResults, sortField, sortDir]);

	const SortIcon = ({ field }: { field: SortField }) => (
		<span className="ml-1 text-xs opacity-50">
			{sortField === field ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
		</span>
	);

	return (
		<div dir="ltr">
			{/* ── Controls ── */}
			<div className="flex flex-wrap items-center gap-3 mb-4">
				{/* Search */}
				<div className="relative flex-1 min-w-[200px] max-w-md">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
					<input
						type="text"
						placeholder="Search 34K+ coins..."
						value={searchQuery}
						onChange={(e) => handleSearch(e.target.value)}
						className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none"
					/>
					{searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400 animate-spin" />}
				</div>

				{/* Type filter */}
				<div className="flex gap-1">
					{[
						{ value: undefined, label: 'All' },
						{ value: 1, label: 'Coins' },
						{ value: 2, label: 'Tokens' },
					].map(({ value, label }) => (
						<button
							key={label}
							onClick={() => setTypeFilter(value)}
							className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
								typeFilter === value
									? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40'
									: 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
							}`}
						>
							{label}
						</button>
					))}
				</div>

				{/* Total info */}
				<span className="text-xs text-gray-500">
					{searchResults ? `${searchResults.length} results` : `${fmt(totalCoins)} total`}
				</span>
			</div>

			{/* ── Table ── */}
			<div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02]">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-white/10 text-gray-400 text-xs">
							<th className="p-3 text-left w-8">★</th>
							<th className="p-3 text-left cursor-pointer hover:text-white" onClick={() => handleSort('rank')}>
								# <SortIcon field="rank" />
							</th>
							<th className="p-3 text-left cursor-pointer hover:text-white" onClick={() => handleSort('name')}>
								Name <SortIcon field="name" />
							</th>
							<th className="p-3 text-left cursor-pointer hover:text-white" onClick={() => handleSort('symbol')}>
								Symbol <SortIcon field="symbol" />
							</th>
							<th className="p-3 text-left cursor-pointer hover:text-white" onClick={() => handleSort('type_name')}>
								Type <SortIcon field="type_name" />
							</th>
							<th className="p-3 text-left">Chains</th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr><td colSpan={6} className="p-12 text-center text-gray-500">
								<Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Loading...
							</td></tr>
						) : displayCoins.length === 0 ? (
							<tr><td colSpan={6} className="p-12 text-center text-gray-500">No coins found</td></tr>
						) : displayCoins.map((coin) => {
							const fav = favoriteIds.has(coin.slug);
							const typeInfo = TYPE_LABELS[coin.type] || { label: coin.type_name || '?', color: 'text-gray-400' };
							const chains = (coin.addresses || [])
								.map(a => a.blockchain || a.chain)
								.filter(Boolean)
								.filter((v, i, arr) => arr.indexOf(v) === i)
								.slice(0, 3);

							return (
								<tr key={coin.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
									<td className="p-3">
										<button onClick={() => toggleFavoriteId(coin.slug)} className="hover:scale-110 transition-transform">
											<Star className={`w-4 h-4 ${fav ? 'fill-amber-400 text-amber-400' : 'text-gray-600 hover:text-gray-400'}`} />
										</button>
									</td>
									<td className="p-3 text-gray-500 font-mono text-xs">{coin.rank || '–'}</td>
									<td className="p-3">
										<Link href={`/chat/cryptocurrencies/${coin.slug}`} className="flex items-center gap-2.5 group">
											<img
												src={getLogoUrl(coin)}
												alt=""
												className="w-6 h-6 rounded-full bg-white/5"
												loading="lazy"
												onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
											/>
											<span className="font-medium text-white group-hover:text-cyan-400 transition-colors truncate max-w-[200px]">
												{coin.name}
											</span>
										</Link>
									</td>
									<td className="p-3 text-gray-300 font-mono text-xs">{coin.symbol}</td>
									<td className="p-3">
										<span className={`px-2 py-0.5 rounded text-xs border ${typeInfo.color}`}>
											{typeInfo.label}
										</span>
									</td>
									<td className="p-3">
										<div className="flex gap-1 flex-wrap">
											{chains.map(c => (
												<span key={c} className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-gray-500 border border-white/5">
													{c}
												</span>
											))}
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* ── Pagination ── */}
			{!searchResults && totalPages > 1 && (
				<div className="flex items-center justify-center gap-3 mt-4">
					<button
						onClick={() => loadPage(page - 1)}
						disabled={page <= 1 || loading}
						className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 disabled:opacity-30 hover:bg-white/10 transition-colors"
					>
						<ChevronLeft className="w-4 h-4" />
					</button>
					<div className="flex items-center gap-1.5 text-sm text-gray-400">
						{/* Quick page buttons */}
						{Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
							let p: number;
							if (totalPages <= 7) p = i + 1;
							else if (page <= 4) p = i + 1;
							else if (page >= totalPages - 3) p = totalPages - 6 + i;
							else p = page - 3 + i;
							return (
								<button
									key={p}
									onClick={() => loadPage(p)}
									disabled={loading}
									className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
										p === page
											? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40'
											: 'bg-white/5 text-gray-500 hover:bg-white/10'
									}`}
								>
									{p}
								</button>
							);
						})}
					</div>
					<button
						onClick={() => loadPage(page + 1)}
						disabled={page >= totalPages || loading}
						className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 disabled:opacity-30 hover:bg-white/10 transition-colors"
					>
						<ChevronRight className="w-4 h-4" />
					</button>
				</div>
			)}
		</div>
	);
}
