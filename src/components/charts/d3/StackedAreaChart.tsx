"use client";

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import { GLASSNODE_COLORS } from "@/lib/chart-utils";

interface DataPoint
{
    date: Date | string;
    [ key: string ]: any;
}

interface Series
{
    key: string;
    color: string;
    label: string;
}

interface StackedAreaChartProps
{
    data: DataPoint[];
    series: Series[];
    height?: number;
    yAxisLabel?: string;
    showGrid?: boolean;
    showLegend?: boolean;
    formatY?: ( v: number ) => string;
    className?: string;
}

export default function StackedAreaChart ( {
    data,
    series,
    height = 360,
    yAxisLabel = "",
    showGrid = true,
    showLegend = true,
    formatY,
    className = "",
}: StackedAreaChartProps )
{
    const svgRef = useRef<SVGSVGElement>( null );
    const containerRef = useRef<HTMLDivElement>( null );
    const tooltipRef = useRef<HTMLDivElement | null>( null );

    const render = useCallback( () =>
    {
        if ( !data || data.length === 0 || !svgRef.current || !containerRef.current ) return;

        const svg = d3.select( svgRef.current );
        svg.selectAll( "*" ).remove();

        const cw = containerRef.current.clientWidth;
        const ch = containerRef.current.clientHeight || height;
        const legendH = showLegend ? 28 : 0;
        const m = { top: 12 + legendH, right: 48, bottom: 32, left: 52 };
        const w = cw - m.left - m.right;
        const h = ch - m.top - m.bottom;

        svg.attr( "width", cw ).attr( "height", ch );
        const g = svg.append( "g" ).attr( "transform", `translate(${ m.left },${ m.top })` );

        const parsed = data
            .map( ( d ) => ( { ...d, date: d.date instanceof Date ? d.date : new Date( d.date ) } ) )
            .sort( ( a, b ) => a.date.getTime() - b.date.getTime() );

        const stack = d3.stack().keys( series.map( ( s ) => s.key ) );
        const stackedData = stack( parsed as any );

        const x = d3.scaleTime().domain( d3.extent( parsed, ( d ) => d.date ) as [ Date, Date ] ).range( [ 0, w ] );
        const y = d3.scaleLinear().domain( [ 0, d3.max( stackedData[ stackedData.length - 1 ], ( d ) => d[ 1 ] ) || 0 ] ).nice().range( [ h, 0 ] );
        const fmtY = formatY || d3.format( "~s" );

        // Grid
        if ( showGrid )
        {
            g.append( "g" ).selectAll( "line" ).data( y.ticks( 5 ) ).join( "line" )
                .attr( "x1", 0 ).attr( "x2", w ).attr( "y1", ( d ) => y( d ) ).attr( "y2", ( d ) => y( d ) )
                .attr( "stroke", GLASSNODE_COLORS.gridLine ).attr( "stroke-width", 1 ).attr( "stroke-dasharray", "2,3" );
        }

        // Areas
        const areaGen = d3.area<any>()
            .x( ( d ) => x( d.data.date ) )
            .y0( ( d ) => y( d[ 0 ] ) )
            .y1( ( d ) => y( d[ 1 ] ) )
            .curve( d3.curveMonotoneX );

        const areaPaths = g.selectAll( ".area" ).data( stackedData ).join( "path" ).attr( "class", "area" )
            .attr( "fill", ( _, i ) => series[ i ].color ).attr( "fill-opacity", 0.7 )
            .attr( "d", areaGen ).attr( "opacity", 0 )
            .transition().duration( 600 ).attr( "opacity", 1 );

        // Hover highlight — dim other areas
        g.selectAll<SVGPathElement, any>( ".area" )
            .on( "mouseenter", function ( _, datum )
            {
                g.selectAll( ".area" ).attr( "fill-opacity", 0.25 );
                d3.select( this ).attr( "fill-opacity", 0.85 );
            } )
            .on( "mouseleave", () =>
            {
                g.selectAll( ".area" ).attr( "fill-opacity", 0.7 );
            } );

        // Axes
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

        // Legend
        if ( showLegend )
        {
            const legend = svg.append( "g" ).attr( "transform", `translate(${ m.left }, 10)` );
            let xOff = 0;
            series.forEach( ( s ) =>
            {
                const item = legend.append( "g" ).attr( "transform", `translate(${ xOff }, 0)` );
                item.append( "rect" ).attr( "width", 12 ).attr( "height", 12 ).attr( "rx", 2 ).attr( "y", -6 )
                    .attr( "fill", s.color ).attr( "fill-opacity", 0.7 );
                const text = item.append( "text" ).attr( "x", 16 ).attr( "y", 4 )
                    .attr( "fill", GLASSNODE_COLORS.grayDark ).style( "font-size", "11px" ).style( "font-family", "Inter, system-ui, sans-serif" )
                    .text( s.label );
                const bbox = ( text.node() as SVGTextElement ).getBBox();
                xOff += bbox.width + 32;
            } );
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

            const rows = series.map( ( s ) => `<div style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:2px;background:${ s.color };display:inline-block"></span>${ s.label }: <span style="font-weight:600">${ fmtY( d[ s.key ] || 0 ) }</span></div>` ).join( "" );
            tooltip.innerHTML = `<div style="font-weight:600;margin-bottom:3px">${ d3.timeFormat( "%b %d, %Y" )( d.date ) }</div>${ rows }`;
            tooltip.style.visibility = "visible";

            const rect = containerRef.current!.getBoundingClientRect();
            const tx = Math.min( Math.max( event.clientX - rect.left + 12, 0 ), cw - 180 );
            const ty = Math.min( Math.max( event.clientY - rect.top - 10, 0 ), ch - 60 );
            tooltip.style.left = `${ tx }px`;
            tooltip.style.top = `${ ty }px`;
        };

        g.append( "rect" ).attr( "width", w ).attr( "height", h ).attr( "fill", "none" ).attr( "pointer-events", "all" )
            .on( "mouseenter", () => { crosshair.style( "display", null ); tooltip.style.visibility = "visible"; } )
            .on( "mouseleave", () => { crosshair.style( "display", "none" ); tooltip.style.visibility = "hidden"; g.selectAll( ".area" ).attr( "fill-opacity", 0.7 ); } )
            .on( "mousemove", showTooltip )
            .on( "touchstart", ( e ) => { e.preventDefault(); crosshair.style( "display", null ); tooltip.style.visibility = "visible"; } )
            .on( "touchmove", ( e ) => { e.preventDefault(); showTooltip( e ); } )
            .on( "touchend", () => { crosshair.style( "display", "none" ); tooltip.style.visibility = "hidden"; } );

    }, [ data, series, height, yAxisLabel, showGrid, showLegend, formatY ] );

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
