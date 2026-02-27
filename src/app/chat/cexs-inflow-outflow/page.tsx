'use client';

import React, { useState, useEffect } from 'react';
import { Activity, ArrowDown, ArrowUp } from 'lucide-react';

interface ExchangeFlow
{
    exchange: string;
    outflow: number;
    inflow: number;
    netflow: number;
}

// Initial mock data based on the user's image, to show immediately before live data is fetched
const INITIAL_DATA: ExchangeFlow[] = [
    { exchange: 'binance', outflow: -1164583986, inflow: 1202205768, netflow: 37621781 },
    { exchange: 'kucoin', outflow: -595018, inflow: 2911917, netflow: 2316899 },
    { exchange: 'okx', outflow: -60187011, inflow: 61773106, netflow: 1586095 },
    { exchange: 'deribit', outflow: -1702931, inflow: 2008037, netflow: 305105 },
    { exchange: 'Bybit', outflow: -25339209, inflow: 24831841, netflow: -507368 },
    { exchange: 'bitfinex', outflow: -378643331, inflow: 367990878, netflow: -10652453 },
    { exchange: 'cryptocom', outflow: -106906491, inflow: 57957608, netflow: -48948883 },
];

const CHAIN_TABS = [
    { id: 'eip155-1', label: 'Ethereum' }
];

export default function CEXsFlowPage ()
{
    const [ data, setData ] = useState<ExchangeFlow[]>( INITIAL_DATA );
    const [ lastUpdated, setLastUpdated ] = useState<Date>( new Date() );
    const [ selectedChain, setSelectedChain ] = useState<string>( CHAIN_TABS[ 0 ].id );

    // Function to format currency
    const formatCurrency = ( value: number ) =>
    {
        return new Intl.NumberFormat( 'en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        } ).format( value );
    };

    useEffect( () =>
    {
        const fetchData = async () =>
        {
            try
            {
                const response = await fetch( `/data/exchange_flows.${ selectedChain }.json` );
                if ( response.ok )
                {
                    const jsonData = await response.json();
                    if ( Array.isArray( jsonData.exchanges ) )
                    {
                        const mapped = jsonData.exchanges.map( ( row: any ) => ( {
                            exchange: row.name,
                            inflow: Number( row.inflow_24h || 0 ),
                            outflow: Number( row.outflow_24h || 0 ),
                            netflow: Number( row.net_flow_24h || 0 ),
                        } ) );
                        setData( mapped.length ? mapped : INITIAL_DATA );
                    }
                    if ( jsonData.metadata?.last_updated )
                    {
                        setLastUpdated( new Date( jsonData.metadata.last_updated ) );
                    } else
                    {
                        setLastUpdated( new Date() );
                    }
                }
            } catch ( error )
            {
                console.error( 'Failed to fetch exchange flows', error );
            }
        };

        fetchData();
        const interval = setInterval( fetchData, 60000 );
        return () => clearInterval( interval );
    }, [ selectedChain ] );

    return (
        <div className="min-h-screen text-white">
            <header className="sticky top-0 z-50 backdrop-blur-sm border-b border-white/[0.08] theme-header">
                <div className="max-w-[1800px] mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-white">CEXs Inflow & Outflow</h1>
                            <p className="text-sm text-gray-400 mt-1">Real-time exchange wallet tracking</p>
                        </div>
                        <div className="text-xs text-gray-500">
                            Last updated: { lastUpdated.toLocaleTimeString() }
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        { CHAIN_TABS.map( ( chain ) => (
                            <button
                                key={ chain.id }
                                type="button"
                                onClick={ () => setSelectedChain( chain.id ) }
                                className={ `px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${ selectedChain === chain.id
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                                    }` }
                            >
                                { chain.label }
                            </button>
                        ) ) }
                    </div>
                </div>
            </header>

            <main className="max-w-[1800px] mx-auto px-4 py-6">
                <div className="glass-panel p-4 sm:p-5 rounded-xl border border-white/10 bg-white/[0.04]">
                    <div className="p-2 sm:p-3 border-b border-white/10">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-400" />
                            CEXs Total Inflow & Outflow
                        </h2>
                    </div>

                    <div
                        className="overflow-x-auto -mx-2 sm:mx-0 mt-3"
                        style={ { WebkitOverflowScrolling: 'touch' } }
                    >
                        <table className="w-full text-sm text-left min-w-[720px]">
                            <thead className="bg-white/[0.04] text-gray-300 uppercase text-xs font-medium border border-white/10">
                                <tr>
                                    <th className="px-6 py-4">Exchange</th>
                                    <th className="px-6 py-4">Outflow</th>
                                    <th className="px-6 py-4">Inflow</th>
                                    <th className="px-6 py-4">Netflow</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                { data.map( ( row ) => (
                                    <tr key={ row.exchange } className="hover:bg-white/[0.04] transition-colors">
                                        <td className="px-6 py-4 font-medium text-white capitalize">
                                            { row.exchange }
                                        </td>
                                        <td className="px-6 py-4 text-red-400">
                                            { formatCurrency( row.outflow ) }
                                        </td>
                                        <td className="px-6 py-4 text-green-400">
                                            { formatCurrency( row.inflow ) }
                                        </td>
                                        <td className={ `px-6 py-4 font-bold ${ row.netflow >= 0 ? 'text-green-400' : 'text-red-400' }` }>
                                            <div className="flex items-center gap-1">
                                                { row.netflow >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" /> }
                                                { formatCurrency( Math.abs( row.netflow ) ) }
                                                {/* Display absolute value because arrow/color indicates direction, 
                            though the table in image shows signed values for counts or similar. 
                            The image shows standard signed formatting. I will stick to image format. */}
                                            </div>
                                            <span className="text-xs opacity-50 block mt-0.5">
                                                {/* Re-rendering with sign for clarity matching image */ }
                                                { formatCurrency( row.netflow ) }
                                            </span>
                                        </td>
                                    </tr>
                                ) ) }
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
