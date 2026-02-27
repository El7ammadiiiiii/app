'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Loader2, ExternalLink, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, X } from 'lucide-react';
import { ALL_TOKENS, SUPPORTED_CHAINS, searchTokens, type WhaleToken } from '@/lib/whales/tokens';
import type { WhalesApiResponse, TokenHolder } from '@/lib/whales/types';

const TOKENS_PER_PAGE = 25;
const HOLDERS_PER_PAGE = 25;

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 CHAIN COLORS (subtle theme-compatible)
// ═══════════════════════════════════════════════════════════════════════════════
const CHAIN_COLORS: Record<number, string> = {
  1: 'border-blue-400/20 bg-blue-400/10 text-blue-200',
  56: 'border-yellow-400/20 bg-yellow-400/10 text-yellow-200',
  42161: 'border-sky-400/20 bg-sky-400/10 text-sky-200',
  137: 'border-purple-400/20 bg-purple-400/10 text-purple-200',
  10: 'border-red-400/20 bg-red-400/10 text-red-200',
  8453: 'border-blue-300/20 bg-blue-300/10 text-blue-100',
  43114: 'border-red-300/20 bg-red-300/10 text-red-100',
  250: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📄 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export function WhalesPageContent ()
{
  // Token list state
  const [ searchQuery, setSearchQuery ] = useState( '' );
  const [ selectedChain, setSelectedChain ] = useState<number | null>( null );
  const [ tokenPage, setTokenPage ] = useState( 1 );
  const [ showTokenDropdown, setShowTokenDropdown ] = useState( false );
  const dropdownRef = useRef<HTMLDivElement>( null );

  // Selected token & holders state
  const [ selectedToken, setSelectedToken ] = useState<WhaleToken | null>( null );
  const [ holdersData, setHoldersData ] = useState<WhalesApiResponse | null>( null );
  const [ loading, setLoading ] = useState( false );
  const [ error, setError ] = useState<string | null>( null );
  const [ holdersPage, setHoldersPage ] = useState( 1 );

  // Close dropdown when clicking outside
  useEffect( () =>
  {
    const handleClickOutside = ( event: MouseEvent ) =>
    {
      if ( dropdownRef.current && !dropdownRef.current.contains( event.target as Node ) )
      {
        setShowTokenDropdown( false );
      }
    };
    document.addEventListener( 'mousedown', handleClickOutside );
    return () => document.removeEventListener( 'mousedown', handleClickOutside );
  }, [] );

  // Filter tokens
  const filteredTokens = useMemo( () =>
  {
    let tokens = searchQuery ? searchTokens( searchQuery ) : ALL_TOKENS;
    if ( selectedChain !== null )
    {
      tokens = tokens.filter( t => t.chainId === selectedChain );
    }
    return tokens;
  }, [ searchQuery, selectedChain ] );

  // Paginate tokens
  const totalTokenPages = Math.ceil( filteredTokens.length / TOKENS_PER_PAGE );
  const displayedTokens = useMemo( () =>
  {
    const start = ( tokenPage - 1 ) * TOKENS_PER_PAGE;
    return filteredTokens.slice( start, start + TOKENS_PER_PAGE );
  }, [ filteredTokens, tokenPage ] );

  // Reset token page when filters change
  useEffect( () =>
  {
    setTokenPage( 1 );
  }, [ searchQuery, selectedChain ] );

  // Fetch holders for selected token
  const fetchHolders = async ( token: WhaleToken, page: number = 1 ) =>
  {
    setLoading( true );
    setError( null );
    setSelectedToken( token );
    setHoldersPage( page );
    setShowTokenDropdown( false );

    try
    {
      const res = await fetch( `/api/whales?tokenId=${ token.id }&page=${ page }&pageSize=${ HOLDERS_PER_PAGE }`, {
        cache: 'no-store',
      } );

      if ( !res.ok )
      {
        const errData = await res.json();
        throw new Error( errData.message || `API error: ${ res.status }` );
      }

      const data = await res.json() as WhalesApiResponse;
      setHoldersData( data );
    } catch ( err: any )
    {
      setError( err.message || 'Failed to fetch holders' );
      setHoldersData( null );
    } finally
    {
      setLoading( false );
    }
  };

  // Shorten address
  const shortenAddress = ( addr: string ) =>
  {
    if ( addr.length <= 12 ) return addr;
    return `${ addr.slice( 0, 6 ) }...${ addr.slice( -4 ) }`;
  };

  // Get explorer URL
  const getExplorerUrl = ( chainId: number, address: string ) =>
  {
    const explorers: Record<number, string> = {
      1: 'https://etherscan.io/address/',
      56: 'https://bscscan.com/address/',
      42161: 'https://arbiscan.io/address/',
      137: 'https://polygonscan.com/address/',
      10: 'https://optimistic.etherscan.io/address/',
      8453: 'https://basescan.org/address/',
      43114: 'https://snowtrace.io/address/',
      250: 'https://ftmscan.com/address/',
    };
    return ( explorers[ chainId ] || 'https://etherscan.io/address/' ) + address;
  };

  // Format balance
  const formatBalance = ( balance: string, decimals: number = 18 ) =>
  {
    try
    {
      const num = Number( BigInt( balance ) ) / Math.pow( 10, decimals );
      if ( num >= 1e9 ) return ( num / 1e9 ).toFixed( 2 ) + 'B';
      if ( num >= 1e6 ) return ( num / 1e6 ).toFixed( 2 ) + 'M';
      if ( num >= 1e3 ) return ( num / 1e3 ).toFixed( 2 ) + 'K';
      return num.toFixed( 2 );
    } catch
    {
      return '0';
    }
  };

  // Pagination component
  const Pagination = ( {
    currentPage,
    totalPages,
    onPageChange
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: ( page: number ) => void;
  } ) =>
  {
    if ( totalPages <= 1 ) return null;

    return (
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        <button
          onClick={ () => onPageChange( 1 ) }
          disabled={ currentPage === 1 }
          className="p-2.5 sm:p-2 rounded-lg bg-white/[0.05] text-gray-300 hover:text-white disabled:opacity-50 transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
        >
          <ChevronsLeft className="w-5 h-5 sm:w-4 sm:h-4" />
        </button>
        <button
          onClick={ () => onPageChange( currentPage - 1 ) }
          disabled={ currentPage === 1 }
          className="p-2.5 sm:p-2 rounded-lg bg-white/[0.05] text-gray-300 hover:text-white disabled:opacity-50 transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 sm:w-4 sm:h-4" />
        </button>

        <div className="text-xs text-white/70 px-2 sm:px-3">
          <span className="text-white font-bold">{ currentPage }</span> / { totalPages }
        </div>

        <button
          onClick={ () => onPageChange( currentPage + 1 ) }
          disabled={ currentPage === totalPages }
          className="p-2.5 sm:p-2 rounded-lg bg-white/[0.05] text-gray-300 hover:text-white disabled:opacity-50 transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
        >
          <ChevronRight className="w-5 h-5 sm:w-4 sm:h-4" />
        </button>
        <button
          onClick={ () => onPageChange( totalPages ) }
          disabled={ currentPage === totalPages }
          className="p-2.5 sm:p-2 rounded-lg bg-white/[0.05] text-gray-300 hover:text-white disabled:opacity-50 transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
        >
          <ChevronsRight className="w-5 h-5 sm:w-4 sm:h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen text-white">
      {/* Header */ }
      <header className="sticky top-0 z-50 backdrop-blur-sm border-b border-white/[0.08] theme-header">
        <div className="max-w-[1800px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white">🐋 Crypto Whales</h1>
              <p className="text-xs text-white/60">
                { ALL_TOKENS.length } tokens • { SUPPORTED_CHAINS.length } chains
              </p>
            </div>

            <div className="flex items-center gap-3">
              { loading ? (
                <div className="inline-flex items-center gap-2 text-xs text-white/70">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading
                </div>
              ) : null }
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-5">
        {/* Search & Chain/Token Selector */ }
        <div className="glass-panel p-3 sm:p-5">
          <div className="flex flex-col gap-3">
            {/* Row 1: Search + Chain Selector */ }
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */ }
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search tokens..."
                  value={ searchQuery }
                  onChange={ ( e ) => setSearchQuery( e.target.value ) }
                  className="w-full pl-10 pr-4 py-3 sm:py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/20 focus:bg-white/[0.07] transition-all text-base sm:text-sm"
                />
              </div>

              {/* Chain Selector Dropdown */ }
              <div className="relative" ref={ dropdownRef }>
                <button
                  onClick={ () => setShowTokenDropdown( !showTokenDropdown ) }
                  className={ `w-full sm:w-auto min-w-[180px] px-4 py-3 sm:py-2.5 rounded-xl text-sm font-medium transition-colors border flex items-center justify-between gap-2 ${ selectedChain !== null
                    ? CHAIN_COLORS[ selectedChain ] || 'border-white/20 bg-white/10 text-white'
                    : 'border-white/10 bg-white/[0.05] text-white/70 hover:text-white hover:bg-white/[0.08]'
                    }` }
                >
                  <span>
                    { selectedChain !== null
                      ? SUPPORTED_CHAINS.find( c => c.chainId === selectedChain )?.name || 'Select Chain'
                      : 'All Chains' }
                  </span>
                  <ChevronDown className={ `w-4 h-4 transition-transform ${ showTokenDropdown ? 'rotate-180' : '' }` } />
                </button>

                {/* Dropdown Menu */ }
                { showTokenDropdown && (
                  <div className="absolute top-full left-0 right-0 sm:right-auto sm:min-w-[280px] mt-2 dropdown-surface backdrop-blur-lg border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                    {/* Chain List */ }
                    <div className="p-2 border-b border-white/10">
                      <p className="text-xs text-white/50 px-2 py-1 uppercase tracking-wider">Select Chain</p>
                      <button
                        onClick={ () => { setSelectedChain( null ); } }
                        className={ `w-full px-3 py-2.5 sm:py-2 rounded-lg text-left text-sm transition-colors flex items-center justify-between ${ selectedChain === null
                          ? 'bg-cyan-400/10 text-cyan-200'
                          : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
                          }` }
                      >
                        <span>All Chains</span>
                        <span className="text-xs text-white/40">{ ALL_TOKENS.length } tokens</span>
                      </button>
                      { SUPPORTED_CHAINS.map( ( chain ) =>
                      {
                        const chainTokenCount = ALL_TOKENS.filter( t => t.chainId === chain.chainId ).length;
                        return (
                          <button
                            key={ chain.chainId }
                            onClick={ () => { setSelectedChain( chain.chainId ); } }
                            className={ `w-full px-3 py-2.5 sm:py-2 rounded-lg text-left text-sm transition-colors flex items-center justify-between ${ selectedChain === chain.chainId
                              ? CHAIN_COLORS[ chain.chainId ] || 'bg-white/10 text-white'
                              : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
                              }` }
                          >
                            <span>{ chain.name }</span>
                            <span className="text-xs text-white/40">{ chainTokenCount } tokens</span>
                          </button>
                        );
                      } ) }
                    </div>

                    {/* Filtered Token List */ }
                    <div className="p-2 max-h-[300px] overflow-y-auto">
                      <p className="text-xs text-white/50 px-2 py-1 uppercase tracking-wider flex items-center justify-between">
                        <span>Tokens { selectedChain !== null ? `on ${ SUPPORTED_CHAINS.find( c => c.chainId === selectedChain )?.name }` : '' }</span>
                        <span>{ filteredTokens.length }</span>
                      </p>
                      { filteredTokens.slice( 0, 20 ).map( ( token ) => (
                        <button
                          key={ token.id }
                          onClick={ () => fetchHolders( token ) }
                          className={ `w-full px-3 py-2.5 sm:py-2 rounded-lg text-left text-sm transition-colors flex items-center gap-2 ${ selectedToken?.id === token.id
                            ? 'bg-cyan-400/10 text-cyan-200'
                            : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
                            }` }
                        >
                          <span className="font-medium text-white">{ token.symbol }</span>
                          <span className="text-white/40 text-xs truncate flex-1">{ token.name }</span>
                          { selectedChain === null && (
                            <span className={ `px-1.5 py-0.5 rounded text-[10px] font-medium ${ CHAIN_COLORS[ token.chainId ] || 'bg-white/10 text-white/70' }` }>
                              { token.chainName }
                            </span>
                          ) }
                        </button>
                      ) ) }
                      { filteredTokens.length > 20 && (
                        <p className="text-xs text-white/40 px-3 py-2 text-center">
                          +{ filteredTokens.length - 20 } more tokens below
                        </p>
                      ) }
                    </div>
                  </div>
                ) }
              </div>
            </div>

            {/* Quick Chain Chips (Desktop) */ }
            <div className="hidden sm:flex gap-2 flex-wrap">
              <button
                onClick={ () => setSelectedChain( null ) }
                className={ `px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${ selectedChain === null
                  ? 'border-cyan-300/30 bg-cyan-400/10 text-cyan-200'
                  : 'border-white/10 bg-white/[0.05] text-white/70 hover:text-white hover:bg-white/[0.08]'
                  }` }
              >
                All ({ ALL_TOKENS.length })
              </button>
              { SUPPORTED_CHAINS.map( ( chain ) =>
              {
                const chainTokenCount = ALL_TOKENS.filter( t => t.chainId === chain.chainId ).length;
                return (
                  <button
                    key={ chain.chainId }
                    onClick={ () => setSelectedChain( chain.chainId ) }
                    className={ `px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${ selectedChain === chain.chainId
                      ? CHAIN_COLORS[ chain.chainId ] || 'border-white/20 bg-white/10 text-white'
                      : 'border-white/10 bg-white/[0.05] text-white/70 hover:text-white hover:bg-white/[0.08]'
                      }` }
                  >
                    { chain.name } ({ chainTokenCount })
                  </button>
                );
              } ) }
            </div>
          </div>
        </div>

        {/* Tokens Grid */ }
        <div className="glass-panel p-3 sm:p-5">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-white/70">
              <span className="text-white font-bold">{ filteredTokens.length }</span> tokens found
            </span>
            <span className="text-xs text-white/50">
              Page { tokenPage } of { totalTokenPages || 1 }
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            { displayedTokens.map( ( token ) => (
              <button
                key={ token.id }
                onClick={ () => fetchHolders( token ) }
                className={ `p-3 sm:p-3 rounded-xl border transition-all text-left hover:bg-white/[0.06] min-h-[60px] ${ selectedToken?.id === token.id
                  ? 'border-cyan-300/30 bg-cyan-400/10'
                  : 'border-white/10 bg-white/[0.04] hover:border-white/20'
                  }` }
              >
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-bold text-white">{ token.symbol }</span>
                  <span className={ `px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium border ${ CHAIN_COLORS[ token.chainId ] || 'border-white/20 bg-white/10 text-white/80' }` }>
                    { token.chainName }
                  </span>
                </div>
                <p className="text-xs text-white/50 mt-1 truncate">{ token.name }</p>
              </button>
            ) ) }
          </div>

          {/* Token Pagination */ }
          <div className="mt-4">
            <Pagination
              currentPage={ tokenPage }
              totalPages={ totalTokenPages }
              onPageChange={ setTokenPage }
            />
          </div>
        </div>

        {/* Holders Table */ }
        { selectedToken && (
          <div className="glass-panel overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-white/[0.08]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    { selectedToken.symbol } <span className="text-white/60 font-normal">Top Holders</span>
                  </h2>
                  <p className="text-xs text-white/50">
                    { selectedToken.name } on { selectedToken.chainName }
                  </p>
                </div>
                { loading && <Loader2 className="w-5 h-5 text-cyan-300 animate-spin" /> }
              </div>
            </div>

            { error && (
              <div className="p-4 bg-amber-500/10 border-b border-amber-500/20">
                <p className="text-amber-200 text-sm">⚠️ { error }</p>
              </div>
            ) }

            { holdersData && !loading && (
              <>
                {/* Data Source Badge */ }
                { holdersData.source?.includes( 'Demo' ) && (
                  <div className="px-4 py-2 bg-cyan-500/10 border-b border-cyan-500/20 flex items-center gap-2">
                    <span className="text-cyan-200 text-xs">
                      📊 Demo data shown. Etherscan PRO API ($199/mo) required for live data.
                    </span>
                  </div>
                ) }

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-white/[0.03]">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Rank</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-white/60 uppercase tracking-wider">Address</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-white/60 uppercase tracking-wider">Balance</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-white/60 uppercase tracking-wider">Share %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      { holdersData.holders.map( ( holder ) => (
                        <tr key={ holder.address } className="hover:bg-white/[0.03] transition-colors">
                          <td className="px-4 py-3">
                            <span className={ `inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${ holder.rank <= 3
                              ? 'bg-yellow-400/10 text-yellow-200 border border-yellow-400/20'
                              : holder.rank <= 10
                                ? 'bg-white/[0.06] text-white/80 border border-white/10'
                                : 'bg-white/[0.03] text-white/50'
                              }` }>
                              { holder.rank }
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <a
                              href={ getExplorerUrl( selectedToken.chainId, holder.address ) }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-cyan-200 hover:text-cyan-100 font-mono text-sm transition-colors"
                            >
                              { shortenAddress( holder.address ) }
                              <ExternalLink className="w-3 h-3 opacity-60" />
                            </a>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-white font-medium">
                              { formatBalance( holder.balance, selectedToken.decimals ) }
                            </span>
                            <span className="text-white/50 ml-1">{ selectedToken.symbol }</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={ `font-medium ${ holder.share >= 10 ? 'text-red-300' :
                              holder.share >= 5 ? 'text-amber-200' :
                                'text-emerald-300'
                              }` }>
                              { holder.share.toFixed( 2 ) }%
                            </span>
                          </td>
                        </tr>
                      ) ) }
                    </tbody>
                  </table>
                </div>

                {/* Holders Pagination */ }
                <div className="p-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-white/50">
                    Showing { ( holdersPage - 1 ) * HOLDERS_PER_PAGE + 1 } - { Math.min( holdersPage * HOLDERS_PER_PAGE, holdersData.totalHolders ) } of { holdersData.totalHolders } holders
                  </span>
                  <Pagination
                    currentPage={ holdersPage }
                    totalPages={ holdersData.totalPages }
                    onPageChange={ ( p ) => fetchHolders( selectedToken, p ) }
                  />
                </div>
              </>
            ) }

            { !holdersData && !loading && !error && (
              <div className="p-8 text-center text-white/50">
                Click on a token to load its top holders
              </div>
            ) }
          </div>
        ) }
      </main>
    </div>
  );
}
