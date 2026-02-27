import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type StakingAsset = {
    slug: string;
    name: string;
    symbol: string;
    logo_url?: string;
    price_usd?: number | null;
    reward_rate?: number | null;
    reward_rate_min?: number | null;
    reward_rate_max?: number | null;
    staked_tokens?: number | null;
    staking_ratio?: number | null;
    price_change_24h?: number | null;
    providers_count?: number;
    providers?: Array<{ name?: string; provider_type?: string; stakelink?: string }>;
    timeframe_metrics?: Record<string, Record<string, number | null | undefined>>;
    type_keys?: string[];
    ecosystem_keys?: string[];
    about?: string;
    coingecko_data?: {
        market_cap?: number | null;
        market_cap_rank?: number | null;
        total_volume?: number | null;
        circulating_supply?: number | null;
        total_supply?: number | null;
        price_change_24h?: number | null;
        price_change_7d?: number | null;
        price_change_30d?: number | null;
        ath?: number | null;
        atl?: number | null;
    };
};

const TIMEFRAMES = ['24h', '7d', '30d', '90d', '1y'] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

function isTimeframe(value: string): value is Timeframe
{
    return TIMEFRAMES.some((tf) => tf === value);
}

const TYPE_FILTERS = [
    { key: 'all', name: 'All' },
    { key: 'proof-of-stake', name: 'Proof of Stake' },
    { key: 'liquid-staking', name: 'Liquid (Re)Staking' },
    { key: 'actively-validated-service', name: 'Actively Validated Services' },
    { key: 'stablecoin', name: 'Stablecoins' },
    { key: 'bitcoin-and-others', name: 'Bitcoin & Others' },
    { key: 'testnet', name: 'Testnet' },
];

const ECOSYSTEM_FILTERS = [
    { key: 'all', name: 'All' },
    { key: 'ethereum-ecosystem', name: 'Ethereum' },
    { key: 'cosmos-ecosystem', name: 'Cosmos' },
    { key: 'polkadot-ecosystem', name: 'Polkadot' },
    { key: 'binance-smart-chain-ecosystem', name: 'BNB Chain' },
    { key: 'solana-ecosystem', name: 'Solana' },
    { key: 'avalanche-ecosystem', name: 'Avalanche' },
    { key: 'bitcoin-ecosystem', name: 'Bitcoin' },
    { key: 'ton-ecosystem', name: 'TON' },
    { key: 'near-ecosystem', name: 'NEAR' },
    { key: 'sui-ecosystem', name: 'Sui' },
    { key: 'aptos-ecosystem', name: 'Aptos' },
    { key: 'polygon-ecosystem', name: 'Polygon' },
];

const AVAILABLE_COLUMNS = [
    { key: 'reward_rate', label: 'Reward Rate', group: 'Reward' },
    { key: 'price', label: 'Price', group: 'General' },
    { key: 'staking_marketcap', label: 'Staking MC', group: 'Risk' },
    { key: 'staking_ratio', label: 'Staking Ratio', group: 'Risk' },
    { key: 'reputation', label: 'Reputation', group: 'General' },
    { key: 'net_staking_flow_7d', label: 'Net Staking Flow 7d', group: 'Momentum' },
    { key: 'marketcap', label: 'Market Cap', group: 'General' },
    { key: 'daily_trading_volume', label: 'Daily Volume', group: 'General' },
    { key: 'real_reward_rate', label: 'Real Reward Rate', group: 'Reward' },
    { key: 'staked_tokens', label: 'Staked Tokens', group: 'Reward' },
    { key: 'annualized_rewards_usd', label: 'Rewards Per Year', group: 'Reward' },
    { key: 'staked_tokens_trend_24h', label: 'Staked Tokens Trend 24h', group: 'Momentum' },
    { key: 'trading_volume_trend_24h', label: 'Trading Volume Trend 24h', group: 'Momentum' },
    { key: 'staking_roi_365d', label: 'Staking ROI 365d', group: 'ROI 365d' },
    { key: 'total_roi_365d', label: 'Total ROI 365d', group: 'ROI 365d' },
    { key: 'price_roi_365d', label: 'Price ROI 365d', group: 'ROI 365d' },
];

const DEFAULT_COLUMNS = ['reward_rate', 'price', 'staking_marketcap', 'staking_ratio', 'reputation', 'net_staking_flow_7d'];

function resolveCrawlerDataDir(): string
{
    const envDir = process.env.CRAWLER_DATA_DIR;
    const candidates = [
        envDir,
        path.join(process.cwd(), 'crawler', 'data', 'latest'),
        path.join(process.cwd(), '..', 'crawler', 'data', 'latest'),
        path.join(process.cwd(), '..', '..', 'crawler', 'data', 'latest'),
    ].filter(Boolean) as string[];

    for (const dir of candidates)
    {
        try
        {
            if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return dir;
        } catch
        {
            // ignore
        }
    }

    return candidates[1] || path.join(process.cwd(), 'crawler', 'data', 'latest');
}

function num(v: unknown): number | null
{
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function getMetric(asset: StakingAsset, key: string, timeframe: string): number | null
{
    // 1. أولوية: timeframe_metrics
    const fromTf = asset.timeframe_metrics?.[timeframe]?.[key];
    const normalized = num(fromTf);
    if (normalized !== null) return normalized;

    // 2. Fallback: top-level asset fields + coingecko_data
    const cg = asset.coingecko_data;
    switch (key)
    {
        case 'reward_rate':
            return num(asset.reward_rate);
        case 'price':
            return num(asset.price_usd);
        case 'staking_ratio':
            return num(asset.staking_ratio);
        case 'staked_tokens':
            return num(asset.staked_tokens);
        case 'staking_marketcap':
        {
            const p = num(asset.price_usd);
            const s = num(asset.staked_tokens);
            return p !== null && s !== null ? p * s : null;
        }
        case 'marketcap':
            return num(cg?.market_cap);
        case 'daily_trading_volume':
            return num(cg?.total_volume);
        case 'real_reward_rate':
        {
            // real = reward - inflation ≈ reward * (1 - staking_ratio/100)
            const rr = num(asset.reward_rate);
            const sr = num(asset.staking_ratio);
            if (rr !== null && sr !== null) return +(rr * (1 - sr / 100)).toFixed(4);
            return rr;
        }
        case 'annualized_rewards_usd':
        {
            const price = num(asset.price_usd);
            const staked = num(asset.staked_tokens);
            const rate = num(asset.reward_rate);
            if (price !== null && staked !== null && rate !== null)
                return +(price * staked * rate / 100).toFixed(0);
            return null;
        }
        case 'price_change_24h':
            return num(asset.price_change_24h) ?? num(cg?.price_change_24h);
        default:
            return null;
    }
}

export async function GET(req: NextRequest)
{
    try
    {
        const dataDir = resolveCrawlerDataDir();
        const filePath = path.join(dataDir, '__stakingrewards__.json');

        if (!fs.existsSync(filePath))
        {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'StakingRewards data not found. Run the stakingrewards crawler first.',
                        hint: 'python -m crawler.runner --family stakingrewards',
                    },
                },
                { status: 404 }
            );
        }

        const raw = fs.readFileSync(filePath, 'utf-8');
        const snapshot = JSON.parse(raw);
        const assets: StakingAsset[] = Array.isArray(snapshot.assets) ? snapshot.assets : [];

        const { searchParams } = new URL(req.url);

        const timeframeParam = searchParams.get('timeframe') || '7d';
        const timeframe = isTimeframe(timeframeParam) ? timeframeParam : '7d';

        const typeFilter = searchParams.get('type') || 'all';
        const ecosystemFilter = searchParams.get('ecosystem') || 'all';
        const search = (searchParams.get('search') || '').trim().toLowerCase();

        const page = Math.max(0, Number(searchParams.get('page') || 0));
        const pageSizeRaw = Number(searchParams.get('pageSize') || 50);
        const pageSize = [5, 10, 20, 50, 100].includes(pageSizeRaw) ? pageSizeRaw : 50;

        const sort = searchParams.get('sort') || 'staking_marketcap';
        const order = (searchParams.get('order') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

        const columns = (searchParams.get('columns') || DEFAULT_COLUMNS.join(','))
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean);

        const hasTypeTagData = assets.some((a) => Array.isArray(a.type_keys) && a.type_keys.length > 0);
        const hasEcosystemTagData = assets.some((a) => Array.isArray(a.ecosystem_keys) && a.ecosystem_keys.length > 0);

        let filtered = assets.filter((a) => {
            if (search)
            {
                const hay = `${a.name || ''} ${a.symbol || ''} ${a.slug || ''}`.toLowerCase();
                if (!hay.includes(search)) return false;
            }

            if (typeFilter !== 'all' && hasTypeTagData)
            {
                if (!(a.type_keys || []).includes(typeFilter)) return false;
            }

            if (ecosystemFilter !== 'all' && hasEcosystemTagData)
            {
                if (!(a.ecosystem_keys || []).includes(ecosystemFilter)) return false;
            }

            return true;
        });

        filtered = filtered.sort((a, b) => {
            const av = sort === 'name' ? (a.name || '').toLowerCase() : getMetric(a, sort, timeframe) ?? Number.NEGATIVE_INFINITY;
            const bv = sort === 'name' ? (b.name || '').toLowerCase() : getMetric(b, sort, timeframe) ?? Number.NEGATIVE_INFINITY;

            if (av < bv) return order === 'asc' ? -1 : 1;
            if (av > bv) return order === 'asc' ? 1 : -1;
            return 0;
        });

        const total = filtered.length;
        const start = page * pageSize;
        const end = start + pageSize;
        const paged = filtered.slice(start, end);

        const items = paged.map((asset) => {
            const metricValues = columns.reduce<Record<string, number | null>>((acc, key) => {
                acc[key] = getMetric(asset, key, timeframe);
                return acc;
            }, {});

            return {
                slug: asset.slug,
                name: asset.name,
                symbol: asset.symbol,
                logo_url: asset.logo_url,
                type_keys: asset.type_keys || [],
                ecosystem_keys: asset.ecosystem_keys || [],
                providers_count: asset.providers_count || 0,
                about: asset.about || '',
                providers: asset.providers || [],
                reward_rate_min: asset.reward_rate_min ?? null,
                reward_rate_max: asset.reward_rate_max ?? null,
                coingecko_rank: asset.coingecko_data?.market_cap_rank ?? null,
                timeframe,
                metrics: metricValues,
                stakingrewards_url: `https://www.stakingrewards.com/asset/${asset.slug}`,
            };
        });

        return NextResponse.json(
            {
                success: true,
                data: {
                    items,
                    total,
                    page,
                    pageSize,
                    timeframe,
                    sort,
                    order,
                    columns,
                    lastUpdated: snapshot.timestamp || null,
                    lastRefresh: snapshot.last_refresh || snapshot.timestamp || null,
                    filters: {
                        types: TYPE_FILTERS,
                        ecosystems: ECOSYSTEM_FILTERS,
                    },
                    timeframes: TIMEFRAMES,
                    availableColumns: AVAILABLE_COLUMNS,
                    hasTypeTagData,
                    hasEcosystemTagData,
                },
            },
            {
                headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
            }
        );
    } catch (error: unknown)
    {
        const message = error instanceof Error ? error.message : 'Failed to load staking rewards data';
        return NextResponse.json(
            {
                success: false,
                error: { message },
            },
            { status: 500 }
        );
    }
}
