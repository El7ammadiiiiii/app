"use client";

import { useEffect, useMemo, useState, useRef } from 'react';
import { Loader2, ArrowLeft, ArrowRight, Share2, Bell, Download, FileText, Image as ImageIcon, RotateCcw, Copy, Check, BellRing } from 'lucide-react';
import D3GraphCanvas from '@/components/onchain/D3GraphCanvas';
import { SelectionSheet } from '@/components/onchain/SelectionSheet';
import { toPng } from 'html-to-image';
import
{
    buildTraceGraph,
    fetchChainRegistry,
    fetchEdgeDrilldown,
    fetchNodeDetails,
    searchIntelligence,
} from '@/lib/onchain/client';
import { detectInput, getChainFamilyName, getEVMChainUIDs } from '@/lib/onchain/addressDetector';
import type {
    ChainRegistryEntry,
    CytoscapeElement,
    IntelligenceSuggestion,
    TraceEdgeResponse
} from '@/lib/onchain/types';
import
{
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const DEFAULT_CHAIN = 'eip155:1';
const INITIAL_VISIBLE_EDGES = 12;

// Helper functions
function shorten_address ( addr: string ): string
{
    if ( !addr || addr.length < 10 ) return addr;
    return `${ addr.slice( 0, 6 ) }...${ addr.slice( -4 ) }`;
}

function formatTimeAgo ( timestamp: number ): string
{
    const now = Math.floor( Date.now() / 1000 );
    const diff = now - timestamp;

    if ( diff < 60 ) return 'just now';
    if ( diff < 3600 ) return `${ Math.floor( diff / 60 ) }m ago`;
    if ( diff < 86400 ) return `${ Math.floor( diff / 3600 ) }h ago`;
    if ( diff < 2592000 ) return `${ Math.floor( diff / 86400 ) }d ago`;
    return `${ Math.floor( diff / 2592000 ) }mo ago`;
}

function formatDateTime ( timestamp: number ): string
{
    try
    {
        const date = new Date( timestamp * 1000 );
        return date.toLocaleString( 'ar-SA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        } );
    } catch
    {
        return '-';
    }
}

function formatValue ( valueRaw: string, decimals: number = 18 ): string
{
    try
    {
        const value = BigInt( valueRaw );
        const divisor = BigInt( 10 ** decimals );
        const intPart = value / divisor;
        const fracPart = value % divisor;

        if ( intPart > 1000000n )
        {
            return `${ ( Number( intPart ) / 1000000 ).toFixed( 2 ) }M`;
        }
        if ( intPart > 1000n )
        {
            return `${ ( Number( intPart ) / 1000 ).toFixed( 2 ) }K`;
        }

        const fracStr = fracPart.toString().padStart( decimals, '0' ).slice( 0, 4 );
        return `${ intPart }.${ fracStr }`;
    }
    catch
    {
        return '0';
    }
}

// Copy Button Component - زر نسخ مع مؤشر بصري
function CopyButton ( { text }: { text: string } )
{
    const [ copied, setCopied ] = useState( false );

    const handleCopy = async ( e: React.MouseEvent ) =>
    {
        e.stopPropagation();
        try
        {
            await navigator.clipboard.writeText( text );
            setCopied( true );
            setTimeout( () => setCopied( false ), 2000 );
        } catch ( err )
        {
            console.error( 'Failed to copy:', err );
        }
    };

    return (
        <span
            onClick={ handleCopy }
            className="ml-2 p-1.5 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 transition-all group cursor-pointer inline-flex"
            title="Copy address"
        >
            { copied ? (
                <Check className="h-3 w-3 text-green-400" />
            ) : (
                <Copy className="h-3 w-3 text-white/60 group-hover:text-white" />
            ) }
        </span>
    );
}

// Convert Cytoscape elements to D3 format
function convertToD3Format ( elements: CytoscapeElement[] )
{
    const nodeMap = new Map<string, {
        id: string;
        label: string;
        address: string;
        type?: string;
    }>();

    for ( const el of elements.filter( e => e.group === 'nodes' ) )
    {
        const id = String( el.data.id || '' );
        if ( !id ) continue;

        const normalized = {
            id,
            label: String( el.data.label || shorten_address( el.data.address || id ) ),
            address: String( el.data.address || id ),
            type: el.data.isStart || el.data.isCenter ? 'start' : undefined,
        };

        if ( !nodeMap.has( id ) )
        {
            nodeMap.set( id, normalized );
        }
    }

    const edgeMap = new Map<string, {
        id: string;
        source: string;
        target: string;
        label?: string;
        value: string;
    }>();

    for ( const el of elements.filter( e => e.group === 'edges' ) )
    {
        const id = String( el.data.id || '' );
        const source = String( el.data.source || '' );
        const target = String( el.data.target || '' );
        if ( !id || !source || !target ) continue;

        if ( !edgeMap.has( id ) )
        {
            edgeMap.set( id, {
                id,
                source,
                target,
                label: el.data.label,
                value: String( el.data.valueLabel || '' ),
            } );
        }
    }

    const nodes = Array.from( nodeMap.values() );
    const edges = Array.from( edgeMap.values() );

    return { nodes, edges };
}

export default function ChainTrackerPage ()
{
    const [ chains, setChains ] = useState<ChainRegistryEntry[]>( [] );
    const [ selectedChain, setSelectedChain ] = useState( DEFAULT_CHAIN );
    const [ address, setAddress ] = useState( '' );
    const [ direction, setDirection ] = useState<'in' | 'out' | 'both'>( 'both' );

    // إعدادات تلقائية - لا تظهر في الواجهة
    const maxDepth = 10; // مستوى كامل
    const includeNative = true; // دائماً مفعل
    const includeErc20 = true; // تلقائي حسب الشبكة
    const includeInternal = true; // تلقائي مفعل
    const [ elements, setElements ] = useState<CytoscapeElement[]>( [] );
    const [ traceId, setTraceId ] = useState<string | null>( null );
    const [ isLoadingChains, setIsLoadingChains ] = useState( true );
    const [ isBuilding, setIsBuilding ] = useState( false );
    const [ errorMessage, setErrorMessage ] = useState<string | null>( null );

    // Export and layout management
    const graphRef = useRef<HTMLDivElement>( null );
    const [ isExporting, setIsExporting ] = useState( false );
    const [ savedLayouts, setSavedLayouts ] = useState<Map<string, string>>( new Map() );

    const [ selectionType, setSelectionType ] = useState<'node' | 'edge' | null>( null );
    const [ selectedNode, setSelectedNode ] = useState<Record<string, any> | null>( null );
    const [ selectedEdge, setSelectedEdge ] = useState<Record<string, any> | null>( null );
    const [ edgeDetails, setEdgeDetails ] = useState<TraceEdgeResponse[ 'data' ] | null>( null );
    const [ edgeLoading, setEdgeLoading ] = useState( false );
    const [ nodeDetails, setNodeDetails ] = useState<Record<string, any> | null>( null );
    const [ sidebarOpen, setSidebarOpen ] = useState( false );
    const [ flowFilter, setFlowFilter ] = useState<'inflow' | 'outflow' | 'all'>( 'all' );
    const [ expandedTxs, setExpandedTxs ] = useState<Set<string>>( new Set() );
    const [ alertedAddresses, setAlertedAddresses ] = useState<string[]>( [] );
    const [ showShareToast, setShowShareToast ] = useState( false );
    const [ transferPanelOpen, setTransferPanelOpen ] = useState( true );
    const [ transferTab, setTransferTab ] = useState<'sent' | 'received'>( 'sent' );
    const [ transferPage, setTransferPage ] = useState( 1 );
    const [ activeEdgeId, setActiveEdgeId ] = useState<string | null>( null );
    const [ edgeDrilldowns, setEdgeDrilldowns ] = useState<Record<string, {
        pages: Array<{ cursor: string | null; items: Array<Record<string, any>>; nextCursor?: string | null }>;
        currentPage: number;
        loading: boolean;
    }> | null>( null );
    const transferPanelOpenedRef = useRef( false );
    const transferPanelRef = useRef<HTMLDivElement>( null );
    const [ suggestions, setSuggestions ] = useState<IntelligenceSuggestion[]>( [] );
    const [ isSearchingSuggestions, setIsSearchingSuggestions ] = useState( false );
    const [ showSuggestions, setShowSuggestions ] = useState( false );

    // Load alerted addresses from localStorage on mount
    useEffect( () =>
    {
        const stored = localStorage.getItem( 'alertedAddresses' );
        if ( stored )
        {
            try
            {
                setAlertedAddresses( JSON.parse( stored ) );
            } catch ( e )
            {
                console.error( 'Failed to load alerted addresses:', e );
            }
        }
    }, [] );

    const hasResults = useMemo( () => elements.some( el => el.group === 'edges' ), [ elements ] );

    useEffect( () =>
    {
        if ( !hasResults )
        {
            setTransferPanelOpen( false );
            transferPanelOpenedRef.current = false;
            return;
        }

        if ( !transferPanelOpenedRef.current )
        {
            setTransferPanelOpen( true );
            transferPanelOpenedRef.current = true;
        }
    }, [ hasResults ] );

    useEffect( () =>
    {
        if ( !transferPanelOpen ) return;

        const handleClickOutside = ( event: MouseEvent ) =>
        {
            if ( transferPanelRef.current && !transferPanelRef.current.contains( event.target as Node ) )
            {
                setTransferPanelOpen( false );
            }
        };

        document.addEventListener( 'mousedown', handleClickOutside );
        return () => document.removeEventListener( 'mousedown', handleClickOutside );
    }, [ transferPanelOpen ] );

    useEffect( () =>
    {
        if ( elements.length === 0 )
        {
            setExpandedTxs( new Set() );
            setTransferPage( 1 );
            setActiveEdgeId( null );
            setEdgeDrilldowns( null );
            return;
        }

        const initialEdgeIds = elements
            .filter( el => el.group === 'edges' )
            .slice( 0, INITIAL_VISIBLE_EDGES )
            .map( el => String( el.data.id ) );

        setExpandedTxs( new Set( initialEdgeIds ) );
        setTransferPage( 1 );
        setActiveEdgeId( null );
        setEdgeDrilldowns( null );
    }, [ elements ] );

    useEffect( () =>
    {
        let active = true;
        setIsLoadingChains( true );
        fetchChainRegistry( 'enabled' )
            .then( ( response ) =>
            {
                if ( !active ) return;
                const list = response.data?.chains || [];
                setChains( list );
                if ( list.length > 0 )
                {
                    setSelectedChain( list[ 0 ].chainUid );
                }
            } )
            .catch( () =>
            {
                if ( active ) setErrorMessage( 'تعذر تحميل قائمة السلاسل.' );
            } )
            .finally( () =>
            {
                if ( active ) setIsLoadingChains( false );
            } );

        return () =>
        {
            active = false;
        };
    }, [] );

    const chainOptions = useMemo( () =>
    {
        if ( chains.length === 0 )
        {
            return [ { chainUid: DEFAULT_CHAIN, label: 'Ethereum' } ];
        }

        return chains.map( ( chain ) => ( {
            chainUid: chain.chainUid,
            label: chain.displayName
        } ) );
    }, [ chains ] );

    useEffect( () =>
    {
        const input = address.trim();
        const detected = detectInput( input );

        if ( input.length < 2 || detected.isValid )
        {
            setSuggestions( [] );
            setShowSuggestions( false );
            return;
        }

        const timer = setTimeout( async () =>
        {
            try
            {
                setIsSearchingSuggestions( true );
                const res = await searchIntelligence( input );
                const items = ( res.data || [] ).slice( 0, 18 );
                setSuggestions( items );
                setShowSuggestions( items.length > 0 );
            } catch
            {
                setSuggestions( [] );
                setShowSuggestions( false );
            } finally
            {
                setIsSearchingSuggestions( false );
            }
        }, 250 );

        return () => clearTimeout( timer );
    }, [ address ] );

    const pickSuggestionAddress = ( item: IntelligenceSuggestion ): string =>
    {
        const firstAddress = item.addresses?.[ 0 ]?.address;
        if ( firstAddress && firstAddress.trim() ) return firstAddress.trim();
        return item.name?.trim() || '';
    };

    const handleBuildGraph = async () =>
    {
        setErrorMessage( null );

        const input = address.trim();

        if ( !input )
        {
            setErrorMessage( 'أدخل عنوان أو معرف معاملة (TXID).' );
            return;
        }

        // Auto-detect blockchain from input
        const detection = detectInput( input );

        if ( !detection.isValid )
        {
            setErrorMessage( 'صيغة العنوان أو TXID غير صحيحة.' );
            return;
        }

        setIsBuilding( true );

        try
        {
            const runTraceOnChain = async ( chainUid: string ) =>
            {
                const accountId = `${ chainUid }:${ input }`;
                return buildTraceGraph( {
                    chains: [ chainUid ],
                    start: {
                        nodeKind: 'account',
                        accountId
                    },
                    direction,
                    maxDepth,
                    limits: {
                        maxNeighborsPerNode: 25,
                        maxTotalEdges: 600
                    },
                    include: {
                        nativeTransfers: includeNative,
                        erc20Transfers: includeErc20,
                        internalTransactions: includeInternal
                    }
                } );
            };

            // For EVM addresses/txids, try primary chains sequentially
            if ( detection.searchAllEVM )
            {
                const evmChains = getEVMChainUIDs( chains );

                if ( evmChains.length === 0 )
                {
                    setErrorMessage( 'لا توجد سلاسل EVM مفعلة.' );
                    setIsBuilding( false );
                    return;
                }

                // Priority: fast first-pass on major chains, then expand to the rest
                const priorityChains = [
                    'eip155:1',   // Ethereum
                    'eip155:137', // Polygon
                    'eip155:56',  // BNB Chain
                    'eip155:42161', // Arbitrum
                    'eip155:10',  // Optimism
                    'eip155:8453' // Base
                ].filter( c => evmChains.includes( c ) );


                const fallbackChains = evmChains.filter( c => !priorityChains.includes( c ) );
                const candidateChains = [ ...priorityChains, ...fallbackChains ];

                let bestResponse: Awaited<ReturnType<typeof buildTraceGraph>> | null = null;
                let bestChain: string | null = null;
                let lastError: string | null = null;

                for ( const chainUid of candidateChains )
                {
                    const response = await runTraceOnChain( chainUid );

                    if ( response.success && response.data )
                    {
                        const edgeCount = ( response.data.graph.elements || [] ).filter( e => e.group === 'edges' ).length;
                        if ( !bestResponse )
                        {
                            bestResponse = response;
                            bestChain = chainUid;
                        }

                        // stop early once we find meaningful graph data
                        if ( edgeCount > 0 )
                        {
                            bestResponse = response;
                            bestChain = chainUid;
                            break;
                        }
                    }
                    else
                    {
                        lastError = response.error?.message || null;
                    }
                }

                if ( bestResponse?.success && bestResponse.data )
                {
                    setSelectedChain( bestChain || DEFAULT_CHAIN );
                    setTraceId( bestResponse.data.traceId );
                    setElements( bestResponse.data.graph.elements || [] );
                    checkWalletAlerts( bestResponse.data.graph.elements || [] );
                }
                else
                {
                    setErrorMessage( lastError || 'فشل بناء الرسم البياني على جميع السلاسل المفعّلة.' );
                }
            }
            else
            {
                // Non-EVM chains: Bitcoin, Solana, Tron, etc
                const chainUid = detection.suggestedChainUid || DEFAULT_CHAIN;
                const response = await runTraceOnChain( chainUid );

                if ( response.success && response.data )
                {
                    setSelectedChain( chainUid );
                    setTraceId( response.data.traceId );
                    setElements( response.data.graph.elements || [] );
                    checkWalletAlerts( response.data.graph.elements || [] );
                }
                else
                {
                    setErrorMessage( response.error?.message || 'فشل بناء الرسم البياني.' );
                }
            }
        } catch ( error )
        {
            setErrorMessage( 'تعذر الاتصال بمحرك الأونتشين.' );
        } finally
        {
            setIsBuilding( false );
        }
    };

    // Check for wallet activity alerts
    const checkWalletAlerts = ( elements: CytoscapeElement[] ) =>
    {
        if ( alertedAddresses.length === 0 ) return;

        // Find nodes that match alerted addresses
        const alertedNodes = elements.filter( el =>
            el.group === 'nodes' &&
            alertedAddresses.includes( el.data.address || el.data.id )
        );

        // Find edges involving alerted addresses
        const alertedEdges = elements.filter( el =>
            el.group === 'edges' &&
            ( alertedAddresses.includes( el.data.source ) || alertedAddresses.includes( el.data.target ) )
        );

        // Send notifications if activity detected
        if ( alertedEdges.length > 0 && 'Notification' in window && Notification.permission === 'granted' )
        {
            alertedEdges.slice( 0, 3 ).forEach( ( edge, idx ) =>
            {
                setTimeout( () =>
                {
                    new Notification( '🔔 Chain Tracker Alert', {
                        body: `نشاط محفظة مراقبة: ${ edge.data.valueLabel || 'معاملة جديدة' }`,
                        icon: '/favicon.ico',
                        tag: edge.data.id,
                    } );
                }, idx * 500 ); // Stagger notifications
            } );
        }
    };

    // Export with CCWAYS watermark
    const exportWithWatermark = async ( format: 'png' | 'pdf' ) =>
    {
        if ( !graphRef.current || isExporting ) return;
        setIsExporting( true );

        try
        {
            // Capture graph as PNG with high quality
            const dataUrl = await toPng( graphRef.current, {
                cacheBust: true,
                backgroundColor: format === 'pdf' ? '#ffffff' : 'rgba(6, 10, 12, 0.35)',
                pixelRatio: 2, // High quality
            } );

            // Create canvas to add watermark
            const img = new Image();
            img.src = dataUrl;

            await new Promise<void>( ( resolve ) =>
            {
                img.onload = () => resolve();
            } );

            const canvas = document.createElement( 'canvas' );
            const ctx = canvas.getContext( '2d' );
            if ( !ctx ) return;

            canvas.width = img.width;
            canvas.height = img.height;

            // Draw captured graph
            ctx.drawImage( img, 0, 0 );

            // Add CCWAYS watermark (transparent)
            ctx.font = 'bold 32px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; // Transparent white
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillText( 'CCWAYS', canvas.width - 20, canvas.height - 20 );

            // Add timestamp and address
            ctx.font = '16px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            const timestamp = new Date().toLocaleString( 'ar-SA' );
            ctx.fillText( timestamp, canvas.width - 20, canvas.height - 60 );

            if ( address )
            {
                ctx.fillText( `Wallet: ${ address.slice( 0, 10 ) }...${ address.slice( -8 ) }`, canvas.width - 20, canvas.height - 85 );
            }

            if ( format === 'png' )
            {
                // Export PNG
                canvas.toBlob( ( blob ) =>
                {
                    if ( !blob ) return;
                    const url = URL.createObjectURL( blob );
                    const link = document.createElement( 'a' );
                    link.download = `chain-tracker-${ address || 'graph' }-${ Date.now() }.png`;
                    link.href = url;
                    link.click();
                    URL.revokeObjectURL( url );
                } );
            } else
            {
                // Export PDF
                const { jsPDF } = await import( 'jspdf' );
                const pdf = new jsPDF( {
                    orientation: 'landscape',
                    unit: 'pt',
                    format: 'a4'
                } );

                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                const imgWidth = pageWidth - 40;
                const imgHeight = ( canvas.height * imgWidth ) / canvas.width;

                pdf.addImage( canvas.toDataURL( 'image/png' ), 'PNG', 20, 20, imgWidth, Math.min( imgHeight, pageHeight - 40 ) );
                pdf.save( `chain-tracker-${ address || 'graph' }-${ Date.now() }.pdf` );
            }
        } catch ( error )
        {
            console.error( 'Export failed:', error );
        } finally
        {
            setIsExporting( false );
        }
    };

    // Reset layout
    const resetLayout = () =>
    {
        // Force re-render of graph with new force simulation
        const currentElements = [ ...elements ];
        setElements( [] );
        setTimeout( () =>
        {
            setElements( currentElements );
        }, 50 );
    };

    // Handle Incoming - expand node to show incoming transactions
    const handleIncoming = async ( node: Record<string, any> | null ) =>
    {
        if ( !node?.address ) return;

        // Build new graph focused on incoming transactions
        setAddress( node.address );
        setDirection( 'in' );

        // Trigger graph rebuild
        handleBuildGraph();
    };

    // Handle Outgoing - expand node to track outgoing wallet
    const handleOutgoing = async ( node: Record<string, any> | null ) =>
    {
        if ( !node?.address ) return;

        // Build new graph focused on outgoing transactions
        setAddress( node.address );
        setDirection( 'out' );

        // Trigger graph rebuild
        handleBuildGraph();
    };

    // Handle Share - copy URL to clipboard with toast
    const handleShare = async ( node: Record<string, any> | null ) =>
    {
        if ( !node?.address ) return;

        const url = `${ window.location.origin }/chat/ChainTracker?address=${ node.address }`;

        try
        {
            await navigator.clipboard.writeText( url );
            setShowShareToast( true );
            setTimeout( () => setShowShareToast( false ), 3000 );
        } catch ( err )
        {
            console.error( 'Failed to copy:', err );
        }
    };

    // Handle Alert - toggle alert for wallet activity
    const handleAlert = ( node: Record<string, any> | null ) =>
    {
        if ( !node?.address ) return;

        const address = node.address;
        const isAlerted = alertedAddresses.includes( address );

        let newAlerted: string[];
        if ( isAlerted )
        {
            // Remove alert
            newAlerted = alertedAddresses.filter( a => a !== address );
        } else
        {
            // Add alert
            newAlerted = [ ...alertedAddresses, address ];

            // Request notification permission if not granted
            if ( 'Notification' in window && Notification.permission === 'default' )
            {
                Notification.requestPermission();
            }
        }

        setAlertedAddresses( newAlerted );
        localStorage.setItem( 'alertedAddresses', JSON.stringify( newAlerted ) );
    };

    const handleNodeSelect = async ( data: Record<string, any> ) =>
    {
        setSelectionType( 'node' );
        setSelectedNode( data );
        setSelectedEdge( null );
        setEdgeDetails( null );

        if ( !data?.chainUid || !data?.id ) return;

        // جلب تفاصيل Node
        const details = await fetchNodeDetails( {
            chainUid: data.chainUid,
            nodeId: data.id,
            include: {
                balance: true,
                recentActivity: true,
                labels: true,
                contractMetadata: false
            }
        } );

        if ( details.success && details.data )
        {
            // إضافة معلومات الحوالات المرتبطة بهذا Node
            const relatedEdges = elements.filter( ( el ) =>
                el.group === 'edges' &&
                ( el.data.source === data.id || el.data.target === data.id )
            );

            const incomingEdges = relatedEdges.filter( ( el ) => el.data.target === data.id );
            const outgoingEdges = relatedEdges.filter( ( el ) => el.data.source === data.id );

            const enrichedDetails = {
                ...details.data,
                transactionStats: {
                    incoming: incomingEdges.length,
                    outgoing: outgoingEdges.length,
                    total: relatedEdges.length
                },
                relatedTransactions: {
                    incoming: incomingEdges.map( ( e ) => ( {
                        from: e.data.source,
                        amount: e.data.valueLabel,
                        kind: e.data.kind
                    } ) ).slice( 0, 5 ),
                    outgoing: outgoingEdges.map( ( e ) => ( {
                        to: e.data.target,
                        amount: e.data.valueLabel,
                        kind: e.data.kind
                    } ) ).slice( 0, 5 )
                }
            };

            setNodeDetails( enrichedDetails );
        }
    };

    const handleEdgeSelect = async ( data: Record<string, any> ) =>
    {
        setSelectionType( 'edge' );
        setSelectedEdge( data );
        setSelectedNode( null );
        setNodeDetails( null );

        const edgeId = String( data.edgeId || data.id || '' );
        if ( !edgeId || !traceId ) return;

        setEdgeLoading( true );
        try
        {
            const response = await fetchEdgeDrilldown( {
                traceId,
                edgeId,
                // No pagination on initial call
            } );

            if ( response.success )
            {
                setEdgeDetails( response.data || null );
            }
            else
            {
                setEdgeDetails( null );
            }
        } finally
        {
            setEdgeLoading( false );
        }
    };

    const centerNodeId = useMemo( () =>
    {
        const centerNode = elements.find( el => el.group === 'nodes' && ( el.data.isStart || el.data.isCenter ) );
        if ( centerNode?.data?.id ) return centerNode.data.id;
        const firstNode = elements.find( el => el.group === 'nodes' );
        return firstNode?.data?.id || null;
    }, [ elements ] );

    const edgesList = useMemo( () =>
    {
        return elements
            .filter( el => el.group === 'edges' )
            .map( el => ( {
                id: String( el.data.id ),
                source: String( el.data.source || '' ),
                target: String( el.data.target || '' ),
                valueLabel: el.data.valueLabel || el.data.label || '-',
                kind: el.data.kind || 'transfer',
                symbol: el.data.symbol || el.data?.summary?.token?.symbol || 'ETH',
                summary: el.data.summary || null,
            } ) );
    }, [ elements ] );

    const nodeLabelMap = useMemo( () =>
    {
        const map = new Map<string, { label: string; address: string }>();
        for ( const el of elements )
        {
            if ( el.group !== 'nodes' ) continue;
            const nodeId = String( el.data.id || '' );
            if ( !nodeId ) continue;
            map.set( nodeId, {
                label: String( el.data.label || '' ),
                address: String( el.data.address || nodeId )
            } );
        }
        return map;
    }, [ elements ] );

    const filteredEdges = useMemo( () =>
    {
        const focusNodeId = selectedNode?.id || centerNodeId;
        if ( !focusNodeId ) return edgesList;

        return edgesList.filter( ( edge ) =>
        {
            if ( transferTab === 'sent' ) return edge.source === focusNodeId;
            return edge.target === focusNodeId;
        } );
    }, [ selectedNode?.id, centerNodeId, edgesList, transferTab ] );

    const transferPageSize = 8;
    const totalTransferPages = Math.max( 1, Math.ceil( filteredEdges.length / transferPageSize ) );
    const pagedEdges = filteredEdges.slice( ( transferPage - 1 ) * transferPageSize, transferPage * transferPageSize );

    const toggleEdgeVisibility = ( edgeId: string ) =>
    {
        setExpandedTxs( ( prev ) =>
        {
            const next = new Set( prev );
            if ( next.has( edgeId ) )
            {
                next.delete( edgeId );
            } else
            {
                next.add( edgeId );
            }
            return next;
        } );
    };

    const getEdgeDrilldownPage = async ( edgeId: string, page: number ) =>
    {
        if ( !traceId ) return;

        setEdgeDrilldowns( ( prev ) =>
        {
            const current = prev?.[ edgeId ] || { pages: [], currentPage: 1, loading: false };
            return {
                ...( prev || {} ),
                [ edgeId ]: {
                    ...current,
                    loading: true,
                }
            };
        } );

        const existing = edgeDrilldowns?.[ edgeId ];
        const existingPage = existing?.pages?.[ page - 1 ];
        if ( existingPage )
        {
            setEdgeDrilldowns( ( prev ) =>
            {
                const current = prev?.[ edgeId ];
                if ( !current ) return prev;
                return {
                    ...( prev || {} ),
                    [ edgeId ]: {
                        ...current,
                        currentPage: page,
                        loading: false,
                    }
                };
            } );
            return;
        }

        const prevPage = existing?.pages?.[ page - 2 ];
        const cursor = page === 1 ? null : ( prevPage?.nextCursor || null );
        if ( page > 1 && !cursor )
        {
            setEdgeDrilldowns( ( prev ) =>
            {
                const current = prev?.[ edgeId ];
                if ( !current ) return prev;
                return {
                    ...( prev || {} ),
                    [ edgeId ]: {
                        ...current,
                        loading: false,
                    }
                };
            } );
            return;
        }

        try
        {
            const response = await fetchEdgeDrilldown( {
                traceId,
                edgeId,
                ...( cursor ? { pagination: { cursor } } : undefined )
            } );

            if ( response.success )
            {
                setEdgeDrilldowns( ( prev ) =>
                {
                    const current = prev?.[ edgeId ] || { pages: [], currentPage: 1, loading: false };
                    const nextPages = [ ...current.pages ];
                    nextPages[ page - 1 ] = {
                        cursor,
                        items: response.data?.items || [],
                        nextCursor: response.data?.nextCursor || null,
                    };
                    return {
                        ...( prev || {} ),
                        [ edgeId ]: {
                            pages: nextPages,
                            currentPage: page,
                            loading: false,
                        }
                    };
                } );
            }
        } finally
        {
            setEdgeDrilldowns( ( prev ) =>
            {
                const current = prev?.[ edgeId ];
                if ( !current ) return prev;
                return {
                    ...( prev || {} ),
                    [ edgeId ]: {
                        ...current,
                        loading: false,
                    }
                };
            } );
        }
    };

    const handleSelectEdgeFromList = ( edgeId: string ) =>
    {
        setActiveEdgeId( edgeId );
        getEdgeDrilldownPage( edgeId, 1 );
    };

    const getEdgeLatestTimestamp = ( edgeId: string ) =>
    {
        const drilldown = edgeDrilldowns?.[ edgeId ];
        const pages = drilldown?.pages || [];
        for ( const page of pages )
        {
            for ( const item of page.items || [] )
            {
                const timestamp = item?.timestamp || item?.timeStamp;
                if ( timestamp ) return Number( timestamp );
            }
        }
        return null;
    };

    useEffect( () =>
    {
        if ( !traceId || pagedEdges.length === 0 ) return;

        pagedEdges.forEach( ( edge ) =>
        {
            const existing = edgeDrilldowns?.[ edge.id ];
            const hasFirstPage = existing?.pages?.[ 0 ]?.items?.length;
            if ( !hasFirstPage && !existing?.loading )
            {
                getEdgeDrilldownPage( edge.id, 1 );
            }
        } );
    }, [ traceId, pagedEdges, edgeDrilldowns ] );

    const handleExpandNode = async ( data: Record<string, any> ) =>
    {
        if ( !data?.address ) return;

        // استخدام العنوان من Node المختار لبناء graph جديد
        setAddress( data.address );

        // محاكاة نقرة على زر Build Graph
        setTimeout( () =>
        {
            handleBuildGraph();
        }, 100 );
    };

    return (
        <main className="flex h-full w-full flex-col items-center gap-4 p-4 md:p-6">
            <div className="w-full max-w-7xl space-y-4">
                <header className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold tracking-tight text-white">Chain Tracker</h1>
                        <p className="text-sm text-white/60">تتبّع تدفقات المحافظ عبر الشبكات المفعّلة.</p>
                    </div>

                    {/* Alerted Addresses Badge */ }
                    { alertedAddresses.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-yellow-400/30"
                            style={ { background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(202, 138, 4, 0.1) 100%)' } }>
                            <BellRing className="h-4 w-4 text-yellow-400 animate-pulse" />
                            <span className="text-sm text-yellow-400 font-semibold">
                                { alertedAddresses.length } محفظة مراقبة
                            </span>
                        </div>
                    ) }
                </header>

                <div className="grid gap-4 md:grid-cols-[360px_minmax(0,1fr)] items-start">
                    <section className="rounded-2xl border border-white/10 glass-lite glass-lite--strong p-2.5 overflow-visible relative z-10">
                        {/* صف واحد أفقي على جميع الشاشات */ }
                        <div className="flex flex-wrap gap-2 items-end">
                            <div className="flex-1 min-w-[200px] space-y-1.5">
                                <label className="text-xs text-white/60">عنوان المحفظة أو معرف المعاملة (TXID)</label>
                                <div className="relative">
                                    <input
                                        value={ address }
                                        onChange={ ( event ) => setAddress( event.target.value ) }
                                        onFocus={ () => setShowSuggestions( suggestions.length > 0 ) }
                                        onBlur={ () => setTimeout( () => setShowSuggestions( false ), 150 ) }
                                        placeholder="0x... أو اسم منصة/عملة"
                                        className="w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none"
                                        style={ { background: 'linear-gradient(135deg, #0D1C1C 0%, #134436 100%)', border: 'none' } }
                                    />

                                    { showSuggestions && ( suggestions.length > 0 || isSearchingSuggestions ) && (
                                        <div className="absolute left-0 right-0 mt-1 rounded-xl border border-white/15 overflow-hidden z-50 backdrop-blur-xl"
                                            style={ { background: 'rgba(8, 16, 19, 0.96)' } }>
                                            { isSearchingSuggestions && (
                                                <div className="px-3 py-2 text-xs text-white/60 flex items-center gap-2">
                                                    <Loader2 className="h-3 w-3 animate-spin" /> جاري البحث...
                                                </div>
                                            ) }

                                            { suggestions.map( ( item ) =>
                                            {
                                                const firstAddress = item.addresses?.[ 0 ]?.address;
                                                const firstChain = item.addresses?.[ 0 ]?.chain || item.chain || '-';
                                                const kindLabel = item.kind === 'token' ? 'TOKEN' : item.kind === 'address' ? 'ADDRESS' : 'ENTITY';

                                                return (
                                                    <button
                                                        key={ item.id }
                                                        onClick={ () =>
                                                        {
                                                            const nextAddress = pickSuggestionAddress( item );
                                                            if ( nextAddress ) setAddress( nextAddress );
                                                            setShowSuggestions( false );
                                                        } }
                                                        className="w-full text-left px-3 py-2.5 hover:bg-white/10 transition border-b border-white/5 last:border-b-0"
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="min-w-0">
                                                                <div className="text-xs text-white font-medium truncate">{ item.name || '-' }</div>
                                                                <div className="text-[10px] text-white/55 truncate flex items-center gap-1">
                                                                    <span className="uppercase">{ kindLabel }</span>
                                                                    <span>•</span>
                                                                    <span>{ firstChain }</span>
                                                                    { firstAddress && <><span>•</span><span className="font-mono">{ shorten_address( firstAddress ) }</span></> }
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            } ) }
                                        </div>
                                    ) }
                                </div>
                            </div>

                            <button
                                onClick={ handleBuildGraph }
                                disabled={ isBuilding || isLoadingChains }
                                className="px-6 py-2 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition disabled:opacity-60"
                                style={ { background: 'linear-gradient(135deg, #0D1C1C 0%, #134436 100%)' } }
                            >
                                { isBuilding && <Loader2 className="h-4 w-4 animate-spin" /> }
                                { isBuilding ? 'جاري الفحص...' : 'Scan' }
                            </button>

                        </div>



                        { isLoadingChains && (
                            <div className="flex items-center gap-2 text-xs text-white/60">
                                <Loader2 className="h-3 w-3 animate-spin" /> جاري تحميل السلاسل...
                            </div>
                        ) }
                    </section>

                    <section className="w-full rounded-2xl border border-white/10 glass-lite glass-lite--strong p-3 h-[70dvh] md:h-[420px] overflow-hidden relative z-0">
                        { address && detectInput( address ).isValid && (
                            <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-24px)] flex justify-center">
                                <div
                                    dir="ltr"
                                    className="max-w-full rounded-full border border-emerald-400/30 bg-black/30 px-3 py-1 text-[11px] text-emerald-200 backdrop-blur-md text-center"
                                >
                                    <span className="inline-flex items-center justify-center gap-1.5 flex-wrap">
                                        <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
                                        <span className="text-white/70">Wallet:</span>
                                        <span className="font-mono">{ shorten_address( address ) }</span>
                                        <span className="text-white/60">•</span>
                                        <span>
                                            { getChainFamilyName( detectInput( address ).chainFamily ) }{ ' ' }
                                            { detectInput( address ).inputType === 'txid' ? 'Transaction' : 'Address' } detected
                                        </span>
                                        { detectInput( address ).searchAllEVM && (
                                            <span className="text-white/60">• Using Ethereum</span>
                                        ) }
                                    </span>
                                </div>
                            </div>
                        ) }
                        { errorMessage && (
                            <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-24px)] flex justify-center">
                                <div
                                    dir="ltr"
                                    className="max-w-full rounded-full border border-red-400/30 bg-red-900/40 px-4 py-2 text-xs text-red-200 backdrop-blur-md text-center font-semibold"
                                >
                                    <span className="inline-flex items-center justify-center gap-2 flex-wrap">
                                        <span className="inline-block h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                                        <span>{ errorMessage }</span>
                                    </span>
                                </div>
                            </div>
                        ) }
                        <div className="flex items-center justify-end gap-2 mb-3">
                            <button
                                onClick={ resetLayout }
                                disabled={ elements.length === 0 }
                                className="px-4 py-2 flex items-center gap-2 rounded-xl text-xs font-semibold text-white/80 hover:text-white transition disabled:opacity-40"
                                style={ { background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' } }
                                title="إعادة تعيين التخطيط"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                إعادة التخطيط
                            </button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        disabled={ elements.length === 0 || isExporting }
                                        className="px-4 py-2 flex items-center gap-2 rounded-xl text-xs font-semibold text-white transition disabled:opacity-40"
                                        style={ { background: 'linear-gradient(135deg, #0D1C1C 0%, #134436 100%)' } }
                                    >
                                        { isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" /> }
                                        تصدير
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-[#264a46]/95 border-teal-700/50">
                                    <DropdownMenuItem
                                        onClick={ () => exportWithWatermark( 'png' ) }
                                        className="flex items-center gap-2 cursor-pointer hover:bg-[#1d2b28]"
                                    >
                                        <ImageIcon className="w-4 h-4" />
                                        <span>حفظ PNG بجودة عالية</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={ () => exportWithWatermark( 'pdf' ) }
                                        className="flex items-center gap-2 cursor-pointer hover:bg-[#1d2b28]"
                                    >
                                        <FileText className="w-4 h-4" />
                                        <span>حفظ PDF بجودة عالية</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <D3GraphCanvas
                            ref={ graphRef }
                            data={ convertToD3Format( elements.filter( ( el ) =>
                            {
                                if ( el.group !== 'edges' ) return true;
                                return expandedTxs.has( String( el.data.id ) );
                            } ) ) }
                            onNodeClick={ ( nodeId ) =>
                            {
                                const node = elements.find( el => el.group === 'nodes' && el.data.id === nodeId );
                                if ( node ) handleNodeSelect( node.data );
                            } }
                            onEdgeClick={ ( edgeId ) =>
                            {
                                const edge = elements.find( el => el.group === 'edges' && el.data.id === edgeId );
                                if ( edge ) handleEdgeSelect( edge.data );
                            } }
                        />
                    </section>
                </div>
            </div>

            { hasResults && (
                <>
                    { transferPanelOpen ? (
                        <aside
                            ref={ transferPanelRef }
                            className="fixed left-3 top-28 z-40 w-[288px] rounded-2xl border border-white/20 backdrop-blur-2xl p-3 flex flex-col gap-3 shadow-2xl"
                            style={ {
                                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.18) 0%, rgba(140, 255, 220, 0.18) 100%)',
                                height: 'calc(100vh - 200px)'
                            } }
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-white">TOGGLE VISIBLE TRACE NODES</p>
                                    <p className="text-[11px] text-white/60">{ filteredEdges.length } نتيجة</p>
                                </div>
                                <button
                                    onClick={ () => setTransferPanelOpen( false ) }
                                    className="rounded-lg border border-red-400/40 bg-red-500/20 px-2 py-1 text-[11px] text-red-200 hover:text-red-100"
                                >
                                    إغلاق
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={ () => { setTransferTab( 'sent' ); setTransferPage( 1 ); } }
                                    className={ `flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${ transferTab === 'sent' ? 'text-white' : 'text-white/60' }` }
                                    style={ { background: transferTab === 'sent' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(255, 255, 255, 0.05)' } }
                                >
                                    OUTFLOWS
                                </button>
                                <button
                                    onClick={ () => { setTransferTab( 'received' ); setTransferPage( 1 ); } }
                                    className={ `flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${ transferTab === 'received' ? 'text-white' : 'text-white/60' }` }
                                    style={ { background: transferTab === 'received' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.05)' } }
                                >
                                    INFLOWS
                                </button>
                            </div>

                            <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                                { pagedEdges.length === 0 && (
                                    <div className="rounded-lg border border-white/15 p-3 text-xs text-white/70 text-center" style={ { background: 'rgba(0, 0, 0, 0.25)' } }>
                                        لا توجد تحويلات في هذا الاتجاه.
                                    </div>
                                ) }

                                { pagedEdges.map( ( edge ) =>
                                {
                                    const isVisible = expandedTxs.has( edge.id );
                                    const isActive = activeEdgeId === edge.id;
                                    const drilldown = edgeDrilldowns?.[ edge.id ];
                                    const currentPage = drilldown?.currentPage || 1;
                                    const pages = drilldown?.pages || [];
                                    const currentItems = pages[ currentPage - 1 ]?.items || [];
                                    const nextCursor = pages[ currentPage - 1 ]?.nextCursor || null;
                                    const latestTimestamp = getEdgeLatestTimestamp( edge.id );
                                    const latestDate = latestTimestamp ? formatDateTime( latestTimestamp ) : '-';
                                    const counterpartyId = transferTab === 'sent' ? edge.target : edge.source;
                                    const counterparty = nodeLabelMap.get( counterpartyId );
                                    const counterpartyName = counterparty?.label || shorten_address( counterparty?.address || counterpartyId );
                                    const counterpartyAddress = counterparty?.address || counterpartyId;

                                    return (
                                        <div
                                            key={ edge.id }
                                            className={ `rounded-xl border border-white/15 p-3 transition hover:border-white/25 ${ isActive ? 'bg-white/5' : '' }` }
                                            style={ { background: 'rgba(0, 0, 0, 0.25)' } }
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <button
                                                    onClick={ () => handleSelectEdgeFromList( edge.id ) }
                                                    className="flex-1 text-left"
                                                >
                                                    { /* Counterparty based on tab */ }
                                                    { /* Sent: show target, Received: show source */ }
                                                    <div className="flex items-center gap-2">
                                                        <span className={ `text-[10px] px-2 py-0.5 rounded-full min-w-[64px] text-center ${ transferTab === 'sent' ? 'bg-green-500/20 text-green-300' : 'bg-blue-500/20 text-blue-300' }` }>
                                                            { transferTab === 'sent' ? 'OUT' : 'IN' }
                                                        </span>
                                                        <span className="text-white/80 text-xs">{ edge.kind }</span>
                                                    </div>
                                                    <div className="mt-1 text-xs text-white font-semibold">{ edge.valueLabel }</div>
                                                    <div className="text-[10px] text-white/50 mt-1 flex items-center gap-1">
                                                        <span>{ latestDate }</span>
                                                    </div>
                                                    <div className="text-[11px] text-white/80 mt-1 truncate" title={ counterpartyName }>
                                                        { counterpartyName }
                                                    </div>
                                                    <div className="text-[10px] text-white/50 mt-0.5 flex flex-wrap items-center gap-1">
                                                        <span>{ shorten_address( counterpartyAddress ) }</span>
                                                        <CopyButton text={ counterpartyAddress } />
                                                    </div>
                                                </button>
                                                <button
                                                    onClick={ () => toggleEdgeVisibility( edge.id ) }
                                                    className={ `rounded-full w-6 h-6 flex items-center justify-center text-sm border font-bold ${ isVisible ? 'border-red-400/50 text-red-300' : 'border-emerald-400/50 text-emerald-300' }` }
                                                    style={ { background: 'rgba(0, 0, 0, 0.2)' } }
                                                    title={ isVisible ? 'إخفاء هذا المسار' : 'إظهار هذا المسار' }
                                                >
                                                    { isVisible ? '−' : '+' }
                                                </button>
                                            </div>

                                            { isActive && drilldown?.loading && (
                                                <div className="mt-2 flex items-center gap-2 text-[10px] text-white/60">
                                                    <Loader2 className="h-3 w-3 animate-spin" /> جاري التحميل...
                                                </div>
                                            ) }
                                        </div>
                                    );
                                } ) }
                            </div>

                            <div className="rounded-lg border border-white/15 p-2" style={ { background: 'rgba(0, 0, 0, 0.25)' } }>
                                <div className="flex flex-wrap items-center justify-center gap-1">
                                    { Array.from( { length: totalTransferPages } ).map( ( _, idx ) =>
                                    {
                                        const pageNumber = idx + 1;
                                        return (
                                            <button
                                                key={ `transfer-page-${ pageNumber }` }
                                                onClick={ () => setTransferPage( pageNumber ) }
                                                className={ `px-2 py-1 rounded text-[10px] border ${ transferPage === pageNumber ? 'border-white/30 text-white' : 'border-white/10 text-white/60' }` }
                                                style={ { background: 'rgba(0, 0, 0, 0.2)' } }
                                            >
                                                { pageNumber }
                                            </button>
                                        );
                                    } ) }
                                </div>
                            </div>
                        </aside>
                    ) : (
                        <button
                            onClick={ () => setTransferPanelOpen( true ) }
                            className="fixed left-3 top-1/2 -translate-y-1/2 z-40 rounded-full border border-emerald-400/40 px-3 py-2 text-xs text-emerald-100 backdrop-blur-xl"
                            style={ { background: 'rgba(16, 185, 129, 0.2)' } }
                        >
                            فتح القائمة
                        </button>
                    ) }
                </>
            ) }

            <SelectionSheet
                open={ selectionType === 'node' && !!selectedNode }
                title={ selectedNode?.label || 'تفاصيل المحفظة' }
                subtitle={ selectedNode?.address }
                onClose={ () => setSelectionType( null ) }
            >
                <div className="space-y-4 text-sm text-white/80">
                    <div className="grid gap-3">
                        <div className="rounded-lg p-3 border border-white/10 backdrop-blur-xl" style={ { background: 'linear-gradient(135deg, #0D1C1C 0%, #134436 100%)' } }>
                            <p className="text-xs text-white/40 mb-2">العنوان الكامل</p>
                            <div className="flex items-center">
                                <p className="font-mono text-xs text-cyan-400 break-all">{ selectedNode?.address || '-' }</p>
                                { selectedNode?.address && <CopyButton text={ selectedNode.address } /> }
                            </div>
                        </div>

                        <div className="rounded-lg p-3 border border-white/10 backdrop-blur-xl" style={ { background: 'linear-gradient(135deg, #0D1C1C 0%, #134436 100%)' } }>
                            <p className="text-xs text-white/40 mb-1">الشبكة</p>
                            <p className="text-white/90">{ selectedNode?.chainUid || '-' }</p>
                        </div>

                        { nodeDetails?.balance && (
                            <div className="rounded-lg p-3 border border-white/10 backdrop-blur-xl" style={ { background: 'linear-gradient(135deg, #0D1C1C 0%, #134436 100%)' } }>
                                <p className="text-xs text-white/40 mb-1">الرصيد</p>
                                <p className="text-green-400 font-semibold">
                                    { typeof nodeDetails.balance === 'object'
                                        ? `${ nodeDetails.balance.balance || '0' } ${ nodeDetails.balance.symbol || '' }`
                                        : nodeDetails.balance
                                    }
                                </p>
                            </div>
                        ) }

                        { nodeDetails?.transactionStats && (
                            <div className="rounded-lg p-3 border border-white/20 backdrop-blur-xl" style={ { background: 'linear-gradient(135deg, #0D1C1C 0%, #134436 100%)' } }>
                                <p className="text-xs text-cyan-400 font-semibold mb-2">إحصائيات الحوالات</p>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div>
                                        <p className="text-green-400 text-lg font-bold">{ nodeDetails.transactionStats.incoming }</p>
                                        <p className="text-[10px] text-white/50">واردة</p>
                                    </div>
                                    <div>
                                        <p className="text-red-400 text-lg font-bold">{ nodeDetails.transactionStats.outgoing }</p>
                                        <p className="text-[10px] text-white/50">صادرة</p>
                                    </div>
                                    <div>
                                        <p className="text-cyan-400 text-lg font-bold">{ nodeDetails.transactionStats.total }</p>
                                        <p className="text-[10px] text-white/50">الإجمالي</p>
                                    </div>
                                </div>
                            </div>
                        ) }

                        { nodeDetails?.relatedTransactions?.incoming && nodeDetails.relatedTransactions.incoming.length > 0 && (
                            <div className="rounded-lg p-3 border border-green-500/30 backdrop-blur-xl" style={ { background: 'linear-gradient(135deg, #0D1C1C 0%, #134436 100%)' } }>
                                <p className="text-xs text-green-400 font-semibold mb-2">الحوالات الواردة (أحدث 5)</p>
                                <div className="space-y-2">
                                    { nodeDetails.relatedTransactions.incoming.map( ( tx: any, i: number ) => (
                                        <div key={ i } className="rounded p-2 text-[11px] border border-white/10 backdrop-blur-sm" style={ { background: 'rgba(255, 255, 255, 0.05)' } }>
                                            <div className="mb-1">
                                                <p className="text-white/60 mb-1">من:</p>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-cyan-300 font-mono break-all">{ tx.from.split( ':' ).pop() }</span>
                                                    <CopyButton text={ tx.from.split( ':' ).pop() || '' } />
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-yellow-400 font-semibold">{ tx.amount || 'N/A' }</span>
                                                <span className="text-white/40 text-[9px] px-2 py-0.5 bg-white/5 rounded">{ tx.kind }</span>
                                            </div>
                                        </div>
                                    ) ) }
                                </div>
                            </div>
                        ) }

                        { nodeDetails?.relatedTransactions?.outgoing && nodeDetails.relatedTransactions.outgoing.length > 0 && (
                            <div className="rounded-lg p-3 border border-red-500/30 backdrop-blur-xl" style={ { background: 'linear-gradient(135deg, #0D1C1C 0%, #134436 100%)' } }>
                                <p className="text-xs text-red-400 font-semibold mb-2">الحوالات الصادرة (أحدث 5)</p>
                                <div className="space-y-2">
                                    { nodeDetails.relatedTransactions.outgoing.map( ( tx: any, i: number ) => (
                                        <div key={ i } className="rounded p-2 text-[11px] border border-white/10 backdrop-blur-sm" style={ { background: 'rgba(255, 255, 255, 0.05)' } }>
                                            <div className="mb-1">
                                                <p className="text-white/60 mb-1">إلى:</p>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-cyan-300 font-mono break-all">{ tx.to.split( ':' ).pop() }</span>
                                                    <CopyButton text={ tx.to.split( ':' ).pop() || '' } />
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-yellow-400 font-semibold">{ tx.amount || 'N/A' }</span>
                                                <span className="text-white/40 text-[9px] px-2 py-0.5 bg-white/5 rounded">{ tx.kind }</span>
                                            </div>
                                        </div>
                                    ) ) }
                                </div>
                            </div>
                        ) }

                        { /* cways-tracker style action buttons - ألوان موحدة مع القوائم المنبثقة */ }
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            <button
                                onClick={ () => handleIncoming( selectedNode ) }
                                className="flex items-center justify-center gap-2 text-white rounded-lg py-2 px-3 transition text-xs hover:brightness-110"
                                style={ { background: 'linear-gradient(135deg, #0D1C1C 0%, #134436 100%)' } }
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                <span>Incoming</span>
                            </button>
                            <button
                                onClick={ () => handleOutgoing( selectedNode ) }
                                className="flex items-center justify-center gap-2 text-white rounded-lg py-2 px-3 transition text-xs hover:brightness-110"
                                style={ { background: 'linear-gradient(135deg, #0D1C1C 0%, #134436 100%)' } }
                            >
                                <ArrowRight className="h-3.5 w-3.5" />
                                <span>Outgoing</span>
                            </button>
                            <button
                                onClick={ () => handleShare( selectedNode ) }
                                className="flex items-center justify-center gap-2 text-white rounded-lg py-2 px-3 transition text-xs hover:brightness-110"
                                style={ { background: 'linear-gradient(135deg, #0D1C1C 0%, #134436 100%)' } }
                            >
                                <Share2 className="h-3.5 w-3.5" />
                                <span>Share</span>
                            </button>
                            <button
                                onClick={ () => handleAlert( selectedNode ) }
                                className={ `relative flex items-center justify-center gap-2 text-white rounded-lg py-2 px-3 transition text-xs hover:brightness-110 ${ selectedNode?.address && alertedAddresses.includes( selectedNode.address ) ? 'ring-2 ring-yellow-400' : ''
                                    }` }
                                style={ { background: 'linear-gradient(135deg, #0D1C1C 0%, #134436 100%)' } }
                                title={ selectedNode?.address && alertedAddresses.includes( selectedNode.address )
                                    ? 'إلغاء التنبيه عند حركة هذه المحفظة'
                                    : 'تفعيل التنبيه عند حركة هذه المحفظة' }
                            >
                                { selectedNode?.address && alertedAddresses.includes( selectedNode.address ) ? (
                                    <BellRing className="h-3.5 w-3.5 text-yellow-400 animate-pulse" />
                                ) : (
                                    <Bell className="h-3.5 w-3.5" />
                                ) }
                                <span>Alert</span>
                                { alertedAddresses.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-yellow-400 text-[#264a46] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                        { alertedAddresses.length }
                                    </span>
                                ) }
                            </button>
                        </div>

                        <button
                            onClick={ () => handleExpandNode( selectedNode ) }
                            className="flex items-center justify-center gap-2 text-white rounded-lg py-3 px-4 transition font-semibold w-full border border-white/20"
                            style={ { background: 'linear-gradient(135deg, #0D1C1C 0%, #134436 100%)' } }
                        >
                            <span>تتبع الأموال من هذه المحفظة</span>
                        </button>
                    </div>

                    { nodeDetails && Object.keys( nodeDetails ).length > 0 && (
                        <details className="group">
                            <summary className="cursor-pointer text-xs text-white/50 hover:text-white/70 transition">
                                عرض البيانات الكاملة
                            </summary>
                            <pre className="mt-2 whitespace-pre-wrap break-words text-[10px] text-white/40 rounded p-2 border border-white/10 backdrop-blur-xl" style={ { background: 'linear-gradient(135deg, #0D1C1C 0%, #134436 100%)' } }>
                                { JSON.stringify( nodeDetails, null, 2 ) }
                            </pre>
                        </details>
                    ) }
                </div>
            </SelectionSheet>

            <SelectionSheet
                open={ selectionType === 'edge' && !!selectedEdge }
                title={ 'Transaction Details' }
                subtitle={ selectedEdge?.valueLabel || selectedEdge?.kind }
                onClose={ () => setSelectionType( null ) }
            >
                { edgeLoading && (
                    <div className="flex items-center gap-2 text-xs text-white/60">
                        <Loader2 className="h-3 w-3 animate-spin" /> Loading details...
                    </div>
                ) }
                { !edgeLoading && (
                    <div className="space-y-4 text-sm">
                        { /* cways-tracker style header */ }
                        <div className="rounded-xl p-5 border border-white/20 backdrop-blur-xl" style={ { background: 'linear-gradient(135deg, #0D1C1C 0%, #134436 100%)' } }>
                            <div className="space-y-4 mb-4">
                                <div>
                                    <p className="text-[10px] text-white/40 mb-2 uppercase tracking-wider">FROM</p>
                                    <div className="flex items-center">
                                        <p className="text-cyan-400 font-mono text-xs break-all">{ selectedEdge?.source || '-' }</p>
                                        { selectedEdge?.source && <CopyButton text={ selectedEdge.source } /> }
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] text-white/40 mb-2 uppercase tracking-wider">TO</p>
                                    <div className="flex items-center">
                                        <p className="text-cyan-400 font-mono text-xs break-all">{ selectedEdge?.target || '-' }</p>
                                        { selectedEdge?.target && <CopyButton text={ selectedEdge.target } /> }
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-white/10 pt-4">
                                <p className="text-[10px] text-white/40 mb-1 uppercase tracking-wider">AMOUNT</p>
                                <p className="text-yellow-400 font-bold text-2xl">{ selectedEdge?.valueLabel || '-' }</p>
                                <p className="text-white/50 text-xs mt-1">{ selectedEdge?.summary?.count || 1 } transaction(s)</p>
                            </div>
                        </div>

                        { /* cways-tracker style transaction table */ }
                        { ( edgeDetails?.items || [] ).length > 0 && (
                            <div className="space-y-3">
                                <p className="text-xs text-white/60 font-semibold uppercase tracking-wider">Transaction History</p>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs border-collapse">
                                        <thead>
                                            <tr className="border-b border-white/10">
                                                <th className="text-left text-white/40 font-medium py-2 px-2 text-[10px] uppercase">TIME</th>
                                                <th className="text-left text-white/40 font-medium py-2 px-2 text-[10px] uppercase">FROM</th>
                                                <th className="text-left text-white/40 font-medium py-2 px-2 text-[10px] uppercase">TO</th>
                                                <th className="text-right text-white/40 font-medium py-2 px-2 text-[10px] uppercase">VALUE</th>
                                                <th className="text-left text-white/40 font-medium py-2 px-2 text-[10px] uppercase">TOKEN</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            { edgeDetails.items.map( ( item, index ) =>
                                            {
                                                const hash = item?.txHash || item?.hash || item?.transactionHash || item?.id || `#${ index + 1 }`;
                                                const timestamp = item?.timestamp || item?.timeStamp;
                                                const timeAgo = timestamp ? formatTimeAgo( Number( timestamp ) ) : '-';
                                                const from = item?.from || selectedEdge?.source || '-';
                                                const to = item?.to || selectedEdge?.target || '-';
                                                const value = item?.value || item?.valueRaw || '0';
                                                const symbol = item?.symbol || selectedEdge?.symbol || 'ETH';

                                                return (
                                                    <tr key={ `${ hash }-${ index }` } className="border-b border-white/5 hover:bg-cyan-500/5 transition">
                                                        <td className="py-3 px-2 text-white/60">{ timeAgo }</td>
                                                        <td className="py-3 px-2 font-mono text-cyan-400 text-[10px]">
                                                            <div className="flex items-center gap-1">
                                                                <span className="break-all">{ from }</span>
                                                                <CopyButton text={ from } />
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-2 font-mono text-cyan-400 text-[10px]">
                                                            <div className="flex items-center gap-1">
                                                                <span className="break-all">{ to }</span>
                                                                <CopyButton text={ to } />
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-2 text-right text-yellow-400 font-medium">{ formatValue( value, item?.decimals || 18 ) }</td>
                                                        <td className="py-3 px-2 text-white/70">{ symbol }</td>
                                                    </tr>
                                                );
                                            } ) }
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) }
                    </div>
                ) }
            </SelectionSheet>

            {/* Share Toast Notification */ }
            { showShareToast && (
                <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-right">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-green-500/30 shadow-2xl"
                        style={ { background: 'linear-gradient(135deg, #0D1C1C 0%, #134436 100%)' } }>
                        <Check className="h-5 w-5 text-green-400" />
                        <div>
                            <p className="text-sm font-semibold text-white">تم النسخ!</p>
                            <p className="text-xs text-white/60">تم نسخ الرابط إلى الحافظة</p>
                        </div>
                    </div>
                </div>
            ) }
        </main>
    );
}
