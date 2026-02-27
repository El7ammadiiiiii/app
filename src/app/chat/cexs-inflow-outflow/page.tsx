'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Activity, ArrowDown, ArrowUp, RefreshCw, Loader2 } from 'lucide-react';
import { useCryptoQuantStudioCategory } from '@/hooks/use-crawler-data';

/* ─── types ─── */
interface FlowMetric {
    name: string;
    slug: string;
    latest_value: number | null;
    chart_data?: { date: string; value: number }[];
    chart_type?: string;
}

const ASSET_TABS = [
    { id: 'btc', label: 'Bitcoin' },
    { id: 'eth', label: 'Ethereum' },
];

const formatCurrency = ( value: number ) =>
    new Intl.NumberFormat( 'en-US', {
        style: 'currency', currency: 'USD',
        minimumFractionDigits: 0, maximumFractionDigits: 0,
        notation: Math.abs( value ) >= 1e9 ? 'compact' : 'standard',
    } ).format( value );

const formatCompact = ( v: number ) =>
    new Intl.NumberFormat( 'en-US', { notation: 'compact', maximumFractionDigits: 2 } ).format( v );

export default function CEXsFlowPage ()
{
    const [ selectedAsset, setSelectedAsset ] = useState( ASSET_TABS[ 0 ].id );
    const { data, loading, error, lastUpdated, refresh } = useCryptoQuantStudioCategory( selectedAsset, 'exchange-flows' );

    /* ─── extract metrics from crawler response ─── */
    const metrics: FlowMetric[] = React.useMemo( () =>
    {
        if ( !data?.data ) return [];
        const d = data.data as any;
        // Try charts array inside asset
        const asset = d?.assets?.[ selectedAsset ] ?? d;
        const charts: any[] = asset?.charts ?? asset?.metrics ?? [];
        if ( Array.isArray( charts ) )
        {
            return charts.map( ( c: any ) => ( {
                name: c.name ?? c.title ?? c.slug ?? 'Unknown',
                slug: c.slug ?? c.id ?? '',
                latest_value: c.latest_value ?? c.value ?? null,
                chart_data: c.chart_data ?? c.data ?? [],
                chart_type: c.chart_type ?? 'bar',
            } ) );
        }
        return [];
    }, [ data, selectedAsset ] );

    return (
        <div className="min-h-screen text-white">
            <header className="sticky top-0 z-50 backdrop-blur-sm border-b border-white/[0.08] theme-header">
                <div className="max-w-[1800px] mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-white">CEXs Inflow & Outflow</h1>
                            <p className="text-sm text-gray-400 mt-1">Exchange flow metrics from CryptoQuant</p>
                        </div>
                        <div className="flex items-center gap-3">
                            { lastUpdated && (
                                <span className="text-xs text-gray-500">
                                    Updated: { lastUpdated.toLocaleTimeString() }
                                </span>
                            ) }
                            <button type="button" onClick={ refresh }
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                                title="Refresh">
                                <RefreshCw className={ `w-4 h-4 text-gray-400 ${ loading ? 'animate-spin' : '' }` } />
                            </button>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        { ASSET_TABS.map( ( tab ) => (
                            <button
                                key={ tab.id }
                                type="button"
                                onClick={ () => setSelectedAsset( tab.id ) }
                                className={ `px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${ selectedAsset === tab.id
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                                    }` }
                            >
                                { tab.label }
                            </button>
                        ) ) }
                    </div>
                </div>
            </header>

            <main className="max-w-[1800px] mx-auto px-4 py-6">
                { loading && !metrics.length ? (
                    <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>Loading exchange flow data…</span>
                    </div>
                ) : error ? (
                    <div className="text-center py-20 text-red-400">
                        <p>Failed to load data: { error }</p>
                        <button type="button" onClick={ refresh }
                            className="mt-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm">
                            Retry
                        </button>
                    </div>
                ) : (
                    <div className="glass-panel p-4 sm:p-5 rounded-xl border border-white/10 bg-white/[0.04]">
                        <div className="p-2 sm:p-3 border-b border-white/10">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Activity className="w-5 h-5 text-blue-400" />
                                Exchange Flows — { ASSET_TABS.find( t => t.id === selectedAsset )?.label }
                                <span className="ml-auto text-xs font-normal text-gray-500">
                                    { metrics.length } metrics
                                </span>
                            </h2>
                        </div>

                        <div className="overflow-x-auto -mx-2 sm:mx-0 mt-3"
                            style={ { WebkitOverflowScrolling: 'touch' } }>
                            <table className="w-full text-sm text-left min-w-[720px]">
                                <thead className="bg-white/[0.04] text-gray-300 uppercase text-xs font-medium border border-white/10">
                                    <tr>
                                        <th className="px-6 py-4">Metric</th>
                                        <th className="px-6 py-4">Latest Value</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Data Points</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    { metrics.map( ( m ) => (
                                        <tr key={ m.slug } className="hover:bg-white/[0.04] transition-colors">
                                            <td className="px-6 py-4 font-medium text-white">
                                                { m.name }
                                            </td>
                                            <td className={ `px-6 py-4 font-bold ${
                                                m.latest_value !== null
                                                    ? m.latest_value >= 0 ? 'text-green-400' : 'text-red-400'
                                                    : 'text-gray-500'
                                            }` }>
                                                { m.latest_value !== null ? (
                                                    <div className="flex items-center gap-1">
                                                        { m.latest_value >= 0
                                                            ? <ArrowUp className="w-3 h-3" />
                                                            : <ArrowDown className="w-3 h-3" /> }
                                                        { formatCompact( Math.abs( m.latest_value ) ) }
                                                    </div>
                                                ) : '—' }
                                            </td>
                                            <td className="px-6 py-4 text-gray-400 capitalize">
                                                { m.chart_type }
                                            </td>
                                            <td className="px-6 py-4 text-gray-400">
                                                { m.chart_data?.length ?? 0 }
                                            </td>
                                        </tr>
                                    ) ) }
                                    { !metrics.length && (
                                        <tr>
                                            <td colSpan={ 4 } className="px-6 py-12 text-center text-gray-500">
                                                No exchange flow data available for this asset.
                                            </td>
                                        </tr>
                                    ) }
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) }
            </main>
        </div>
    );
}
