"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import
  {
    Rocket,
    Search,
    LayoutList,
    LayoutGrid,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Database,
  } from "lucide-react";
import
  {
    TokenSaleProject,
    TokenSaleListResponse,
    getTokenSales,
  } from "@/lib/services/cryptorank";
import { ICOListView } from "./ico-list-view";
import { ICOCardView } from "./ico-card-view";

const PAGE_SIZE = 20;

export function ICODashboard ()
{
  const router = useRouter();
  const [ viewMode, setViewMode ] = useState<"list" | "card">( "card" );
  const [ searchQuery, setSearchQuery ] = useState( "" );
  const [ debouncedSearch, setDebouncedSearch ] = useState( "" );
  const [ data, setData ] = useState<TokenSaleProject[]>( [] );
  const [ total, setTotal ] = useState( 0 );
  const [ page, setPage ] = useState( 1 );
  const [ loading, setLoading ] = useState( true );
  const [ refreshing, setRefreshing ] = useState( false );
  const [ isEmpty, setIsEmpty ] = useState( false );

  useEffect( () =>
  {
    const timer = setTimeout( () => setDebouncedSearch( searchQuery ), 400 );
    return () => clearTimeout( timer );
  }, [ searchQuery ] );

  useEffect( () =>
  {
    setPage( 1 );
  }, [ debouncedSearch ] );

  const loadData = useCallback( async () =>
  {
    setLoading( true );
    try
    {
      const res: TokenSaleListResponse = await getTokenSales(
        "all",
        page,
        PAGE_SIZE,
        debouncedSearch
      );
      setData( res.projects );
      setTotal( res.total );
      setIsEmpty( res.total === 0 && !debouncedSearch );
    } catch ( err )
    {
      console.error( err );
      setData( [] );
      setTotal( 0 );
    }
    setLoading( false );
  }, [ page, debouncedSearch ] );

  useEffect( () =>
  {
    loadData();
  }, [ loadData ] );

  const totalPages = Math.max( 1, Math.ceil( total / PAGE_SIZE ) );

  const handleProjectClick = ( project: TokenSaleProject ) =>
  {
    router.push( `/chat/token-sales/${ project.id }` );
  };

  const handleRefresh = async () =>
  {
    setRefreshing( true );
    try
    {
      await fetch( "/api/cryptorank?action=refresh" );
      setPage( 1 );
      await loadData();
    } catch ( err )
    {
      console.error( err );
    }
    setRefreshing( false );
  };

  return (
    <div className="min-h-screen text-white p-4 lg:p-6 space-y-5">
      {/* Header */ }
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-white">
            <Rocket className="w-5 h-5 text-yellow-500" />
            Token Sales & IDO
          </h1>
          <p className="text-xs text-white/60 mt-1">
            Latest 100 tokens with complete data • Stored locally
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh from API */ }
          <button
            onClick={ handleRefresh }
            disabled={ refreshing }
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.05] text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-50 text-xs border border-white/[0.08]"
            title="Re-fetch latest data from API"
          >
            <RefreshCw
              className={ `w-3.5 h-3.5 ${ refreshing ? "animate-spin" : "" }` }
            />
            { refreshing ? "Updating..." : "Update Data" }
          </button>

          {/* View Toggle */ }
          <div className="flex items-center gap-1 bg-white/[0.05] p-1 rounded-lg border border-white/[0.08]">
            <button
              onClick={ () => setViewMode( "card" ) }
              className={ `p-2 rounded-md transition-all ${ viewMode === "card"
                  ? "bg-white/[0.1] text-white shadow-sm"
                  : "text-white/50 hover:text-white"
                }` }
              title="Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={ () => setViewMode( "list" ) }
              className={ `p-2 rounded-md transition-all ${ viewMode === "list"
                  ? "bg-white/[0.1] text-white shadow-sm"
                  : "text-white/50 hover:text-white"
                }` }
              title="List View"
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search */ }
      <div className="flex items-center gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search by name or symbol..."
            value={ searchQuery }
            onChange={ ( e ) => setSearchQuery( e.target.value ) }
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all placeholder:text-white/30"
          />
        </div>
        { !loading && total > 0 && (
          <div className="text-xs text-white/40 flex items-center gap-1.5 whitespace-nowrap">
            <Database className="w-3.5 h-3.5" />
            { total } projects
          </div>
        ) }
      </div>

      {/* Content */ }
      <div className="glass-panel p-4 sm:p-6">
        { loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-white/50">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
            Loading projects...
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Database className="w-10 h-10 text-white/20" />
            <div className="text-center">
              <p className="text-white/60 font-medium mb-1">
                No data stored yet
              </p>
              <p className="text-white/40 text-sm mb-4">
                Click &quot;Update Data&quot; to fetch the latest 100 tokens
                from the API
              </p>
              <button
                onClick={ handleRefresh }
                disabled={ refreshing }
                className="px-4 py-2 rounded-lg bg-cyan-600/80 text-white text-sm hover:bg-cyan-600 transition-colors disabled:opacity-50"
              >
                { refreshing ? "Fetching..." : "Fetch Data Now" }
              </button>
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-20 text-white/50">
            No projects found matching &quot;{ searchQuery }&quot;
          </div>
        ) : viewMode === "list" ? (
          <ICOListView data={ data } onRowClick={ handleProjectClick } />
        ) : (
          <ICOCardView data={ data } onCardClick={ handleProjectClick } />
        ) }
      </div>

      {/* Pagination */ }
      { !loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={ () => setPage( ( p ) => Math.max( 1, p - 1 ) ) }
            disabled={ page <= 1 }
            className="p-2 rounded-lg bg-white/[0.05] text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-white/70 px-3">
            Page <span className="text-white font-bold">{ page }</span> of{ " " }
            <span className="text-white font-bold">{ totalPages }</span>
          </span>
          <button
            onClick={ () => setPage( ( p ) => Math.min( totalPages, p + 1 ) ) }
            disabled={ page >= totalPages }
            className="p-2 rounded-lg bg-white/[0.05] text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      ) }
    </div>
  );
}
