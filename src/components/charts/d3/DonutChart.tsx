"use client";

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import { GLASSNODE_COLORS } from "@/lib/chart-utils";

interface DonutDataPoint
{
    label: string;
    value: number;
    color?: string;
}

interface DonutChartProps
{
    data: DonutDataPoint[];
    height?: number;
    innerRadiusRatio?: number;
    showLegend?: boolean;
    showLabels?: boolean;
    centerLabel?: string;
    centerValue?: string;
    colors?: string[];
    className?: string;
}

export default function DonutChart ( {
    data,
    height = 280,
    innerRadiusRatio = 0.6,
    showLegend = true,
    showLabels = false,
    centerLabel,
    centerValue,
    colors,
    className = "",
}: DonutChartProps )
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
        const legendW = showLegend ? Math.min( 160, cw * 0.35 ) : 0;
        const chartW = cw - legendW;
        const size = Math.min( chartW, ch );
        const radius = size / 2 - 8;
        const inner = radius * innerRadiusRatio;

        svg.attr( "width", cw ).attr( "height", ch );

        const palette = colors || GLASSNODE_COLORS.series;
        const total = d3.sum( data, ( d ) => d.value );

        const g = svg.append( "g" ).attr( "transform", `translate(${ chartW / 2 },${ ch / 2 })` );

        const pie = d3.pie<DonutDataPoint>().value( ( d ) => d.value ).sort( null ).padAngle( 0.02 );
        const arcGen = d3.arc<d3.PieArcDatum<DonutDataPoint>>().innerRadius( inner ).outerRadius( radius ).cornerRadius( 3 );

        const arcs = pie( data );

        // Tooltip
        if ( !tooltipRef.current && containerRef.current )
        {
            tooltipRef.current = document.createElement( "div" );
            Object.assign( tooltipRef.current.style, {
                position: "absolute", visibility: "hidden", pointerEvents: "none", zIndex: "50",
                background: "rgba(0,0,0,0.92)", color: "#fff", padding: "6px 10px",
                borderRadius: "8px", fontSize: "11px", fontFamily: "Inter, system-ui, sans-serif",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            } );
            containerRef.current.appendChild( tooltipRef.current );
        }
        const tooltip = tooltipRef.current!;

        g.selectAll( "path" ).data( arcs ).join( "path" )
            .attr( "d", arcGen )
            .attr( "fill", ( _, i ) => data[ i ].color || palette[ i % palette.length ] )
            .attr( "stroke", "rgba(0,0,0,0.2)" ).attr( "stroke-width", 1 )
            .style( "cursor", "pointer" )
            .on( "mouseenter", function ( event, d )
            {
                d3.select( this ).transition().duration( 150 ).attr( "transform", () =>
                {
                    const [ cx, cy ] = arcGen.centroid( d );
                    const dist = Math.sqrt( cx * cx + cy * cy );
                    return `translate(${ ( cx / dist ) * 4 },${ ( cy / dist ) * 4 })`;
                } );
                const pct = ( ( d.data.value / total ) * 100 ).toFixed( 1 );
                tooltip.innerHTML = `<strong>${ d.data.label }</strong><br/>${ d3.format( "," )( d.data.value ) } (${ pct }%)`;
                tooltip.style.visibility = "visible";
            } )
            .on( "mouseleave", function ()
            {
                d3.select( this ).transition().duration( 150 ).attr( "transform", "translate(0,0)" );
                tooltip.style.visibility = "hidden";
            } )
            .on( "mousemove", ( event ) =>
            {
                const rect = containerRef.current!.getBoundingClientRect();
                tooltip.style.left = `${ event.clientX - rect.left + 10 }px`;
                tooltip.style.top = `${ event.clientY - rect.top - 10 }px`;
            } );

        // Center text
        if ( centerValue )
        {
            g.append( "text" ).attr( "text-anchor", "middle" ).attr( "y", centerLabel ? -6 : 4 )
                .attr( "fill", "#fff" ).style( "font-size", "18px" ).style( "font-weight", "700" )
                .style( "font-family", "Inter, system-ui, sans-serif" ).text( centerValue );
        }
        if ( centerLabel )
        {
            g.append( "text" ).attr( "text-anchor", "middle" ).attr( "y", centerValue ? 14 : 4 )
                .attr( "fill", "rgba(255,255,255,0.5)" ).style( "font-size", "10px" )
                .style( "font-family", "Inter, system-ui, sans-serif" ).text( centerLabel );
        }

        // Legend
        if ( showLegend )
        {
            const legendG = svg.append( "g" ).attr( "transform", `translate(${ chartW + 8 }, ${ Math.max( 12, ch / 2 - data.length * 12 ) })` );

            data.forEach( ( d, i ) =>
            {
                const item = legendG.append( "g" ).attr( "transform", `translate(0, ${ i * 24 })` );
                item.append( "rect" ).attr( "width", 10 ).attr( "height", 10 ).attr( "rx", 2 )
                    .attr( "fill", d.color || palette[ i % palette.length ] );
                item.append( "text" ).attr( "x", 16 ).attr( "y", 9 )
                    .attr( "fill", "rgba(255,255,255,0.7)" ).style( "font-size", "11px" )
                    .style( "font-family", "Inter, system-ui, sans-serif" )
                    .text( `${ d.label }` );
                item.append( "text" ).attr( "x", legendW - 8 ).attr( "y", 9 ).attr( "text-anchor", "end" )
                    .attr( "fill", "rgba(255,255,255,0.4)" ).style( "font-size", "10px" )
                    .style( "font-family", "Inter, system-ui, sans-serif" )
                    .text( `${ ( ( d.value / total ) * 100 ).toFixed( 1 ) }%` );
            } );
        }
    }, [ data, height, innerRadiusRatio, showLegend, showLabels, centerLabel, centerValue, colors ] );

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
