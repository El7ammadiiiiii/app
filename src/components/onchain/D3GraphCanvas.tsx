"use client";

import React, { useEffect, useRef, useState, forwardRef } from "react";
import * as d3 from "d3";
import { classifyAddress, type EntityClassification } from "@/lib/onchain/known-entities";
import { fetchNodeDetails } from "@/lib/onchain/client";

interface Node
{
    id: string;
    label: string;
    type?: string;
    address?: string;
    chainUid?: string;
    balanceLabel?: string;
    entityInfo?: EntityClassification;
    x?: number;
    y?: number;
    fx?: number | null;
    fy?: number | null;
}

interface Edge
{
    id: string;
    source: string;
    target: string;
    label?: string;
    value?: string;
    pairKey?: string;
    edgeCount?: number;
    edgeIndex?: number;
    curveOffset?: number;
    labelOffset?: number;
}

interface GraphData
{
    nodes: Node[];
    edges: Edge[];
}

interface D3GraphCanvasProps
{
    data: GraphData;
    onNodeClick?: ( nodeId: string ) => void;
    onEdgeClick?: ( edgeId: string ) => void;
    height?: number;
    className?: string;
}

interface SimulationNode extends d3.SimulationNodeDatum
{
    id: string;
    label: string;
    type?: string;
    address?: string;
    chainUid?: string;
    balanceLabel?: string;
    entityInfo?: EntityClassification;
    x?: number;
    y?: number;
    fx?: number | null;
    fy?: number | null;
}

// Helper function to shorten address
function shortenAddress ( addr: string ): string
{
    if ( !addr || addr.length < 10 ) return addr;
    return `${ addr.slice( 0, 6 ) }...${ addr.slice( -4 ) }`;
}

function formatBalanceLabel ( value: unknown ): string
{
    if ( value == null ) return "Value: -";

    if ( typeof value === "string" || typeof value === "number" )
    {
        const text = String( value ).trim();
        if ( !text ) return "Value: -";
        return `Value: ${ text }`;
    }

    if ( typeof value === "object" )
    {
        const obj = value as Record<string, unknown>;
        const amount = obj.balance ?? obj.amount ?? obj.value ?? "";
        const symbol = obj.symbol ?? obj.asset ?? "";
        const text = `${ amount ?? "" } ${ symbol ?? "" }`.trim();
        if ( text ) return `Value: ${ text }`;
    }

    return "Value: -";
}

interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode>
{
    id: string;
    label?: string;
    value?: string;
    pairKey?: string;
    edgeCount?: number;
    edgeIndex?: number;
    curveOffset?: number;
    labelOffset?: number;
    source: SimulationNode;
    target: SimulationNode;
}

export default forwardRef<HTMLDivElement, D3GraphCanvasProps>( function D3GraphCanvas ( {
    data,
    onNodeClick,
    onEdgeClick,
    height = 600,
    className = "",
}, ref )
{
    const svgRef = useRef<SVGSVGElement>( null );
    const containerRef = useRef<HTMLDivElement>( null );
    const [ dimensions, setDimensions ] = useState( { width: 800, height } );
    const [ nodesWithEntities, setNodesWithEntities ] = useState<SimulationNode[]>( [] );
    const balanceCacheRef = useRef<Map<string, string>>( new Map() );

    // Classify nodes with entity information
    useEffect( () =>
    {
        const classifyNodes = async () =>
        {
            const classified = await Promise.all(
                data.nodes.map( async ( node ) =>
                {
                    const entityInfo = await classifyAddress( node.address || node.id );

                    const cacheKey = `${ node.chainUid || '' }|${ node.id }`;
                    let balanceLabel = balanceCacheRef.current.get( cacheKey ) || "Value: -";

                    if ( !balanceCacheRef.current.has( cacheKey ) && node.chainUid && node.id )
                    {
                        try
                        {
                            const details = await fetchNodeDetails( {
                                chainUid: node.chainUid,
                                nodeId: node.id,
                                include: {
                                    balance: true,
                                    recentActivity: false,
                                    labels: false,
                                    contractMetadata: false,
                                }
                            } );
                            balanceLabel = formatBalanceLabel( details?.data?.balance );
                        }
                        catch
                        {
                            balanceLabel = "Value: -";
                        }
                        balanceCacheRef.current.set( cacheKey, balanceLabel );
                    }

                    return {
                        ...node,
                        address: node.address || node.id,
                        entityInfo,
                        balanceLabel,
                    };
                } )
            );
            setNodesWithEntities( classified );
        };

        if ( data.nodes.length > 0 )
        {
            classifyNodes();
        }
    }, [ data.nodes ] );

    // Combine external and internal refs
    useEffect( () =>
    {
        if ( ref )
        {
            if ( typeof ref === 'function' )
            {
                ref( containerRef.current );
            } else
            {
                ref.current = containerRef.current;
            }
        }
    }, [ ref ] );

    useEffect( () =>
    {
        if ( !containerRef.current ) return;

        const resizeObserver = new ResizeObserver( ( entries ) =>
        {
            const { width, height: observedHeight } = entries[ 0 ].contentRect;
            const nextHeight = observedHeight || height;
            setDimensions( { width, height: nextHeight } );
        } );

        resizeObserver.observe( containerRef.current );

        return () => resizeObserver.disconnect();
    }, [ height ] );

    useEffect( () =>
    {
        if ( !svgRef.current || !nodesWithEntities.length || !data.nodes.length ) return;

        const svg = d3.select( svgRef.current );
        const width = dimensions.width;
        const canvasHeight = dimensions.height;

        // Clear previous content
        svg.selectAll( "*" ).remove();

        // Create main group for zoom/pan
        const g = svg.append( "g" ).attr( "class", "graph-container" );

        // Setup zoom behavior
        const zoom = d3
            .zoom<SVGSVGElement, unknown>()
            .scaleExtent( [ 0.1, 4 ] )
            .on( "zoom", ( event ) =>
            {
                g.attr( "transform", event.transform );
            } );

        svg.call( zoom );

        // Arrow marker definition
        svg
            .append( "defs" )
            .append( "marker" )
            .attr( "id", "arrowhead" )
            .attr( "viewBox", "0 -5 10 10" )
            .attr( "refX", 32 ) // Updated for circle radius 28 + arrow size
            .attr( "refY", 0 )
            .attr( "markerWidth", 6 )
            .attr( "markerHeight", 6 )
            .attr( "orient", "auto" )
            .append( "path" )
            .attr( "d", "M0,-5L10,0L0,5" )
            .attr( "fill", "#4a5568" );

        // Convert data with entity information
        const nodes: SimulationNode[] = nodesWithEntities.map( ( n ) => ( {
            ...n,
            x: n.x ?? width / 2,
            y: n.y ?? canvasHeight / 2,
            // Pin center node (type === 'start') to the middle of canvas
            fx: n.type === 'start' ? width / 2 : n.fx,
            fy: n.type === 'start' ? canvasHeight / 2 : n.fy,
        } ) );

        svg.call( zoom );

        // Create links with string IDs first - D3 will convert them to object references
        const validEdges = data.edges.filter( ( d ) =>
        {
            // Only include edges where both nodes exist
            const hasSource = nodes.some( ( n ) => n.id === d.source );
            const hasTarget = nodes.some( ( n ) => n.id === d.target );
            return hasSource && hasTarget;
        } );

        const pairKeyFor = ( edge: Edge ) =>
        {
            const a = edge.source;
            const b = edge.target;
            return a < b ? `${ a }|${ b }` : `${ b }|${ a }`;
        };

        const pairGroups = new Map<string, Edge[]>();
        validEdges.forEach( ( edge ) =>
        {
            const key = pairKeyFor( edge );
            const group = pairGroups.get( key ) ?? [];
            group.push( edge );
            pairGroups.set( key, group );
        } );

        const edgeMeta = new Map<string, Pick<SimulationLink, 'pairKey' | 'edgeCount' | 'edgeIndex' | 'curveOffset' | 'labelOffset'>>();
        const laneSpacing = 22;

        pairGroups.forEach( ( group, key ) =>
        {
            const totalCount = group.length;
            if ( totalCount === 1 )
            {
                const only = group[ 0 ];
                edgeMeta.set( only.id, {
                    pairKey: key,
                    edgeCount: 1,
                    edgeIndex: 0,
                    curveOffset: 0,
                    labelOffset: 0,
                } );
                return;
            }

            const [ minId, maxId ] = key.split( '|' );
            const forward = group.filter( ( edge ) => edge.source === minId );
            const backward = group.filter( ( edge ) => edge.source === maxId );
            const hasBothDirections = forward.length > 0 && backward.length > 0;
            const directionBase = hasBothDirections ? laneSpacing : 0;

            const assignOffsets = ( edges: Edge[], sign: 1 | -1 ) =>
            {
                const count = edges.length;
                edges.forEach( ( edge, idx ) =>
                {
                    let laneIndex = idx - ( count - 1 ) / 2;
                    if ( count > 1 && Math.abs( laneIndex ) < 0.001 )
                    {
                        laneIndex = 0.5;
                    }
                    const laneOffset = laneIndex * laneSpacing;
                    const curveOffset = sign * ( directionBase + laneOffset );
                    edgeMeta.set( edge.id, {
                        pairKey: key,
                        edgeCount: totalCount,
                        edgeIndex: idx,
                        curveOffset,
                        labelOffset: curveOffset,
                    } );
                } );
            };

            assignOffsets( forward, 1 );
            assignOffsets( backward, -1 );
        } );

        const links: SimulationLink[] = validEdges
            .map( ( d ) => ( {
                id: d.id,
                label: d.label,
                value: d.value,
                pairKey: edgeMeta.get( d.id )?.pairKey,
                edgeCount: edgeMeta.get( d.id )?.edgeCount,
                edgeIndex: edgeMeta.get( d.id )?.edgeIndex,
                curveOffset: edgeMeta.get( d.id )?.curveOffset,
                labelOffset: edgeMeta.get( d.id )?.labelOffset,
                source: d.source, // Keep as string ID - D3 will convert it
                target: d.target, // Keep as string ID - D3 will convert it
            } as unknown as SimulationLink ) );

        // Create arrow markers
        const defs = svg.append( "defs" );
        defs
            .append( "marker" )
            .attr( "id", "arrowhead" )
            .attr( "viewBox", "0 -5 10 10" )
            .attr( "refX", 25 )
            .attr( "refY", 0 )
            .attr( "markerWidth", 6 )
            .attr( "markerHeight", 6 )
            .attr( "orient", "auto" )
            .append( "path" )
            .attr( "d", "M0,-5L10,0L0,5" )
            .attr( "fill", "#666" );

        // Create force simulation
        const simulation = d3
            .forceSimulation<SimulationNode>( nodes )
            .force(
                "link",
                d3
                    .forceLink<SimulationNode, SimulationLink>( links )
                    .id( ( d ) => d.id )
                    .distance( 150 )
            )
            .force( "charge", d3.forceManyBody().strength( -400 ) )
            .force( "center", d3.forceCenter( width / 2, canvasHeight / 2 ) )
            .force( "collision", d3.forceCollide().radius( 50 ) ); // Increased for text labels

        // Create curved path generator with pronounced curves (cways-tracker style)
        const getCurveGeometry = ( d: SimulationLink, offset = 0 ) =>
        {
            const source = { x: d.source.x ?? 0, y: d.source.y ?? 0 };
            const target = { x: d.target.x ?? 0, y: d.target.y ?? 0 };

            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dr = Math.sqrt( dx * dx + dy * dy );

            if ( dr === 0 )
            {
                return {
                    source,
                    target,
                    cp1x: source.x,
                    cp1y: source.y,
                    cp2x: target.x,
                    cp2y: target.y,
                };
            }

            // Calculate perpendicular offset for more pronounced curve
            const perpX = -dy / dr;
            const perpY = dx / dr;
            const baseCurve = dr * 0.3; // 30% offset for pronounced S-curve
            const curveDirection = offset === 0 ? 1 : Math.sign( offset );
            const curveOffset = curveDirection * baseCurve + offset;

            // Control points for cubic bezier (more pronounced than quadratic)
            const cp1x = source.x + dx * 0.25 + perpX * curveOffset;
            const cp1y = source.y + dy * 0.25 + perpY * curveOffset;
            const cp2x = source.x + dx * 0.75 + perpX * curveOffset;
            const cp2y = source.y + dy * 0.75 + perpY * curveOffset;

            return { source, target, cp1x, cp1y, cp2x, cp2y };
        };

        const linkPath = ( d: SimulationLink ) =>
        {
            const geom = getCurveGeometry( d, d.curveOffset ?? 0 );
            return `M${ geom.source.x },${ geom.source.y } C${ geom.cp1x },${ geom.cp1y } ${ geom.cp2x },${ geom.cp2y } ${ geom.target.x },${ geom.target.y }`;
        };

        const getBezierPoint = ( t: number, p0: number, p1: number, p2: number, p3: number ) =>
        {
            const u = 1 - t;
            return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
        };

        const getBezierTangent = ( t: number, p0: number, p1: number, p2: number, p3: number ) =>
        {
            const u = 1 - t;
            return 3 * u * u * ( p1 - p0 ) + 6 * u * t * ( p2 - p1 ) + 3 * t * t * ( p3 - p2 );
        };

        // Draw links
        const link = g
            .append( "g" )
            .attr( "class", "links" )
            .selectAll( "g" )
            .data( links, ( d: SimulationLink ) => d.id )
            .join( "g" )
            .attr( "class", "link-group" );

        // Link paths
        link
            .append( "path" )
            .attr( "class", "link" )
            .attr( "d", linkPath )
            .attr( "stroke", "#4a5568" )
            .attr( "stroke-width", 2 )
            .attr( "stroke-opacity", 0.6 )
            .attr( "fill", "none" )
            .attr( "marker-end", "url(#arrowhead)" )
            .style( "cursor", "pointer" )
            .on( "click", ( event, d ) =>
            {
                event.stopPropagation();
                if ( onEdgeClick ) onEdgeClick( d.id );
            } )
            .on( "mouseenter", function ()
            {
                d3.select( this )
                    .attr( "stroke", "#60a5fa" )
                    .attr( "stroke-width", 4 )
                    .attr( "stroke-opacity", 1.0 );
            } )
            .on( "mouseleave", function ()
            {
                d3.select( this )
                    .attr( "stroke", "#4a5568" )
                    .attr( "stroke-width", 2 )
                    .attr( "stroke-opacity", 0.6 );
            } );

        // Link labels (value) with background
        // Add background rect for better readability
        link
            .append( "rect" )
            .attr( "class", "link-label-bg" )
            .attr( "fill", "rgba(15, 23, 42, 0.35)" )
            .attr( "stroke", "rgba(148, 163, 184, 0.2)" )
            .attr( "stroke-width", 1 )
            .attr( "rx", 4 )
            .attr( "ry", 4 )
            .attr( "opacity", 0.55 )
            .style( "pointer-events", "none" );

        link
            .append( "text" )
            .attr( "class", "link-label" )
            .attr( "text-anchor", "middle" )
            .attr( "dy", 0 )
            .attr( "fill", "#fbbf24" )
            .attr( "font-size", "10px" )
            .attr( "font-weight", "600" )
            .text( ( d ) => d.value || "" );

        // Position label backgrounds based on text size
        link.each( function ()
        {
            const text = d3.select( this ).select( '.link-label' );
            const bbox = ( text.node() as SVGTextElement )?.getBBox();
            if ( bbox )
            {
                d3.select( this ).select( '.link-label-bg' )
                    .attr( 'width', bbox.width + 8 )
                    .attr( 'height', bbox.height + 4 )
                    .attr( 'x', -bbox.width / 2 - 4 )
                    .attr( 'y', -bbox.height / 2 - 2 );
            }
        } );

        // Draw nodes
        const node = g
            .append( "g" )
            .attr( "class", "nodes" )
            .selectAll( "g" )
            .data( nodes )
            .join( "g" )
            .attr( "class", "node-group" )
            .style( "cursor", "grab" )
            .call(
                d3
                    .drag<SVGGElement, SimulationNode>()
                    .on( "start", dragstarted )
                    .on( "drag", dragged )
                    .on( "end", dragended )
            )
            .on( "click", ( event, d ) =>
            {
                event.stopPropagation();
                if ( onNodeClick ) onNodeClick( d.id );
            } );

        // Main circle with colored background
        node
            .append( "circle" )
            .attr( "r", 28 )
            .attr( "fill", ( d ) => d.entityInfo?.color || "#334155" )
            .attr( "opacity", 0.2 )
            .attr( "stroke", ( d ) => d.entityInfo?.color || "#334155" )
            .attr( "stroke-width", 3 )
            .style( "filter", "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))" )
            .on( "mouseenter", function ( event, d )
            {
                d3.select( this )
                    .attr( "r", 32 )
                    .attr( "stroke", "#60a5fa" )
                    .attr( "stroke-width", 4 )
                    .style( "filter", "drop-shadow(0 0 20px rgba(96, 165, 250, 0.6))" );
            } )
            .on( "mouseleave", function ( event, d )
            {
                d3.select( this )
                    .attr( "r", 28 )
                    .attr( "stroke", d.entityInfo?.color || "#334155" )
                    .attr( "stroke-width", 3 )
                    .style( "filter", "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4))" );
            } );

        // Inner circle for icon background
        node
            .append( "circle" )
            .attr( "r", 24 )
            .attr( "fill", "rgba(15, 23, 42, 0.9)" );

        // Icon image (centered)
        node
            .append( "image" )
            .attr( "href", ( d ) => d.entityInfo?.iconUrl || "/icons/entities/generic.svg" )
            .attr( "x", -18 )
            .attr( "y", -18 )
            .attr( "width", 36 )
            .attr( "height", 36 )
            .style( "pointer-events", "none" );

        // Entity name text (below circle)
        node
            .append( "text" )
            .attr( "x", 0 )
            .attr( "y", 45 )
            .attr( "text-anchor", "middle" )
            .attr( "fill", "#e5e7eb" )
            .attr( "font-size", "13px" )
            .attr( "font-weight", "600" )
            .style( "pointer-events", "none" )
            .text( ( d ) =>
            {
                const name = d.entityInfo?.name || d.label;
                return name.length > 12 ? name.slice( 0, 12 ) + "..." : name;
            } );

        // Address text (below name)
        node
            .append( "text" )
            .attr( "x", 0 )
            .attr( "y", 60 )
            .attr( "text-anchor", "middle" )
            .attr( "fill", "#9ca3af" )
            .attr( "font-size", "10px" )
            .attr( "font-weight", "400" )
            .attr( "font-family", "monospace" )
            .style( "pointer-events", "none" )
            .text( ( d ) => shortenAddress( d.address || d.id ) );

        // Balance/value text (below address)
        node
            .append( "text" )
            .attr( "x", 0 )
            .attr( "y", 74 )
            .attr( "text-anchor", "middle" )
            .attr( "fill", "#22c55e" )
            .attr( "font-size", "10px" )
            .attr( "font-weight", "600" )
            .style( "pointer-events", "none" )
            .text( ( d ) =>
            {
                const txt = d.balanceLabel || "Value: -";
                return txt.length > 28 ? `${ txt.slice( 0, 28 ) }…` : txt;
            } );

        // Update positions on each tick
        simulation.on( "tick", () =>
        {
            link.select( "path" ).attr( "d", linkPath );

            link.each( function ( d )
            {
                const geom = getCurveGeometry( d, d.curveOffset ?? 0 );
                const text = d3.select( this ).select( 'text' );
                const t = 0.5;
                const labelBaseX = getBezierPoint( t, geom.source.x, geom.cp1x, geom.cp2x, geom.target.x );
                const labelBaseY = getBezierPoint( t, geom.source.y, geom.cp1y, geom.cp2y, geom.target.y );
                const tangentX = getBezierTangent( t, geom.source.x, geom.cp1x, geom.cp2x, geom.target.x );
                const tangentY = getBezierTangent( t, geom.source.y, geom.cp1y, geom.cp2y, geom.target.y );
                const tangentLen = Math.hypot( tangentX, tangentY ) || 1;
                const normalX = -tangentY / tangentLen;
                const normalY = tangentX / tangentLen;
                const labelPadding = 12;
                const labelX = labelBaseX + normalX * labelPadding;
                const labelY = labelBaseY + normalY * labelPadding;

                text.attr( 'x', labelX ).attr( 'y', labelY );

                const bbox = ( text.node() as SVGTextElement )?.getBBox();
                if ( bbox )
                {
                    d3.select( this ).select( '.link-label-bg' )
                        .attr( 'width', bbox.width + 8 )
                        .attr( 'height', bbox.height + 4 )
                        .attr( 'x', labelX - bbox.width / 2 - 4 )
                        .attr( 'y', labelY - bbox.height / 2 - 2 );
                }
            } );

            node.attr( "transform", ( d ) => `translate(${ d.x },${ d.y })` );
        } );

        // Drag functions
        function dragstarted (
            event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>
        )
        {
            if ( !event.active ) simulation.alphaTarget( 0.3 ).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
            d3.select( event.sourceEvent.target.parentNode ).style( "cursor", "grabbing" );
        }

        function dragged (
            event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>
        )
        {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended (
            event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>
        )
        {
            if ( !event.active ) simulation.alphaTarget( 0 );
            // Keep fx and fy to maintain position (removed fx = null, fy = null)
            // Positions will be saved in sessionStorage by parent component
            d3.select( event.sourceEvent.target.parentNode ).style( "cursor", "grab" );
        }

        // Cleanup
        return () =>
        {
            simulation.stop();
        };
    }, [ data, nodesWithEntities, dimensions, height, onNodeClick, onEdgeClick ] );

    return (
        <div ref={ containerRef } className={ `relative h-full w-full ${ className }` }>
            <svg
                ref={ svgRef }
                width="100%"
                height={ dimensions.height }
                style={ {
                    background: "rgba(6, 10, 12, 0.35)",
                    borderRadius: "16px",
                } }
            />

            {/* Controls overlay - hidden */ }
            <div className="hidden absolute top-4 left-4 bg-[#1d2b28]/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-slate-300">
                <div className="flex gap-4">
                    <span>🖱️ Drag nodes</span>
                    <span>🔍 Scroll to zoom</span>
                    <span>✋ Pan canvas</span>
                </div>
            </div>

            {/* Stats overlay - hidden */ }
            <div className="hidden absolute top-4 right-4 bg-[#1d2b28]/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-slate-300">
                <div className="flex gap-3">
                    <span>{ data.nodes.length } nodes</span>
                    <span>{ data.edges.length } edges</span>
                </div>
            </div>
        </div>
    );
} );
