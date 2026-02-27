"use client";

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import { GLASSNODE_COLORS, GLASSNODE_CHART_CONFIG } from "@/lib/chart-utils";

interface DataPoint
{
    date: Date | string;
    value: number;
    value2: number;
    [ key: string ]: any;
}

interface DualAxisChartProps
{
    data: DataPoint[];
    height?: number;
    leftLabel?: string;
    rightLabel?: string;
    leftColor?: string;
    rightColor?: string;
    leftType?: "line" | "area" | "bar";
    rightType?: "line" | "area" | "bar";
    title?: string;
    formatLeftY?: ( v: number ) => string;
    formatRightY?: ( v: number ) => string;
    className?: string;
}

export default function DualAxisChart ( {
    data,
    height = 320,
    leftLabel = "",
    rightLabel = "",
    leftColor = GLASSNODE_COLORS.primary,
    rightColor = GLASSNODE_COLORS.secondary,
    leftType = "area",
    rightType = "line",
    title,
    formatLeftY,
    formatRightY,
    className = "",
}: DualAxisChartProps )
{
    const svgRef = useRef<SVGSVGElement>( null );
    const containerRef = useRef<HTMLDivElement>( null );
    const tooltipRef = useRef<HTMLDivElement | null>( null );

    const render = useCallback( () =>
    {
        if ( !data?.length || !svgRef.current || !containerRef.current ) return;

        const svg = d3.select( svgRef.current );
        svg.selectAll( "*" ).remove();

        const cw = containerRef.current.clientWidth;
        const ch = containerRef.current.clientHeight || height;
        const m = { top: 16, right: 56, bottom: 32, left: 56 };
        const w = cw - m.left - m.right;
        const h = ch - m.top - m.bottom;

        svg.attr( "width", cw ).attr( "height", ch );
        const g = svg.append( "g" ).attr( "transform", `translate(${ m.left },${ m.top })` );

        const parsed = data
            .map( ( d ) => ( { ...d, date: d.date instanceof Date ? d.date : new Date( d.date ) } ) )
            .sort( ( a, b ) => a.date.getTime() - b.date.getTime() );

        // Scales
        const x = d3.scaleTime().domain( d3.extent( parsed, ( d ) => d.date ) as [ Date, Date ] ).range( [ 0, w ] );
        const yL = d3.scaleLinear().domain( [ 0, d3.max( parsed, ( d ) => d.value ) || 1 ] ).nice().range( [ h, 0 ] );
        const yR = d3.scaleLinear().domain( [ 0, d3.max( parsed, ( d ) => d.value2 ) || 1 ] ).nice().range( [ h, 0 ] );

        // Grid
        g.append( "g" ).selectAll( "line" ).data( yL.ticks( 5 ) ).join( "line" )
            .attr( "x1", 0 ).attr( "x2", w )
            .attr( "y1", ( d ) => yL( d ) ).attr( "y2", ( d ) => yL( d ) )
            .attr( "stroke", GLASSNODE_COLORS.gridLine ).attr( "stroke-width", 1 ).attr( "stroke-dasharray", "2,3" );

        // Gradient defs
        const defs = svg.append( "defs" );
        const gradId = `dual-grad-${ Math.random().toString( 36 ).slice( 2 ) }`;

        if ( leftType === "area" )
        {
            const grad = defs.append( "linearGradient" ).attr( "id", `${ gradId }-left` ).attr( "x1", "0%" ).attr( "y1", "0%" ).attr( "x2", "0%" ).attr( "y2", "100%" );
            grad.append( "stop" ).attr( "offset", "0%" ).attr( "stop-color", leftColor ).attr( "stop-opacity", 0.35 );
            grad.append( "stop" ).attr( "offset", "100%" ).attr( "stop-color", leftColor ).attr( "stop-opacity", 0.02 );
        }
        if ( rightType === "area" )
        {
            const grad = defs.append( "linearGradient" ).attr( "id", `${ gradId }-right` ).attr( "x1", "0%" ).attr( "y1", "0%" ).attr( "x2", "0%" ).attr( "y2", "100%" );
            grad.append( "stop" ).attr( "offset", "0%" ).attr( "stop-color", rightColor ).attr( "stop-opacity", 0.25 );
            grad.append( "stop" ).attr( "offset", "100%" ).attr( "stop-color", rightColor ).attr( "stop-opacity", 0.02 );
        }

        // Draw left series
        if ( leftType === "bar" )
        {
            const barW = Math.max( 1, w / parsed.length - 1 );
            g.selectAll( ".bar-left" ).data( parsed ).join( "rect" )
                .attr( "x", ( d ) => x( d.date ) - barW / 2 ).attr( "y", ( d ) => yL( d.value ) )
                .attr( "width", barW ).attr( "height", ( d ) => h - yL( d.value ) )
                .attr( "fill", leftColor ).attr( "opacity", 0.6 ).attr( "rx", 1 );
        } else
        {
            if ( leftType === "area" )
            {
                const area = d3.area<any>().x( ( d ) => x( d.date ) ).y0( h ).y1( ( d ) => yL( d.value ) ).curve( d3.curveMonotoneX );
                g.append( "path" ).datum( parsed ).attr( "d", area ).attr( "fill", `url(#${ gradId }-left)` );
            }
            const line = d3.line<any>().x( ( d ) => x( d.date ) ).y( ( d ) => yL( d.value ) ).curve( d3.curveMonotoneX );
            g.append( "path" ).datum( parsed ).attr( "d", line ).attr( "fill", "none" )
                .attr( "stroke", leftColor ).attr( "stroke-width", leftType === "area" ? 1.5 : 2 );
        }

        // Draw right series
        if ( rightType === "bar" )
        {
            const barW = Math.max( 1, w / parsed.length - 1 );
            g.selectAll( ".bar-right" ).data( parsed ).join( "rect" )
                .attr( "x", ( d ) => x( d.date ) - barW / 2 ).attr( "y", ( d ) => yR( d.value2 ) )
                .attr( "width", barW ).attr( "height", ( d ) => h - yR( d.value2 ) )
                .attr( "fill", rightColor ).attr( "opacity", 0.5 ).attr( "rx", 1 );
        } else
        {
            if ( rightType === "area" )
            {
                const area = d3.area<any>().x( ( d ) => x( d.date ) ).y0( h ).y1( ( d ) => yR( d.value2 ) ).curve( d3.curveMonotoneX );
                g.append( "path" ).datum( parsed ).attr( "d", area ).attr( "fill", `url(#${ gradId }-right)` );
            }
            const line = d3.line<any>().x( ( d ) => x( d.date ) ).y( ( d ) => yR( d.value2 ) ).curve( d3.curveMonotoneX );
            g.append( "path" ).datum( parsed ).attr( "d", line ).attr( "fill", "none" )
                .attr( "stroke", rightColor ).attr( "stroke-width", 2 );
        }

        // Axes
        const fmtL = formatLeftY || d3.format( "~s" );
        const fmtR = formatRightY || d3.format( "~s" );

        g.append( "g" ).attr( "transform", `translate(0,${ h })` )
            .call( d3.axisBottom( x ).ticks( 6 ).tickSize( 0 ).tickPadding( 8 ) )
            .call( ( g ) => g.select( ".domain" ).attr( "stroke", GLASSNODE_COLORS.gridLine ) )
            .selectAll( "text" ).attr( "fill", GLASSNODE_COLORS.grayLight ).style( "font-size", "10px" ).style( "font-family", "Inter, system-ui, sans-serif" );

        g.append( "g" )
            .call( d3.axisLeft( yL ).ticks( 5 ).tickSize( 0 ).tickPadding( 6 ).tickFormat( ( d ) => fmtL( d as number ) ) )
            .call( ( g ) => g.select( ".domain" ).remove() )
            .selectAll( "text" ).attr( "fill", leftColor ).style( "font-size", "10px" ).style( "font-family", "Inter, system-ui, sans-serif" );

        g.append( "g" ).attr( "transform", `translate(${ w },0)` )
            .call( d3.axisRight( yR ).ticks( 5 ).tickSize( 0 ).tickPadding( 6 ).tickFormat( ( d ) => fmtR( d as number ) ) )
            .call( ( g ) => g.select( ".domain" ).remove() )
            .selectAll( "text" ).attr( "fill", rightColor ).style( "font-size", "10px" ).style( "font-family", "Inter, system-ui, sans-serif" );

        // Legend
        const legend = svg.append( "g" ).attr( "transform", `translate(${ m.left }, 6)` );
        if ( leftLabel )
        {
            legend.append( "line" ).attr( "x1", 0 ).attr( "x2", 14 ).attr( "y1", 4 ).attr( "y2", 4 ).attr( "stroke", leftColor ).attr( "stroke-width", 2 );
            legend.append( "text" ).attr( "x", 18 ).attr( "y", 7 ).text( leftLabel ).attr( "fill", GLASSNODE_COLORS.grayMedium ).style( "font-size", "10px" ).style( "font-family", "Inter, system-ui, sans-serif" );
        }
        if ( rightLabel )
        {
            const off = leftLabel ? 120 : 0;
            legend.append( "line" ).attr( "x1", off ).attr( "x2", off + 14 ).attr( "y1", 4 ).attr( "y2", 4 ).attr( "stroke", rightColor ).attr( "stroke-width", 2 ).attr( "stroke-dasharray", "4,2" );
            legend.append( "text" ).attr( "x", off + 18 ).attr( "y", 7 ).text( rightLabel ).attr( "fill", GLASSNODE_COLORS.grayMedium ).style( "font-size", "10px" ).style( "font-family", "Inter, system-ui, sans-serif" );
        }

        // Crosshair tooltip
        if ( !tooltipRef.current && containerRef.current )
        {
            tooltipRef.current = document.createElement( "div" );
            Object.assign( tooltipRef.current.style, {
                position: "absolute", visibility: "hidden", pointerEvents: "none", zIndex: "50",
                background: "rgba(0,0,0,0.92)", color: "#fff", padding: "6px 10px",
                borderRadius: "8px", fontSize: "11px", fontFamily: "Inter, system-ui, sans-serif",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)", lineHeight: "1.5", border: "1px solid rgba(255,255,255,0.08)",
            } );
            containerRef.current.appendChild( tooltipRef.current );
        }
        const tooltip = tooltipRef.current!;

        const crosshair = g.append( "g" ).style( "display", "none" );
        crosshair.append( "line" ).attr( "class", "ch-v" ).attr( "y1", 0 ).attr( "y2", h ).attr( "stroke", GLASSNODE_COLORS.grayLight ).attr( "stroke-width", 1 ).attr( "stroke-dasharray", "3,3" );
        crosshair.append( "circle" ).attr( "r", 3.5 ).attr( "fill", leftColor ).attr( "stroke", "#fff" ).attr( "stroke-width", 1.5 ).attr( "class", "ch-dot-l" );
        crosshair.append( "circle" ).attr( "r", 3.5 ).attr( "fill", rightColor ).attr( "stroke", "#fff" ).attr( "stroke-width", 1.5 ).attr( "class", "ch-dot-r" );

        g.append( "rect" ).attr( "width", w ).attr( "height", h ).attr( "fill", "none" ).attr( "pointer-events", "all" )
            .on( "mouseenter", () => { crosshair.style( "display", null ); tooltip.style.visibility = "visible"; } )
            .on( "mouseleave", () => { crosshair.style( "display", "none" ); tooltip.style.visibility = "hidden"; } )
            .on( "touchstart", () => { crosshair.style( "display", null ); tooltip.style.visibility = "visible"; } )
            .on( "touchend", () => { crosshair.style( "display", "none" ); tooltip.style.visibility = "hidden"; } )
            .on( "mousemove touchmove", function ( event )
            {
                const [ mx ] = d3.pointer( event );
                const x0 = x.invert( mx );
                const bis = d3.bisector( ( d: any ) => d.date ).left;
                const idx = bis( parsed, x0, 1 );
                const d0 = parsed[ idx - 1 ], d1 = parsed[ idx ];
                const d = d1 && x0.getTime() - d0.date.getTime() > d1.date.getTime() - x0.getTime() ? d1 : d0;
                if ( !d ) return;

                crosshair.select( ".ch-v" ).attr( "x1", x( d.date ) ).attr( "x2", x( d.date ) );
                crosshair.select( ".ch-dot-l" ).attr( "cx", x( d.date ) ).attr( "cy", yL( d.value ) );
                crosshair.select( ".ch-dot-r" ).attr( "cx", x( d.date ) ).attr( "cy", yR( d.value2 ) );

                tooltip.innerHTML = `
                    <div style="font-weight:600;margin-bottom:2px">${ d3.timeFormat( "%b %d, %Y" )( d.date ) }</div>
                    <div style="color:${ leftColor }">${ leftLabel || "Left" }: ${ fmtL( d.value ) }</div>
                    <div style="color:${ rightColor }">${ rightLabel || "Right" }: ${ fmtR( d.value2 ) }</div>
                `;
                const rect = containerRef.current!.getBoundingClientRect();
                const tx = Math.min( event.clientX - rect.left + 12, cw - 160 );
                tooltip.style.left = `${ tx }px`;
                tooltip.style.top = `${ Math.min( event.clientY - rect.top - 10, ch - 60 ) }px`;
            } );

    }, [ data, height, leftLabel, rightLabel, leftColor, rightColor, leftType, rightType, formatLeftY, formatRightY ] );

    useEffect( () =>
    {
        render();
        const obs = new ResizeObserver( () => render() );
        if ( containerRef.current ) obs.observe( containerRef.current );
        return () => { obs.disconnect(); tooltipRef.current?.remove(); tooltipRef.current = null; };
    }, [ render ] );

    return (
        <div ref={ containerRef } className={ `relative w-full h-full ${ className }` }>
            { title && <div className="text-xs font-medium text-white/60 mb-1 px-1">{ title }</div> }
            <svg ref={ svgRef } className="w-full h-full" />
        </div>
    );
}
