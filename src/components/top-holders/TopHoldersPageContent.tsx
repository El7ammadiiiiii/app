"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import
{
    Menu,
    Columns3,
    RefreshCw,
    ChevronLeft,
    Crown,
} from "lucide-react";
import TokenList, { type TokenProject } from "./TokenList";
import EditColumnsDialog, { DEFAULT_SELECTED_COLUMNS } from "./EditColumnsDialog";
import HoldersTable from "./HoldersTable";

// ── localStorage keys ────────────────────────────────────────────────
const LS_COLUMNS_KEY = "top-holders-columns";
const LS_PROJECT_KEY = "top-holders-selected";

function loadColumns (): string[]
{
    if ( typeof window === "undefined" ) return DEFAULT_SELECTED_COLUMNS;
    try
    {
        const raw = localStorage.getItem( LS_COLUMNS_KEY );
        if ( raw ) return JSON.parse( raw );
    } catch { }
    return DEFAULT_SELECTED_COLUMNS;
}

function loadProject (): string | null
{
    // Avoid reading storage during SSR or initial hydration
    return null;
}

// ── Main Page Content ────────────────────────────────────────────────
export function TopHoldersPageContent ()
{
    // State
    const [ projects, setProjects ] = useState<TokenProject[]>( [] );
    const [ selectedProjectId, setSelectedProjectId ] = useState<string | null>( null );
    const [ holders, setHolders ] = useState<any[]>( [] );
    const [ listOpen, setListOpen ] = useState( false );
    const [ columnsOpen, setColumnsOpen ] = useState( false );
    const [ selectedColumns, setSelectedColumns ] = useState<string[]>( loadColumns );

    // Hydration fix: Load storage only after mount
    useEffect( () =>
    {
        if ( typeof window !== "undefined" )
        {
            try
            {
                const storedStyles = localStorage.getItem( LS_COLUMNS_KEY );
                if ( storedStyles ) setSelectedColumns( JSON.parse( storedStyles ) );

                const storedProj = localStorage.getItem( LS_PROJECT_KEY );
                if ( storedProj ) setSelectedProjectId( storedProj );
            } catch { }
        }
    }, [] );
    const [ loadingProjects, setLoadingProjects ] = useState( true );
    const [ loadingHolders, setLoadingHolders ] = useState( false );
    const [ error, setError ] = useState<string | null>( null );
    const [ summary, setSummary ] = useState<any>( null );

    // Selected project details
    const selectedProject = useMemo(
        () => projects.find( ( p ) => p.id === selectedProjectId ),
        [ projects, selectedProjectId ]
    );

    // ── Fetch project list ─────────────────────────────────────────────
    const fetchProjects = useCallback( async () =>
    {
        setLoadingProjects( true );
        setError( null );
        try
        {
            const res = await fetch( "/api/crawler/top-holders?action=list" );
            if ( !res.ok ) throw new Error( `HTTP ${ res.status }` );
            const json = await res.json();
            const list = json?.data?.projects ?? json?.projects ?? [];
            setProjects( Array.isArray( list ) ? list : [] );
        } catch ( err: any )
        {
            setError( err.message || "Failed to load projects" );
        } finally
        {
            setLoadingProjects( false );
        }
    }, [] );

    // ── Fetch holders for a project ────────────────────────────────────
    const fetchHolders = useCallback( async ( projectId: string ) =>
    {
        setLoadingHolders( true );
        setError( null );
        try
        {
            const res = await fetch(
                `/api/crawler/top-holders?action=holders&project=${ encodeURIComponent( projectId ) }`
            );
            if ( !res.ok ) throw new Error( `HTTP ${ res.status }` );
            const json = await res.json();
            const raw = json?.data?.holders ?? json?.data ?? json?.holders ?? [];
            setHolders( Array.isArray( raw ) ? raw : [] );
        } catch ( err: any )
        {
            setError( err.message || "Failed to load holders" );
            setHolders( [] );
        } finally
        {
            setLoadingHolders( false );
        }
    }, [] );

    // ── Fetch summary ─────────────────────────────────────────────────
    const fetchSummary = useCallback( async () =>
    {
        try
        {
            const res = await fetch( "/api/crawler/top-holders?action=summary" );
            if ( res.ok )
            {
                const data = await res.json();
                setSummary( data );
            }
        } catch { }
    }, [] );

    // ── Effects ────────────────────────────────────────────────────────
    useEffect( () =>
    {
        fetchProjects();
        fetchSummary();
    }, [ fetchProjects, fetchSummary ] );

    // Auto-select first project if none/invalid selected (fixes stale ID from localStorage)
    useEffect( () =>
    {
        if ( !loadingProjects && projects.length > 0 )
        {
            const isValid = projects.find( p => p.id === selectedProjectId );
            if ( !selectedProjectId || !isValid )
            {
                // Prefer ethereum if available, otherwise first
                const def = projects.find( p => p.id === 'ethereum' ) || projects[ 0 ];
                console.log( 'Auto-selecting project:', def.id );
                setSelectedProjectId( def.id );
            }
        }
    }, [ projects, loadingProjects, selectedProjectId ] );

    useEffect( () =>
    {
        if ( selectedProjectId )
        {
            fetchHolders( selectedProjectId );
            try
            {
                localStorage.setItem( LS_PROJECT_KEY, selectedProjectId );
            } catch { }
        } else
        {
            setHolders( [] );
        }
    }, [ selectedProjectId, fetchHolders ] );

    // Save columns preference
    useEffect( () =>
    {
        try
        {
            localStorage.setItem( LS_COLUMNS_KEY, JSON.stringify( selectedColumns ) );
        } catch { }
    }, [ selectedColumns ] );

    // ── Handlers ───────────────────────────────────────────────────────
    const handleSelectProject = ( project: TokenProject ) =>
    {
        setSelectedProjectId( project.id );
        setListOpen( false ); // Close on mobile
    };

    const handleRefresh = () =>
    {
        if ( selectedProjectId ) fetchHolders( selectedProjectId );
    };

    return (
        <div className="min-h-screen text-white flex flex-col">
            {/* ──── Sticky Header ──── */ }
            <header className="sticky top-0 z-50 backdrop-blur-sm border-b border-white/[0.08] theme-header">
                <div className="max-w-[1800px] mx-auto px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                        {/* Left: toggle + title */ }
                        <div className="flex items-center gap-3">
                            <button
                                onClick={ () => setListOpen( !listOpen ) }
                                className="p-2 rounded-lg hover:bg-white/[0.06] text-white/60 hover:text-white transition-colors"
                                title="قائمة العملات"
                            >
                                { listOpen ? (
                                    <ChevronLeft className="w-5 h-5" />
                                ) : (
                                    <Menu className="w-5 h-5" />
                                ) }
                            </button>
                            <div>
                                <div className="flex items-center gap-2">
                                    <Crown className="w-5 h-5 text-amber-400" />
                                    <h1 className="text-lg font-bold text-white">
                                        Top 200 Holders
                                    </h1>
                                </div>
                                <p className="text-xs text-white/40 mr-7">
                                    { selectedProject
                                        ? `${ selectedProject.name } (${ selectedProject.symbol })`
                                        : `${ projects.length } عملة متاحة` }
                                </p>
                            </div>
                        </div>

                        {/* Right: actions */ }
                        <div className="flex items-center gap-2">
                            { summary?.crawled_at && (
                                <span className="hidden sm:block text-[10px] text-white/25 font-mono">
                                    { new Date( summary.crawled_at ).toLocaleDateString( "ar" ) }
                                </span>
                            ) }
                            <button
                                onClick={ handleRefresh }
                                disabled={ loadingHolders || !selectedProjectId }
                                className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white
                           disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                                title="تحديث"
                            >
                                <RefreshCw
                                    className={ `w-4 h-4 ${ loadingHolders ? "animate-spin" : "" }` }
                                />
                            </button>
                            <button
                                onClick={ () => setColumnsOpen( true ) }
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                           bg-white/[0.04] hover:bg-white/[0.08] text-white/60
                           hover:text-white text-sm transition-colors border border-white/[0.06]"
                            >
                                <Columns3 className="w-4 h-4" />
                                <span className="hidden sm:inline">Edit Columns</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* ──── Body: sidebar + table ──── */ }
            <div className="flex-1 flex relative overflow-hidden">
                {/* Token List Panel */ }
                <TokenList
                    projects={ projects }
                    selectedId={ selectedProjectId }
                    onSelect={ handleSelectProject }
                    isOpen={ listOpen }
                    onClose={ () => setListOpen( false ) }
                    loading={ loadingProjects }
                />

                {/* Main content */ }
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Error banner */ }
                    { error && (
                        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs">
                            { error }
                        </div>
                    ) }

                    { !loadingProjects && projects.length === 0 && !error && (
                        <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs">
                            لا توجد بيانات حالياً لصفحة Top Holders. يرجى تشغيل الزاحف (TokenTerminal) لتوليد البيانات.
                        </div>
                    ) }

                    {/* Table */ }
                    <HoldersTable
                        holders={ holders }
                        visibleColumns={ selectedColumns }
                        projectName={ selectedProject?.name }
                        loading={ loadingHolders }
                    />
                </div>
            </div>

            {/* ──── Edit Columns Dialog ──── */ }
            <EditColumnsDialog
                isOpen={ columnsOpen }
                onClose={ () => setColumnsOpen( false ) }
                selectedColumns={ selectedColumns }
                onApply={ setSelectedColumns }
            />
        </div>
    );
}
