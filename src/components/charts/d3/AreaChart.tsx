"use client";

import { useEffect, useRef, useCallback, useId } from "react";
import * as d3 from "d3";
import { GLASSNODE_COLORS } from "@/lib/chart-utils";

interface DataPoint
{
    date: Date | string;
    value: number;
    [ key: string ]: any;
}

interface AreaChartProps
{
    data: DataPoint[];
    height?: number;
    color?: string;
    fillOpacity?: number;
    yAxisLabel?: string;
    showGrid?: boolean;
    formatY?: ( v: number ) => string;
    className?: string;
}

export default function AreaChart ( {
    data,
    height = 360,
    color = "#ff8c42",
    fillOpacity = 0.6,
    yAxisLabel = "",
    showGrid = true,
    formatY,
    className = "",
}: AreaChartProps )
{
    const svgRef = useRef<SVGSVGElement>( null );
    const containerRef = useRef<HTMLDivElement>( null );
    const tooltipRef = useRef<HTMLDivElement | null>( null );
    const gradientId = useId().replace( /:/g, "_" );

    const render = useCallback( () =>
    {
        if ( !data || data.length === 0 || !svgRef.current || !containerRef.current ) return;

        const svg = d3.select( svgRef.current );
        svg.selectAll( "*" ).remove();

        const cw = containerRef.current.clientWidth;
        const ch = containerRef.current.clientHeight || height;
        const m = { top: 16, right: 48, bottom: 32, left: 52 };
        const w = cw - m.left - m.right;
        const h = ch - m.top - m.bottom;

        svg.attr( "width", cw ).attr( "height", ch );
        const g = svg.append( "g" ).attr( "transform", `translate(${ m.left },${ m.top })` );

        const parsed = data
            .map( ( d ) => ( { ...d, date: d.date instanceof Date ? d.date : new Date( d.date ) } ) )
            .sort( ( a, b ) => a.date.getTime() - b.date.getTime() );

        const x = d3.scaleTime().domain( d3.extent( parsed, ( d ) => d.date ) as [ Date, Date ] ).range( [ 0, w ] );
        const y = d3.scaleLinear().domain( [ 0, d3.max( parsed, ( d ) => d.value ) || 0 ] ).nice().range( [ h, 0 ] );

        // Grid
        if ( showGrid )
        {
            g.append( "g" ).selectAll( "line" ).data( y.ticks( 5 ) ).join( "line" )
                .attr( "x1", 0 ).attr( "x2", w )
                .attr( "y1", ( d ) => y( d ) ).attr( "y2", ( d ) => y( d ) )
                .attr( "stroke", GLASSNODE_COLORS.gridLine ).attr( "stroke-width", 1 ).attr( "stroke-dasharray", "2,3" );
        }

        // Gradient
        const defs = svg.append( "defs" );
        const grad = defs.append( "linearGradient" ).attr( "id", gradientId )
            .attr( "x1", "0%" ).attr( "y1", "0%" ).attr( "x2", "0%" ).attr( "y2", "100%" );
        grad.append( "stop" ).attr( "offset", "0%" ).attr( "stop-color", color ).attr( "stop-opacity", fillOpacity );
        grad.append( "stop" ).attr( "offset", "100%" ).attr( "stop-color", color ).attr( "stop-opacity", 0.02 );

        // Area
        const areaGen = d3.area<any>().x( ( d ) => x( d.date ) ).y0( h ).y1( ( d ) => y( d.value ) ).curve( d3.curveMonotoneX );

        g.append( "path" ).datum( parsed ).attr( "fill", `url(#${ gradientId })` ).attr( "d", areaGen )
            .attr( "opacity", 0 ).transition().duration( 600 ).attr( "opacity", 1 );

        // Line on top
        const lineGen = d3.line<any>().x( ( d ) => x( d.date ) ).y( ( d ) => y( d.value ) ).curve( d3.curveMonotoneX );

        const linePath = g.append( "path" ).datum( parsed ).attr( "fill", "none" )
            .attr( "stroke", color ).attr( "stroke-width", 2 ).attr( "d", lineGen );

        // Line draw animation
        const totalLen = ( linePath.node() as SVGPathElement )?.getTotalLength?.() || 0;
        if ( totalLen )
        {
            linePath
                .attr( "stroke-dasharray", totalLen )
                .attr( "stroke-dashoffset", totalLen )
                .transition().duration( 800 ).ease( d3.easeCubicOut )
                .attr( "stroke-dashoffset", 0 );
        }

        // Axes
        const fmtY = formatY || d3.format( "~s" );

        g.append( "g" ).attr( "transform", `translate(0,${ h })` )
            .call( d3.axisBottom( x ).ticks( 6 ).tickSize( 0 ).tickPadding( 8 ) )
            .call( ( g ) => g.select( ".domain" ).attr( "stroke", GLASSNODE_COLORS.domainStroke ) )
            .selectAll( "text" ).attr( "fill", GLASSNODE_COLORS.axisText ).style( "font-size", "10px" ).style( "font-family", "Inter, system-ui, sans-serif" );

        g.append( "g" )
            .call( d3.axisLeft( y ).ticks( 5 ).tickSize( 0 ).tickPadding( 6 ).tickFormat( ( d ) => fmtY( d as number ) ) )
            .call( ( g ) => g.select( ".domain" ).remove() )
            .selectAll( "text" ).attr( "fill", GLASSNODE_COLORS.axisText ).style( "font-size", "10px" ).style( "font-family", "Inter, system-ui, sans-serif" );

        if ( yAxisLabel )
        {
            g.append( "text" ).attr( "transform", "rotate(-90)" )
                .attr( "y", -m.left + 12 ).attr( "x", -h / 2 ).attr( "text-anchor", "middle" )
                .attr( "fill", GLASSNODE_COLORS.grayMedium ).style( "font-size", "10px" ).style( "font-family", "Inter, system-ui, sans-serif" )
                .text( yAxisLabel );
        }

        // Tooltip
        if ( !tooltipRef.current && containerRef.current )
        {
            tooltipRef.current = document.createElement( "div" );
            Object.assign( tooltipRef.current.style, {
                position: "absolute", visibility: "hidden", pointerEvents: "none", zIndex: "50",
                background: "rgba(0,0,0,0.92)", color: "#fff", padding: "6px 10px",
                borderRadius: "8px", fontSize: "11px", fontFamily: "Inter, system-ui, sans-serif",
                boxShadow: "0 4px 12px rgba(0,0,0,0.4)", lineHeight: "1.5", border: "1px solid rgba(255,255,255,0.08)",
            } );
            containerRef.current.appendChild( tooltipRef.current );
        }
        const tooltip = tooltipRef.current!;

        // Crosshair
        const crosshair = g.append( "g" ).style( "display", "none" );
        crosshair.append( "line" ).attr( "y1", 0 ).attr( "y2", h )
            .attr( "stroke", GLASSNODE_COLORS.crosshair ).attr( "stroke-width", 1 ).attr( "stroke-dasharray", "3,3" );
        crosshair.append( "circle" ).attr( "r", 4 ).attr( "fill", color ).attr( "stroke", "#fff" ).attr( "stroke-width", 1.5 );

        const showTooltip = ( event: any ) =>
        {
            const [ mx ] = d3.pointer( event, g.node() );
            const x0 = x.invert( mx );
            const bis = d3.bisector( ( d: any ) => d.date ).left;
            const idx = bis( parsed, x0, 1 );
            const d0 = parsed[ idx - 1 ], d1 = parsed[ idx ];
            const d = d1 && x0.getTime() - d0.date.getTime() > d1.date.getTime() - x0.getTime() ? d1 : d0;
            if ( !d ) return;

            crosshair.style( "display", null );
            crosshair.select( "line" ).attr( "x1", x( d.date ) ).attr( "x2", x( d.date ) );
            crosshair.select( "circle" ).attr( "cx", x( d.date ) ).attr( "cy", y( d.value ) );

            tooltip.innerHTML = `<div style="font-weight:600;margin-bottom:2px">${ d3.timeFormat( "%b %d, %Y" )( d.date ) }</div><div style="color:${ color }">${ fmtY( d.value ) }</div>`;
            tooltip.style.visibility = "visible";

            const rect = containerRef.current!.getBoundingClientRect();
            const tx = Math.min( Math.max( event.clientX - rect.left + 12, 0 ), cw - 140 );
            const ty = Math.min( Math.max( event.clientY - rect.top - 10, 0 ), ch - 50 );
            tooltip.style.left = `${ tx }px`;
            tooltip.style.top = `${ ty }px`;
        };

        g.append( "rect" ).attr( "width", w ).attr( "height", h ).attr( "fill", "none" ).attr( "pointer-events", "all" )
            .on( "mouseenter", () => { crosshair.style( "display", null ); tooltip.style.visibility = "visible"; } )
            .on( "mouseleave", () => { crosshair.style( "display", "none" ); tooltip.style.visibility = "hidden"; } )
            .on( "mousemove", showTooltip )
            .on( "touchstart", ( e ) => { e.preventDefault(); crosshair.style( "display", null ); tooltip.style.visibility = "visible"; } )
            .on( "touchmove", ( e ) => { e.preventDefault(); showTooltip( e ); } )
            .on( "touchend", () => { crosshair.style( "display", "none" ); tooltip.style.visibility = "hidden"; } );

    }, [ data, height, color, fillOpacity, yAxisLabel, showGrid, formatY, gradientId ] );

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
