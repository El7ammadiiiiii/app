"use client";

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import { GLASSNODE_COLORS } from "@/lib/chart-utils";

interface DataPoint
{
    date: Date | string;
    bar: number;
    line: number;
    [ key: string ]: any;
}

interface BarLineComboChartProps
{
    data: DataPoint[];
    height?: number;
    barColor?: string;
    lineColor?: string;
    barLabel?: string;
    lineLabel?: string;
    yAxisLabel?: string;
    formatY?: ( v: number ) => string;
    showGrid?: boolean;
    className?: string;
}

export default function BarLineComboChart ( {
    data,
    height = 320,
    barColor = GLASSNODE_COLORS.secondary,
    lineColor = GLASSNODE_COLORS.primary,
    barLabel = "",
    lineLabel = "",
    yAxisLabel = "",
    formatY,
    showGrid = true,
    className = "",
}: BarLineComboChartProps )
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
        const m = { top: 24, right: 20, bottom: 32, left: 56 };
        const w = cw - m.left - m.right;
        const h = ch - m.top - m.bottom;

        svg.attr( "width", cw ).attr( "height", ch );
        const g = svg.append( "g" ).attr( "transform", `translate(${ m.left },${ m.top })` );

        const parsed = data
            .map( ( d ) => ( { ...d, date: d.date instanceof Date ? d.date : new Date( d.date ) } ) )
            .sort( ( a, b ) => a.date.getTime() - b.date.getTime() );

        const allVals = parsed.flatMap( ( d ) => [ d.bar, d.line ] );
        const x = d3.scaleTime().domain( d3.extent( parsed, ( d ) => d.date ) as [ Date, Date ] ).range( [ 0, w ] );
        const y = d3.scaleLinear().domain( [ 0, d3.max( allVals ) || 1 ] ).nice().range( [ h, 0 ] );

        // Grid
        if ( showGrid )
        {
            g.append( "g" ).selectAll( "line" ).data( y.ticks( 5 ) ).join( "line" )
                .attr( "x1", 0 ).attr( "x2", w )
                .attr( "y1", ( d ) => y( d ) ).attr( "y2", ( d ) => y( d ) )
                .attr( "stroke", GLASSNODE_COLORS.gridLine ).attr( "stroke-width", 1 ).attr( "stroke-dasharray", "2,3" );
        }

        // Bars
        const barW = Math.max( 1, w / parsed.length * 0.65 );
        g.selectAll( ".bar" ).data( parsed ).join( "rect" )
            .attr( "x", ( d ) => x( d.date ) - barW / 2 ).attr( "y", ( d ) => y( d.bar ) )
            .attr( "width", barW ).attr( "height", ( d ) => h - y( d.bar ) )
            .attr( "fill", barColor ).attr( "opacity", 0.55 ).attr( "rx", 1 );

        // Line
        const line = d3.line<any>().x( ( d ) => x( d.date ) ).y( ( d ) => y( d.line ) ).curve( d3.curveMonotoneX );
        g.append( "path" ).datum( parsed ).attr( "d", line ).attr( "fill", "none" )
            .attr( "stroke", lineColor ).attr( "stroke-width", 2 );

        // Dots on line at hover breakpoints
        g.selectAll( ".dot" ).data( parsed ).join( "circle" )
            .attr( "cx", ( d ) => x( d.date ) ).attr( "cy", ( d ) => y( d.line ) )
            .attr( "r", 0 ).attr( "fill", lineColor );

        // Axes
        const fmtY = formatY || d3.format( "~s" );

        g.append( "g" ).attr( "transform", `translate(0,${ h })` )
            .call( d3.axisBottom( x ).ticks( 6 ).tickSize( 0 ).tickPadding( 8 ) )
            .call( ( g ) => g.select( ".domain" ).attr( "stroke", GLASSNODE_COLORS.gridLine ) )
            .selectAll( "text" ).attr( "fill", GLASSNODE_COLORS.grayLight ).style( "font-size", "10px" ).style( "font-family", "Inter, system-ui, sans-serif" );

        g.append( "g" )
            .call( d3.axisLeft( y ).ticks( 5 ).tickSize( 0 ).tickPadding( 6 ).tickFormat( ( d ) => fmtY( d as number ) ) )
            .call( ( g ) => g.select( ".domain" ).remove() )
            .selectAll( "text" ).attr( "fill", GLASSNODE_COLORS.grayLight ).style( "font-size", "10px" ).style( "font-family", "Inter, system-ui, sans-serif" );

        // Legend
        const legend = svg.append( "g" ).attr( "transform", `translate(${ m.left }, 8)` );
        if ( barLabel )
        {
            legend.append( "rect" ).attr( "width", 10 ).attr( "height", 8 ).attr( "rx", 1 ).attr( "fill", barColor ).attr( "opacity", 0.6 );
            legend.append( "text" ).attr( "x", 14 ).attr( "y", 8 ).text( barLabel )
                .attr( "fill", GLASSNODE_COLORS.grayMedium ).style( "font-size", "10px" ).style( "font-family", "Inter, system-ui, sans-serif" );
        }
        if ( lineLabel )
        {
            const off = barLabel ? 100 : 0;
            legend.append( "line" ).attr( "x1", off ).attr( "x2", off + 14 ).attr( "y1", 4 ).attr( "y2", 4 )
                .attr( "stroke", lineColor ).attr( "stroke-width", 2 );
            legend.append( "text" ).attr( "x", off + 18 ).attr( "y", 8 ).text( lineLabel )
                .attr( "fill", GLASSNODE_COLORS.grayMedium ).style( "font-size", "10px" ).style( "font-family", "Inter, system-ui, sans-serif" );
        }

        // Tooltip
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
        crosshair.append( "line" ).attr( "y1", 0 ).attr( "y2", h )
            .attr( "stroke", GLASSNODE_COLORS.grayLight ).attr( "stroke-dasharray", "3,3" );

        crosshair.append( "circle" ).attr( "r", 4 ).attr( "fill", lineColor ).attr( "stroke", "#fff" ).attr( "stroke-width", 1.5 ).attr( "class", "ch-dot" );

        const showTip = ( event: any ) =>
        {
            const [ mx ] = d3.pointer( event, g.node() );
            const x0 = x.invert( mx );
            const bis = d3.bisector( ( d: any ) => d.date ).left;
            const idx = bis( parsed, x0, 1 );
            const d0 = parsed[ idx - 1 ], d1 = parsed[ idx ];
            const d = d1 && x0.getTime() - d0.date.getTime() > d1.date.getTime() - x0.getTime() ? d1 : d0;
            if ( !d ) return;

            crosshair.select( "line" ).attr( "x1", x( d.date ) ).attr( "x2", x( d.date ) );
            crosshair.select( ".ch-dot" ).attr( "cx", x( d.date ) ).attr( "cy", y( d.line ) );
            tooltip.innerHTML = `
                <div style="font-weight:600;margin-bottom:2px">${ d3.timeFormat( "%b %d, %Y" )( d.date ) }</div>
                <div style="color:${ barColor }">${ barLabel || "Bar" }: ${ fmtY( d.bar ) }</div>
                <div style="color:${ lineColor }">${ lineLabel || "Line" }: ${ fmtY( d.line ) }</div>
            `;
            const rect = containerRef.current!.getBoundingClientRect();
            tooltip.style.left = `${ Math.min( event.clientX - rect.left + 12, cw - 160 ) }px`;
            tooltip.style.top = `${ Math.min( event.clientY - rect.top - 10, ch - 60 ) }px`;
        };

        g.append( "rect" ).attr( "width", w ).attr( "height", h ).attr( "fill", "none" ).attr( "pointer-events", "all" )
            .on( "mouseenter", () => { crosshair.style( "display", null ); tooltip.style.visibility = "visible"; } )
            .on( "mouseleave", () => { crosshair.style( "display", "none" ); tooltip.style.visibility = "hidden"; } )
            .on( "mousemove", showTip )
            .on( "touchstart", ( e ) => { e.preventDefault(); crosshair.style( "display", null ); tooltip.style.visibility = "visible"; } )
            .on( "touchmove", ( e ) => { e.preventDefault(); showTip( e ); } )
            .on( "touchend", () => { crosshair.style( "display", "none" ); tooltip.style.visibility = "hidden"; } );

    }, [ data, height, barColor, lineColor, barLabel, lineLabel, formatY, showGrid ] );

    useEffect( () =>
    {
        render();
        const obs = new ResizeObserver( () => render() );
        if ( containerRef.current ) obs.observe( containerRef.current );
        return () => { obs.disconnect(); tooltipRef.current?.remove(); tooltipRef.current = null; };
    }, [ render ] );

    return (
        <div ref={ containerRef } className={ `relative w-full h-full ${ className }` }>
            <svg ref={ svgRef } className="w-full h-full" />
        </div>
    );
}
